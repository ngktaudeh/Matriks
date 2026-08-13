from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

BUILTIN_CATEGORIES = ["Credentials", "Notes", "Links", "Archive"]


# ---------------- Models ----------------
class ItemBase(BaseModel):
    title: str
    content: str = ""
    tags: List[str] = Field(default_factory=list)
    category: str = "Notes"
    favorite: bool = False


class ItemCreate(ItemBase):
    pass


class ItemUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    category: Optional[str] = None
    favorite: Optional[bool] = None


class Item(ItemBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    createdAt: int = Field(default_factory=lambda: int(datetime.now(timezone.utc).timestamp() * 1000))


class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str


# ---------------- Seed ----------------
def _seed_items() -> List[dict]:
    now = int(datetime.now(timezone.utc).timestamp() * 1000)
    raw = [
        ("Production Database URL",
         "postgres://vault_admin:S7r0ng-P@ss@db.internal.prod.acme.io:5432/knowledge_vault?sslmode=require",
         ["db", "prod", "secret"], "Credentials", True, now - 300000),
        ("Onboarding checklist copy",
         "Welcome aboard. Over the next few days we'll get you set up with the tools, access, and context you need. Start by reading the team handbook, then pair with your onboarding buddy on your first small task. Ask questions early and often — curiosity is a feature here, not a bug.",
         ["writing", "hr", "template"], "Notes", False, now - 10800000),
        ("Design system reference",
         "https://www.figma.com/file/acme-design-system/Knowledge-Vault",
         ["design", "figma"], "Links", True, now - 93600000),
        ("SMTP relay credentials",
         "host: smtp.mailrelay.io\nport: 587\nuser: no-reply@acme.io\npass: mR-9x2L…kQ (rotate quarterly)",
         ["email", "smtp"], "Credentials", False, now - 180000000),
        ("Quarterly retro notes",
         "What went well: shipped Vault v2, cut load time by 40%. What to improve: flaky CI, unclear ownership on the billing surface. Action items: add ownership map, stabilise the e2e suite, and protect deep-work mornings.",
         ["team", "retro"], "Notes", False, now - 324000000),
        ("Old staging API key",
         "sk_stg_9f8a7b6c5d4e3f2a1b0c-DEPRECATED-do-not-use",
         ["deprecated", "api"], "Archive", False, now - 720000000),
    ]
    return [
        Item(title=t, content=c, tags=tags, category=cat, favorite=fav, createdAt=ts).model_dump()
        for (t, c, tags, cat, fav, ts) in raw
    ]


@app.on_event("startup")
async def seed_if_empty():
    if await db.vault_items.count_documents({}) == 0:
        await db.vault_items.insert_many(_seed_items())
        logger.info("Seeded vault_items with demo data")


# ---------------- Routes ----------------
@api_router.get("/")
async def root():
    return {"message": "Knowledge Vault API"}


@api_router.get("/items", response_model=List[Item])
async def list_items():
    docs = await db.vault_items.find({}, {"_id": 0}).to_list(5000)
    return [Item(**d) for d in docs]


@api_router.post("/items", response_model=Item)
async def create_item(payload: ItemCreate):
    item = Item(**payload.model_dump())
    await db.vault_items.insert_one(item.model_dump())
    return item


@api_router.put("/items/{item_id}", response_model=Item)
async def update_item(item_id: str, payload: ItemUpdate):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.vault_items.update_one({"id": item_id}, {"$set": updates})
    doc = await db.vault_items.find_one({"id": item_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Item not found")
    return Item(**doc)


@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str):
    res = await db.vault_items.delete_one({"id": item_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}


@api_router.get("/categories", response_model=List[str])
async def list_categories():
    docs = await db.vault_categories.find({}, {"_id": 0}).to_list(1000)
    return [d["name"] for d in docs]


@api_router.post("/categories", response_model=List[str])
async def add_category(payload: Category):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name required")
    reserved = {c.lower() for c in (["All", "Favorites"] + BUILTIN_CATEGORIES)}
    existing = {d["name"].lower() for d in await db.vault_categories.find({}, {"_id": 0}).to_list(1000)}
    if name.lower() in reserved or name.lower() in existing:
        raise HTTPException(status_code=409, detail="Category already exists")
    await db.vault_categories.insert_one({"name": name})
    docs = await db.vault_categories.find({}, {"_id": 0}).to_list(1000)
    return [d["name"] for d in docs]


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
