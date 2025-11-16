"""
Tests for file utility functions
"""
import pytest
import os
from app.utils.file_utils import sanitize_filename, sanitize_path
from fastapi import HTTPException


def test_sanitize_filename():
    """Test filename sanitization"""
    assert sanitize_filename("normal_file.csv") == "normal_file.csv"
    assert sanitize_filename("../../../etc/passwd") == "passwd"
    assert sanitize_filename("file with spaces.csv") == "file_with_spaces.csv"
    assert sanitize_filename("file@#$%special.csv") == "file____special.csv"


def test_sanitize_path_valid(tmp_path):
    """Test path sanitization with valid path"""
    base_dir = str(tmp_path)
    safe_file = os.path.join(base_dir, "test.csv")
    
    result = sanitize_path(safe_file, base_dir)
    assert result == safe_file


def test_sanitize_path_traversal(tmp_path):
    """Test path sanitization prevents directory traversal"""
    base_dir = str(tmp_path)
    malicious_path = os.path.join(base_dir, "../../../etc/passwd")
    
    with pytest.raises(HTTPException) as exc_info:
        sanitize_path(malicious_path, base_dir)
    
    assert exc_info.value.status_code == 400
    assert "traversal" in str(exc_info.value.detail).lower()
