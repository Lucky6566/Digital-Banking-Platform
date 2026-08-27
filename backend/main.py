from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import users
from backend.routers import accounts
from backend.routers import transactions


app = FastAPI(
    title="Digital Banking Platform",
    description="A digital banking REST API",
    version="1.0.0"
)


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Routers
# --------------------------------------------------

app.include_router(users.router)
app.include_router(accounts.router)
app.include_router(transactions.router)


# --------------------------------------------------
# Root endpoint
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "Digital Banking Platform API is running"
    }


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }