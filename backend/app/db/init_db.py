"""
Initialize database with tables
"""
from app.db.session import Base, engine
from app.models.orm_models import User, Pipeline, PipelineRun, RunLog


def init_db():
    """Create all tables in the database"""
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")


if __name__ == "__main__":
    init_db()
