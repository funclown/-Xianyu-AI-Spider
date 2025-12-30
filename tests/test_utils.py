import pytest
import json
import os
from unittest.mock import patch, mock_open
from src.utils import (
    safe_get,
    get_link_unique_key,
    format_registration_days,
    random_sleep,
    save_to_jsonl,
    convert_goofish_link,
    retry_on_failure
)


def test_safe_get():
    """Test the safe_get function with various inputs"""
    test_data = {
        "level1": {
            "level2": {
                "value": "found"
            }
        }
    }
    
    # Test successful retrieval
    assert safe_get(test_data, 'level1', 'level2', 'value') == "found"
    
    # Test default value when key not found
    assert safe_get(test_data, 'level1', 'missing', default="default") == "default"
    
    # Test None when no default specified and key not found
    assert safe_get(test_data, 'level1', 'missing') is None


def test_get_link_unique_key():
    """Test the get_link_unique_key function"""
    # Test with valid URL
    url = "https://item.goofish.com/item.htm?id=12345&other=param"
    assert get_link_unique_key(url) == "12345"
    
    # Test with URL without id parameter
    url = "https://item.goofish.com/item.htm?other=param"
    assert get_link_unique_key(url) == url


def test_format_registration_days():
    """Test the format_registration_days function"""
    # Test with valid days
    assert format_registration_days(365) == "1年"
    assert format_registration_days(30) == "1个月"
    assert format_registration_days(1) == "1天"
    assert format_registration_days(0) == "未知"
    assert format_registration_days(400) == "1年1个月"


def test_convert_goofish_link():
    """Test the convert_goofish_link function"""
    # Test with PC link
    pc_link = "https://item.goofish.com/item.htm?id=12345"
    mobile_link = "https://m.goofish.com/item.htm?id=12345"
    assert convert_goofish_link(pc_link) == mobile_link
    
    # Test with already mobile link
    assert convert_goofish_link(mobile_link) == mobile_link
    
    # Test with non-goofish link
    other_link = "https://other.com/item.htm?id=12345"
    assert convert_goofish_link(other_link) == other_link


@patch("src.utils.asyncio.sleep")
async def test_random_sleep(mock_sleep):
    """Test the random_sleep function"""
    # Mock sleep to avoid actual delay
    mock_sleep.return_value = None
    
    # Test that function calls sleep
    await random_sleep(0.001, 0.002)
    assert mock_sleep.called


@patch("builtins.open", new_callable=mock_open)
@patch("src.utils.os.makedirs")
def test_save_to_jsonl(mock_makedirs, mock_file):
    """Test the save_to_jsonl function"""
    # Test data
    test_data = {"key": "value"}
    keyword = "test_keyword"
    
    # Call function
    save_to_jsonl(test_data, keyword)
    
    # Verify directories are created
    mock_makedirs.assert_called_once_with("jsonl", exist_ok=True)
    
    # Verify file is written
    mock_file.assert_called_once_with(os.path.join("jsonl", "test_keyword_full_data.jsonl"), "a", encoding="utf-8")


def test_retry_on_failure():
    """Test the retry_on_failure decorator"""
    attempts = 0
    
    @retry_on_failure(retries=2, delay=0.001)
    def failing_function():
        nonlocal attempts
        attempts += 1
        if attempts < 2:
            raise Exception("Intentional failure")
        return "success"
    
    # Should succeed on second attempt
    result = failing_function()
    assert result == "success"
    assert attempts == 2
    
    # Reset for next test
    attempts = 0
    
    @retry_on_failure(retries=1, delay=0.001)
    def always_failing_function():
        nonlocal attempts
        attempts += 1
        raise Exception("Always fails")
    
    # Should fail after retries
    with pytest.raises(Exception, match="Always fails"):
        always_failing_function()
    assert attempts == 2