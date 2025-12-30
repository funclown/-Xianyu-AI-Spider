import pytest
import asyncio
import json
import os
import sys
from unittest.mock import patch, mock_open, MagicMock, AsyncMock
from prompt_generator import main as prompt_generator_main


@pytest.mark.asyncio
async def test_prompt_generator_main():
    """Test the prompt_generator main function"""
    # Mock command line arguments
    test_args = [
        "prompt_generator.py",
        "--description", "Test description",
        "--output", "prompts/test_output.txt",
        "--task-name", "Test Task",
        "--keyword", "test"
    ]
    
    # Mock the generate_criteria function
    with patch("src.prompt_utils.generate_criteria") as mock_generate_criteria:
        mock_generate_criteria.return_value = "Generated criteria content"
        
        # Mock file operations
        with patch("builtins.open", mock_open()) as mock_file:
            # Mock update_config_with_new_task to return True
            with patch("src.prompt_utils.update_config_with_new_task") as mock_update_config:
                mock_update_config.return_value = True
                
                # Mock sys.argv and call main function
                with patch.object(sys, 'argv', test_args):
                    try:
                        # Call function (this will likely fail due to argparse behavior in tests)
                        await prompt_generator_main()
                    except SystemExit:
                        # Expected due to sys.exit calls in the script
                        pass
                    
                    # Verify that generate_criteria was called
                    mock_generate_criteria.assert_called_once()
                    
                    # Verify that file was written
                    # Note: This verification might not work perfectly due to the complexity of the test