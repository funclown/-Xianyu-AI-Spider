#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
商业代理API提取脚本
支持快代理、芝麻代理、讯代理等主流服务商
支持从配置文件读取配置，支持测试模式
"""
import requests
import json
import os
import sys
import argparse
from datetime import datetime

# 设置标准输出编码为UTF-8
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')


# ==================== 配置区域 ====================

# 配置文件路径
PROXY_POOL_CONFIG_FILE = "proxy_pool_config.json"
PROXY_FILE = "proxies.json"

# 是否创建备份
CREATE_BACKUP = True

# ===================================================


def log(message):
    """打印日志"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"[{timestamp}] {message}")


def load_config():
    """从配置文件加载配置"""
    if not os.path.exists(PROXY_POOL_CONFIG_FILE):
        log(f"❌ 配置文件不存在: {PROXY_POOL_CONFIG_FILE}")
        return None

    try:
        with open(PROXY_POOL_CONFIG_FILE, 'r', encoding='utf-8') as f:
            config = json.load(f)
        return config
    except Exception as e:
        log(f"❌ 读取配置文件失败: {e}")
        return None


def backup_proxies():
    """备份当前代理列表"""
    if not os.path.exists(PROXY_FILE):
        return False

    backup_dir = "proxy_backups"
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = os.path.join(backup_dir, f"proxies_{timestamp}.json")

    try:
        import shutil
        shutil.copy2(PROXY_FILE, backup_file)
        log(f"✅ 已备份当前代理列表到: {backup_file}")
        return True
    except Exception as e:
        log(f"⚠️  备份失败: {e}")
        return False


def fetch_kuaidaili_proxies(config):
    """提取快代理"""
    params = {
        "orderid": config['orderid'],
        "num": str(config['num']),
        "protocol": config['protocol'],
        "method": "robots",
        "an_ha": "1",
        "sep": "1",
        "format": "json"
    }

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    if config.get('api_key'):
        params["signature"] = config['api_key']

    log(f"📡 正在请求快代理API...")
    response = requests.get(config['api_url'], params=params, headers=headers, timeout=30)
    response.raise_for_status()
    data = response.json()

    proxy_list = []

    if "data" in data and "proxy_list" in data["data"]:
        for proxy in data["data"]["proxy_list"]:
            proxy_url = f"http://{proxy['ip']}:{proxy['port']}"
            proxy_list.append(proxy_url)

    return proxy_list


