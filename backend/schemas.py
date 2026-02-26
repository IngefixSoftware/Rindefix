from pydantic import BaseModel, EmailStr
from typing import Optional, Literal, List
from datetime import datetime, date

RoleType = Literal["RENDIDOR", "APROBADOR", "ADMIN"]
RenditionType = Literal["CAJA_CHICA", "COMBUSTIBLE", "FONDO_POR_RENDIR"]


class ExpenseBase(BaseModel):
    title: str
    amount: float
    provider: str
    document_number: str
    document_type: str
    rendition_type: RenditionType
    description: str
    expense_date: date


class ExpenseCreate(ExpenseBase):
    user_id: int


class Expense(ExpenseBase):
    id: int
    status: str
    branch: str
    document_path: Optional[str]
    created_at: datetime
    approved_at: Optional[datetime]
    user_id: int
    approver_comment: Optional[str]

    class Config:
        orm_mode = True


class ExpenseStatusUpdate(BaseModel):
    status: str  # "APROBADO" o "RECHAZADO"
    approver_comment: Optional[str] = None


class ReportSummary(BaseModel):
    total_gastos: float
    total_pendiente: float
    total_aprobado: float
    total_rechazado: float
    cantidad_gastos: int
    pendiente_count: int
    aprobado_count: int
    rechazado_count: int


class Movement(BaseModel):
    id: int
    user_id: int
    amount: float
    description: Optional[str]
    balance_before: float
    balance_after: float
    created_at: datetime

    class Config:
        orm_mode = True


class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: RoleType
    branch: str


class UserCreate(UserBase):
    password: str
    budget_assigned: float = 0
    overdraft_limit: float = 0
    fondo_por_rendir_assigned: float = 0
    fondo_por_rendir_overdraft_limit: float = 0


class User(UserBase):
    id: int
    budget_assigned: float
    budget_available: float
    overdraft_limit: float
    fondo_por_rendir_assigned: float
    fondo_por_rendir_available: float
    fondo_por_rendir_overdraft_limit: float

    class Config:
        orm_mode = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[RoleType] = None
    branch: Optional[str] = None
    password: Optional[str] = None
    budget_assigned: Optional[float] = None
    budget_available: Optional[float] = None
    overdraft_limit: Optional[float] = None
    fondo_por_rendir_assigned: Optional[float] = None
    fondo_por_rendir_available: Optional[float] = None
    fondo_por_rendir_overdraft_limit: Optional[float] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SettlementCreate(BaseModel):
    description: Optional[str] = None


class MovementList(BaseModel):
    items: List[Movement]


class EmailTemplate(BaseModel):
    subject: str
    body: str


class ReportEmailRequest(BaseModel):
    branch: Optional[str] = None
    user_id: int
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    rendition_type: Optional[str] = None
    exclude_fondo_por_rendir: bool = False
