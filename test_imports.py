#!/usr/bin/env python
"""详细导入测试 - 验证每个模块的导入"""
import sys
from importlib import import_module

# 测试每个文件中实际使用的导入
IMPORT_TESTS = [
    # web_server.py
    ('uvicorn', 'import uvicorn'),
    ('httpx', 'import httpx'),
    ('fastapi', 'from fastapi import FastAPI'),
    ('fastapi.security', 'from fastapi.security import HTTPBasic'),
    ('fastapi.responses', 'from fastapi.responses import HTMLResponse'),
    ('fastapi.staticfiles', 'from fastapi.staticfiles import StaticFiles'),
    ('fastapi.templating', 'from fastapi.templating import Jinja2Templates'),
    ('starlette.middleware.sessions', 'from starlette.middleware.sessions import SessionMiddleware'),
    ('apscheduler.schedulers.asyncio', 'from apscheduler.schedulers.asyncio import AsyncIOScheduler'),
    ('apscheduler.triggers.cron', 'from apscheduler.triggers.cron import CronTrigger'),
    ('apscheduler.triggers.interval', 'from apscheduler.triggers.interval import IntervalTrigger'),
    ('pydantic', 'from pydantic import BaseModel'),
    ('jinja2', 'import jinja2'),
    ('aiofiles', 'import aiofiles'),

    # scraper.py
    ('playwright.async_api', 'from playwright.async_api import async_playwright'),
    ('dotenv', 'from dotenv import dotenv_values'),

    # ai_handler.py
    ('requests', 'import requests'),
    ('openai', 'from openai import AsyncOpenAI'),

    # login.py
    ('PIL', 'from PIL import Image'),
    ('qrcode', 'import qrcode'),
    ('pyzbar.pyzbar', 'import pyzbar.pyzbar'),

    # proxy_pool.py
    ('aiohttp', 'import aiohttp'),

    # 测试相关
    ('pytest', 'import pytest'),
    ('pytest_asyncio', 'import pytest_asyncio'),
]

def test_import(module_path, import_statement):
    """测试单个导入"""
    try:
        import_module(module_path)
        return True, None
    except ImportError as e:
        return False, str(e)

def main():
    print("=" * 80)
    print("详细导入测试报告")
    print("=" * 80)

    failed = []
    passed = []

    for module_path, import_statement in IMPORT_TESTS:
        success, error = test_import(module_path, import_statement)

        if success:
            passed.append(module_path)
            print(f"[OK] {module_path:50s}")
        else:
            failed.append((module_path, import_statement, error))
            print(f"[FAIL] {module_path:50s}")
            print(f"       导入语句: {import_statement}")
            print(f"       错误: {error}")

    print("\n" + "=" * 80)
    print("测试结果:")
    print("=" * 80)
    print(f"通过: {len(passed)}/{len(IMPORT_TESTS)}")
    print(f"失败: {len(failed)}/{len(IMPORT_TESTS)}")

    if failed:
        print("\n[ERROR] 以下模块导入失败:")
        for module_path, import_statement, error in failed:
            print(f"\n  模块: {module_path}")
            print(f"  导入: {import_statement}")
            print(f"  错误: {error}")
        return 1
    else:
        print("\n[SUCCESS] 所有导入测试通过!")
        return 0

if __name__ == "__main__":
    sys.exit(main())
