import asyncio
import os
import json
import logging
import copy
from datetime import datetime
from typing import Any, Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger("auramart.db")

class ResilientCursor:
    """Mock async cursor matching Motor's find() chainable cursor API."""
    def __init__(self, items: List[Dict[str, Any]]):
        self._items = items
        self._skip_val = 0
        self._limit_val = None
        self._sort_key = None
        self._sort_dir = 1

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, list):
            self._sort_key, self._sort_dir = key_or_list[0]
        else:
            self._sort_key = key_or_list
            self._sort_dir = direction
        return self

    def skip(self, n: int):
        self._skip_val = n
        return self

    def limit(self, n: int):
        self._limit_val = n
        return self

    async def to_list(self, length: Optional[int] = None) -> List[Dict[str, Any]]:
        res = list(self._items)
        if self._sort_key:
            def sort_func(x):
                val = x.get(self._sort_key)
                if val is None:
                    return ""
                return str(val)
            res.sort(key=sort_func, reverse=(self._sort_dir == -1))
        if self._skip_val:
            res = res[self._skip_val:]
        if self._limit_val is not None:
            res = res[:self._limit_val]
        if length is not None:
            res = res[:length]
        return copy.deepcopy(res)

    def __aiter__(self):
        self._iter_idx = 0
        return self

    async def __anext__(self):
        res = await self.to_list()
        if self._iter_idx < len(res):
            item = res[self._iter_idx]
            self._iter_idx += 1
            return item
        raise StopAsyncIteration

class ResilientCollection:
    """Async Mongo collection implementation with JSON persistence fallback."""
    def __init__(self, name: str, filepath: str):
        self.name = name
        self.filepath = filepath
        self._data: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        if os.path.exists(self.filepath):
            try:
                with open(self.filepath, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
            except Exception as e:
                logger.error(f"Error loading {self.name} data: {e}")
                self._data = []

    def _save(self):
        try:
            os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
            with open(self.filepath, "w", encoding="utf-8") as f:
                json.dump(self._data, f, default=str, indent=2)
        except Exception as e:
            logger.error(f"Error saving {self.name} data: {e}")

    def _get_nested(self, doc: Dict[str, Any], path: str) -> Any:
        parts = path.split(".")
        curr = doc
        for p in parts:
            if not isinstance(curr, dict):
                return None
            curr = curr.get(p)
        return curr

    def _set_nested(self, doc: Dict[str, Any], path: str, val: Any):
        parts = path.split(".")
        curr = doc
        for p in parts[:-1]:
            if p not in curr or not isinstance(curr[p], dict):
                curr[p] = {}
            curr = curr[p]
        curr[parts[-1]] = val

    def _matches(self, doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
        for k, v in query.items():
            if k == "$or":
                if not any(self._matches(doc, q) for q in v):
                    return False
            elif k == "$and":
                if not all(self._matches(doc, q) for q in v):
                    return False
            else:
                doc_val = self._get_nested(doc, k)
                if isinstance(v, dict):
                    for op, op_val in v.items():
                        if op == "$regex":
                            import re
                            options = v.get("$options", "")
                            flags = re.IGNORECASE if "i" in options else 0
                            if not doc_val or not re.search(str(op_val), str(doc_val), flags):
                                return False
                        elif op == "$lte":
                            if doc_val is None or str(doc_val) > str(op_val):
                                return False
                        elif op == "$gte":
                            if doc_val is None or str(doc_val) < str(op_val):
                                return False
                        elif op == "$ne":
                            if doc_val == op_val:
                                return False
                        elif op == "$in":
                            if doc_val not in op_val:
                                return False
                else:
                    if doc_val != v:
                        return False
        return True

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for doc in self._data:
            if self._matches(doc, query):
                return copy.deepcopy(doc)
        return None

    def find(self, query: Optional[Dict[str, Any]] = None) -> ResilientCursor:
        q = query or {}
        matched = [doc for doc in self._data if self._matches(doc, q)]
        return ResilientCursor(matched)

    async def insert_one(self, document: Dict[str, Any]):
        import uuid
        doc = copy.deepcopy(document)
        if "_id" not in doc:
            doc["_id"] = str(uuid.uuid4())
        self._data.append(doc)
        self._save()
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertResult(doc["_id"])

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any], upsert: bool = False):
        target = None
        for doc in self._data:
            if self._matches(doc, query):
                target = doc
                break
        
        if not target and upsert:
            import uuid
            target = {"_id": str(uuid.uuid4())}
            target.update(query)
            self._data.append(target)

        if target:
            if "$set" in update:
                for k, v in update["$set"].items():
                    self._set_nested(target, k, v)
            if "$unset" in update:
                for k in update["$unset"]:
                    target.pop(k, None)
            self._save()
            class UpdateResult:
                matched_count = 1
                modified_count = 1
            return UpdateResult()
        
        class NoUpdateResult:
            matched_count = 0
            modified_count = 0
        return NoUpdateResult()

    async def delete_one(self, query: Dict[str, Any]):
        for i, doc in enumerate(self._data):
            if self._matches(doc, query):
                self._data.pop(i)
                self._save()
                class DelResult:
                    deleted_count = 1
                return DelResult()
        class DelZero:
            deleted_count = 0
        return DelZero()

    async def count_documents(self, query: Dict[str, Any]) -> int:
        count = sum(1 for doc in self._data if self._matches(doc, query))
        return count


class DatabaseManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Any = None
    is_live_mongo: bool = False
    
    # Collections
    users: Any = None
    plans: Any = None
    orders: Any = None
    products: Any = None
    tokens: Any = None

    async def connect(self):
        try:
            logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI}...")
            client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=2000
            )
            # Test connection
            await client.admin.command('ping')
            self.client = client
            self.db = client[settings.MONGODB_DB_NAME]
            self.users = self.db.users
            self.plans = self.db.plans
            self.orders = self.db.orders
            self.products = self.db.products
            self.tokens = self.db.tokens
            self.is_live_mongo = True
            logger.info("Successfully connected to live MongoDB server!")
        except Exception as e:
            logger.warning(f"Live MongoDB not available ({e}). Initializing Resilient Data Store.")
            data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
            os.makedirs(data_dir, exist_ok=True)
            self.users = ResilientCollection("users", os.path.join(data_dir, "users.json"))
            self.plans = ResilientCollection("plans", os.path.join(data_dir, "plans.json"))
            self.orders = ResilientCollection("orders", os.path.join(data_dir, "orders.json"))
            self.products = ResilientCollection("products", os.path.join(data_dir, "products.json"))
            self.tokens = ResilientCollection("tokens", os.path.join(data_dir, "tokens.json"))
            self.is_live_mongo = False
            logger.info("Resilient Data Store initialized. Ready for local execution!")

    async def close(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed.")

db_manager = DatabaseManager()
