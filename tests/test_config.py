import pytest
import asyncio
from unittest.mock import patch, mock_open, MagicMock
from src.config import (
    STATE_FILE,
    IMAGE_SAVE_DIR,
    TASK_IMAGE_DIR_PREFIX,
    API_URL_PATTERN,
    DETAIL_API_URL_PATTERN,
    API_KEY,
    BASE_URL,
    MODEL_NAME,
    PROXY_URL,
    NTFY_TOPIC_URL,
    PCURL_TO_MOBILE,
    RUN_HEADLESS,
    LOGIN_IS_EDGE,
    RUNNING_IN_DOCKER,
    AI_DEBUG_MODE,
    IMAGE_DOWNLOAD_HEADERS
)


def test_config_constants():
    """Test that config constants are properly defined"""
    # Test file paths
    assert STATE_FILE == "xianyu_state.json"
    assert IMAGE_SAVE_DIR == "images"
    assert TASK_IMAGE_DIR_PREFIX == "task_images_"
    
    # Test API URL patterns
    assert API_URL_PATTERN == "h5api.m.goofish.com/h5/mtop.taobao.idlemtopsearch.pc.search"
    assert DETAIL_API_URL_PATTERN == "h5api.m.goofish.com/h5/mtop.taobao.idle.pc.detail"
    
    # Test headers
    assert "User-Agent" in IMAGE_DOWNLOAD_HEADERS
    assert "Accept" in IMAGE_DOWNLOAD_HEADERS
    assert "Accept-Language" in IMAGE_DOWNLOAD_HEADERS


@patch("src.config.os.getenv")
def test_config_environment_variables(mock_getenv):
    """Test that environment variables are properly handled"""
    # Mock environment variables
    mock_getenv.side_effect = lambda key, default=None: {
        "OPENAI_API_KEY": "test_key",
        "OPENAI_BASE_URL": "https://api.test.com",
        "OPENAI_MODEL_NAME": "test_model",
        "PROXY_URL": "http://proxy.test.com",
        "NTFY_TOPIC_URL": "https://ntfy.test.com",
        "PCURL_TO_MOBILE": "true",
        "RUN_HEADLESS": "false",
        "LOGIN_IS_EDGE": "true",
        "RUNNING_IN_DOCKER": "false",
        "AI_DEBUG_MODE": "true"
    }.get(key, default)
    
    # Reimport config to pick up mocked values
    import importlib
    import src.config
    importlib.reload(src.config)
    
    # Test values
    assert src.config.API_KEY == "test_key"
    assert src.config.BASE_URL == "https://api.test.com"
    assert src.config.MODEL_NAME == "test_model"
    assert src.config.PROXY_URL == "http://proxy.test.com"
    assert src.config.NTFY_TOPIC_URL == "https://ntfy.test.com"
    assert src.config.PCURL_TO_MOBILE is True
    assert src.config.RUN_HEADLESS is True  # Inverted logic in config
    assert src.config.LOGIN_IS_EDGE is True
    assert src.config.RUNNING_IN_DOCKER is False
    assert src.config.AI_DEBUG_MODE is True


@patch("src.config.os.getenv")
@patch("src.config.AsyncOpenAI")
def test_client_initialization(mock_async_openai, mock_getenv):
    """Test that the AI client is properly initialized"""
    # Mock environment variables
    mock_getenv.side_effect = lambda key, default=None: {
        "OPENAI_API_KEY": "test_key",
        "OPENAI_BASE_URL": "https://api.test.com",
        "OPENAI_MODEL_NAME": "test_model",
        "PROXY_URL": None
    }.get(key, default)
    
    # Reimport config to pick up mocked values
    import importlib
    import src.config
    importlib.reload(src.config)
    
    # Verify client was created
    mock_async_openai.assert_called_once_with(api_key="test_key", base_url="https://api.test.com")


@patch("src.config.os.getenv")
def test_client_initialization_missing_config(mock_getenv):
    """Test that client is None when config is missing"""
    # Mock environment variables with missing values
    mock_getenv.side_effect = lambda key, default=None: {
        "OPENAI_API_KEY": "test_key",
        "OPENAI_BASE_URL": None,  # Missing
        "OPENAI_MODEL_NAME": "test_model",
        "PROXY_URL": None
    }.get(key, default)
    
    # Reimport config to pick up mocked values
    import importlib
    import src.config
    importlib.reload(src.config)
    
    # Verify client is None
    assert src.config.client is None