def fetch_zhima_proxies(config):
    """提取芝麻代理"""
    params = {
        "num": str(config['num']),
        "type": config['type'],
        "pro": config['pro'],
        "city": config['city'],
        "port": config['port'],
        'mr': config['mr']
    }

    log(f"📡 正在请求芝麻代理API...")
    response = requests.get(config['api_url'], params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    proxy_list = []

    if "data" in data:
        for proxy in data["data"]:
            proxy_url = f"http://{proxy['ip']}:{proxy['port']}"
            proxy_list.append(proxy_url)

    return proxy_list


def fetch_xdaili_proxies(config):
    """提取讯代理"""
    params = {
        "num": str(config['num']),
        "sp0": config['sp0'],
        "sp1": config['sp1'],
        "ptype": config['ptype']
    }

    log(f"📡 正在请求讯代理API...")
    response = requests.get(config['api_url'], params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    proxy_list = []

    if "ERRORCODE" in data and data["ERRORCODE"] == "0":
        if "RESULT" in data:
            for proxy_line in data["RESULT"].split('\n'):
                if ':' in proxy_line:
                    proxy_url = f"http://{proxy_line}"
                    proxy_list.append(proxy_url)

    return proxy_list


def fetch_ipidea_proxies(config):
    """提取IPIDEA代理"""
    params = {
        "num": str(config['num']),
        "type": config['type'],
        "proto": config['proto'],
        "result_type": config['result_type']
    }

    log(f"📡 正在请求IPIDEA API...")
    response = requests.get(config['api_url'], params=params, timeout=30)
    response.raise_for_status()
    data = response.json()

    proxy_list = []

    if "code" in data and data["code"] == 0:
        if "data" in data:
            for proxy in data["data"]:
                proxy_url = f"http://{proxy['ip']}:{proxy['port']}"
                proxy_list.append(proxy_url)

    return proxy_list


def test_kuaidaili_connection(config):
    """测试快代理连接"""
    api_url = 'https://dps.kdlapi.com/api/getdps'

    params = {
        "secret_id": config['kuaidaili_secret_id'],
        "signature": config['kuaidaili_secret_key'],
        "sign_type": "token",
        "num": "1",
        "format": "json"
    }

    log("🔐 使用私密代理API (密钥令牌验证)")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    try:
        log(f"📡 正在测试快代理私密代理连接...")
        response = requests.get(api_url, params=params, headers=headers, timeout=10)

        if response.status_code == 200:
            try:
                data = response.json()
                code = data.get("code", -1)

                if code == 0:
                    log("✅ 快代理连接测试成功")
                    proxy_list = data.get("data", {}).get("proxy_list", [])
                    if proxy_list:
                        log(f"✅ 成功获取 {len(proxy_list)} 个代理IP")
                    return True, "连接成功，配置正确"
                else:
                    error_msg = data.get("msg", "未知错误")
                    log(f"⚠️  API返回: {error_msg}")

                    # 提供更友好的错误提示
                    error_code_map = {
                        1: "今日提取余额已用尽",
                        2: "订单提取余额已用尽",
                        3: "没有找到符合条件的代理",
                        4: "账号尚未通过实名认证",
                        -2: "订单无效。如果刚下单，请耐心等待一会儿，1分钟内订单会自动生效",
                        -3: "参数错误",
                        -5: "此订单不能提取私密代理",
                        -6: "调用此接口的IP不在您设置的IP白名单内",
                        -11: "订单尚未支付",
                        -12: "订单无效",
                        -13: "订单已过期",
                        -14: "订单被封禁，请联系客服处理",
                        -15: "订单已过期",
                        -16: "订单已退款"
                    }

                    if code in error_code_map:
                        error_msg = error_code_map[code]

                    return False, error_msg
            except json.JSONDecodeError:
                log("❌ API返回数据格式错误")
                return False, "API返回数据格式错误"
        else:
            log(f"❌ HTTP错误: {response.status_code}")
            return False, f"HTTP错误: {response.status_code}"

    except requests.exceptions.Timeout:
        log("❌ 请求超时")
        return False, "请求超时，请检查网络连接"
    except requests.exceptions.ConnectionError:
        log("❌ 网络连接失败")
        return False, "网络连接失败，请检查网络或防火墙设置"
    except requests.exceptions.RequestException as e:
        log(f"❌ 网络请求失败: {e}")
        return False, f"网络请求失败: {str(e)}"
    except Exception as e:
        log(f"❌ 测试失败: {e}")
        return False, str(e)


def fetch_kuaidaili_proxies(config):
    """提取快代理私密代理"""
    # 第一步：提取代理IP列表
    api_url = 'https://dps.kdlapi.com/api/getdps'

    params = {
        "secret_id": config['kuaidaili_secret_id'],
        "signature": config['kuaidaili_secret_key'],
        "sign_type": "token",
        "num": str(config['extract_num']),
        "format": "json"
    }

    log("🔐 使用私密代理API (密钥令牌验证)")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }

    log(f"📡 正在请求快代理私密代理API...")
    response = requests.get(api_url, params=params, headers=headers, timeout=30)
    response.raise_for_status()
    data = response.json()

    if data.get("code") != 0:
        error_msg = data.get("msg", "未知错误")
        raise Exception(f"快代理API返回错误: {error_msg}")

    # 第二步：获取代理鉴权信息（用户名密码）
    log(f"🔑 正在获取代理鉴权信息...")
    auth_url = 'https://dev.kdlapi.com/api/getproxyauthorization'

    auth_params = {
        "secret_id": config['kuaidaili_secret_id'],
        "signature": config['kuaidaili_secret_key'],
        "sign_type": "token",
        "plaintext": "1"  # 明文返回用户名密码
    }

    auth_response = requests.get(auth_url, params=auth_params, headers=headers, timeout=30)
    auth_response.raise_for_status()
    auth_data = auth_response.json()

    if auth_data.get("code") != 0:
        error_msg = auth_data.get("msg", "未知错误")
        raise Exception(f"获取代理鉴权信息失败: {error_msg}")

    # 提取用户名和密码
    auth_info = auth_data.get("data", {})
    proxy_username = auth_info.get("username")
    proxy_password = auth_info.get("password")

    if not proxy_username or not proxy_password:
        raise Exception("鉴权信息中缺少用户名或密码")

    log(f"✅ 成功获取代理鉴权信息 (用户名: {proxy_username})")

    # 第三步：构建代理列表
    proxy_list = []

    if "data" in data and "proxy_list" in data["data"]:
        for proxy_str in data["data"]["proxy_list"]:
            # 私密代理返回格式为 "ip:port" 字符串
            # 使用从GetProxyAuthorization获取的真实用户名密码
            proxy_obj = {
                "url": f"http://{proxy_username}:{proxy_password}@{proxy_str}",
                "active": True,
                "success_count": 0,
                "fail_count": 0
            }
            proxy_list.append(proxy_obj)

    return proxy_list


def fetch_proxies():
    """根据配置提取代理"""
    # 加载配置
    pool_config = load_config()
    if not pool_config:
        log("❌ 无法加载配置文件")
        return []

    # 检查是否启用
    if not pool_config.get('enabled', False):
        log("⚠️  代理池未启用")
        return []

    # 检查提供商
    provider = pool_config.get('provider', 'kuaidaili')
    if provider != 'kuaidaili':
        log(f"❌ 暂不支持的服务商: {provider}")
        return []

    # 检查订单号
    orderid = pool_config.get('kuaidaili_orderid', '')
    if not orderid:
        log("❌ 请先配置快代理订单号")
        return []

    try:
        return fetch_kuaidaili_proxies(pool_config)
    except requests.exceptions.RequestException as e:
        log(f"❌ 网络请求失败: {e}")
        return []
    except Exception as e:
        log(f"❌ 提取代理失败: {e}")
        return []


def save_proxies(proxy_list):
    """保存代理列表"""
    with open(PROXY_FILE, 'w', encoding='utf-8') as f:
        json.dump(proxy_list, f, indent=2, ensure_ascii=False)

    log(f"💾 已保存 {len(proxy_list)} 个代理到 {PROXY_FILE}")


def print_statistics(proxy_list):
    """打印统计信息"""
    # 加载配置以获取服务商名称
    config = load_config()
    provider = config.get('provider', '未知') if config else '未知'
    provider_name_map = {
        'kuaidaili': '快代理',
        'zhima': '芝麻代理',
        'xdaili': '讯代理',
        'ipidea': 'IPIDEA'
    }

    print("\n" + "="*60)
    print("📊 提取统计")
    print("="*60)
    print(f"服务商: {provider_name_map.get(provider, provider)}")
    print(f"代理总数: {len(proxy_list)}")
    print(f"协议类型: HTTP/HTTPS")
    print(f"保存位置: {os.path.abspath(PROXY_FILE)}")
    print("="*60 + "\n")


def main():
    parser = argparse.ArgumentParser(description='代理池管理工具')
    parser.add_argument('--test', action='store_true', help='测试连接模式')
    args = parser.parse_args()

    # 加载配置
    config = load_config()
    if not config:
        print("❌ 无法加载配置文件")
        sys.exit(1)

    # 测试模式
    if args.test:
        print("\n" + "="*60)
        print("🧪 代理连接测试")
        print("="*60 + "\n")

        provider = config.get('provider', 'kuaidaili')
        if provider == 'kuaidaili':
            orderid = config.get('kuaidaili_orderid', '')
            if not orderid:
                print("❌ 请先配置快代理订单号")
                sys.exit(1)

            success, message = test_kuaidaili_connection(config)
            if success:
                print(f"\n✅ {message}")
                sys.exit(0)
            else:
                print(f"\n❌ {message}")
                sys.exit(1)
        else:
            print(f"❌ 暂不支持测试服务商: {provider}")
            sys.exit(1)

    # 提取模式
    print("\n" + "="*60)
    print("🔄 商业代理自动提取工具")
    print("="*60 + "\n")

    # 检查是否启用
    if not config.get('enabled', False):
        print("⚠️  代理池未启用")
        print("💡 请在Web UI中启用代理池")
        sys.exit(1)

    # 备份旧代理
    if CREATE_BACKUP and os.path.exists(PROXY_FILE):
        backup_proxies()

    # 提取新代理
    log("开始提取商业代理...")
    proxies = fetch_proxies()

    if proxies:
        # 保存代理
        save_proxies(proxies)

        # 打印统计
        print_statistics(proxies)

        log("✅ 代理提取完成！")
        log("💡 提示：代理已保存，系统将自动使用")

    else:
        log("❌ 未能提取到任何代理")
        log("💡 请检查：")
        log("   1. 订单号是否正确")
        log("   2. 订单是否过期")
        log("   3. 账户余额是否充足")
        log("   4. 网络连接是否正常")
        sys.exit(1)


if __name__ == "__main__":
    main()
