import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.auth import get_current_user
from backend.database import get_db
from backend.models import Account, Transaction, User
from backend.schemas import UPIRequest, TransactionResponse


router = APIRouter(
    prefix="/upi",
    tags=["UPI Payments"]
)


# =========================================================
# UPI PAYMENT
# =========================================================

@router.post(
    "/pay",
    response_model=TransactionResponse
)
def upi_payment(
    receiver_account_number: str,
    transaction_data: UPIRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    sender_account = db.query(Account).filter(
        Account.user_id == current_user.id
    ).first()

    if sender_account is None:
        raise HTTPException(
            status_code=404,
            detail="Sender bank account not found"
        )

    receiver_account = db.query(Account).filter(
        Account.account_number == receiver_account_number
    ).first()

    if receiver_account is None:
        raise HTTPException(
            status_code=404,
            detail="Receiver bank account not found"
        )

    if sender_account.id == receiver_account.id:
        raise HTTPException(
            status_code=400,
            detail="Cannot make UPI payment to your own account"
        )

    if sender_account.balance < transaction_data.amount:
        raise HTTPException(
            status_code=400,
            detail="Insufficient balance"
        )

    sender_account.balance -= transaction_data.amount
    receiver_account.balance += transaction_data.amount

    transaction = Transaction(
        sender_account_id=sender_account.id,
        receiver_account_id=receiver_account.id,
        transaction_type="UPI Payment",
        amount=transaction_data.amount,
        status="Success",
        reference=str(uuid.uuid4())
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction