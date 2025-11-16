"""
Celery worker tasks for async ETL execution
"""
from datetime import datetime
from celery import Task
from app.tasks.celery_app import cel
from app.db.session import SessionLocal
from app.models.orm_models import Pipeline, PipelineRun, RunStatus, RunLog, LogLevel
from app.services.runner import execute_pipeline


class DatabaseTask(Task):
    """Base task with database session management"""
    _db = None

    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None


@cel.task(bind=True, base=DatabaseTask, name='app.tasks.run_pipeline_task')
def run_pipeline_task(self, run_id: int, pipeline_id: int):
    """
    Execute a pipeline asynchronously.
    
    Args:
        run_id: ID of the pipeline run
        pipeline_id: ID of the pipeline to execute
    """
    db = self.db
    
    try:
        # Update run status to RUNNING
        run = db.query(PipelineRun).filter(PipelineRun.id == run_id).first()
        if not run:
            raise ValueError(f"Run {run_id} not found")
        
        run.status = RunStatus.RUNNING
        run.started_at = datetime.utcnow()
        db.commit()
        
        # Get pipeline
        pipeline = db.query(Pipeline).filter(Pipeline.id == pipeline_id).first()
        if not pipeline:
            raise ValueError(f"Pipeline {pipeline_id} not found")
        
        # Log start
        start_log = RunLog(
            run_id=run_id,
            node_id=None,
            level=LogLevel.INFO,
            message=f"Starting pipeline execution: {pipeline.name}",
        )
        db.add(start_log)
        db.commit()
        
        # Execute pipeline
        output_path = execute_pipeline(pipeline.pipeline_json, run_id, db)
        
        # Update run status to SUCCESS
        run.status = RunStatus.SUCCESS
        run.finished_at = datetime.utcnow()
        run.result_location = output_path
        db.commit()
        
        # Log completion
        success_log = RunLog(
            run_id=run_id,
            node_id=None,
            level=LogLevel.INFO,
            message=f"Pipeline completed successfully. Output: {output_path}",
        )
        db.add(success_log)
        db.commit()
        
        return {
            "status": "SUCCESS",
            "run_id": run_id,
            "output": output_path,
        }
    
    except Exception as e:
        # Update run status to FAILED
        run = db.query(PipelineRun).filter(PipelineRun.id == run_id).first()
        if run:
            run.status = RunStatus.FAILED
            run.finished_at = datetime.utcnow()
            run.error_message = str(e)
            db.commit()
        
        # Log error
        error_log = RunLog(
            run_id=run_id,
            node_id=None,
            level=LogLevel.ERROR,
            message=f"Pipeline execution failed: {str(e)}",
        )
        db.add(error_log)
        db.commit()
        
        # Re-raise to mark Celery task as failed
        raise
