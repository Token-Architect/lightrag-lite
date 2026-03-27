"""
Platform-level routes for model config and graph versioning.
"""

from __future__ import annotations

import asyncio
import json
import os
import socket
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, Callable, Awaitable
from urllib.parse import unquote

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from lightrag.utils import logger
from ..utils_api import get_combined_auth_dependency

router = APIRouter(tags=["platform"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _workspace_from_request(request: Request) -> str:
    workspace = request.headers.get("LIGHTRAG-WORKSPACE", "").strip()
    if workspace:
        workspace = unquote(workspace)
    return workspace


class _PlatformStore:
    def __init__(self, working_dir: str):
        self._file = Path(working_dir) / "platform_runtime_config.json"
        self._lock = asyncio.Lock()

    def _ensure_parent(self) -> None:
        self._file.parent.mkdir(parents=True, exist_ok=True)

    def _default(self) -> dict[str, Any]:
        return {
            "models": [],
            "active_model_id": None,
            "updated_at": _now_iso(),
        }

    def _load_sync(self) -> dict[str, Any]:
        self._ensure_parent()
        if not self._file.exists():
            return self._default()
        try:
            with self._file.open("r", encoding="utf-8") as f:
                data = json.load(f)
                if not isinstance(data, dict):
                    return self._default()
                data.setdefault("models", [])
                data.setdefault("active_model_id", None)
                data.setdefault("updated_at", _now_iso())
                return data
        except Exception:
            logger.warning("Failed to load platform runtime config, using defaults")
            return self._default()

    def _save_sync(self, data: dict[str, Any]) -> None:
        self._ensure_parent()
        data["updated_at"] = _now_iso()
        with self._file.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    async def load(self) -> dict[str, Any]:
        async with self._lock:
            return self._load_sync()

    async def save(self, data: dict[str, Any]) -> None:
        async with self._lock:
            self._save_sync(data)


class ModelConfigIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    provider: str = Field(
        ...,
        description="volcengine/tongyi/zhipu/ollama/vllm/openai/gemini/azure_openai/aws_bedrock/lollms",
    )
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    model_name: str = Field(..., min_length=1)
    enabled: bool = True
    extra: dict[str, Any] = Field(default_factory=dict)

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        return v.strip().lower()


class GraphVersionSaveRequest(BaseModel):
    note: Optional[str] = Field(default=None, max_length=1024)


def _to_public_model(item: dict[str, Any]) -> dict[str, Any]:
    safe = dict(item)
    if safe.get("api_key"):
        safe["api_key"] = "***"
    return safe


def _extract_host_port(item: dict[str, Any]) -> tuple[Optional[str], Optional[int]]:
    host = item.get("host")
    port = item.get("port")
    if host and port:
        return host, int(port)

    url = item.get("url")
    if not isinstance(url, str) or not url:
        return None, None

    if "://" in url:
        body = url.split("://", 1)[1]
    else:
        body = url
    body = body.split("/", 1)[0]
    if "@" in body:
        body = body.rsplit("@", 1)[1]
    if ":" in body:
        host_part, port_part = body.rsplit(":", 1)
        if port_part.isdigit():
            return host_part, int(port_part)
    return body, None


def _tcp_test(host: str, port: int, timeout: float = 3.0) -> tuple[bool, str]:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True, "TCP reachable"
    except Exception as e:
        return False, str(e)


def _normalize_provider_to_binding(provider: str) -> str:
    mapping = {
        "volcengine": "openai",
        "tongyi": "openai",
        "zhipu": "openai",
        "vllm": "openai",
        "openai": "openai",
        "openai_compatible": "openai",
        "ollama": "ollama",
        "gemini": "gemini",
        "azure_openai": "azure_openai",
        "aws_bedrock": "aws_bedrock",
        "lollms": "lollms",
    }
    return mapping.get(provider, "openai")


def _graph_version_paths(working_dir: str, workspace: str) -> tuple[Path, Path]:
    ws = workspace if workspace else "__default__"
    base = Path(working_dir) / "graph_versions" / ws
    base.mkdir(parents=True, exist_ok=True)
    return base / "current.json", base / "previous.json"


def _extract_node_id(node: dict[str, Any]) -> Optional[str]:
    for key in ("id", "node_id", "label", "name", "entity_name"):
        val = node.get(key)
        if isinstance(val, str) and val:
            return val
    return None


def _extract_edge_src_tgt(edge: dict[str, Any]) -> tuple[Optional[str], Optional[str]]:
    src = None
    tgt = None
    for key in ("source", "src", "source_id", "src_id"):
        val = edge.get(key)
        if isinstance(val, str) and val:
            src = val
            break
    for key in ("target", "tgt", "target_id", "tgt_id"):
        val = edge.get(key)
        if isinstance(val, str) and val:
            tgt = val
            break
    return src, tgt


def _extract_node_data(node: dict[str, Any]) -> dict[str, Any]:
    if isinstance(node.get("properties"), dict):
        return dict(node["properties"])
    return {
        k: v
        for k, v in node.items()
        if k not in {"id", "node_id", "label", "name", "entity_name"}
    }


def _extract_edge_data(edge: dict[str, Any]) -> dict[str, Any]:
    if isinstance(edge.get("properties"), dict):
        return dict(edge["properties"])
    return {
        k: v
        for k, v in edge.items()
        if k not in {"source", "src", "source_id", "src_id", "target", "tgt", "target_id", "tgt_id"}
    }


def create_platform_routes(
    rag,
    working_dir: str,
    api_key: Optional[str] = None,
    apply_model_config_cb: Optional[
        Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]
    ] = None,
):
    combined_auth = get_combined_auth_dependency(api_key)
    store = _PlatformStore(working_dir=working_dir)

    @router.get("/platform/models", dependencies=[Depends(combined_auth)])
    async def list_models():
        data = await store.load()
        return {
            "active_model_id": data.get("active_model_id"),
            "items": [_to_public_model(i) for i in data["models"]],
        }

    @router.post("/platform/models", dependencies=[Depends(combined_auth)])
    async def create_model(request: ModelConfigIn):
        data = await store.load()
        now = _now_iso()
        item = request.model_dump()
        item["id"] = str(uuid.uuid4())
        item["binding"] = _normalize_provider_to_binding(item["provider"])
        item["created_at"] = now
        item["updated_at"] = now
        data["models"].append(item)
        await store.save(data)
        return {"status": "success", "data": _to_public_model(item)}

    @router.put("/platform/models/{model_id}", dependencies=[Depends(combined_auth)])
    async def update_model(model_id: str, request: ModelConfigIn):
        data = await store.load()
        idx = next((i for i, x in enumerate(data["models"]) if x["id"] == model_id), -1)
        if idx < 0:
            raise HTTPException(status_code=404, detail="Model config not found")
        old = data["models"][idx]
        updated = request.model_dump()
        updated["id"] = model_id
        updated["binding"] = _normalize_provider_to_binding(updated["provider"])
        updated["created_at"] = old.get("created_at", _now_iso())
        updated["updated_at"] = _now_iso()
        data["models"][idx] = updated
        await store.save(data)
        return {"status": "success", "data": _to_public_model(updated)}

    @router.delete("/platform/models/{model_id}", dependencies=[Depends(combined_auth)])
    async def delete_model(model_id: str):
        data = await store.load()
        before = len(data["models"])
        data["models"] = [x for x in data["models"] if x["id"] != model_id]
        if len(data["models"]) == before:
            raise HTTPException(status_code=404, detail="Model config not found")
        if data.get("active_model_id") == model_id:
            data["active_model_id"] = None
        await store.save(data)
        return {"status": "success", "message": "Model config deleted"}

    @router.post("/platform/models/{model_id}/activate", dependencies=[Depends(combined_auth)])
    async def activate_model(model_id: str):
        data = await store.load()
        item = next((x for x in data["models"] if x["id"] == model_id), None)
        if item is None:
            raise HTTPException(status_code=404, detail="Model config not found")
        if not item.get("enabled", True):
            raise HTTPException(status_code=400, detail="Model config is disabled")

        applied_result: dict[str, Any] = {"applied": False, "message": "No callback"}
        if apply_model_config_cb is not None:
            applied_result = await apply_model_config_cb(item)

        data["active_model_id"] = model_id
        await store.save(data)
        return {
            "status": "success",
            "active_model_id": model_id,
            "apply_result": applied_result,
            "data": _to_public_model(item),
        }

    @router.post("/platform/models/{model_id}/test", dependencies=[Depends(combined_auth)])
    async def test_model(model_id: str):
        data = await store.load()
        item = next((x for x in data["models"] if x["id"] == model_id), None)
        if item is None:
            raise HTTPException(status_code=404, detail="Model config not found")

        if not item.get("model_name"):
            return {"status": "failed", "message": "Missing model_name"}
        if not item.get("base_url"):
            return {
                "status": "success",
                "message": "Config valid (base_url empty; may use provider default)",
            }
        host, port = _extract_host_port(item)
        if not host:
            return {"status": "failed", "message": "Invalid base_url"}
        test_port = port or 80
        ok, msg = await asyncio.to_thread(_tcp_test, host, test_port)
        return {
            "status": "success" if ok else "failed",
            "message": msg,
            "host": host,
            "port": test_port,
            "binding": item.get("binding"),
        }

    @router.get("/platform/graph/version", dependencies=[Depends(combined_auth)])
    async def get_graph_version_status(request: Request):
        workspace = _workspace_from_request(request)
        current_path, previous_path = _graph_version_paths(working_dir, workspace)
        current = None
        previous = None
        if current_path.exists():
            with current_path.open("r", encoding="utf-8") as f:
                current = json.load(f)
        if previous_path.exists():
            with previous_path.open("r", encoding="utf-8") as f:
                previous = json.load(f)
        return {
            "workspace": workspace,
            "current": current.get("meta") if isinstance(current, dict) else None,
            "previous": previous.get("meta") if isinstance(previous, dict) else None,
        }

    @router.post("/platform/graph/version/save", dependencies=[Depends(combined_auth)])
    async def save_graph_version(request: Request, body: GraphVersionSaveRequest):
        workspace = _workspace_from_request(request)
        current_path, previous_path = _graph_version_paths(working_dir, workspace)

        nodes = await rag.chunk_entity_relation_graph.get_all_nodes()
        edges = await rag.chunk_entity_relation_graph.get_all_edges()

        if current_path.exists():
            current_path.replace(previous_path)

        snapshot = {
            "meta": {
                "workspace": workspace,
                "saved_at": _now_iso(),
                "note": body.note,
                "nodes_count": len(nodes),
                "edges_count": len(edges),
            },
            "nodes": nodes,
            "edges": edges,
        }
        with current_path.open("w", encoding="utf-8") as f:
            json.dump(snapshot, f, ensure_ascii=False, indent=2)

        return {"status": "success", "meta": snapshot["meta"]}

    @router.post(
        "/platform/graph/version/rollback", dependencies=[Depends(combined_auth)]
    )
    async def rollback_graph_version(request: Request):
        workspace = _workspace_from_request(request)
        current_path, previous_path = _graph_version_paths(working_dir, workspace)
        if not previous_path.exists():
            raise HTTPException(status_code=404, detail="No previous graph version found")

        with previous_path.open("r", encoding="utf-8") as f:
            previous_snapshot = json.load(f)
        if not isinstance(previous_snapshot, dict):
            raise HTTPException(status_code=500, detail="Invalid previous graph version file")

        existing_nodes = await rag.chunk_entity_relation_graph.get_all_nodes()
        existing_ids = []
        for n in existing_nodes:
            if not isinstance(n, dict):
                continue
            node_id = _extract_node_id(n)
            if node_id:
                existing_ids.append(node_id)
        if existing_ids:
            await rag.chunk_entity_relation_graph.remove_nodes(existing_ids)

        restored_nodes = 0
        for node in previous_snapshot.get("nodes", []):
            if not isinstance(node, dict):
                continue
            node_id = _extract_node_id(node)
            if not node_id:
                continue
            node_data = _extract_node_data(node)
            await rag.chunk_entity_relation_graph.upsert_node(node_id=node_id, node_data=node_data)
            restored_nodes += 1

        restored_edges = 0
        for edge in previous_snapshot.get("edges", []):
            if not isinstance(edge, dict):
                continue
            src, tgt = _extract_edge_src_tgt(edge)
            if not src or not tgt:
                continue
            edge_data = _extract_edge_data(edge)
            await rag.chunk_entity_relation_graph.upsert_edge(
                source_node_id=src, target_node_id=tgt, edge_data=edge_data
            )
            restored_edges += 1

        await rag.chunk_entity_relation_graph.index_done_callback()

        if current_path.exists():
            current_path.replace(previous_path)
        with current_path.open("w", encoding="utf-8") as f:
            json.dump(previous_snapshot, f, ensure_ascii=False, indent=2)

        return {
            "status": "success",
            "workspace": workspace,
            "restored_nodes": restored_nodes,
            "restored_edges": restored_edges,
            "meta": previous_snapshot.get("meta"),
        }

    return router
