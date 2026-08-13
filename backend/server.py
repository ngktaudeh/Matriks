"""
Knowledge Vault — backend is intentionally minimal.

The data layer now lives entirely in Supabase (Postgres + Auth + RLS + Realtime),
called directly from the React frontend via @supabase/supabase-js.

This file only exposes a health-check so the container/supervisor stays green.
There are NO data routes here anymore — MongoDB/motor have been removed.
"""
from fastapi import FastAPI, APIRouter
from starlette.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Knowledge Vault (health only)")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"status": "ok", "data_layer": "supabase"}


@api_router.get("/health")
async def health():
    return {"status": "healthy"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
