import os
import uuid
import mimetypes
from pathlib import Path
from typing import Optional, BinaryIO
from datetime import datetime
from fastapi import UploadFile, HTTPException, status
import pandas as pd
from app.config import settings


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to prevent directory traversal and other attacks.
    Returns a safe filename.
    """
    # Remove path components
    filename = os.path.basename(filename)
    
    # Remove any characters that aren't alphanumeric, dash, underscore, or dot
    safe_chars = []
    for char in filename:
        if char.isalnum() or char in ['-', '_', '.']:
            safe_chars.append(char)
        else:
            safe_chars.append('_')
    
    return ''.join(safe_chars)


def sanitize_path(file_path: str, base_dir: Optional[str] = None) -> str:
    """
    Sanitize file path to prevent directory traversal attacks.
    Ensures the path is within the allowed base directory.
    """
    if base_dir is None:
        base_dir = settings.UPLOAD_DIR
    
    # Resolve to absolute path
    base_path = Path(base_dir).resolve()
    requested_path = Path(file_path).resolve()
    
    # Check if the requested path is within base directory
    try:
        requested_path.relative_to(base_path)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path: directory traversal detected",
        )
    
    return str(requested_path)


def validate_file_extension(filename: str, allowed_extensions: Optional[list] = None) -> bool:
    """Validate file extension against allowed list"""
    if allowed_extensions is None:
        allowed_extensions = settings.ALLOWED_EXTENSIONS
    
    file_ext = os.path.splitext(filename)[1].lower()
    return file_ext in allowed_extensions


def validate_file_size(file: UploadFile, max_size_mb: Optional[int] = None) -> bool:
    """Validate file size"""
    if max_size_mb is None:
        max_size_mb = settings.MAX_UPLOAD_SIZE_MB
    
    # Try to get file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning
    
    max_size_bytes = max_size_mb * 1024 * 1024
    return file_size <= max_size_bytes


async def save_upload_file(file: UploadFile) -> tuple[str, str]:
    """
    Save an uploaded file and return (file_id, file_path).
    Includes validation for extension and size.
    """
    # Validate extension
    if not validate_file_extension(file.filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {settings.ALLOWED_EXTENSIONS}",
        )
    
    # Validate size
    if not validate_file_size(file):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE_MB}MB",
        )
    
    # Generate unique file ID and sanitize filename
    file_id = str(uuid.uuid4())
    safe_filename = sanitize_filename(file.filename)
    file_ext = os.path.splitext(safe_filename)[1]
    new_filename = f"{file_id}{file_ext}"
    
    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Create full path
    file_path = os.path.join(settings.UPLOAD_DIR, new_filename)
    
    # Save file
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    return file_id, file_path


def load_csv(file_path: str, delimiter: str = ',', encoding: str = 'utf-8', **kwargs) -> pd.DataFrame:
    """
    Safely load a CSV file with validation.
    """
    # Sanitize path
    safe_path = sanitize_path(file_path, settings.UPLOAD_DIR)
    
    if not os.path.exists(safe_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {file_path}",
        )
    
    try:
        df = pd.read_csv(safe_path, delimiter=delimiter, encoding=encoding, **kwargs)
        return df
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading CSV file: {str(e)}",
        )


def load_excel(file_path: str, sheet_name: int | str = 0, **kwargs) -> pd.DataFrame:
    """
    Safely load an Excel file with validation.
    """
    # Sanitize path
    safe_path = sanitize_path(file_path, settings.UPLOAD_DIR)
    
    if not os.path.exists(safe_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {file_path}",
        )
    
    try:
        df = pd.read_excel(safe_path, sheet_name=sheet_name, **kwargs)
        return df
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading Excel file: {str(e)}",
        )


def load_json(file_path: str, **kwargs) -> pd.DataFrame:
    """
    Safely load a JSON file with validation.
    """
    # Sanitize path
    safe_path = sanitize_path(file_path, settings.UPLOAD_DIR)
    
    if not os.path.exists(safe_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {file_path}",
        )
    
    try:
        df = pd.read_json(safe_path, **kwargs)
        return df
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading JSON file: {str(e)}",
        )


def write_csv(df: pd.DataFrame, output_path: str, **kwargs) -> str:
    """
    Write DataFrame to CSV file safely.
    Returns the full output path.
    """
    # Ensure output is in OUTPUT_DIR
    filename = os.path.basename(output_path)
    safe_filename = sanitize_filename(filename)
    full_path = os.path.join(settings.OUTPUT_DIR, safe_filename)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    
    try:
        df.to_csv(full_path, index=False, **kwargs)
        return full_path
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error writing CSV file: {str(e)}",
        )


def write_excel(df: pd.DataFrame, output_path: str, **kwargs) -> str:
    """
    Write DataFrame to Excel file safely.
    Returns the full output path.
    """
    # Ensure output is in OUTPUT_DIR
    filename = os.path.basename(output_path)
    safe_filename = sanitize_filename(filename)
    full_path = os.path.join(settings.OUTPUT_DIR, safe_filename)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    
    try:
        df.to_excel(full_path, index=False, **kwargs)
        return full_path
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error writing Excel file: {str(e)}",
        )


def write_json(df: pd.DataFrame, output_path: str, **kwargs) -> str:
    """
    Write DataFrame to JSON file safely.
    Returns the full output path.
    """
    # Ensure output is in OUTPUT_DIR
    filename = os.path.basename(output_path)
    safe_filename = sanitize_filename(filename)
    full_path = os.path.join(settings.OUTPUT_DIR, safe_filename)
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    
    try:
        df.to_json(full_path, orient='records', **kwargs)
        return full_path
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error writing JSON file: {str(e)}",
        )


def get_file_info(file_path: str) -> dict:
    """Get file information"""
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
    
    stat = os.stat(file_path)
    return {
        "size": stat.st_size,
        "created": datetime.fromtimestamp(stat.st_ctime),
        "modified": datetime.fromtimestamp(stat.st_mtime),
    }


def analyze_dataframe(df: pd.DataFrame, max_rows: int = 10) -> dict:
    """
    Analyze a DataFrame and return statistics useful for suggestions.
    """
    column_stats = {}
    total_rows = len(df)
    
    for col in df.columns:
        stats = {
            "dtype": str(df[col].dtype),
            "null_count": int(df[col].isnull().sum()),
            "null_percent": float(df[col].isnull().sum() / len(df) * 100),
            "unique_count": int(df[col].nunique()),
            "total_rows": total_rows,
            "sample_values": df[col].dropna().head(5).tolist(),
        }
        
        # Add numeric stats if applicable
        if pd.api.types.is_numeric_dtype(df[col]):
            stats.update({
                "min": float(df[col].min()) if not df[col].isnull().all() else None,
                "max": float(df[col].max()) if not df[col].isnull().all() else None,
                "mean": float(df[col].mean()) if not df[col].isnull().all() else None,
                "median": float(df[col].median()) if not df[col].isnull().all() else None,
            })
        
        column_stats[col] = stats
    
    return {
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "columns": list(df.columns),
        "column_stats": column_stats,
        "sample_data": df.head(max_rows).to_dict('records'),
    }
