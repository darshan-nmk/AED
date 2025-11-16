from sqlalchemy import Column, Integer, BigInteger, String, Text, DateTime, ForeignKey, JSON, Enum as SQLEnum, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"


class RunStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class LogLevel(str, enum.Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    DEBUG = "DEBUG"


class User(Base):
    __tablename__ = "users"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.ANALYST)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    pipelines = relationship("Pipeline", back_populates="owner", cascade="all, delete-orphan")


class Pipeline(Base):
    __tablename__ = "pipelines"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    pipeline_json = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="pipelines")
    runs = relationship("PipelineRun", back_populates="pipeline", cascade="all, delete-orphan")


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    pipeline_id = Column(BigInteger, ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False)
    status = Column(SQLEnum(RunStatus), default=RunStatus.PENDING, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    finished_at = Column(DateTime(timezone=True), nullable=True)
    result_location = Column(String(1024), nullable=True)
    triggered_by = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    pipeline = relationship("Pipeline", back_populates="runs")
    logs = relationship("RunLog", back_populates="run", cascade="all, delete-orphan")


class RunLog(Base):
    __tablename__ = "run_logs"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    run_id = Column(BigInteger, ForeignKey("pipeline_runs.id", ondelete="CASCADE"), nullable=False)
    node_id = Column(String(255), nullable=True)
    level = Column(SQLEnum(LogLevel), default=LogLevel.INFO)
    message = Column(Text, nullable=False)
    rows_in = Column(Integer, nullable=True)
    rows_out = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    run = relationship("PipelineRun", back_populates="logs")


class UserSettings(Base):
    __tablename__ = "user_settings"
    
    id = Column(BigInteger, primary_key=True, index=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    workspace_name = Column(String(255), nullable=True, default="My Workspace")
    pipeline_timeout = Column(Integer, nullable=False, default=3600)  # seconds
    email_notifications = Column(Boolean, nullable=False, default=True)
    api_key = Column(String(255), nullable=True)  # For external integrations
    theme = Column(String(50), nullable=False, default="dark")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

