"""Knowledge Vault backend API tests."""
import os
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
if not BASE_URL:
    # fall back to frontend .env
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                break

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Items ---
class TestItems:
    def test_list_items_seeded(self, client):
        r = client.get(f"{API}/items", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 6
        for it in data:
            assert "id" in it and "title" in it and "createdAt" in it
            assert "_id" not in it

    def test_create_get_update_delete(self, client):
        # CREATE
        payload = {"title": "TEST_item", "content": "hello", "tags": ["t1"], "category": "Notes", "favorite": False}
        r = client.post(f"{API}/items", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["title"] == "TEST_item"
        assert isinstance(created["id"], str) and len(created["id"]) > 0
        assert isinstance(created["createdAt"], int)
        item_id = created["id"]

        # GET verify persistence
        r = client.get(f"{API}/items", timeout=15)
        assert any(i["id"] == item_id for i in r.json())

        # UPDATE
        r = client.put(f"{API}/items/{item_id}", json={"favorite": True, "title": "TEST_item_updated"}, timeout=15)
        assert r.status_code == 200
        upd = r.json()
        assert upd["favorite"] is True
        assert upd["title"] == "TEST_item_updated"

        # Verify persist via GET list
        r = client.get(f"{API}/items", timeout=15)
        found = next((i for i in r.json() if i["id"] == item_id), None)
        assert found and found["favorite"] is True and found["title"] == "TEST_item_updated"

        # DELETE
        r = client.delete(f"{API}/items/{item_id}", timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True

        # 404 on missing
        r = client.delete(f"{API}/items/{item_id}", timeout=15)
        assert r.status_code == 404

    def test_update_404(self, client):
        r = client.put(f"{API}/items/nonexistent-id-xyz", json={"title": "x"}, timeout=15)
        assert r.status_code == 404


# --- Categories ---
class TestCategories:
    def test_list_categories(self, client):
        r = client.get(f"{API}/categories", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_add_and_duplicate_and_reserved(self, client):
        import uuid
        name = f"TEST_cat_{uuid.uuid4().hex[:6]}"
        r = client.post(f"{API}/categories", json={"name": name}, timeout=15)
        assert r.status_code == 200, r.text
        cats = r.json()
        assert name in cats

        # duplicate -> 409
        r2 = client.post(f"{API}/categories", json={"name": name}, timeout=15)
        assert r2.status_code == 409

        # reserved names
        for reserved in ["All", "Favorites", "Credentials", "Notes", "Links", "Archive"]:
            rr = client.post(f"{API}/categories", json={"name": reserved}, timeout=15)
            assert rr.status_code == 409, f"{reserved} should be reserved"

        # empty name -> 400
        rr = client.post(f"{API}/categories", json={"name": "   "}, timeout=15)
        assert rr.status_code == 400

        # cleanup category directly via mongo not possible via API; leave TEST_ prefix
