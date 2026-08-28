from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import users
from backend.routers import accounts
from backend.routers import transactions
from backend import beneficiaries
from backend import upi


app = FastAPI(
    title="Digital Banking Platform",
    description="A digital banking REST API",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# ROUTERS
# =========================================================

app.include_router(users.router)
app.include_router(accounts.router)
app.include_router(transactions.router)
app.include_router(beneficiaries.router)
app.include_router(upi.router)


# =========================================================
# ROOT
# =========================================================

@app.get("/")
def root():
    return {
        "message": "Digital Banking Platform API is running"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }