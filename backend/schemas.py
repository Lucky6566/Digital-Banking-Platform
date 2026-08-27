from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    full_name: str = Field(
        min_length=2,
        max_length=100
    )

    email: EmailStr

    phone: str = Field(
        min_length=10,
        max_length=15
    )

    password: str = Field(
        min_length=8,
        max_length=100
    )


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


class AccountResponse(BaseModel):
    id: int
    account_number: str
    account_type: str
    balance: float

    class Config:
        from_attributes = True


class TransactionRequest(BaseModel):
    amount: float = Field(gt=0)


class TransactionResponse(BaseModel):
    id: int
    transaction_type: str
    amount: float
    status: str
    reference: str
    created_at: datetime

    class Config:
        from_attributes = True

    class Config:
        from_attributes = True