from sqlalchemy.orm import Session
from sqlalchemy import func
from passlib.context import CryptContext
try:
    from . import models, schemas
except ImportError:
    import models
    import schemas
from datetime import datetime
from typing import Optional, List


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


class BudgetError(Exception):
    pass


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def create_user(db: Session, payload: schemas.UserCreate) -> models.User:
    user = models.User(
        name=payload.name,
        email=payload.email,
        role=payload.role,
        branch=payload.branch,
        password_hash=hash_password(payload.password),
        budget_assigned=payload.budget_assigned or 0,
        budget_available=payload.budget_assigned or 0,
        overdraft_limit=payload.overdraft_limit or 0,
        fondo_por_rendir_assigned=payload.fondo_por_rendir_assigned or 0,
        fondo_por_rendir_available=payload.fondo_por_rendir_assigned or 0,
        fondo_por_rendir_overdraft_limit=payload.fondo_por_rendir_overdraft_limit or 0,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_users(db: Session, role: str | None = None, branch: str | None = None):
    q = db.query(models.User)
    if role:
        q = q.filter(models.User.role == role)
    if branch:
        q = q.filter(models.User.branch == branch)
    return q.order_by(models.User.name.asc()).all()


def update_user(db: Session, user_id: int, payload: schemas.UserUpdate) -> Optional[models.User]:
    user = get_user(db, user_id)
    if not user:
        return None
    if payload.name is not None:
        user.name = payload.name
    if payload.email is not None:
        user.email = payload.email
    if payload.role is not None:
        user.role = payload.role
    if payload.branch is not None:
        user.branch = payload.branch
    if payload.password:
        user.password_hash = hash_password(payload.password)
    if payload.budget_assigned is not None:
        spent = max(0, user.budget_assigned - user.budget_available)
        user.budget_assigned = max(0, payload.budget_assigned)
        user.budget_available = user.budget_assigned - spent
    if getattr(payload, "budget_available", None) is not None:
        user.budget_available = max(0, payload.budget_available or 0)
    if payload.overdraft_limit is not None:
        user.overdraft_limit = max(0, payload.overdraft_limit)
    if getattr(payload, "fondo_por_rendir_assigned", None) is not None:
        fondo_spent = max(0, user.fondo_por_rendir_assigned - user.fondo_por_rendir_available)
        user.fondo_por_rendir_assigned = max(0, payload.fondo_por_rendir_assigned or 0)
        user.fondo_por_rendir_available = user.fondo_por_rendir_assigned - fondo_spent
    if getattr(payload, "fondo_por_rendir_available", None) is not None:
        user.fondo_por_rendir_available = max(0, payload.fondo_por_rendir_available or 0)
    if getattr(payload, "fondo_por_rendir_overdraft_limit", None) is not None:
        user.fondo_por_rendir_overdraft_limit = max(
            0, payload.fondo_por_rendir_overdraft_limit or 0
        )
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int) -> bool:
    user = get_user(db, user_id)
    if not user:
        return False
    db.delete(user)
    db.commit()
    return True


def authenticate_user(db: Session, email: str, password: str) -> Optional[models.User]:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_expense(db: Session, expense: schemas.ExpenseCreate, document_path: str | None):
    user = db.query(models.User).filter(models.User.id == expense.user_id).first()
    if not user:
        return None

    if user.role == "RENDIDOR":
        if expense.rendition_type == "FONDO_POR_RENDIR":
            projected_fondo = (user.fondo_por_rendir_available or 0) - expense.amount
            if projected_fondo < (0 - (user.fondo_por_rendir_overdraft_limit or 0)):
                raise BudgetError(
                    "El usuario supera el límite máximo de sobregiro de fondos por rendir."
                )
            user.fondo_por_rendir_available = projected_fondo
        else:
            projected_balance = user.budget_available - expense.amount
            if projected_balance < (0 - user.overdraft_limit):
                raise BudgetError(
                    "El usuario supera el límite máximo de sobregiro configurado."
                )
            user.budget_available = projected_balance

    db_expense = models.Expense(
        user_id=expense.user_id,
        title=expense.title,
        provider=expense.provider,
        document_number=expense.document_number,
        document_type=expense.document_type,
        rendition_type=expense.rendition_type,
        description=expense.description,
        expense_date=expense.expense_date,
        amount=expense.amount,
        document_path=document_path,
        branch=user.branch,
    )
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense


def get_expenses(
    db: Session,
    status: str | None = None,
    user_id: int | None = None,
    rendition_type: str | None = None,
    start_date=None,
    end_date=None,
    limit: int | None = None,
    offset: int | None = None,
):
    q = db.query(models.Expense)
    if status:
        q = q.filter(models.Expense.status == status)
    if user_id:
        q = q.filter(models.Expense.user_id == user_id)
    if rendition_type:
        q = q.filter(models.Expense.rendition_type == rendition_type)
    if start_date:
        q = q.filter(models.Expense.expense_date >= start_date)
    if end_date:
        q = q.filter(models.Expense.expense_date <= end_date)
    q = q.order_by(models.Expense.created_at.desc())
    if offset:
        q = q.offset(offset)
    if limit:
        q = q.limit(limit)
    return q.all()


