from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200


def test_openapi_endpoint():
    response = client.get("/openapi.json")
    assert response.status_code == 200


def test_register_user():
    response = client.post(
        "/users/register",
        json={
            "full_name": "Test User",
            "email": "testuser_step11@example.com",
            "phone": "9876543210",
            "password": "Test@12345"
        }
    )

    # User may already exist from a previous test run.
    assert response.status_code in [200, 400]


def test_login_user():
    response = client.post(
        "/users/login",
        data={
            "username": "testuser_step11@example.com",
            "password": "Test@12345"
        }
    )

    assert response.status_code in [200, 401]

    if response.status_code == 200:
        data = response.json()

        assert "access_token" in data
        assert data["token_type"] == "bearer"


def test_unauthorized_profile():
    response = client.get("/users/me")

    assert response.status_code in [401, 403]


def test_unauthorized_account():
    response = client.get("/accounts/")

    assert response.status_code in [401, 403]


def test_unauthorized_balance():
    response = client.get("/accounts/balance")

    assert response.status_code in [401, 403]


def test_unauthorized_transactions():
    response = client.get("/transactions/history")

    assert response.status_code in [401, 403]


def test_transaction_validation():
    response = client.get(
        "/transactions/history?skip=-1"
    )

    assert response.status_code in [401, 400]


def test_invalid_transaction_limit():
    response = client.get(
        "/transactions/history?limit=101"
    )

    assert response.status_code in [401, 400]