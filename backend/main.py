from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from database import Base, engine, SessionLocal, Recipe, Ingredient, Instruction
from ocr_service import process_recipe_image

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Recipe Keeper API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class IngredientCreate(BaseModel):
    item: str
    weight_or_quantity: str

class RecipeCreate(BaseModel):
    title: str
    category: str
    ingredients: List[IngredientCreate]
    instructions: List[str]
    image_url: Optional[str] = None

@app.get("/")
def read_root():
    return {"status": "Recipe Keeper API is running!"}

@app.post("/api/upload-scan")
async def upload_and_scan(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        scanned_data = process_recipe_image(image_bytes)
        return scanned_data
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to process image")

@app.post("/api/recipes")
def create_recipe(recipe: RecipeCreate, db: Session = Depends(get_db)):
    db_recipe = Recipe(title=recipe.title, category=recipe.category, image_url=recipe.image_url)
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