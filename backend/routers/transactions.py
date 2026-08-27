import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Account, Transaction, User
from ..schemas import TransactionRequest, TransactionResponse


router = APIRouter(
    prefix="/transactions",
    tags=["Transactions"]
)


@router.post(
    "/deposit",
    response_model=TransactionResponse
)
def deposit_money(
    transaction_data: TransactionRequest,
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

    account.balance += transaction_data.amount

    transaction = Transaction(
        sender_account_id=None,
        receiver_account_id=account.id,
        transaction_type="Deposit",
        amount=transaction_data.amount,
        status="Success",
        reference=str(uuid.uuid4())
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


@router.post(
    "/withdraw",
    response_model=TransactionResponse
)
def withdraw_money(
    transaction_data: TransactionRequest,
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

    if account.balance < transaction_data.amount:
        raise HTTPException(
            status_code=400,
            detail="Insufficient balance"
        )

    account.balance -= transaction_data.amount

    transaction = Transaction(
        sender_account_id=account.id,
        receiver_account_id=None,
        transaction_type="Withdrawal",
        amount=transaction_data.amount,
        status="Success",
        reference=str(uuid.uuid4())
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


@router.post(
    "/transfer",
    response_model=TransactionResponse
)
def transfer_money(
    receiver_account_number: str,
    transaction_data: TransactionRequest,
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
            detail="Cannot transfer to the same account"
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
        transaction_type="Transfer",
        amount=transaction_data.amount,
        status="Success",
        reference=str(uuid.uuid4())
    )

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


@router.get(
    "/history",
    response_model=list[TransactionResponse]
)
def transaction_history(
    skip: int = 0,
    limit: int = 10,
    transaction_type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if skip < 0:
        raise HTTPException(
            status_code=400,
            detail="Skip cannot be negative"
        )

    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 100"
        )

    account = db.query(Account).filter(
        Account.user_id == current_user.id
    ).first()

    if account is None:
        raise HTTPException(
            status_code=404,
            detail="Bank account not found"
        )

    query = db.query(Transaction).filter(
        (Transaction.sender_account_id == account.id) |
        (Transaction.receiver_account_id == account.id)
    )

    if transaction_type is not None:
        allowed_types = [
            "Deposit",
            "Withdrawal",
            "Transfer"
        ]

        if transaction_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid transaction type"
            )

        query = query.filter(
            Transaction.transaction_type == transaction_type
        )

    transactions = query.order_by(
        Transaction.id.desc()
    ).offset(skip).limit(limit).all()

    return transactions


@router.get(
    "/recent",
    response_model=list[TransactionResponse]
)
def recent_transactions(
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

    transactions = db.query(Transaction).filter(
        (Transaction.sender_account_id == account.id) |
        (Transaction.receiver_account_id == account.id)
    ).order_by(
        Transaction.id.desc()
    ).limit(5).all()

    return transactions