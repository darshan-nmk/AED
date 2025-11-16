"""add user settings table

Revision ID: 002
Revises: 001
Create Date: 2025-11-16

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_settings table
    op.create_table(
        'user_settings',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.BigInteger(), nullable=False),
        sa.Column('workspace_name', sa.String(length=255), nullable=True, default='My Workspace'),
        sa.Column('pipeline_timeout', sa.Integer(), nullable=False, server_default='3600'),
        sa.Column('email_notifications', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('api_key', sa.String(length=255), nullable=True),
        sa.Column('theme', sa.String(length=50), nullable=False, server_default='dark'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('user_id')
    )
    
    # Create index on user_id
    op.create_index(op.f('ix_user_settings_user_id'), 'user_settings', ['user_id'], unique=True)


def downgrade() -> None:
    # Drop index
    op.drop_index(op.f('ix_user_settings_user_id'), table_name='user_settings')
    
    # Drop table
    op.drop_table('user_settings')
