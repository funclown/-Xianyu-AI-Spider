# Python 3.14 兼容性警告修复说明

## 问题描述

在 Python 3.14 环境下运行项目时，会出现以下警告：

```
C:\Python314\Lib\site-packages\openai\_compat.py:48: UserWarning: Core Pydantic V1 functionality isn't compatible with Python 3.14 or greater.
  from pydantic.v1.typing import (
```

## 问题原因

- **OpenAI SDK 1.65.5** 内部使用了 Pydantic V1 的 `typing` 模块
- **Python 3.14** 移除了一些旧版本的兼容性代码
- 这导致 OpenAI SDK 在导入时产生警告
- **注意**: 这只是警告，不影响实际功能

## 解决方案

在 `web_server.py` 文件开头添加警告过滤器：

```python
import warnings

# 过滤 Python 3.14 与 Pydantic V1 的兼容性警告
warnings.filterwarnings(
    "ignore",
    message="Core Pydantic V1 functionality isn't compatible with Python 3.14 or greater.",
    category=UserWarning
)
```

## 验证结果

### 修复前（stderr）:
```
C:\Python314\Lib\site-packages\openai\_compat.py:48: UserWarning: Core Pydantic V1 functionality isn't compatible with Python 3.14 or greater.
  from pydantic.v1.typing import (
INFO:     Started server process [22168]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### 修复后（stderr）:
```
INFO:     Started server process [16436]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

✅ **警告已完全消除**

## 其他解决方案（备选）

如果不想修改代码，也可以考虑以下方案：

### 方案 1: 使用 Python 3.9-3.13
```bash
# 使用 Conda 创建兼容环境
conda create -n xianyu python=3.11
conda activate xianyu
pip install -r requirements.txt
```

### 方案 2: 环境变量设置
```bash
# 设置环境变量过滤警告（Windows）
set PYTHONWARNINGS=ignore::UserWarning

# Linux/Mac
export PYTHONWARNINGS=ignore::UserWarning
```

### 方案 3: 降级 OpenAI 版本
```bash
# 使用不支持该警告的旧版本
pip install openai==1.3.7
```

## 推荐方案

✅ **推荐使用当前方案（警告过滤器）**，因为：
1. 不影响功能
2. 不改变依赖版本
3. 不需要额外环境配置
4. 代码改动最小

## 版本信息

- **Python**: 3.14.0
- **OpenAI**: 1.65.5
- **Pydantic**: 2.12.3
- **修复日期**: 2025-12-29
- **项目版本**: v2.26
