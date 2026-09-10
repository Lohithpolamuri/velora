import re

from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime

SPECIAL_CHAR_PATTERN = re.compile(r'[!@#$%^&*(),.?":{}|<>_\-+=\[\]/\\;\'`~]')


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not SPECIAL_CHAR_PATTERN.search(value):
            raise ValueError("Password must include at least one special character.")
        return value


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    name: str
    email: EmailStr


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PasswordChange(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        if len(value) < 8:
            raise ValueError("New password must be at least 8 characters long.")
        if not SPECIAL_CHAR_PATTERN.search(value):
            raise ValueError("New password must include at least one special character.")
        return value


class ResendVerificationRequest(BaseModel):
    email: EmailStr