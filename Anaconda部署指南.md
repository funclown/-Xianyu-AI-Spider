# Anaconda 部署指南

本文档介绍如何使用Anaconda部署闲鱼智能监控机器人项目。

## 前置要求

- 已安装 Anaconda 或 Miniconda
- Python 3.8 或更高版本
- Windows 操作系统

## 部署步骤

### 1. 创建并激活 Conda 环境

```bash
# 创建名为 xianyu 的虚拟环境，指定 Python 版本
conda create -n xianyu python=3.11 -y

# 激活环境
conda activate xianyu
```

### 2. 安装项目依赖

```bash
# 进入项目目录
cd "C:\Users\Administrator\Desktop\闲鱼修改 备份（2）"

# 安装所有依赖包
pip install -r requirements.txt
```

### 3. 安装 Playwright 浏览器

```bash
# 安装 Playwright 浏览器驱动
playwright install chromium

# 如果需要安装 Edge 浏览器（可选）
playwright install msedge
```

### 4. 配置环境变量

复制并编辑 `.env` 文件：

```bash
# 复制示例配置文件（如果存在）
copy .env.example .env

# 或直接创建新的 .env 文件
notepad .env
```

**必需的配置项：**

```env
# AI 模型配置
AI_API_KEY=your_api_key_here
AI_BASE_URL=https://api.openai.com/v1  # 或兼容的API地址
MODEL_NAME=gpt-4-vision-preview  # 或其他支持视觉的模型

# Web 管理界面认证
WEB_USERNAME=admin
WEB_PASSWORD=admin123

# 浏览器配置
RUN_HEADLESS=true  # true=无头模式, false=有头模式
LOGIN_IS_EDGE=false  # true=使用Edge, false=使用Chrome

# 通知配置（可选）
NTFY_TOPIC=your_ntfy_topic
WX_BOT_URL=your_wechat_bot_url
```

### 5. 初始化闲鱼登录状态

**方法一：使用 Chrome 扩展（推荐）**

1. 安装 Chrome 扩展：[闲鱼登录状态提取扩展](https://chromewebstore.google.com/detail/xianyu-login-state-extrac/eidlpfjiodpigmfcahkmlenhppfklcoa)
2. 登录 [闲鱼官网](https://www.goofish.com)
3. 点击扩展图标，提取登录状态
4. 启动 Web 服务器（见下一步）
5. 在浏览器中打开 `http://127.0.0.1:8000`
6. 点击"已登录"按钮 → "手动更新Cookie"，粘贴提取的内容

**方法二：使用登录脚本**

```bash
# 确保已激活环境
conda activate xianyu

# 运行登录脚本（需要手动扫码）
python login.py
```

### 6. 启动 Web 管理界面

```bash
# 确保已激活环境
conda activate xianyu

# 启动 Web 服务器
python web_server.py
```

服务器启动后，在浏览器中访问：`http://127.0.0.1:8000`

### 7. 创建监控任务

1. 在 Web 界面中登录（使用 `.env` 中配置的用户名和密码）
2. 点击"创建新任务"
3. 填写任务信息：
   - 任务名称
   - 搜索关键词
   - 价格范围（可选）
   - 详细购买需求
4. 保存任务并运行

## 常用命令

### 环境管理

```bash
# 激活环境
conda activate xianyu

# 退出环境
conda deactivate

# 查看已安装的包
conda list

# 更新环境（基于 requirements.txt）
pip install -r requirements.txt --upgrade
```

### 运行项目

```bash
# 启动 Web 服务器
python web_server.py

# 运行单个任务
python spider_v2.py --task-id your_task_id

# 手动登录
python login.py
```

### 测试

```bash
# 运行所有测试
pytest

# 运行特定测试文件
pytest tests/test_config.py

# 查看测试覆盖率
pytest --cov=src tests/
```

## 导出和分享环境

### 导出环境配置

```bash
# 导出为 YAML 文件（推荐）
conda env export > environment.yml

# 或导出为 requirements.txt
pip freeze > requirements_freeze.txt
```

### 从环境文件创建环境

```bash
# 从 environment.yml 创建
conda env create -f environment.yml

# 更新现有环境
conda env update -f environment.yml --prune
```

## 常见问题

### Q1: Playwright 浏览器下载失败

**解决方案：**

```bash
# 设置国内镜像
set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright/

# 重新安装
playwright install chromium
```

### Q2: 依赖安装冲突

**解决方案：**

```bash
# 使用 conda 安装关键依赖
conda install -c conda-forge playwright python-dotenv requests

# 然后用 pip 安装其余依赖
pip install -r requirements.txt
```

### Q3: 运行时提示模块找不到

**解决方案：**

```bash
# 确保在项目根目录
cd "C:\Users\Administrator\Desktop\闲鱼修改 备份（2）"

# 确保环境已激活
conda activate xianyu

# 重新安装依赖
pip install -e .
```

### Q4: 浏览器无法启动

**解决方案：**

```bash
# 检查浏览器是否安装
playwright install --force chromium

# 如果在 Docker 中运行，需要安装系统依赖
# 参考 Docker 部署文档
```

## Docker 部署（可选）

如果要在 Docker 中部署，请参考项目根目录的 `docker-compose.yml` 文件。

```bash
# 构建并启动
docker-compose up --build -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 性能优化建议

### 1. 使用 SSD 存放数据

将 `jsonl/` 和 `images/` 目录放在 SSD 上以提升 I/O 性能。

### 2. 配置代理池

如果需要频繁爬取，配置代理池以避免 IP 封禁。

### 3. 调整并发数

在 `.env` 中配置合适的并发参数：

```env
MAX_CONCURRENT_TASKS=3  # 最大并发任务数
```

## 安全建议

1. **不要将 `.env` 文件提交到版本控制**
2. **使用强密码保护 Web 界面**
3. **定期更新依赖包**：`pip install --upgrade -r requirements.txt`
4. **使用防火墙限制端口访问**

## 更新和维护

### 更新项目代码

```bash
# 拉取最新代码（如果使用 Git）
git pull origin main

# 或手动替换文件后，更新依赖
pip install -r requirements.txt --upgrade
```

### 清理缓存

```bash
# 清理 pip 缓存
pip cache purge

# 清理 conda 缓存
conda clean --all
```

## 技术支持

如遇到问题，请检查：
1. `.env` 配置是否正确
2. 所有依赖是否正确安装
3. Playwright 浏览器是否安装
4. 网络连接是否正常
5. 防火墙和杀毒软件设置

---

**祝您使用愉快！** 🎉
