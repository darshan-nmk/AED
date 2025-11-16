"""
User Settings API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.orm_models import User, UserSettings
from app.models.pydantic_schemas import UserSettingsResponse, UserSettingsUpdate
from app.utils.security import get_current_user
import secrets

router = APIRouter()


@router.get("/me", response_model=UserSettingsResponse)
def get_my_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's settings"""
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    
    # Create default settings if not exists
    if not settings:
        settings = UserSettings(
            user_id=current_user.id,
            workspace_name="My Workspace",
            pipeline_timeout=3600,
            email_notifications=True,
            theme="dark"
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings


@router.put("/me", response_model=UserSettingsResponse)
def update_my_settings(
    settings_update: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's settings"""
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    
    # Create if not exists
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
    
    # Update only provided fields
    update_data = settings_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)
    
    db.commit()
    db.refresh(settings)
    
    return settings


@router.post("/me/api-key", response_model=UserSettingsResponse)
def generate_api_key(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a new API key for the user"""
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
    
    # Generate secure random API key
    settings.api_key = f"aed_{secrets.token_urlsafe(32)}"
    
    db.commit()
    db.refresh(settings)
    
    return settings


@router.delete("/me/api-key", response_model=UserSettingsResponse)
def revoke_api_key(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Revoke the user's API key"""
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settings not found"
        )
    
    settings.api_key = None
    
    db.commit()
    db.refresh(settings)
    
    return settings
