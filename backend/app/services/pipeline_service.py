"""
Pipeline service for business logic related to pipelines
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from fastapi import HTTPException, status
from app.models.orm_models import Pipeline, User, PipelineRun, RunStatus
from app.models.pydantic_schemas import (
    PipelineCreate, PipelineUpdate, PipelineResponse, 
    PipelineListItem
)


def create_pipeline(db: Session, pipeline: PipelineCreate, owner: User) -> Pipeline:
    """Create a new pipeline"""
    # Build pipeline JSON
    pipeline_json = {
        "nodes": [node.model_dump() for node in pipeline.nodes],
        "edges": [edge.model_dump(by_alias=True) for edge in pipeline.edges],
    }
    
    db_pipeline = Pipeline(
        name=pipeline.name,
        description=pipeline.description,
        owner_id=owner.id,
        pipeline_json=pipeline_json,
    )
    
    db.add(db_pipeline)
    db.commit()
    db.refresh(db_pipeline)
    
    return db_pipeline


def get_pipeline(db: Session, pipeline_id: int, user: User) -> Pipeline:
    """Get a pipeline by ID with ownership check"""
    pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
    
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )
    
    # Check ownership
    if pipeline.owner_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this pipeline",
        )
    
    return pipeline


def list_pipelines(db: Session, user: User, skip: int = 0, limit: int = 20) -> List[Pipeline]:
    """List all pipelines for a user"""
    pipelines = (
        db.query(Pipeline)
        .filter(Pipeline.owner_id == user.id)
        .order_by(desc(Pipeline.updated_at))
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    # Enrich with last run info
    result = []
    for pipeline in pipelines:
        # Get last run
        last_run = (
            db.query(PipelineRun)
            .filter(PipelineRun.pipeline_id == pipeline.id)
            .order_by(desc(PipelineRun.created_at))
            .first()
        )
        
        pipeline_dict = {
            "id": pipeline.id,
            "name": pipeline.name,
            "description": pipeline.description,
            "owner_id": pipeline.owner_id,
            "created_at": pipeline.created_at,
            "updated_at": pipeline.updated_at,
            "last_run_status": last_run.status if last_run else None,
            "last_run_at": last_run.started_at if last_run else None,
        }
        result.append(pipeline_dict)
    
    return result


def update_pipeline(db: Session, pipeline_id: int, pipeline_update: PipelineUpdate, 
                   user: User) -> Pipeline:
    """Update a pipeline"""
    from datetime import datetime
    
    # Get and verify ownership
    db_pipeline = get_pipeline(db, pipeline_id, user)
    
    # Update fields
    if pipeline_update.name is not None:
        db_pipeline.name = pipeline_update.name
    
    if pipeline_update.description is not None:
        db_pipeline.description = pipeline_update.description
    
    if pipeline_update.nodes is not None or pipeline_update.edges is not None:
        # Rebuild pipeline JSON - create new dict to trigger SQLAlchemy change detection
        pipeline_json = {
            'nodes': [node.model_dump() for node in pipeline_update.nodes] if pipeline_update.nodes is not None else db_pipeline.pipeline_json.get('nodes', []),
            'edges': [edge.model_dump(by_alias=True) for edge in pipeline_update.edges] if pipeline_update.edges is not None else db_pipeline.pipeline_json.get('edges', [])
        }
        db_pipeline.pipeline_json = pipeline_json
    
    # Explicitly update timestamp to ensure it changes
    db_pipeline.updated_at = datetime.utcnow()
    
    # Mark as modified for SQLAlchemy
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(db_pipeline, 'pipeline_json')
    
    db.commit()
    db.refresh(db_pipeline)
    
    return db_pipeline


def delete_pipeline(db: Session, pipeline_id: int, user: User) -> None:
    """Delete a pipeline"""
    # Get and verify ownership
    db_pipeline = get_pipeline(db, pipeline_id, user)
    
    db.delete(db_pipeline)
    db.commit()


def get_pipeline_runs(db: Session, pipeline_id: int, user: User, 
                     skip: int = 0, limit: int = 20) -> List[PipelineRun]:
    """Get all runs for a pipeline"""
    # Verify ownership
    get_pipeline(db, pipeline_id, user)
    
    runs = (
        db.query(PipelineRun)
        .filter(PipelineRun.pipeline_id == pipeline_id)
        .order_by(desc(PipelineRun.created_at))
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return runs
