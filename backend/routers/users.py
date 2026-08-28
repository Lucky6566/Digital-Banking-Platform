from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..auth import (
    get_current_user,
    hash_password,
    verify_password,
    create_access_token,
)
from ..database import get_db
from ..models import User
from ..schemas import (
    UserCreate,
    UserResponse,
    TokenResponse,
    ForgotUsernameRequest,
    ForgotPasswordRequest,
)


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


# --------------------------------------------------
# REGISTER
# --------------------------------------------------

@router.post("/register")
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    existing_user = (
        db.query(User)
        .filter(User.email == user_data.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_password = hash_password(
        user_data.password
    )

    user = User(
        full_name=user_data.full_name,
        email=user_data.email,
        phone=user_data.phone,
        password_hash=hashed_password
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message": "User registered successfully",
        "user_id": user.id,
        "email": user.email
    }


# --------------------------------------------------
# LOGIN
# --------------------------------------------------

@router.post(
    "/login",
    response_model=TokenResponse
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.email == form_data.username)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            }
        )

    if not verify_password(
        form_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            }
        )

    access_token = create_access_token(
        data={
            "sub": str(user.id)
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# --------------------------------------------------
# GET CURRENT USER
# --------------------------------------------------

@router.get(
    "/me",
    response_model=UserResponse
)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user


# --------------------------------------------------
# FORGOT USERNAME
# --------------------------------------------------

@router.post("/forgot-username")
def forgot_username(
    request: ForgotUsernameRequest,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.phone == request.phone)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this phone number"
        )

    email = user.email

    # Mask email for safer display
    if "@" in email:
        username, domain = email.split("@", 1)

        if len(username) > 2:
            masked_username = (
                username[0]
                + "*" * (len(username) - 2)
                + username[-1]
            )
        else:
            masked_username = "*" * len(username)

        masked_email = (
            masked_username
            + "@"
            + domain
        )
    else:
        masked_email = "***"

    return {
        "message": "Account found",
        "email": masked_email
    }


# --------------------------------------------------
# FORGOT PASSWORD
# --------------------------------------------------

@router.post("/forgot-password")
def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(
            User.email == request.email,
            User.phone == request.phone
        )
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email and phone number do not match"
        )

    user.password_hash = hash_password(
        request.new_password
    )

    db.commit()

    return {
        "message": "Password updated successfully"
    }