#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
动态代理管理器: 在爬虫运行时自动检测并补充失效的IP
"""
import subprocess
import sys
import os
import json
import threading
import time
from datetime import datetime, timedelta

PROXIES_FILE = "proxies.json"
PROXY_CONFIG_FILE = "proxy_pool_config.json"
PROXY_LIFETIME_MINUTES = 30  # IP有效期30分钟

class ProxyManager:
    def __init__(self):
        self.running = True
        self.proxy_timestamp = None
        self.last_check = None

    def extract_new_proxy(self):
        """提取1个新代理IP"""
        print(f"\n🔄 [{datetime.now().strftime('%H:%M:%S')}] 提取新代理IP...")
        try:
            result = subprocess.run(
                [sys.executable, "update_proxies.py"],
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode == 0:
                self.proxy_timestamp = datetime.now()
                print(f"✅ [{datetime.now().strftime('%H:%M:%S')}] 新代理提取成功")
                return True
            else:
                print(f"❌ [{datetime.now().strftime('%H:%M:%S')}] 代理提取失败: {result.stderr}")
                return False
        except Exception as e:
            print(f"❌ [{datetime.now().strftime('%H:%M:%S')}] 代理提取异常: {e}")
            return False

    def get_proxy_age(self):
        """获取当前代理的使用时长(分钟)"""
        if not self.proxy_timestamp:
            return None

        age = (datetime.now() - self.proxy_timestamp).total_seconds() / 60
        return age

    def is_proxy_expiring_soon(self):
        """检查代理是否即将失效"""
        age = self.get_proxy_age()
        if age is None:
            return True

        # 如果代理使用了超过18分钟,认为即将失效
        return age >= (PROXY_LIFETIME_MINUTES - 2)

    def monitor_and_replenish(self):
        """后台线程: 监控代理状态并自动补充"""
        print(f"🔍 [{datetime.now().strftime('%H:%M:%S')}] 代理监控线程启动")

        while self.running:
            try:
                # 每分钟检查一次
                time.sleep(60)

                if self.is_proxy_expiring_soon():
                    age = self.get_proxy_age()
                    print(f"⚠️  [{datetime.now().strftime('%H:%M:%S')}] 代理即将失效 (已使用{age:.1f}分钟)")
                    self.extract_new_proxy()
                else:
                    age = self.get_proxy_age()
                    if age is not None:
                        print(f"✅ [{datetime.now().strftime('%H:%M:%S')}] 代理正常 (已使用{age:.1f}分钟)")

            except Exception as e:
                print(f"❌ [{datetime.now().strftime('%H:%M:%S')}] 监控异常: {e}")

        print(f"🔍 [{datetime.now().strftime('%H:%M:%S')}] 代理监控线程停止")

def main():
    print("="*60)
    print("🚀 闲鱼监控任务 - 动态代理模式")
    print("="*60)
    print(f"⚙️  配置: 每{PROXY_LIFETIME_MINUTES}分钟自动更换代理IP")
    print("="*60)

    # 创建代理管理器
    proxy_manager = ProxyManager()

    # 初始提取1个代理
    print(f"\n📡 [{datetime.now().strftime('%H:%M:%S')}] 初始化: 提取第1个代理IP...")
    if not proxy_manager.extract_new_proxy():
        print("❌ 初始代理提取失败,退出")
        return

    # 启动后台监控线程
    monitor_thread = threading.Thread(
        target=proxy_manager.monitor_and_replenish,
        daemon=True
    )
    monitor_thread.start()

    # 运行爬虫任务
    print(f"\n🕷️  [{datetime.now().strftime('%H:%M:%S')}] 启动爬虫任务...")
    print("="*60)

    try:
        # 运行爬虫,代理会自动在后台补充
        result = subprocess.run(
            [sys.executable, "spider_v2.py"],
            timeout=None  # 不限制运行时间
        )

        print(f"\n✅ [{datetime.now().strftime('%H:%M:%S')}] 任务完成!")
        print(f"📊 统计: 共运行了 {(datetime.now() - proxy_manager.proxy_timestamp).total_seconds() / 60:.1f} 分钟")

    except KeyboardInterrupt:
        print(f"\n\n⚠️  [{datetime.now().strftime('%H:%M:%S')}] 用户中断")
    except Exception as e:
        print(f"\n❌ [{datetime.now().strftime('%H:%M:%S')}] 任务异常: {e}")
    finally:
        proxy_manager.running = False
        print(f"\n🔍 [{datetime.now().strftime('%H:%M:%S')}] 等待监控线程停止...")
        monitor_thread.join(timeout=5)

if __name__ == "__main__":
    main()
