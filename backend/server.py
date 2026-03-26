from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production-' + str(uuid.uuid4()))
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ============= MODELS =============

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "member"  # admin, manager, member

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    role: str
    created_at: str

class AuthResponse(BaseModel):
    token: str
    user: User

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None  # user id
    priority: str = "medium"  # low, medium, high
    status: str = "todo"  # todo, in_progress, completed
    due_date: Optional[str] = None
    labels: List[str] = []

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    priority: str
    status: str
    due_date: Optional[str] = None
    labels: List[str]
    created_by: str
    created_by_name: str
    created_at: str
    comments: List[dict] = []

class CommentCreate(BaseModel):
    text: str

class ArticleCreate(BaseModel):
    title: str
    content: str
    category: str = "general"

class Article(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    content: str
    category: str
    created_by: str
    created_by_name: str
    created_at: str

class UpdateCreate(BaseModel):
    title: str
    content: str
    type: str = "announcement"  # announcement, news, feature

class Update(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    content: str
    type: str
    created_by: str
    created_by_name: str
    created_at: str


# ============= HELPER FUNCTIONS =============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


# ============= AUTH ROUTES =============

@api_router.post("/auth/register", response_model=AuthResponse)
async def register(user_input: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_input.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "name": user_input.name,
        "email": user_input.email,
        "password": hash_password(user_input.password),
        "role": user_input.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create token
    token = create_access_token({"sub": user_id})
    
    user_response = User(
        id=user_id,
        name=user_input.name,
        email=user_input.email,
        role=user_input.role,
        created_at=user_doc["created_at"]
    )
    
    return AuthResponse(token=token, user=user_response)

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=400, detail="Invalid email or password")
    
    token = create_access_token({"sub": user["id"]})
    
    user_response = User(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"],
        created_at=user["created_at"]
    )
    
    return AuthResponse(token=token, user=user_response)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(**current_user)


# ============= USER ROUTES =============

@api_router.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [User(**u) for u in users]


# ============= TASK ROUTES =============

@api_router.post("/tasks", response_model=Task)
async def create_task(task_input: TaskCreate, current_user: dict = Depends(get_current_user)):
    task_id = str(uuid.uuid4())
    
    # Get assigned user name if assigned
    assigned_to_name = None
    if task_input.assigned_to:
        assigned_user = await db.users.find_one({"id": task_input.assigned_to}, {"_id": 0})
        if assigned_user:
            assigned_to_name = assigned_user["name"]
    
    task_doc = {
        "id": task_id,
        "title": task_input.title,
        "description": task_input.description,
        "assigned_to": task_input.assigned_to,
        "assigned_to_name": assigned_to_name,
        "priority": task_input.priority,
        "status": task_input.status,
        "due_date": task_input.due_date,
        "labels": task_input.labels,
        "created_by": current_user["id"],
        "created_by_name": current_user["name"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "comments": []
    }
    
    await db.tasks.insert_one(task_doc)
    return Task(**task_doc)

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(current_user: dict = Depends(get_current_user)):
    tasks = await db.tasks.find({}, {"_id": 0}).to_list(1000)
    return [Task(**t) for t in tasks]

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return Task(**task)

@api_router.patch("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    # Get assigned user name if assigned_to is being updated
    if "assigned_to" in updates and updates["assigned_to"]:
        assigned_user = await db.users.find_one({"id": updates["assigned_to"]}, {"_id": 0})
        if assigned_user:
            updates["assigned_to_name"] = assigned_user["name"]
    
    result = await db.tasks.update_one({"id": task_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return Task(**task)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted"}

@api_router.post("/tasks/{task_id}/comments", response_model=Task)
async def add_comment(task_id: str, comment_input: CommentCreate, current_user: dict = Depends(get_current_user)):
    comment = {
        "id": str(uuid.uuid4()),
        "text": comment_input.text,
        "user_id": current_user["id"],
        "user_name": current_user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.tasks.update_one(
        {"id": task_id},
        {"$push": {"comments": comment}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = await db.tasks.find_one({"id": task_id}, {"_id": 0})
    return Task(**task)


# ============= KNOWLEDGE BASE ROUTES =============

@api_router.post("/articles", response_model=Article)
async def create_article(article_input: ArticleCreate, current_user: dict = Depends(get_current_user)):
    article_id = str(uuid.uuid4())
    article_doc = {
        "id": article_id,
        "title": article_input.title,
        "content": article_input.content,
        "category": article_input.category,
        "created_by": current_user["id"],
        "created_by_name": current_user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.articles.insert_one(article_doc)
    return Article(**article_doc)

@api_router.get("/articles", response_model=List[Article])
async def get_articles(current_user: dict = Depends(get_current_user)):
    articles = await db.articles.find({}, {"_id": 0}).to_list(1000)
    return [Article(**a) for a in articles]

@api_router.get("/articles/{article_id}", response_model=Article)
async def get_article(article_id: str, current_user: dict = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return Article(**article)

@api_router.delete("/articles/{article_id}")
async def delete_article(article_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.articles.delete_one({"id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")
    return {"message": "Article deleted"}


# ============= UPDATES ROUTES =============

@api_router.post("/updates", response_model=Update)
async def create_update(update_input: UpdateCreate, current_user: dict = Depends(get_current_user)):
    # Only admins and managers can create updates
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_id = str(uuid.uuid4())
    update_doc = {
        "id": update_id,
        "title": update_input.title,
        "content": update_input.content,
        "type": update_input.type,
        "created_by": current_user["id"],
        "created_by_name": current_user["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.updates.insert_one(update_doc)
    return Update(**update_doc)

@api_router.get("/updates", response_model=List[Update])
async def get_updates(current_user: dict = Depends(get_current_user)):
    updates = await db.updates.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Update(**u) for u in updates]

@api_router.delete("/updates/{update_id}")
async def delete_update(update_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.updates.delete_one({"id": update_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Update not found")
    return {"message": "Update deleted"}


# ============= DASHBOARD STATS =============

@api_router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    tasks_count = await db.tasks.count_documents({})
    articles_count = await db.articles.count_documents({})
    users_count = await db.users.count_documents({})
    
    my_tasks_count = await db.tasks.count_documents({"assigned_to": current_user["id"]})
    completed_tasks = await db.tasks.count_documents({"status": "completed"})
    
    return {
        "total_tasks": tasks_count,
        "my_tasks": my_tasks_count,
        "completed_tasks": completed_tasks,
        "total_articles": articles_count,
        "total_users": users_count
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
