import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from typing import Optional

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI")
# Updated MongoDB URI with recommended parameters and ssl options
mongo_client = AsyncIOMotorClient(
    MONGO_URI,
    tls=True,
    tlsAllowInvalidCertificates=True,
    serverSelectionTimeoutMS=5000,
)
db = mongo_client["chatnest"]
