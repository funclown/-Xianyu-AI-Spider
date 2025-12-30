import pytest
import asyncio
import base64
import os
import json
from unittest.mock import patch, mock_open, MagicMock, AsyncMock
from src.ai_handler import (
    safe_print,
    _download_single_image,
    download_all_images,
    cleanup_task_images,
    encode_image_to_base64,
    validate_ai_response_format,
    send_ntfy_notification,
    get_ai_analysis
)


def test_safe_print():
    """Test the safe_print function"""
    # This is a simple function that just calls print, so we'll just verify it runs
    safe_print("test message")
    assert True  # If no exception, test passes


@patch("src.ai_handler.requests.get")
@pytest.mark.asyncio
async def test_download_single_image(mock_requests_get):
    """Test the _download_single_image function"""
    # Mock response
    mock_response = MagicMock()
    mock_response.iter_content.return_value = [b"data1", b"data2"]
    mock_requests_get.return_value = mock_response
    
    # Test data
    url = "https://test.com/image.jpg"
    save_path = "/tmp/test_image.jpg"
    
    # Call function
    result = await _download_single_image(url, save_path)
    
    # Verify
    assert result == save_path
    mock_requests_get.assert_called_once_with(url, headers=MagicMock(), timeout=20, stream=True)
    mock_response.raise_for_status.assert_called_once()


@patch("src.ai_handler.os.makedirs")
@patch("src.ai_handler.os.path.exists")
@patch("src.ai_handler._download_single_image")
@pytest.mark.asyncio
async def test_download_all_images(mock_download_single, mock_exists, mock_makedirs):
    """Test the download_all_images function"""
    # Mock os.path.exists to return False (files don't exist)
    mock_exists.return_value = False
    
    # Mock _download_single_image to return successfully
    mock_download_single.return_value = "/tmp/image1.jpg"
    
    # Test data
    product_id = "12345"
    image_urls = ["https://test.com/image1.jpg", "https://test.com/image2.jpg"]
    task_name = "test_task"
    
    # Call function
    result = await download_all_images(product_id, image_urls, task_name)
    
    # Verify
    assert len(result) == 2
    assert "/tmp/image1.jpg" in result
    mock_makedirs.assert_called_once()


@patch("src.ai_handler.os.path.exists")
@patch("src.ai_handler.shutil.rmtree")
def test_cleanup_task_images(mock_rmtree, mock_exists):
    """Test the cleanup_task_images function"""
    # Mock os.path.exists to return True (directory exists)
    mock_exists.return_value = True
    
    # Test data
    task_name = "test_task"
    
    # Call function
    cleanup_task_images(task_name)
    
    # Verify
    mock_rmtree.assert_called_once()


@patch("src.ai_handler.os.path.exists")
@patch("builtins.open", new_callable=mock_open, read_data=b"test image data")
def test_encode_image_to_base64(mock_file, mock_exists):
    """Test the encode_image_to_base64 function"""
    # Mock os.path.exists to return True (file exists)
    mock_exists.return_value = True
    
    # Test data
    image_path = "/tmp/test_image.jpg"
    
    # Call function
    result = encode_image_to_base64(image_path)
    
    # Verify
    assert result is not None
    assert isinstance(result, str)
    # Should be base64 encoded "test image data"
    expected = base64.b64encode(b"test image data").decode('utf-8')
    assert result == expected


def test_validate_ai_response_format():
    """Test the validate_ai_response_format function"""
    # Test valid response
    valid_response = {
        "prompt_version": "1.0",
        "is_recommended": True,
        "reason": "test reason",
        "risk_tags": ["tag1", "tag2"],
        "criteria_analysis": {
            "model_chip": {"status": "new", "comment": "test"},
            "battery_health": {"status": "good", "comment": "test"},
            "condition": {"status": "excellent", "comment": "test"},
            "history": {"status": "clean", "comment": "test"},
            "seller_type": {
                "status": "individual",
                "persona": "test",
                "comment": "test",
                "analysis_details": {
                    "temporal_analysis": "test",
                    "selling_behavior": "test",
                    "buying_behavior": "test",
                    "behavioral_summary": "test"
                }
            },
            "shipping": {"status": "included", "comment": "test"},
            "seller_credit": {"status": "high", "comment": "test"}
        }
    }
    
    assert validate_ai_response_format(valid_response) is True
    
    # Test invalid response (missing required field)
    invalid_response = valid_response.copy()
    del invalid_response["is_recommended"]
    
    assert validate_ai_response_format(invalid_response) is False


@patch("src.ai_handler.requests.post")
@pytest.mark.asyncio
async def test_send_ntfy_notification(mock_requests_post):
    """Test the send_ntfy_notification function"""
    # Mock successful response
    mock_response = MagicMock()
    mock_response.raise_for_status.return_value = None
    mock_requests_post.return_value = mock_response
    
    # Test data
    product_data = {
        "商品标题": "Test Product",
        "当前售价": "100",
        "商品链接": "https://item.goofish.com/item.htm?id=12345"
    }
    reason = "test reason"
    
    # Call function with a mock NTFY_TOPIC_URL
    with patch("src.ai_handler.NTFY_TOPIC_URL", "https://ntfy.test.com"):
        await send_ntfy_notification(product_data, reason)
    
    # Verify
    mock_requests_post.assert_called_once()


@patch("src.ai_handler.client")
@patch("src.ai_handler.encode_image_to_base64")
@pytest.mark.asyncio
async def test_get_ai_analysis(mock_encode_image, mock_client):
    """Test the get_ai_analysis function"""
    # Mock encode_image_to_base64 to return a base64 string
    mock_encode_image.return_value = "dGVzdCBpbWFnZSBkYXRh"  # "test image data" base64 encoded
    
    # Mock AI client response
    mock_completion = AsyncMock()
    mock_completion.choices = [MagicMock()]
    mock_completion.choices[0].message.content = json.dumps({
        "prompt_version": "1.0",
        "is_recommended": True,
        "reason": "test reason",
        "risk_tags": [],
        "criteria_analysis": {
            "model_chip": {"status": "new", "comment": "test"},
            "battery_health": {"status": "good", "comment": "test"},
            "condition": {"status": "excellent", "comment": "test"},
            "history": {"status": "clean", "comment": "test"},
            "seller_type": {
                "status": "individual",
                "persona": "test",
                "comment": "test",
                "analysis_details": {
                    "temporal_analysis": "test",
                    "selling_behavior": "test",
                    "buying_behavior": "test",
                    "behavioral_summary": "test"
                }
            },
            "shipping": {"status": "included", "comment": "test"},
            "seller_credit": {"status": "high", "comment": "test"}
        }
    })
    mock_client.chat.completions.create.return_value = mock_completion
    
    # Test data
    product_data = {
        "商品信息": {
            "商品ID": "12345",
            "商品标题": "Test Product"
        }
    }
    image_paths = ["/tmp/image1.jpg"]
    prompt_text = "Test prompt"
    
    # Call function
    result = await get_ai_analysis(product_data, image_paths, prompt_text)
    
    # Verify
    assert result is not None
    assert result["is_recommended"] is True
    assert result["reason"] == "test reason"