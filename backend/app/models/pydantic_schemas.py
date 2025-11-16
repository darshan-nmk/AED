from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Dict, Optional, Any
from enum import Enum
from datetime import datetime


# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"


class NodeType(str, Enum):
    SOURCE = "SOURCE"
    TRANSFORM = "TRANSFORM"
    LOAD = "LOAD"


class NodeSubtype(str, Enum):
    # Sources
    CSV_SOURCE = "CSV_SOURCE"
    EXCEL_SOURCE = "EXCEL_SOURCE"
    DB_SOURCE = "DB_SOURCE"
    JSON_SOURCE = "JSON_SOURCE"
    
    # Transforms
    FILTER = "FILTER"
    SELECT = "SELECT"
    RENAME = "RENAME"
    CAST = "CAST"
    AGGREGATE = "AGGREGATE"
    JOIN = "JOIN"
    SORT = "SORT"
    FILL_MISSING = "FILL_MISSING"
    DROP_DUPLICATES = "DROP_DUPLICATES"
    
    # Loads
    CSV_LOAD = "CSV_LOAD"
    EXCEL_LOAD = "EXCEL_LOAD"
    DB_LOAD = "DB_LOAD"
    JSON_LOAD = "JSON_LOAD"


class RunStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class LogLevel(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    DEBUG = "DEBUG"


# User schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    role: UserRole
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None


# Pipeline schemas
class PipelineNodeCreate(BaseModel):
    id: str
    type: NodeType
    subtype: NodeSubtype
    config: Dict[str, Any] = Field(default_factory=dict)
    position_x: float
    position_y: float


class PipelineEdge(BaseModel):
    from_node: str = Field(..., alias="from")
    to_node: str = Field(..., alias="to")
    
    class Config:
        populate_by_name = True


class PipelineCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    nodes: List[PipelineNodeCreate] = Field(default_factory=list)
    edges: List[PipelineEdge] = Field(default_factory=list)


class PipelineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    nodes: Optional[List[PipelineNodeCreate]] = None
    edges: Optional[List[PipelineEdge]] = None


class PipelineResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    owner_id: int
    pipeline_json: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class PipelineListItem(BaseModel):
    id: int
    name: str
    description: Optional[str]
    owner_id: int
    created_at: datetime
    updated_at: datetime
    last_run_status: Optional[RunStatus] = None
    last_run_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Run schemas
class RunTrigger(BaseModel):
    pass  # Empty for now, can add config later


class RunLogResponse(BaseModel):
    id: int
    run_id: int
    node_id: Optional[str]
    level: LogLevel
    message: str
    rows_in: Optional[int]
    rows_out: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True


class RunResponse(BaseModel):
    id: int
    pipeline_id: int
    status: RunStatus
    started_at: Optional[datetime]
    finished_at: Optional[datetime]
    result_location: Optional[str]
    triggered_by: int
    error_message: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class RunDetailResponse(RunResponse):
    logs: List[RunLogResponse] = []
    pipeline_name: Optional[str] = None


# File schemas
class FileUploadResponse(BaseModel):
    file_id: str
    filename: str
    file_path: str
    size: int
    uploaded_at: datetime


class FileSampleResponse(BaseModel):
    filename: str
    columns: List[str]
    sample_data: List[Dict[str, Any]]
    total_rows: int
    column_stats: Dict[str, Dict[str, Any]]


# Suggestion schemas
class SuggestionType(str, Enum):
    FILL_MISSING = "FILL_MISSING"
    DROP_COLUMN = "DROP_COLUMN"
    PARSE_DATE = "PARSE_DATE"
    CAST_TYPE = "CAST_TYPE"
    AGGREGATE = "AGGREGATE"
    JOIN = "JOIN"
    FILTER = "FILTER"
    FILTER_OUTLIERS = "FILTER_OUTLIERS"


class Suggestion(BaseModel):
    type: SuggestionType
    column: Optional[str] = None
    suggestion: str
    config: Dict[str, Any] = Field(default_factory=dict)
    priority: int = 1  # 1=high, 2=medium, 3=low


class SuggestionRequest(BaseModel):
    column_stats: Dict[str, Dict[str, Any]]


class SuggestionResponse(BaseModel):
    suggestions: List[Suggestion]


# Health check
class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime


# User Settings schemas
class UserSettingsBase(BaseModel):
    workspace_name: Optional[str] = "My Workspace"
    pipeline_timeout: int = 3600
    email_notifications: bool = True
    theme: str = "dark"


class UserSettingsUpdate(BaseModel):
    workspace_name: Optional[str] = None
    pipeline_timeout: Optional[int] = None
    email_notifications: Optional[bool] = None
    theme: Optional[str] = None


class UserSettingsResponse(UserSettingsBase):
    id: int
    user_id: int
    api_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Password change schema
class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

