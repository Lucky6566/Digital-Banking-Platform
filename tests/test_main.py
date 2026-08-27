from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200


def test_openapi_endpoint():
    response = client.get("/openapi.json")
    assert response.status_code == 200
