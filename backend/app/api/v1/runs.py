"""
Run management endpoints
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.orm_models import User, PipelineRun, RunLog, Pipeline
from app.models.pydantic_schemas import RunResponse, RunDetailResponse, RunLogResponse
from app.utils.security import get_current_active_user

router = APIRouter()


@router.get("/", response_model=List[RunResponse])
async def list_all_runs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    List all runs for the current user across all pipelines.
    
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return
    """
    # Get all pipelines owned by user
    user_pipelines = db.query(Pipeline).filter(Pipeline.owner_id == current_user.id).all()
    pipeline_ids = [p.id for p in user_pipelines]
    
    # Get runs for those pipelines
    runs = (
        db.query(PipelineRun)
        .filter(PipelineRun.pipeline_id.in_(pipeline_ids))
        .order_by(PipelineRun.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return runs


@router.get("/{run_id}", response_model=RunDetailResponse)
async def get_run(
    run_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a specific run, including logs.
    
    Only the pipeline owner can access run details.
    """
    # Get run
    run = db.query(PipelineRun).filter(PipelineRun.id == run_id).first()
    
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Run not found",
        )
    
    # Check ownership via pipeline
    pipeline = db.query(Pipeline).filter(Pipeline.id == run.pipeline_id).first()
    if pipeline.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this run",
        )
    
    # Get logs
    logs = db.query(RunLog).filter(RunLog.run_id == run_id).order_by(RunLog.created_at).all()
    
    # Build response
    response = RunDetailResponse(
        id=run.id,
        pipeline_id=run.pipeline_id,
        status=run.status,
        started_at=run.started_at,
        finished_at=run.finished_at,
        result_location=run.result_location,
        triggered_by=run.triggered_by,
        error_message=run.error_message,
        created_at=run.created_at,
        logs=logs,
        pipeline_name=pipeline.name,
    )
    
    return response


@router.delete("/{run_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_run(
    run_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Delete a run and its logs.
    
    Only the pipeline owner can delete runs.
    """
    # Get run
    run = db.query(PipelineRun).filter(PipelineRun.id == run_id).first()
    
    if not run:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Run not found",
        )
    
    # Check ownership via pipeline
    pipeline = db.query(Pipeline).filter(Pipeline.id == run.pipeline_id).first()
    if pipeline.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this run",
        )
    
    db.delete(run)
    db.commit()
    
    return None
