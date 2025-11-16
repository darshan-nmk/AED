"""
File upload and management endpoints
"""
import os
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.orm_models import User
from app.models.pydantic_schemas import FileUploadResponse, FileSampleResponse
from app.utils.security import get_current_active_user
from app.utils.file_utils import save_upload_file, analyze_dataframe, load_csv, load_excel, load_json
from app.config import settings

router = APIRouter()


@router.post("/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Upload a data file (CSV, Excel, or JSON).
    
    The file will be stored and can be used as a source in pipelines.
    Returns file metadata including ID and path.
    """
    # Save file
    file_id, file_path = await save_upload_file(file)
    
    # Get file size
    file_size = os.path.getsize(file_path)
    
    return FileUploadResponse(
        file_id=file_id,
        filename=file.filename,
        file_path=file_path,
        size=file_size,
        uploaded_at=datetime.utcnow(),
    )


@router.get("/{file_id}/sample", response_model=FileSampleResponse)
async def get_file_sample(
    file_id: str,
    rows: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get a sample of rows and column statistics from a file.
    
    Useful for previewing data and generating suggestions.
    
    - **file_id**: The file ID returned from upload
    - **rows**: Number of sample rows to return (default 10, max 100)
    """
    # Construct file path
    # Try different extensions
    file_path = None
    for ext in settings.ALLOWED_EXTENSIONS:
        potential_path = os.path.join(settings.UPLOAD_DIR, f"{file_id}{ext}")
        if os.path.exists(potential_path):
            file_path = potential_path
            break
    
    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
    
    # Load file based on extension
    ext = os.path.splitext(file_path)[1].lower()
    
    try:
        if ext == '.csv':
            df = load_csv(file_path)
        elif ext in ['.xlsx', '.xls']:
            df = load_excel(file_path)
        elif ext == '.json':
            df = load_json(file_path)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file type",
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error reading file: {str(e)}",
        )
    
    # Analyze dataframe
    analysis = analyze_dataframe(df, max_rows=rows)
    
    return FileSampleResponse(
        filename=os.path.basename(file_path),
        columns=analysis['columns'],
        sample_data=analysis['sample_data'],
        total_rows=analysis['total_rows'],
        column_stats=analysis['column_stats'],
    )


@router.get("/download/{file_path:path}")
async def download_file(
    file_path: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Download a file (output or uploaded file).
    
    - **file_path**: Relative path to the file (e.g., "outputs/123/test.csv")
    """
    # Resolve full path - check both outputs and uploads directories
    full_path = None
    
    # Try outputs directory first
    outputs_path = os.path.join(os.getcwd(), file_path)
    if os.path.exists(outputs_path) and os.path.isfile(outputs_path):
        full_path = outputs_path
    
    # Try uploads directory
    if not full_path:
        uploads_path = os.path.join(settings.UPLOAD_DIR, file_path)
        if os.path.exists(uploads_path) and os.path.isfile(uploads_path):
            full_path = uploads_path
    
    if not full_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
    
    # Security check: ensure file is within allowed directories
    real_path = os.path.realpath(full_path)
    allowed_dirs = [
        os.path.realpath(settings.UPLOAD_DIR),
        os.path.realpath(os.path.join(os.getcwd(), "outputs")),
    ]
    
    if not any(real_path.startswith(allowed_dir) for allowed_dir in allowed_dirs):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    
    # Get filename for download
    filename = os.path.basename(full_path)
    
    return FileResponse(
        path=full_path,
        filename=filename,
        media_type='application/octet-stream',
    )
