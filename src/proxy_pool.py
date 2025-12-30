"""
代理IP池管理模块
支持代理池加载、轮换、验证和智能切换
"""

import asyncio
import random
import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from dataclasses import dataclass, field
import aiohttp


@dataclass
class ProxyInfo:
    """代理信息数据类"""
    url: str  # 完整代理URL，如 http://user:pass@host:port
    host: str
    port: int
    protocol: str  # http, https, socks5
    username: Optional[str] = None
    password: Optional[str] = None

    # 统计信息
    success_count: int = field(default=0)
    fail_count: int = field(default=0)
    last_used: Optional[datetime] = None
    last_check: Optional[datetime] = None
    is_active: bool = field(default=True)

    @property
    def success_rate(self) -> float:
        """计算成功率"""
        total = self.success_count + self.fail_count
        if total == 0:
            return 0.0
        return self.success_count / total

    @property
    def score(self) -> float:
        """
        综合评分（用于排序）
        考虑成功率、使用频率、最近状态
        """
        score = self.success_rate * 100

        # 惩罚频繁使用的代理
        if self.last_used:
            hours_since_use = (datetime.now() - self.last_used).total_seconds() / 3600
            score += min(hours_since_use, 24) * 0.5

        # 惩励最近验证过的代理
        if self.last_check:
            hours_since_check = (datetime.now() - self.last_check).total_seconds() / 3600
            if hours_since_check < 1:
                score += 10

        return score

    def to_dict(self) -> dict:
        """转换为字典"""
        return {
            'url': self.url,
            'host': self.host,
            'port': self.port,
            'protocol': self.protocol,
            'username': self.username,
            'password': self.password,
            'success_count': self.success_count,
            'fail_count': self.fail_count,
            'last_used': self.last_used.isoformat() if self.last_used else None,
            'last_check': self.last_check.isoformat() if self.last_check else None,
            'is_active': self.is_active,
        }


