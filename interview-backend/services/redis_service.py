import os
import json
import logging
import redis.asyncio as redis
from typing import Optional

logger = logging.getLogger(__name__)

class RedisService:
    """
    Handles all Enterprise-level Redis architecture for the backend:
    1. Caching: Dramatically speeds up complex dashboard queries.
    2. Pub/Sub: Prepares the backend to broadcast websocket events across multiple servers.
    3. Graceful degradation: If Redis is offline, seamlessly falls back to Postgres.
    """
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.is_connected = False

    async def connect(self):
        redis_url = os.getenv("REDIS_URL")
        if not redis_url:
            logger.error("🛑 CRITICAL ERROR: REDIS_URL not found in environment. Deployment aborted.")
            raise ValueError("REDIS_URL environment variable is missing!")
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            # Test the connection to ensure server is live
            await self.redis_client.ping()
            self.is_connected = True
            logger.info("🟢 Redis connection established! Enterprise Caching & Pub/Sub enabled.")
        except Exception as e:
            self.is_connected = False
            logger.warning(f"🟡 Redis not found (running at {redis_url}). Running cleanly in Fallback Mode (No caching). Error: {str(e)}")

    async def close(self):
        if self.redis_client:
            await self.redis_client.close()
            logger.info("🛑 Redis connection closed.")

    async def get_cache(self, key: str) -> Optional[dict]:
        """Fetch JSON data from Redis cache."""
        if not self.is_connected or not self.redis_client:
            return None
        try:
            data = await self.redis_client.get(key)
            if data:
                logger.info(f"⚡ REDIS CACHE HIT ⚡ -> Loaded {key} from memory instantly!")
                return json.loads(data)
        except Exception as e:
            logger.error(f"Redis GET error: {str(e)}")
        return None

    async def set_cache(self, key: str, value: dict, expire_seconds: int = 300):
        """Store JSON data in Redis cache with an expiration time."""
        if not self.is_connected or not self.redis_client:
            return
        try:
            await self.redis_client.setex(key, expire_seconds, json.dumps(value))
            logger.debug(f"💾 Redis Cache SET -> Stored {key} for {expire_seconds}s")
        except Exception as e:
            logger.error(f"Redis SET error: {str(e)}")
            
    async def invalidate_cache(self, key: str):
        """Deletes a key from the cache to force a fresh DB query next time."""
        if not self.is_connected or not self.redis_client:
            return
        try:
            await self.redis_client.delete(key)
            logger.debug(f"🗑️ Redis Cache INVALIDATED -> Removed {key}")
        except Exception as e:
            logger.error(f"Redis DELETE error: {str(e)}")

    async def publish(self, channel: str, message: dict):
        """Broadcasts a JSON message to a Redis Pub/Sub channel for horizontal scaling."""
        if not self.is_connected or not self.redis_client:
            return
        try:
            await self.redis_client.publish(channel, json.dumps(message))
            logger.debug(f"📡 Redis PUB/SUB -> Broadcasted to channel: {channel}")
        except Exception as e:
            logger.error(f"Redis PUBLISH error: {str(e)}")

# Singleton instance
redis_service = RedisService()
