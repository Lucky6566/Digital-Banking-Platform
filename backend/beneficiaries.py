from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database import get_db
from backend.models import Account, Beneficiary, User
from backend.schemas import (
    BeneficiaryCreate,
    BeneficiaryResponse
)


router = APIRouter(
    prefix="/beneficiaries",
    tags=["Beneficiaries"]
)


# =========================================================
# ADD BENEFICIARY
# =========================================================

@router.post(
    "/",
    response_model=BeneficiaryResponse
)
def add_beneficiary(
    beneficiary_data: BeneficiaryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    account = db.query(Account).filter(
        Account.account_number == beneficiary_data.account_number
    ).first()

    if account is None:
        raise HTTPException(
            status_code=404,
            detail="Beneficiary account not found"
        )

    if account.user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot add your own account as beneficiary"
        )

    existing = db.query(Beneficiary).filter(
        Beneficiary.user_id == current_user.id,
        Beneficiary.account_number == beneficiary_data.account_number
    ).first()

    if existing is not None:
        raise HTTPException(
            status_code=400,
            detail="Beneficiary already exists"
        )

    beneficiary = Beneficiary(
        user_id=current_user.id,
        beneficiary_name=beneficiary_data.beneficiary_name,
        account_number=beneficiary_data.account_number,
        bank_name=beneficiary_data.bank_name
    )

    db.add(beneficiary)
    db.commit()
    db.refresh(beneficiary)

    return beneficiary


# =========================================================
# GET BENEFICIARIES
# =========================================================

@router.get(
    "/",
    response_model=list[BeneficiaryResponse]
)
def get_beneficiaries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    return db.query(Beneficiary).filter(
        Beneficiary.user_id == current_user.id
    ).order_by(
        Beneficiary.id.desc()
    ).all()


# =========================================================
# DELETE BENEFICIARY
# =========================================================

@router.delete(
    "/{beneficiary_id}"
)
def delete_beneficiary(
    beneficiary_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    beneficiary = db.query(Beneficiary).filter(
        Beneficiary.id == beneficiary_id,
        Beneficiary.user_id == current_user.id
    ).first()

    if beneficiary is None:
        raise HTTPException(
            status_code=404,
            detail="Beneficiary not found"
        )

    db.delete(beneficiary)
    db.commit()

    return {
        "message": "Beneficiary deleted successfully"
    }