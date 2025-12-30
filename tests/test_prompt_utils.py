import pytest
import asyncio
import json
import os
from unittest.mock import patch, mock_open, MagicMock, AsyncMock
from src.prompt_utils import generate_criteria, update_config_with_new_task


@pytest.mark.asyncio
async def test_generate_criteria():
    """Test the generate_criteria function"""
    # Mock client
    with patch("src.prompt_utils.client") as mock_client:
        # Mock response
        mock_completion = AsyncMock()
        mock_completion.choices = [MagicMock()]
        mock_completion.choices[0].message.content = "Generated criteria content"
        mock_client.chat.completions.create.return_value = mock_completion
        
        # Mock reference file
        with patch("builtins.open", mock_open(read_data="Reference content")) as mock_file:
            # Test data
            user_description = "Test description"
            reference_file_path = "prompts/test_reference.txt"
            
            # Call function
            result = await generate_criteria(user_description, reference_file_path)
            
            # Verify
            assert result == "Generated criteria content"
            mock_file.assert_called_once_with(reference_file_path, 'r', encoding='utf-8')


@pytest.mark.asyncio
async def test_update_config_with_new_task():
    """Test the update_config_with_new_task function"""
    # Mock config file
    mock_config_data = [
        {
            "task_name": "existing_task",
            "enabled": True,
            "keyword": "existing"
        }
    ]
    
    # Mock file operations
    with patch("aiofiles.open") as mock_aiofiles_open:
        # Mock reading existing config
        mock_read_context = AsyncMock()
        mock_read_context.__aenter__.return_value.read.return_value = json.dumps(mock_config_data)
        mock_read_context.__aenter__.return_value.write = AsyncMock()
        
        # Mock writing updated config
        mock_write_context = AsyncMock()
        mock_write_context.__aenter__.return_value.write = AsyncMock()
        
        # Configure mock to return different contexts for read and write
        mock_aiofiles_open.side_effect = [mock_read_context, mock_write_context]
        
        with patch("src.prompt_utils.os.path.exists", return_value=True):
            # Test data
            new_task = {
                "task_name": "new_task",
                "enabled": True,
                "keyword": "new"
            }
            config_file = "config.json"
            
            # Call function
            result = await update_config_with_new_task(new_task, config_file)
            
            # Verify
            assert result is True
            # Verify that write was called with the correct data
            expected_data = mock_config_data + [new_task]
            mock_write_context.__aenter__.return_value.write.assert_called_once()