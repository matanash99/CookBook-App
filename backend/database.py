from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./recipes.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    category = Column(String, index=True)
    image_url = Column(String, nullable=True)

    ingredients = relationship("Ingredient", back_populates="recipe", cascade="all, delete-orphan")
    instructions = relationship("Instruction", back_populates="recipe", cascade="all, delete-orphan")

class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    item = Column(String, index=True)
    amount = Column(String)
    recipe_id = Column(Integer, ForeignKey("recipes.id"))

    recipe = relationship("Recipe", back_populates="ingredients")

class Instruction(Base):
    __tablename__ = "instructions"

    id = Column(Integer, primary_key=True, index=True)
    step_number = Column(Integer)
    instruction_text = Column(String)
    recipe_id = Column(Integer, ForeignKey("recipes.id"))

    recipe = relationship("Recipe", back_populates="instructions")