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


# ============= KNOWLEDGE TOWER - FOLDERS =============

class TowerFolderCreate(BaseModel):
    name: str
    parent_id: Optional[str] = None
    color: str = "zinc"
    order: int = 0

class TowerFolder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    parent_id: Optional[str] = None
    color: str
    created_by: str
    created_at: str
    updated_at: str
    order: int

@api_router.post("/tower/folders", response_model=TowerFolder)
async def create_tower_folder(folder_input: TowerFolderCreate, current_user: dict = Depends(get_current_user)):
    folder_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    folder_doc = {
        "id": folder_id,
        "name": folder_input.name,
        "parent_id": folder_input.parent_id,
        "color": folder_input.color,
        "created_by": current_user["id"],
        "created_at": now,
        "updated_at": now,
        "order": folder_input.order
    }
    
    await db.tower_folders.insert_one(folder_doc)
    return TowerFolder(**folder_doc)

@api_router.get("/tower/folders", response_model=List[TowerFolder])
async def get_tower_folders(current_user: dict = Depends(get_current_user)):
    folders = await db.tower_folders.find({}, {"_id": 0}).sort("order", 1).to_list(1000)
    return [TowerFolder(**f) for f in folders]

@api_router.patch("/tower/folders/{folder_id}", response_model=TowerFolder)
async def update_tower_folder(folder_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.tower_folders.update_one({"id": folder_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    folder = await db.tower_folders.find_one({"id": folder_id}, {"_id": 0})
    return TowerFolder(**folder)

@api_router.delete("/tower/folders/{folder_id}")
async def delete_tower_folder(folder_id: str, current_user: dict = Depends(get_current_user)):
    # Delete all files in folder
    await db.tower_files.delete_many({"folder_id": folder_id})
    
    # Delete all subfolders recursively
    async def delete_subfolders(parent_id):
        subfolders = await db.tower_folders.find({"parent_id": parent_id}, {"_id": 0}).to_list(1000)
        for subfolder in subfolders:
            await db.tower_files.delete_many({"folder_id": subfolder["id"]})
            await delete_subfolders(subfolder["id"])
            await db.tower_folders.delete_one({"id": subfolder["id"]})
    
    await delete_subfolders(folder_id)
    
    # Delete the folder itself
    result = await db.tower_folders.delete_one({"id": folder_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Folder not found")
    return {"message": "Folder deleted"}


# ============= KNOWLEDGE TOWER - FILES =============

class TowerFileCreate(BaseModel):
    name: str
    folder_id: Optional[str] = None
    content: str = ""
    color: str = "zinc"
    bg_color: str = "#FFFFFF"
    order: int = 0

class TowerFileUpdate(BaseModel):
    name: Optional[str] = None
    folder_id: Optional[str] = None
    content: Optional[str] = None
    color: Optional[str] = None
    bg_color: Optional[str] = None
    order: Optional[int] = None

class TowerFile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    folder_id: Optional[str] = None
    content: str
    content_text: str
    color: str
    bg_color: str
    created_by: str
    created_by_name: str
    created_at: str
    updated_at: str
    order: int

class TowerFileMeta(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    folder_id: Optional[str] = None
    color: str
    bg_color: str
    created_by: str
    created_by_name: str
    created_at: str
    updated_at: str
    order: int

def html_to_text(html_content: str) -> str:
    """Simple HTML to text conversion for search"""
    import re
    text = re.sub(r'<[^>]+>', ' ', html_content)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

@api_router.post("/tower/files", response_model=TowerFile)
async def create_tower_file(file_input: TowerFileCreate, current_user: dict = Depends(get_current_user)):
    file_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    content_text = html_to_text(file_input.content)
    
    file_doc = {
        "id": file_id,
        "name": file_input.name,
        "folder_id": file_input.folder_id,
        "content": file_input.content,
        "content_text": content_text,
        "color": file_input.color,
        "bg_color": file_input.bg_color,
        "created_by": current_user["id"],
        "created_by_name": current_user["name"],
        "created_at": now,
        "updated_at": now,
        "order": file_input.order
    }
    
    await db.tower_files.insert_one(file_doc)
    return TowerFile(**file_doc)

@api_router.get("/tower/files", response_model=List[TowerFileMeta])
async def get_tower_files(current_user: dict = Depends(get_current_user)):
    files = await db.tower_files.find({}, {"_id": 0, "content": 0, "content_text": 0}).sort("order", 1).to_list(1000)
    return [TowerFileMeta(**f) for f in files]

@api_router.get("/tower/files/{file_id}", response_model=TowerFile)
async def get_tower_file(file_id: str, current_user: dict = Depends(get_current_user)):
    file = await db.tower_files.find_one({"id": file_id}, {"_id": 0})
    if not file:
        raise HTTPException(status_code=404, detail="File not found")
    return TowerFile(**file)

@api_router.patch("/tower/files/{file_id}", response_model=TowerFile)
async def update_tower_file(file_id: str, updates: dict, current_user: dict = Depends(get_current_user)):
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Update content_text if content is updated
    if "content" in updates:
        updates["content_text"] = html_to_text(updates["content"])
    
    result = await db.tower_files.update_one({"id": file_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    
    file = await db.tower_files.find_one({"id": file_id}, {"_id": 0})
    return TowerFile(**file)

@api_router.delete("/tower/files/{file_id}")
async def delete_tower_file(file_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tower_files.delete_one({"id": file_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="File not found")
    return {"message": "File deleted"}


# ============= KNOWLEDGE TOWER - SEARCH (SAGHBOOP) =============

class SearchResult(BaseModel):
    file_id: str
    file_name: str
    folder_id: Optional[str] = None
    snippet: str
    color: str

@api_router.get("/tower/search", response_model=List[SearchResult])
async def search_tower(q: str, current_user: dict = Depends(get_current_user)):
    if not q or len(q.strip()) < 2:
        return []
    
    # Simple text search across all files
    files = await db.tower_files.find({
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"content_text": {"$regex": q, "$options": "i"}}
        ]
    }, {"_id": 0}).to_list(100)
    
    results = []
    for file in files:
        # Extract snippet around the match
        content_text = file.get("content_text", "")
        query_lower = q.lower()
        content_lower = content_text.lower()
        
        match_index = content_lower.find(query_lower)
        if match_index >= 0:
            start = max(0, match_index - 50)
            end = min(len(content_text), match_index + len(q) + 50)
            snippet = content_text[start:end]
            if start > 0:
                snippet = "..." + snippet
            if end < len(content_text):
                snippet = snippet + "..."
        else:
            # Match in title
            snippet = content_text[:100] + "..." if len(content_text) > 100 else content_text
        
        results.append(SearchResult(
            file_id=file["id"],
            file_name=file["name"],
            folder_id=file.get("folder_id"),
            snippet=snippet,
            color=file.get("color", "zinc")
        ))
    
    return results


# ============= KNOWLEDGE TOWER - SEED DATA =============

@api_router.post("/tower/seed")
async def seed_tower_data(current_user: dict = Depends(get_current_user)):
    """Seed the Knowledge Tower with sample data for demonstration."""
    now = datetime.now(timezone.utc).isoformat()

    # Check if already seeded (look for the welcome file)
    existing = await db.tower_files.find_one({"name": "Welcome to Knowledge Tower"})
    if existing:
        return {"message": "Tower already seeded", "seeded": False}

    created_by = current_user["id"]
    created_by_name = current_user["name"]

    # Create top-level folders
    folder_project = {"id": str(uuid.uuid4()), "name": "Project Reports", "parent_id": None, "color": "blue", "created_by": created_by, "created_at": now, "updated_at": now, "order": 0}
    folder_meetings = {"id": str(uuid.uuid4()), "name": "Meeting Notes", "parent_id": None, "color": "emerald", "created_by": created_by, "created_at": now, "updated_at": now, "order": 1}
    folder_guidelines = {"id": str(uuid.uuid4()), "name": "Guidelines", "parent_id": None, "color": "violet", "created_by": created_by, "created_at": now, "updated_at": now, "order": 2}

    await db.tower_folders.insert_many([folder_project, folder_meetings, folder_guidelines])

    # Create sub-folder inside Guidelines
    folder_design = {"id": str(uuid.uuid4()), "name": "Design Standards", "parent_id": folder_guidelines["id"], "color": "pink", "created_by": created_by, "created_at": now, "updated_at": now, "order": 0}
    await db.tower_folders.insert_one(folder_design)

    # Sample file contents
    q1_content = "<h1>Q1 2026 Progress Report</h1><p>This report summarizes the team's progress during Q1 2026. Overall, we have made significant strides across all project verticals.</p><h2>Key Achievements</h2><ul><li>Launched three major features ahead of schedule</li><li>Reduced bug backlog by 40%</li><li>Onboarded two new team members successfully</li><li>Improved API response times by 25%</li></ul><h2>Challenges</h2><p>Integration with third-party services proved more complex than anticipated. We allocated additional sprint cycles to address these dependencies.</p><h2>Upcoming Milestones</h2><p>Q2 will focus on scalability improvements, user experience enhancements, and expanding our test coverage to above 85%.</p>"
    retro_content = "<h1>Sprint Retrospective — March</h1><p>The March sprint retrospective highlighted several areas of improvement and celebrated team successes.</p><h2>What Went Well</h2><ul><li>Daily standups were concise and effective</li><li>Code review turnaround improved to under 24 hours</li><li>Deployment pipeline ran without issues</li></ul><h2>What Needs Improvement</h2><ul><li>Estimation accuracy — several tasks took longer than expected</li><li>Documentation was sometimes written after the fact</li></ul><h2>Action Items</h2><ol><li>Introduce story-point poker for all new tickets</li><li>Require documentation PR alongside feature PR</li></ol>"
    standup_content = "<h1>Team Standup — March 25</h1><p><strong>Attendees:</strong> All team members present.</p><h2>Updates</h2><ul><li><strong>Alice:</strong> Completed the authentication module refactor. Moving to integration tests today.</li><li><strong>Bob:</strong> Still working on the dashboard charts — expects to finish by EOD.</li><li><strong>Carol:</strong> Reviewed three PRs yesterday. Starting on the notification system.</li></ul><h2>Blockers</h2><p>Bob needs design approval for the chart color scheme before finalising the implementation.</p>"
    client_content = "<h1>Client Review Notes</h1><p>Client review session held on March 22, 2026. Attendees included the product manager, lead developer, and two client representatives.</p><h2>Feedback Received</h2><ul><li>The new dashboard layout is well-received — clients appreciate the clean design</li><li>Request to add export-to-PDF functionality for reports</li><li>Minor concern about load times on the analytics page with large datasets</li></ul><h2>Next Steps</h2><ol><li>Create a ticket for PDF export feature — priority: medium</li><li>Investigate and optimise analytics queries</li><li>Schedule follow-up demo in 3 weeks</li></ol>"
    ui_guide_content = "<h1>UI Component Guide</h1><p>This guide documents our design system components and usage guidelines.</p><h2>Typography</h2><p>Use <strong>Outfit</strong> for headings and <strong>IBM Plex Sans</strong> for body text. Maintain a clear typographic hierarchy.</p><h2>Colors</h2><p>Our palette is zinc-based. Primary actions use <code>zinc-900</code>. Avoid pure black (#000) — use <code>#18181B</code> instead.</p><h2>Buttons</h2><ul><li>All buttons use <code>rounded-full</code></li><li>Primary: <code>bg-zinc-900 text-white</code></li><li>Outline: <code>border-zinc-200 hover:bg-zinc-50</code></li></ul><h2>Cards</h2><p>Cards use <code>rounded-xl sm:rounded-2xl border border-zinc-200</code>. Avoid heavy shadows — prefer subtle borders.</p>"
    checklist_content = "<h1>Code Review Checklist</h1><p>Use this checklist when reviewing pull requests to ensure consistency and quality.</p><h2>Before Approving</h2><ul><li>Does the code solve the stated problem?</li><li>Are there adequate tests for new functionality?</li><li>Is the code readable and well-documented?</li><li>Are there any obvious performance issues?</li><li>Does the PR include relevant documentation updates?</li></ul><h2>Security</h2><ul><li>No secrets or credentials committed</li><li>Input validation is present where needed</li><li>No new SQL/injection vulnerabilities introduced</li></ul>"
    welcome_content = "<h1>Welcome to Knowledge Tower 📚</h1><p>Knowledge Tower is your team's shared knowledge management system — a place to store, organise, and search AI-generated reports, meeting notes, guidelines, and documents.</p><h2>Getting Started</h2><ul><li><strong>Browse</strong> the file tree on the left to explore existing documents</li><li><strong>Click any file</strong> to open and read it</li><li><strong>Create folders and files</strong> using the + buttons in the tree panel</li><li><strong>Right-click</strong> any file or folder for options like rename, recolor, and more</li></ul><h2>Saghboop AI (صغبوب)</h2><p>Use the search bar at the bottom to ask Saghboop anything about the content stored in the tower. Saghboop will search through all files and surface relevant results instantly.</p><h2>Tips</h2><ol><li>Drag files between folders to reorganise</li><li>Change the background colour of any file to suit your reading preference</li><li>Use colour labels to categorise files at a glance</li></ol>"

    files = [
        {"id": str(uuid.uuid4()), "name": "Q1 2026 Progress Report", "folder_id": folder_project["id"], "content": q1_content, "content_text": html_to_text(q1_content), "color": "blue", "bg_color": "#FFFFFF", "created_by": created_by, "created_by_name": created_by_name, "created_at": now, "updated_at": now, "order": 0},
        {"id": str(uuid.uuid4()), "name": "Sprint Retrospective - March", "folder_id": folder_project["id"], "content": retro_content, "content_text": html_to_text(retro_content), "color": "blue", "bg_color": "#FFFFFF", "created_by": created_by, "created_by_name": created_by_name, "created_at": now, "updated_at": now, "order": 1},
        {"id": str(uuid.uuid4()), "name": "Team Standup - March 25", "folder_id": folder_meetings["id"], "content": standup_content, "content_text": html_to_text(standup_content), "color": "emerald", "bg_color": "#FFFFFF", "created_by": created_by, "created_by_name": created_by_name, "created_at": now, "updated_at": now, "order": 0},
        {"id": str(uuid.uuid4()), "name": "Client Review Notes", "folder_id": folder_meetings["id"], "content": client_content, "content_text": html_to_text(client_content), "color": "emerald", "bg_color": "#FFFFFF", "created_by": created_by, "created_by_name": created_by_name, "created_at": now, "updated_at": now, "order": 1},
        {"id": str(uuid.uuid4()), "name": "UI Component Guide", "folder_id": folder_design["id"], "content": ui_guide_content, "content_text": html_to_text(ui_guide_content), "color": "pink", "bg_color": "#FFFFFF", "created_by": created_by, "created_by_name": created_by_name, "created_at": now, "updated_at": now, "order": 0},
        {"id": str(uuid.uuid4()), "name": "Code Review Checklist", "folder_id": folder_guidelines["id"], "content": checklist_content, "content_text": html_to_text(checklist_content), "color": "violet", "bg_color": "#FFFFFF", "created_by": created_by, "created_by_name": created_by_name, "created_at": now, "updated_at": now, "order": 1},
        {"id": str(uuid.uuid4()), "name": "Welcome to Knowledge Tower", "folder_id": None, "content": welcome_content, "content_text": html_to_text(welcome_content), "color": "amber", "bg_color": "#FFF8F0", "created_by": created_by, "created_by_name": created_by_name, "created_at": now, "updated_at": now, "order": 0},
    ]

    await db.tower_files.insert_many(files)
    return {"message": "Tower seeded successfully", "seeded": True, "folders": 4, "files": len(files)}


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
