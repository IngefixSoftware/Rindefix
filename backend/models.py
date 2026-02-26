from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
try:
    from .database import Base
except ImportError:
    from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    role = Column(String(20), default="RENDIDOR")  # 'user' o 'approver'
    branch = Column(String(100), nullable=False, default="Regiones")
    password_hash = Column(String(255), nullable=False)
    budget_assigned = Column(Float, nullable=False, default=0)
    budget_available = Column(Float, nullable=False, default=0)
    overdraft_limit = Column(Float, nullable=False, default=0)
    fondo_por_rendir_assigned = Column(Float, nullable=False, default=0)
    fondo_por_rendir_available = Column(Float, nullable=False, default=0)
    fondo_por_rendir_overdraft_limit = Column(Float, nullable=False, default=0)

    expenses = relationship("Expense", back_populates="user")
    movements = relationship("Movement", back_populates="user")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String(200), nullable=False)
    provider = Column(String(120), nullable=False)
    document_number = Column(String(50), nullable=False)
    document_type = Column(String(30), nullable=False)
    rendition_type = Column(String(30), nullable=False, default="CAJA_CHICA")
    description = Column(String(255), nullable=False)
    expense_date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String(20), default="PENDIENTE")  # PENDIENTE / APROBADO / RECHAZADO
    document_path = Column(String(255), nullable=True)
    branch = Column(String(100), nullable=False)
    approver_comment = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    approved_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="expenses")


class Movement(Base):
    __tablename__ = "movements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(String(255), nullable=True)
    balance_before = Column(Float, nullable=False)
    balance_after = Column(Float, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="movements")


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
