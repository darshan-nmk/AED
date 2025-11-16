"""
Pipeline management endpoints
"""
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.orm_models import User, PipelineRun, RunStatus
from app.models.pydantic_schemas import (
    PipelineCreate, PipelineUpdate, PipelineResponse,
    PipelineListItem, RunTrigger, RunResponse
)
from app.utils.security import get_current_active_user
from app.services import pipeline_service
from app.services.validation import validate_pipeline
from app.tasks.worker_tasks import run_pipeline_task
from datetime import datetime

router = APIRouter()


@router.post("/", response_model=PipelineResponse, status_code=status.HTTP_201_CREATED)
async def create_pipeline(
    pipeline: PipelineCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Create a new pipeline.
    
    Requires authentication. The pipeline will be owned by the authenticated user.
    """
    db_pipeline = pipeline_service.create_pipeline(db, pipeline, current_user)
    return db_pipeline


@router.get("/", response_model=List[PipelineListItem])
async def list_pipelines(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    List all pipelines owned by the current user.
    
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return
    """
    pipelines = pipeline_service.list_pipelines(db, current_user, skip, limit)
    return pipelines


@router.get("/{pipeline_id}", response_model=PipelineResponse)
async def get_pipeline(
    pipeline_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Get a specific pipeline by ID.
    
    Only the pipeline owner can access this endpoint.
    """
    pipeline = pipeline_service.get_pipeline(db, pipeline_id, current_user)
    return pipeline


@router.put("/{pipeline_id}", response_model=PipelineResponse)
async def update_pipeline(
    pipeline_id: int,
    pipeline_update: PipelineUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Update a pipeline.
    
    Only the pipeline owner can update the pipeline.
    """
    pipeline = pipeline_service.update_pipeline(db, pipeline_id, pipeline_update, current_user)
    return pipeline


@router.delete("/{pipeline_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pipeline(
    pipeline_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Delete a pipeline.
    
    Only the pipeline owner can delete the pipeline.
    This will also delete all associated runs and logs.
    """
    pipeline_service.delete_pipeline(db, pipeline_id, current_user)
    return None


@router.post("/{pipeline_id}/runs", response_model=RunResponse, status_code=status.HTTP_202_ACCEPTED)
async def trigger_pipeline_run(
    pipeline_id: int,
    trigger_data: RunTrigger = None,
    sync: bool = False,  # Add sync execution option
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Trigger a pipeline run.
    
    - **sync=False** (default): Execute asynchronously using Celery worker
    - **sync=True**: Execute immediately in this request (for testing/demo)
    
    Use the returned run_id to check status via GET /api/v1/runs/{run_id}
    """
    # Verify pipeline exists and user has access
    pipeline = pipeline_service.get_pipeline(db, pipeline_id, current_user)
    
    # Create run record
    run = PipelineRun(
        pipeline_id=pipeline_id,
        status=RunStatus.PENDING if not sync else RunStatus.RUNNING,
        triggered_by=current_user.id,
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    
    if sync:
        # Execute synchronously (for demo/testing without Celery)
        try:
            from app.services.runner import execute_pipeline
            from datetime import datetime
            
            run.started_at = datetime.utcnow()
            run.status = RunStatus.RUNNING
            db.commit()
            
            # Execute pipeline
            output_path = execute_pipeline(pipeline.pipeline_json, run.id, db, pipeline.name)
            
            # Update run status
            run.status = RunStatus.SUCCESS
            run.finished_at = datetime.utcnow()
            run.result_location = output_path
            db.commit()
            
        except Exception as e:
            run.status = RunStatus.FAILED
            run.finished_at = datetime.utcnow()
            run.error_message = str(e)
            db.commit()
            raise HTTPException(status_code=500, detail=str(e))
    else:
        # Trigger async task (requires Celery + Redis)
        try:
            run_pipeline_task.delay(run.id, pipeline_id)
        except Exception as e:
            # If Celery is not available, fallback to sync execution
            run.status = RunStatus.RUNNING
            db.commit()
            
            try:
                from app.services.runner import execute_pipeline
                from datetime import datetime
                
                run.started_at = datetime.utcnow()
                output_path = execute_pipeline(pipeline.pipeline_json, run.id, db, pipeline.name)
                
                run.status = RunStatus.SUCCESS
                run.finished_at = datetime.utcnow()
                run.result_location = output_path
                db.commit()
                
            except Exception as exec_error:
                run.status = RunStatus.FAILED
                run.finished_at = datetime.utcnow()
                run.error_message = str(exec_error)
                db.commit()
                raise HTTPException(status_code=500, detail=str(exec_error))
    
    db.refresh(run)
    return run


@router.post("/{pipeline_id}/validate")
async def validate_pipeline_endpoint(
    pipeline_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Validate a pipeline before execution.
    
    Checks for:
    - Cycles in the DAG
    - Orphan nodes
    - Invalid configurations
    - Missing required fields
    - Schema compatibility issues
    
    Returns:
        {
            "valid": bool,
            "errors": List[str],
            "warnings": List[str]
        }
    """
    # Get pipeline
    pipeline = pipeline_service.get_pipeline(db, pipeline_id, current_user)
    
    # Validate
    is_valid, errors = validate_pipeline(pipeline.pipeline_json)
    
    return {
        "valid": is_valid,
        "errors": errors,
        "warnings": []  # Future: add warnings for best practices
    }


@router.get("/{pipeline_id}/runs", response_model=List[RunResponse])
async def list_pipeline_runs(
    pipeline_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    List all runs for a specific pipeline.
    
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return
    """
    runs = pipeline_service.get_pipeline_runs(db, pipeline_id, current_user, skip, limit)
    return runs
