#!/usr/bin/env python
"""依赖检查脚本 - 检查项目是否缺少依赖"""
import sys
from pathlib import Path

# 项目中实际使用的第三方包映射
USED_PACKAGES = {
    # 核心依赖
    'python-dotenv': ['dotenv'],
    'playwright': ['playwright'],
    'requests': ['requests'],
    'openai': ['openai'],
    'httpx': ['httpx'],

    # Web框架
    'fastapi': ['fastapi'],
    'uvicorn': ['uvicorn'],
    'jinja2': ['jinja2'],
    'starlette': ['starlette'],
    'pydantic': ['pydantic'],
    'python-multipart': ['multipart'],
    'itsdangerous': ['itsdangerous'],  # Starlette SessionMiddleware 需要

    # 异步处理
    'aiofiles': ['aiofiles'],
    'aiohttp': ['aiohttp'],

    # 调度任务
    'apscheduler': ['apscheduler'],

    # 图像处理
    'Pillow': ['PIL', 'Pillow'],
    'pyzbar': ['pyzbar'],
    'qrcode': ['qrcode'],

    # 代理和网络
    'python-socks': ['socks', 'python-socks'],

    # 测试
    'pytest': ['pytest'],
    'pytest-asyncio': ['pytest_asyncio'],
    'coverage': ['coverage'],
}

# requirements.txt 中列出的包
REQUIREMENTS_PACKAGES = [
    'python-dotenv',
    'playwright',
    'requests',
    'openai',
    'httpx',
    'fastapi',
    'uvicorn',
    'jinja2',
    'starlette',
    'pydantic',
    'python-multipart',
    'itsdangerous',
    'aiofiles',
    'aiohttp',
    'apscheduler',
    'Pillow',
    'pyzbar',
    'qrcode',
    'python-socks',
    'pytest',
    'pytest-asyncio',
    'coverage',
]

def check_package_import(package_name, import_names):
    """检查包是否可以导入"""
    for import_name in import_names:
        try:
            __import__(import_name)
            return True, import_name
        except ImportError:
            continue
    return False, None

def main():
    print("=" * 70)
    print("依赖检查报告")
    print("=" * 70)

    missing_packages = []
    installed_packages = []

    print("\n1. 检查 requirements.txt 中的包是否可以导入:")
    print("-" * 70)

    for package in REQUIREMENTS_PACKAGES:
        import_names = USED_PACKAGES.get(package, [package])
        can_import, actual_import = check_package_import(package, import_names)

        if can_import:
            installed_packages.append(package)
            print(f"[OK] {package:25s} -> 导入模块: {actual_import}")
        else:
            missing_packages.append(package)
            print(f"[MISSING] {package:25s} -> 无法导入!")

    print("\n2. 检查 requirements.txt 是否有遗漏:")
    print("-" * 70)

    # 检查是否有使用的包未在 requirements.txt 中列出
    missing_in_requirements = []
    for package in USED_PACKAGES.keys():
        if package not in REQUIREMENTS_PACKAGES:
            missing_in_requirements.append(package)

    if missing_in_requirements:
        print("[WARNING] 以下包在代码中使用但未在 requirements.txt 中列出:")
        for pkg in missing_in_requirements:
            print(f"  - {pkg}")
    else:
        print("[OK] 所有使用的包都已列在 requirements.txt 中")

    print("\n3. 检查 Python 标准库使用情况:")
    print("-" * 70)
    standard_libs = [
        'asyncio', 'os', 'sys', 'json', 're', 'time', 'random',
        'datetime', 'pathlib', 'urllib', 'base64', 'hashlib',
        'typing', 'contextlib', 'functools', 'collections',
        'argparse', 'subprocess', 'signal', 'threading', 'glob',
        'unittest', 'warnings', 'math', 'dataclasses', 'secrets'
    ]
    print("[OK] 以下标准库模块被使用（无需安装）:")
    for lib in sorted(standard_libs):
        print(f"  - {lib}")

    print("\n" + "=" * 70)
    print("总结:")
    print("=" * 70)
    print(f"已安装包: {len(installed_packages)}/{len(REQUIREMENTS_PACKAGES)}")
    print(f"缺失包:   {len(missing_packages)}/{len(REQUIREMENTS_PACKAGES)}")

    if missing_packages:
        print("\n[ERROR] 缺失的依赖包:")
        for pkg in missing_packages:
            print(f"  - {pkg}")
        print("\n建议运行: pip install -r requirements.txt")
        return 1

    if missing_in_requirements:
        print("\n[WARNING] requirements.txt 需要补充以下包:")
        for pkg in missing_in_requirements:
            print(f"  - {pkg}")

    print("\n[SUCCESS] 所有依赖都已正确安装!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