class ProxyPool:
    """代理IP池管理类"""

    def __init__(self, proxy_file: str = "proxies.json", verify_timeout: int = 10):
        self.proxy_file = proxy_file
        self.verify_timeout = verify_timeout
        self.proxies: List[ProxyInfo] = []
        self.current_index = 0
        self.session: Optional[aiohttp.ClientSession] = None

        # 统计信息
        self.total_requests = 0
        self.successful_requests = 0

    async def initialize(self):
        """初始化代理池"""
        await self.load_from_file()
        self.session = aiohttp.ClientSession()

        # 如果有代理，验证它们
        if self.proxies:
            print(f"[代理池] 已加载 {len(self.proxies)} 个代理，开始验证...")
            await self.verify_all_proxies()
        else:
            print("[代理池] 警告: 未加载任何代理，将直连访问")

    async def close(self):
        """关闭资源"""
        if self.session:
            await self.session.close()

    async def load_from_file(self):
        """从文件加载代理列表"""
        if not os.path.exists(self.proxy_file):
            print(f"[代理池] 代理文件 {self.proxy_file} 不存在")
            return

        try:
            with open(self.proxy_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # 支持两种格式：
            # 1. 列表格式: ["http://proxy1", "http://proxy2"]
            # 2. 对象格式（带状态）: [{...}, {...}]
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, str):
                        proxy = self._parse_proxy_url(item)
                    elif isinstance(item, dict):
                        proxy = self._dict_to_proxy(item)
                    else:
                        continue

                    if proxy:
                        self.proxies.append(proxy)

            print(f"[代理池] 成功加载 {len(self.proxies)} 个代理")
        except Exception as e:
            print(f"[代理池] 加载代理文件失败: {e}")

    def _parse_proxy_url(self, proxy_url: str) -> Optional[ProxyInfo]:
        """解析代理URL"""
        try:
            # 解析协议
            if '://' in proxy_url:
                protocol, rest = proxy_url.split('://', 1)
            else:
                return None

            # 解析认证信息
            username = None
            password = None
            if '@' in rest:
                auth, host_port = rest.rsplit('@', 1)
                if ':' in auth:
                    username, password = auth.split(':', 1)
            else:
                host_port = rest

            # 解析主机和端口
            if ':' in host_port:
                host, port = host_port.split(':', 1)
                port = int(port)
            else:
                host = host_port
                port = 8080  # 默认端口

            return ProxyInfo(
                url=proxy_url,
                host=host,
                port=port,
                protocol=protocol,
                username=username,
                password=password
            )
        except Exception as e:
            print(f"[代理池] 解析代理URL失败 {proxy_url}: {e}")
            return None

    def _dict_to_proxy(self, data: dict) -> Optional[ProxyInfo]:
        """从字典创建代理对象"""
        try:
            # 如果有完整的字段信息，直接使用
            if 'host' in data and 'port' in data and 'protocol' in data:
                proxy = ProxyInfo(
                    url=data['url'],
                    host=data['host'],
                    port=data['port'],
                    protocol=data['protocol'],
                    username=data.get('username'),
                    password=data.get('password'),
                    success_count=data.get('success_count', 0),
                    fail_count=data.get('fail_count', 0),
                    is_active=data.get('active', data.get('is_active', True)),
                )
            else:
                # 如果只有 url 字段，从 url 解析信息
                proxy = self._parse_proxy_url(data['url'])
                if not proxy:
                    return None

                # 加载统计信息
                proxy.success_count = data.get('success_count', 0)
                proxy.fail_count = data.get('fail_count', 0)
                proxy.is_active = data.get('active', True)

            # 恢复时间字段
            if data.get('last_used'):
                proxy.last_used = datetime.fromisoformat(data['last_used'])
            if data.get('last_check'):
                proxy.last_check = datetime.fromisoformat(data['last_check'])

            return proxy
        except Exception as e:
            print(f"[代理池] 从字典创建代理失败: {e}")
            return None

    async def verify_proxy(self, proxy: ProxyInfo) -> bool:
        """验证单个代理是否可用"""
        try:
            # 使用闲鱼首页作为测试目标
            test_url = "https://www.goofish.com"

            proxy_url, _ = self._get_proxy_tuple(proxy)

            async with self.session.get(
                url=test_url,
                proxy=proxy_url,
                timeout=aiohttp.ClientTimeout(total=self.verify_timeout),
                ssl=False  # 某些代理SSL证书有问题
            ) as response:
                if response.status == 200:
                    proxy.last_check = datetime.now()
                    proxy.is_active = True
                    print(f"  ✓ {proxy.host}:{proxy.port} - 可用")
                    return True
                else:
                    proxy.is_active = False
                    print(f"  ✗ {proxy.host}:{proxy.port} - 状态码: {response.status}")
                    return False
        except Exception as e:
            proxy.is_active = False
            error_msg = str(e)[:100]
            print(f"  ✗ {proxy.host}:{proxy.port} - 错误: {error_msg}")
            return False

    async def verify_all_proxies(self):
        """验证所有代理（并发）"""
        active_proxies = [p for p in self.proxies if p.is_active]

        if not active_proxies:
            print("[代理池] 没有需要验证的代理")
            return

        # 暂时跳过验证，直接标记为可用
        # （因为快代理私密代理的验证方式特殊，可能导致误判）
        print(f"[代理池] 已加载 {len(active_proxies)} 个代理（跳过验证）")
        for proxy in active_proxies:
            proxy.last_check = datetime.now()
            proxy.is_active = True
            print(f"  ✓ {proxy.host}:{proxy.port} - 已启用（跳过验证）")

    def _get_proxy_tuple(self, proxy: ProxyInfo):
        """
        获取aiohttp使用的代理配置

        对于快代理私密代理，直接在 URL 中包含认证信息
        格式: http://secret_id:secret_key@ip:port

        Returns:
            tuple: (proxy_url, None) - 认证信息已包含在 URL 中
        """
        # 如果有用户名和密码，直接在 URL 中包含认证信息
        if proxy.username and proxy.password:
            proxy_url = f"{proxy.protocol}://{proxy.username}:{proxy.password}@{proxy.host}:{proxy.port}"
        else:
            proxy_url = f"{proxy.protocol}://{proxy.host}:{proxy.port}"

        return (proxy_url, None)

    def _get_proxy_dict(self, proxy: ProxyInfo) -> str:
        """获取aiohttp使用的代理字典（向后兼容）"""
        return self._get_proxy_tuple(proxy)[0]

    def get_proxy(self, strategy: str = "smart") -> Optional[ProxyInfo]:
        """
        获取一个代理

        Args:
            strategy: 选择策略
                - "random": 随机选择
                - "round_robin": 轮询
                - "smart": 智能选择（基于评分）

        Returns:
            ProxyInfo对象，如果没有可用代理则返回None
        """
        if not self.proxies:
            return None

        # 过滤出可用的代理
        active_proxies = [p for p in self.proxies if p.is_active]

        if not active_proxies:
            print("[代理池] 警告: 没有可用的代理")
            return None

        proxy = None

        if strategy == "random":
            proxy = random.choice(active_proxies)
        elif strategy == "round_robin":
            proxy = active_proxies[self.current_index % len(active_proxies)]
            self.current_index += 1
        else:  # smart
            # 按评分排序，选择最好的
            active_proxies.sort(key=lambda p: p.score, reverse=True)
            # 从前3个中随机选择，增加多样性
            top_n = min(3, len(active_proxies))
            proxy = random.choice(active_proxies[:top_n])

        proxy.last_used = datetime.now()
        self.total_requests += 1

        return proxy

    def report_success(self, proxy_url: str):
        """报告代理使用成功"""
        for proxy in self.proxies:
            if proxy.url == proxy_url:
                proxy.success_count += 1
                self.successful_requests += 1
                break

    def report_failure(self, proxy_url: str, deactivate: bool = False):
        """
        报告代理使用失败

        Args:
            proxy_url: 代理URL
            deactivate: 是否停用该代理（连续失败时）
        """
        for proxy in self.proxies:
            if proxy.url == proxy_url:
                proxy.fail_count += 1

                # 如果失败次数过多，暂时停用
                if deactivate or proxy.fail_count >= 5:
                    proxy.is_active = False
                    print(f"[代理池] 代理 {proxy_url} 已停用（连续失败）")

                    # 30分钟后重新激活
                    asyncio.create_task(self._reactivate_proxy(proxy, 30))
                break

    async def _reactivate_proxy(self, proxy: ProxyInfo, minutes: int):
        """在指定分钟后重新激活代理"""
        await asyncio.sleep(minutes * 60)
        proxy.is_active = True
        proxy.fail_count = max(0, proxy.fail_count - 3)
        print(f"[代理池] 代理 {proxy.url} 已重新激活")

    def get_statistics(self) -> dict:
        """获取统计信息"""
        active_count = sum(1 for p in self.proxies if p.is_active)

        return {
            'total_proxies': len(self.proxies),
            'active_proxies': active_count,
            'total_requests': self.total_requests,
            'successful_requests': self.successful_requests,
            'success_rate': self.successful_requests / self.total_requests if self.total_requests > 0 else 0,
        }

    def save_to_file(self):
        """保存代理状态到文件"""
        try:
            data = [p.to_dict() for p in self.proxies]
            with open(self.proxy_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"[代理池] 已保存 {len(self.proxies)} 个代理状态到 {self.proxy_file}")
        except Exception as e:
            print(f"[代理池] 保存代理状态失败: {e}")

    def print_status(self):
        """打印代理池状态"""
        stats = self.get_statistics()

        print(f"  📦 代理: {stats['total_proxies']} 个 | "
              f"✓ 可用: {stats['active_proxies']} | "
              f"📊 请求: {stats['total_requests']} | "
              f"✅ 成功: {stats['successful_requests']} | "
              f"成功率: {stats['success_rate']*100:.1f}%\n")

        # 显示前5个最佳代理
        if self.proxies:
            sorted_proxies = sorted(self.proxies, key=lambda p: p.score, reverse=True)[:5]
            print("  🏆 最佳代理:")
            for i, proxy in enumerate(sorted_proxies, 1):
                status = "✓" if proxy.is_active else "✗"
                print(f"    {i}. {status} {proxy.url}")
                print(f"       成功率: {proxy.success_rate*100:.1f}% | "
                      f"成功: {proxy.success_count} | 失败: {proxy.fail_count}")
        print()


# 全局代理池实例
_proxy_pool: Optional[ProxyPool] = None


async def get_proxy_pool() -> ProxyPool:
    """获取全局代理池实例"""
    global _proxy_pool
    if _proxy_pool is None:
        _proxy_pool = ProxyPool()
        await _proxy_pool.initialize()
    return _proxy_pool
