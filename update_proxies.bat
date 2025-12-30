@echo off
chcp 65001 >nul
echo ====================================
echo 商业代理自动提取工具
echo ====================================
echo.

cd /d "%~dp0"
python update_proxies.py

echo.
echo 按任意键退出...
pause >nul
