# 测试指南

本项目使用 pytest 作为测试框架。以下是运行测试的指南。

## 安装依赖

在运行测试之前，请确保已安装所有开发依赖项：

```bash
pip install -r requirements.txt
```

## 运行测试

### 运行所有测试

```bash
pytest
```

### 运行特定测试文件

```bash
pytest tests/test_utils.py
```

### 运行特定测试函数

```bash
pytest tests/test_utils.py::test_safe_get
```

### 生成覆盖率报告

```bash
coverage run -m pytest
coverage report
coverage html  # 生成 HTML 报告
```

## 测试文件结构

```
tests/
├── __init__.py
├── conftest.py          # 共享测试配置和 fixtures
├── test_ai_handler.py   # ai_handler.py 模块的测试
├── test_config.py       # config.py 模块的测试
├── test_login.py        # login.py 脚本的测试
├── test_prompt_generator.py  # prompt_generator.py 脚本的测试
├── test_prompt_utils.py # prompt_utils.py 模块的测试
├── test_scraper.py      # scraper.py 模块的测试
├── test_spider_v2.py    # spider_v2.py 脚本的测试
└── test_utils.py        # utils.py 模块的测试
```

## 编写新测试

1. 在 `tests/` 目录中创建新的测试文件，文件名应以 `test_` 开头
2. 使用 `test_` 前缀命名测试函数
3. 为异步函数使用 `@pytest.mark.asyncio` 装饰器
4. 使用 `unittest.mock` 模块模拟外部依赖和副作用

## 注意事项

1. 一些测试可能需要复杂的模拟，特别是涉及 Playwright 的测试
2. 某些测试可能需要实际的网络连接或外部服务
3. 测试数据应尽可能使用模拟数据而不是真实数据