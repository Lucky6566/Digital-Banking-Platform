from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Account, Transaction, User
from ..schemas import AccountResponse


router = APIRouter(
    prefix="/accounts",
    tags=["Accounts"]
)


@router.post(
    "/create",
    response_model=AccountResponse
)
def create_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing_account = db.query(Account).filter(
        Account.user_id == current_user.id
    ).first()

    if existing_account is not None:
        raise HTTPException(
            status_code=400,
            detail="Bank account already exists"
        )

    import random

    account_number = str(
        random.randint(1000000000, 9999999999)
    )

    account = Account(
        user_id=current_user.id,
        account_number=account_number,
        account_type="Savings",
        balance=0
    )

    db.add(account)
    db.commit()
    db.refresh(account)

    return account


@router.get(
    "/",
    response_model=AccountResponse
)
def get_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = db.query(Account).filter(
        Account.user_id == current_user.id
    ).first()

    if account is None:
        raise HTTPException(
            status_code=404,
            detail="Bank account not found"
        )

    return account


@router.get("/balance")
def get_balance(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = db.query(Account).filter(
        Account.user_id == current_user.id
    ).first()

    if account is None:
        raise HTTPException(
            status_code=404,
            detail="Bank account not found"
        )

    return {
        "account_number": account.account_number,
        "balance": account.balance
    }


@router.get("/summary")
def get_account_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = db.query(Account).filter(
        Account.user_id == current_user.id
    ).first()

    if account is None:
        raise HTTPException(
            status_code=404,
            detail="Bank account not found"
        )

    deposit_rows = db.query(Transaction.amount).filter(
        Transaction.receiver_account_id == account.id,
        Transaction.transaction_type == "Deposit",
        Transaction.status == "Success"
    ).all()

    withdrawal_rows = db.query(Transaction.amount).filter(
        Transaction.sender_account_id == account.id,
        Transaction.transaction_type == "Withdrawal",
        Transaction.status == "Success"
    ).all()

    transfer_rows = db.query(Transaction.amount).filter(
        Transaction.sender_account_id == account.id,
        Transaction.transaction_type == "Transfer",
        Transaction.status == "Success"
    ).all()

    total_deposits = sum(
        row.amount for row in deposit_rows
    )

    total_withdrawals = sum(
        row.amount for row in withdrawal_rows
    )

    total_transfers = sum(
        row.amount for row in transfer_rows
    )

    return {
        "account_number": account.account_number,
        "balance": account.balance,
        "total_deposits": total_deposits,
        "total_withdrawals": total_withdrawals,
        "total_transfers": total_transfers
    }