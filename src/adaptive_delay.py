"""
自适应延迟和缓存管理器
用于优化爬虫速度，同时保持稳定性
"""
import asyncio
import random
from datetime import datetime, timedelta
from typing import Dict, Optional


class AdaptiveDelayManager:
    """
    自适应延迟管理器
    根据请求成功率动态调整延迟时间，在速度和稳定性之间取得平衡
    """

    def __init__(self, initial_min: int = 15, initial_max: int = 25):
        """
        初始化延迟管理器

        Args:
            initial_min: 初始最小延迟时间（秒）
            initial_max: 初始最大延迟时间（秒）
        """
        self.current_min = initial_min
        self.current_max = initial_max

        # 最小和最大延迟限制（安全边界）
        self.abs_min = 5  # 绝对最小延迟，不低于5秒
        self.abs_max = 60  # 绝对最大延迟，不超过60秒

        self.success_count = 0
        self.failure_count = 0
        self.total_requests = 0
        self.total_failures = 0

        # 配置参数
        self.success_threshold = 3  # 连续成功3次后减少延迟
        self.failure_threshold = 2  # 连续失败2次后增加延迟
        self.delay_reduction = 3  # 每次减少的延迟秒数
        self.delay_increase = 10  # 每次增加的延迟秒数

    async def wait(self, reason: str = "操作间隔"):
        """
        执行自适应延迟

        Args:
            reason: 延迟原因（用于日志）
        """
        delay = random.uniform(self.current_min, self.current_max)
        print(f"   [延迟] {reason}: 等待 {delay:.1f} 秒 (当前范围: {self.current_min}-{self.current_max}s)")
        await asyncio.sleep(delay)

    def record_success(self):
        """记录成功请求，可能减少延迟"""
        self.success_count += 1
        self.failure_count = 0  # 重置失败计数
        self.total_requests += 1

        # 连续成功达到阈值，减少延迟
        if self.success_count >= self.success_threshold:
            old_min, old_max = self.current_min, self.current_max
            self.current_min = max(self.abs_min, self.current_min - self.delay_reduction)
            self.current_max = max(self.abs_min + 5, self.current_max - self.delay_reduction)

            if old_min != self.current_min or old_max != self.current_max:
                print(f"   [自适应] 连续成功 {self.success_threshold} 次，降低延迟: {old_min}-{old_max}s → {self.current_min}-{self.current_max}s")

            self.success_count = 0

    def record_failure(self):
        """记录失败请求，增加延迟"""
        self.failure_count += 1
        self.total_failures += 1
        self.total_requests += 1

        # 连续失败达到阈值，增加延迟
        if self.failure_count >= self.failure_threshold:
            old_min, old_max = self.current_min, self.current_max
            self.current_min = min(self.abs_max - 10, self.current_min + self.delay_increase)
            self.current_max = min(self.abs_max, self.current_max + self.delay_increase)

            if old_min != self.current_min or old_max != self.current_max:
                print(f"   [自适应] 连续失败 {self.failure_threshold} 次，增加延迟: {old_min}-{old_max}s → {self.current_min}-{self.current_max}s")

            self.failure_count = 0

    def get_success_rate(self) -> float:
        """获取成功率"""
        if self.total_requests == 0:
            return 100.0
        return ((self.total_requests - self.total_failures) / self.total_requests) * 100

    def get_stats(self) -> Dict:
        """获取统计信息"""
        return {
            "current_delay_range": f"{self.current_min}-{self.current_max}s",
            "total_requests": self.total_requests,
            "total_failures": self.total_failures,
            "success_rate": f"{self.get_success_rate():.1f}%",
            "consecutive_successes": self.success_count,
            "consecutive_failures": self.failure_count
        }

    def print_stats(self):
        """打印统计信息"""
        stats = self.get_stats()
        print(f"\n{'='*60}")
        print(f"📊 自适应延迟统计:")
        print(f"   当前延迟范围: {stats['current_delay_range']}")
        print(f"   总请求数: {stats['total_requests']}")
        print(f"   失败次数: {stats['total_failures']}")
        print(f"   成功率: {stats['success_rate']}")
        print(f"   连续成功: {stats['consecutive_successes']} 次")
        print(f"   连续失败: {stats['consecutive_failures']} 次")
        print(f"{'='*60}\n")


class SellerInfoCache:
    """
    卖家信息缓存管理器
    避免重复采集同一卖家的信息，提升速度
    """

    def __init__(self, cache_ttl_hours: int = 24):
        """
        初始化缓存管理器

        Args:
            cache_ttl_hours: 缓存有效期（小时），默认24小时
        """
        self.cache: Dict[str, Dict] = {}
        self.cache_ttl = timedelta(hours=cache_ttl_hours)
        self.hits = 0
        self.misses = 0

    def get(self, user_id: str) -> Optional[Dict]:
        """
        从缓存获取卖家信息

        Args:
            user_id: 卖家ID

        Returns:
            卖家信息字典，如果缓存不存在或已过期则返回 None
        """
        if user_id not in self.cache:
            self.misses += 1
            return None

        cached_data = self.cache[user_id]
        cache_time = cached_data.get('_cached_at')

        # 检查缓存是否过期
        if cache_time and datetime.now() - cache_time > self.cache_ttl:
            print(f"   [缓存] 卖家 {user_id} 的缓存已过期，将重新采集")
            del self.cache[user_id]
            self.misses += 1
            return None

        self.hits += 1
        print(f"   [缓存命中] ✅ 使用缓存的卖家信息: {user_id} (命中率: {self.get_hit_rate():.1f}%)")

        # 返回去除缓存元数据的卖家信息
        return {k: v for k, v in cached_data.items() if not k.startswith('_')}

    def set(self, user_id: str, seller_data: Dict):
        """
        将卖家信息存入缓存

        Args:
            user_id: 卖家ID
            seller_data: 卖家信息字典
        """
        # 添加缓存元数据
        cache_entry = {
            '_cached_at': datetime.now(),
            **seller_data
        }
        self.cache[user_id] = cache_entry
        print(f"   [缓存] 💾 已缓存卖家 {user_id} 的信息")

    def get_hit_rate(self) -> float:
        """获取缓存命中率"""
        total = self.hits + self.misses
        if total == 0:
            return 0.0
        return (self.hits / total) * 100

    def clear(self):
        """清空所有缓存"""
        self.cache.clear()
        self.hits = 0
        self.misses = 0
        print(f"   [缓存] 🗑️ 已清空所有缓存")

    def clear_expired(self):
        """清理过期的缓存条目"""
        expired_count = 0
        now = datetime.now()

        for user_id in list(self.cache.keys()):
            cache_time = self.cache[user_id].get('_cached_at')
            if cache_time and now - cache_time > self.cache_ttl:
                del self.cache[user_id]
                expired_count += 1

        if expired_count > 0:
            print(f"   [缓存] 🧹 清理了 {expired_count} 个过期缓存")

    def get_stats(self) -> Dict:
        """获取缓存统计信息"""
        return {
            "cached_sellers": len(self.cache),
            "cache_hits": self.hits,
            "cache_misses": self.misses,
            "hit_rate": f"{self.get_hit_rate():.1f}%"
        }

    def print_stats(self):
        """打印缓存统计信息"""
        stats = self.get_stats()
        print(f"\n{'='*60}")
        print(f"💾 卖家信息缓存统计:")
        print(f"   已缓存卖家数: {stats['cached_sellers']}")
        print(f"   缓存命中: {stats['cache_hits']} 次")
        print(f"   缓存未命中: {stats['cache_misses']} 次")
        print(f"   命中率: {stats['hit_rate']}")
        print(f"   缓存有效期: {self.cache_ttl.total_seconds() / 3600:.1f} 小时")
        print(f"{'='*60}\n")
