@echo off
chcp 65001 >nul
echo ========================================
echo  闲鱼智能监控机器人 - Anaconda 快速部署
echo ========================================
echo.

REM 检查 conda 是否可用
where conda >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 未找到 conda 命令！
    echo 请确保已安装 Anaconda 或 Miniconda
    pause
    exit /b 1
)

echo [1/5] 创建 conda 环境...
conda env create -f environment.yml
if %ERRORLEVEL% NEQ 0 (
    echo [错误] 创建环境失败！
    echo 可能是 environment.yml 文件不存在或格式错误
    pause
    exit /b 1
)

echo.
echo [2/5] 激活环境...
call conda activate xianyu

echo.
echo [3/5] 安装 Playwright 浏览器...
playwright install chromium
if %ERRORLEVEL% NEQ 0 (
    echo [警告] Playwright 浏览器安装失败，请手动运行: playwright install chromium
)

echo.
echo [4/5] 检查配置文件...
if not exist .env (
    echo [提示] 未找到 .env 文件
    echo 请创建 .env 文件并配置以下必需项：
    echo   - AI_API_KEY
    echo   - AI_BASE_URL
    echo   - MODEL_NAME
    echo   - WEB_USERNAME
    echo   - WEB_PASSWORD
    echo.
    choice /C YN /M "是否现在创建 .env 文件"
    if %ERRORLEVEL% EQU 1 (
        notepad .env
    )
) else (
    echo [OK] 找到 .env 配置文件
)

echo.
echo [5/5] 部署完成！
echo.
echo ========================================
echo  后续步骤：
echo ========================================
echo.
echo 1. 检查并编辑 .env 文件，配置 API 密钥等信息
echo.
echo 2. 初始化闲鱼登录状态（二选一）：
echo    方法A: 使用 Chrome 扩展提取登录状态
echo           扩展地址: https://chromewebstore.google.com/detail/xianyu-login-state-extrac/eidlpfjiodpigmfcahkmlenhppfklcoa
echo    方法B: 运行登录脚本手动扫码
echo           命令: conda activate xianyu ^&^& python login.py
echo.
echo 3. 启动 Web 管理界面：
echo           命令: conda activate xianyu ^&^& python web_server.py
echo.
echo 4. 浏览器访问: http://127.0.0.1:8000
echo.
echo ========================================
echo.

choice /C YN /M "是否现在启动 Web 服务器"
if %ERRORLEVEL% EQU 1 (
    echo.
    echo 启动 Web 服务器...
    python web_server.py
) else (
    echo.
    echo 稍后可以手动启动，运行以下命令：
    echo   conda activate xianyu
    echo   python web_server.py
    echo.
)

pause
