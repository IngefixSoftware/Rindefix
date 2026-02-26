import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# DATABASE_URL se obtiene desde el entorno para facilitar despliegues (Render, etc.)
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+mysqlconnector://root:@localhost:3306/rindefix")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
