from fastapi import FastAPI, Depends, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import jwt
import os
from fastapi.staticfiles import StaticFiles

from database import Base, engine, SessionLocal, Recipe, Ingredient, Instruction, User
from ocr_service import process_recipe_image
import auth

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Recipe Keeper API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"], 
    allow_headers=["*"],
    expose_headers=["*"], # Forces the phone to see all server responses
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

class UserCreate(BaseModel):
    username: str
    password: str

class IngredientCreate(BaseModel):
    item: str
    weight_or_quantity: str

class RecipeCreate(BaseModel):
    title: str
    category: str
    ingredients: List[IngredientCreate]
    instructions: List[str]
    image_url: Optional[str] = None

@app.post("/api/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    user_is_admin = user.username.lower() == "matan"
    
    new_user = User(username=user.username, hashed_password=hashed_password, is_admin=user_is_admin)
    db.add(new_user)
    db.commit()
    return {"message": "User created successfully"}

@app.post("/api/login")
def login(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if not db_user or not auth.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = auth.create_access_token(data={"sub": db_user.username})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": db_user.id,
        "is_admin": db_user.is_admin
    }

@app.post("/api/upload-scan")
def upload_and_scan(file: UploadFile = File(...)):
    try:
        image_bytes = file.file.read()
        scanned_data = process_recipe_image(image_bytes)
        return scanned_data
    except Exception as e:
        error_msg = str(e)
        print(f"CRITICAL SCAN ERROR: {error_msg}")
        
        # Check if the error is about limits or quota
        if "429" in error_msg or "quota" in error_msg.lower():
            raise HTTPException(
                status_code=429, 
                detail="הגעת למכסה היומית של סריקות (20). נסה שוב מחר או החלף מפתח API."
            )
        
        raise HTTPException(status_code=500, detail="שגיאה פנימית בסריקה")

@app.post("/api/recipes")
def create_recipe(recipe: RecipeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_recipe = Recipe(
        title=recipe.title, 
        category=recipe.category, 
        image_url=recipe.image_url,
        owner_id=current_user.id
    )
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)

    for ing in recipe.ingredients:
        db_ing = Ingredient(item=ing.item, amount=ing.weight_or_quantity, recipe_id=db_recipe.id)
        db.add(db_ing)

    for i, step_text in enumerate(recipe.instructions):
        db_inst = Instruction(step_number=i+1, instruction_text=step_text, recipe_id=db_recipe.id)
        db.add(db_inst)

    db.commit()
    return {"message": "Recipe saved successfully!", "recipe_id": db_recipe.id}

@app.get("/api/recipes")
def get_recipes(db: Session = Depends(get_db)):
    return db.query(Recipe).all()

# 1. Get Top 10 Recipes (Sorted by views)
@app.get("/api/recipes/top10")
def get_top_10_recipes(db: Session = Depends(get_db)):
    return db.query(Recipe).order_by(desc(Recipe.views)).limit(10).all()

# 2. Get Recent Recipes (Sorted by newest first)
@app.get("/api/recipes/recent")
def get_recent_recipes(limit: int = 10, db: Session = Depends(get_db)):
    # You can pass limit=100 later for the dedicated page!
    return db.query(Recipe).order_by(desc(Recipe.created_at)).limit(limit).all()


@app.get("/api/recipes/{recipe_id}")
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    return {
        "id": recipe.id,
        "title": recipe.title,
        "category": recipe.category,
        "owner_id": recipe.owner_id,
        "image_url": recipe.image_url,
        "ingredients": [{"item": i.item, "amount": i.amount} for i in recipe.ingredients],
        "instructions": [inst.instruction_text for inst in recipe.instructions]
    }

@app.put("/api/recipes/{recipe_id}")
def edit_recipe(recipe_id: int, recipe_update: RecipeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    if recipe.owner_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to edit this recipe")
    
    recipe.title = recipe_update.title
    recipe.category = recipe_update.category
    
    if recipe_update.image_url is not None:
        recipe.image_url = recipe_update.image_url

    
    
    db.query(Ingredient).filter(Ingredient.recipe_id == recipe_id).delete()
    db.query(Instruction).filter(Instruction.recipe_id == recipe_id).delete()
    
    for ing in recipe_update.ingredients:
        db.add(Ingredient(item=ing.item, amount=ing.weight_or_quantity, recipe_id=recipe_id))

    for i, step_text in enumerate(recipe_update.instructions):
        db.add(Instruction(step_number=i+1, instruction_text=step_text, recipe_id=recipe_id))

    db.commit()
    return {"message": "Recipe updated successfully"}

@app.delete("/api/recipes/{recipe_id}")
def delete_recipe(recipe_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    if recipe.owner_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this recipe")
    
    db.delete(recipe)
    db.commit()
    return {"message": "Recipe deleted successfully"}

@app.post("/api/recipes/{recipe_id}/save")
def save_recipe(recipe_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    if recipe not in current_user.saved_recipes:
        current_user.saved_recipes.append(recipe)
        db.commit()
    
    return {"message": "Recipe saved to your favorites"}

@app.delete("/api/recipes/{recipe_id}/save")
def unsave_recipe(recipe_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    if recipe in current_user.saved_recipes:
        current_user.saved_recipes.remove(recipe)
        db.commit()
        
    return {"message": "Recipe removed from your favorites"}

@app.get("/api/users/me/saved-recipes")
def get_saved_recipes(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return [
        {
            "id": recipe.id,
            "title": recipe.title,
            "category": recipe.category,
            "owner_id": recipe.owner_id
        }
        for recipe in current_user.saved_recipes
    ]


from sqlalchemy import desc

# Increment View Count
@app.post("/api/recipes/{recipe_id}/view")
def increment_recipe_view(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    if recipe:
        # If it doesn't have views yet, set to 0 then add 1
        if recipe.views is None:
            recipe.views = 0
        recipe.views += 1
        db.commit()
        return {"message": "View counted!", "new_views": recipe.views}
    raise HTTPException(status_code=404, detail="Recipe not found")

# --- SERVE FRONTEND ---
# 1. Get the directory where main.py lives (the backend folder)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 2. Go up one level to "cookbook", then into the "frontend" folder
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

# 3. Mount the frontend folder to the root URL "/"
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")