def get_expense(db: Session, expense_id: int) -> Optional[models.Expense]:
    return db.query(models.Expense).filter(models.Expense.id == expense_id).first()


def delete_expense(db: Session, expense_id: int) -> bool:
    exp = get_expense(db, expense_id)
    if not exp:
        return False
    user = exp.user
    if user and user.role == "RENDIDOR":
        if exp.status != "RECHAZADO":
            if exp.rendition_type == "FONDO_POR_RENDIR":
                user.fondo_por_rendir_available = min(
                    user.fondo_por_rendir_assigned,
                    (user.fondo_por_rendir_available or 0) + exp.amount,
                )
            else:
                user.budget_available = min(
                    user.budget_assigned, user.budget_available + exp.amount
                )
    db.delete(exp)
    db.commit()
    return True


def update_expense_status(db: Session, expense_id: int, status: str, comment: str | None = None):
    exp = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not exp:
        return None
    old_status = exp.status
    if old_status == status:
        return exp
    user = exp.user
    if user and user.role == "RENDIDOR":
        if old_status != "RECHAZADO" and status == "RECHAZADO":
            if exp.rendition_type == "FONDO_POR_RENDIR":
                user.fondo_por_rendir_available = min(
                    user.fondo_por_rendir_assigned,
                    (user.fondo_por_rendir_available or 0) + exp.amount,
                )
            else:
                user.budget_available = min(
                    user.budget_assigned, user.budget_available + exp.amount
                )
        elif old_status == "RECHAZADO" and status != "RECHAZADO":
            if exp.rendition_type == "FONDO_POR_RENDIR":
                projected_fondo = (user.fondo_por_rendir_available or 0) - exp.amount
                if projected_fondo < (0 - (user.fondo_por_rendir_overdraft_limit or 0)):
                    raise BudgetError(
                        "Saldo insuficiente considerando el límite de sobregiro de fondos por rendir."
                    )
                user.fondo_por_rendir_available = projected_fondo
            else:
                projected_balance = user.budget_available - exp.amount
                if projected_balance < (0 - user.overdraft_limit):
                    raise BudgetError("Saldo insuficiente considerando el límite de sobregiro.")
                user.budget_available = projected_balance

    exp.status = status
    exp.approver_comment = comment
    if status == "APROBADO":
        exp.approved_at = datetime.utcnow()
    else:
        exp.approved_at = None
    db.commit()
    db.refresh(exp)
    return exp


def get_report_summary(
    db: Session, branch: str | None = None, user_id: int | None = None
) -> schemas.ReportSummary:
    base_query = db.query(models.Expense)
    if branch:
        base_query = base_query.filter(models.Expense.branch == branch)
    if user_id:
        base_query = base_query.filter(models.Expense.user_id == user_id)

    def sum_for_status(query, status: str | None = None):
        q = query
        if status:
            q = q.filter(models.Expense.status == status)
        return q.with_entities(func.coalesce(func.sum(models.Expense.amount), 0)).scalar()

    total_gastos = sum_for_status(base_query)
    total_pendiente = sum_for_status(base_query, "PENDIENTE")
    total_aprobado = sum_for_status(base_query, "APROBADO")
    total_rechazado = sum_for_status(base_query, "RECHAZADO")
    cantidad = base_query.count()

    def count_for_status(query, status: str):
        return query.filter(models.Expense.status == status).count()

    pendiente_count = count_for_status(base_query, "PENDIENTE")
    aprobado_count = count_for_status(base_query, "APROBADO")
    rechazado_count = count_for_status(base_query, "RECHAZADO")

    return schemas.ReportSummary(
        total_gastos=total_gastos,
        total_pendiente=total_pendiente,
        total_aprobado=total_aprobado,
        total_rechazado=total_rechazado,
        cantidad_gastos=cantidad,
        pendiente_count=pendiente_count,
        aprobado_count=aprobado_count,
        rechazado_count=rechazado_count,
    )


def settle_user_balance(
    db: Session, user_id: int, description: Optional[str] = None
) -> Optional[models.Movement]:
    user = get_user(db, user_id)
    if not user:
        return None
    if user.budget_available >= 0:
        raise BudgetError("El usuario no tiene saldo a favor pendiente.")
    balance_before = user.budget_available
    amount = -balance_before
    user.budget_assigned = 0
    user.budget_available = 0
    movement = models.Movement(
        user_id=user.id,
        amount=amount,
        description=description or "Transferencia registrada",
        balance_before=balance_before,
        balance_after=0,
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement


def list_movements(db: Session, user_id: int) -> List[models.Movement]:
    return (
        db.query(models.Movement)
        .filter(models.Movement.user_id == user_id)
        .order_by(models.Movement.created_at.desc())
        .all()
    )


def delete_movement(db: Session, movement_id: int) -> bool:
    movement = db.query(models.Movement).filter(models.Movement.id == movement_id).first()
    if not movement:
        return False
    db.delete(movement)
    db.commit()
    return True
