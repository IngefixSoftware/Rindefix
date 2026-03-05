# RindeFix

Aplicación web para gestionar rendiciones de gastos por sucursal, con flujo de carga, aprobación/rechazo, control de saldos, fondos por rendir, cartolas de transferencias y generación de informes en Excel/correo.

## 1) Qué hace la app

RindeFix cubre este flujo operativo:

1. Un **rendidor** registra un gasto (con documento adjunto).
2. El sistema descuenta el monto del saldo disponible (caja chica o fondo por rendir).
3. Un **aprobador/admin** revisa y cambia estado del gasto.
4. Si se rechaza, el monto se devuelve al saldo disponible según reglas.
5. Se pueden generar reportes, exportar Excel y enviar informe por correo.
6. Si un rendidor queda con saldo a favor (negativo), se registra transferencia y queda trazabilidad en cartola.

## 2) Stack y estructura

## Backend

- Framework: FastAPI
- ORM: SQLAlchemy
- DB: MySQL o PostgreSQL (según `DATABASE_URL`)
- Excel: `openpyxl`
- Hash de contraseñas: `passlib`

Carpeta: `backend/`

Archivos clave:

- `main.py`: API, validaciones, carga de archivos, reportes, email, WebSocket.
- `crud.py`: reglas de negocio y acceso a datos.
- `models.py`: entidades SQLAlchemy.
- `schemas.py`: contratos Pydantic.
- `database.py`: conexión y sesión SQLAlchemy.

## Frontend

- React + Vite
- Axios para API
- React Router para navegación
- Exportaciones: utilidades propias + `xlsx`

Carpeta: `frontend/`

Archivos clave:

- `src/App.jsx`: layout principal, navegación por rol, rutas.
- `src/api.js`: cliente axios y `VITE_API_URL`.
- `src/pages/*`: pantallas por caso de uso.
- `src/utils/format.js`: formato/parseo CLP y fechas.
- `src/utils/export.js`: descarga CSV/XLS/XLSX.

## 3) Roles y permisos

Roles válidos en backend y frontend:

- `RENDIDOR`
- `APROBADOR`
- `ADMIN`

Accesos principales:

- Rendidor: resumen, carga de gastos, mis rendiciones, cartola personal.
- Aprobador: aprobación, reportes, informes, usuarios (consulta), cartolas globales.
- Admin: todo lo anterior + crear usuarios, configurar correo, eliminar gastos/usuarios, ajustar saldos/sobregiros/fondos.

## 4) Modelo de datos (resumen)

## `users`

Campos relevantes:

- Identidad: `id`, `name`, `email`, `password_hash`, `role`, `branch`
- Caja chica: `budget_assigned`, `budget_available`, `overdraft_limit`
- Fondo por rendir: `fondo_por_rendir_assigned`, `fondo_por_rendir_available`, `fondo_por_rendir_overdraft_limit`

## `expenses`

- `user_id`, `title`, `provider`, `document_number`
- `document_type`: `FACTURA | BOLETA | BOLETA_COMBUSTIBLE | COMPROBANTE_RECIBO_TBK`
- `rendition_type`: `CAJA_CHICA | COMBUSTIBLE | FONDO_POR_RENDIR`
- `amount`, `expense_date`, `document_path`
- `status`: `PENDIENTE | APROBADO | RECHAZADO`
- `approver_comment`, `created_at`, `approved_at`, `branch`

## `movements`

Historial de transferencias/regularizaciones:

- `user_id`, `amount`, `description`
- `balance_before`, `balance_after`, `created_at`

## `email_templates`

- `subject`, `body`

## 5) Reglas de negocio importantes

Implementadas principalmente en `backend/crud.py`.

1. Al crear gasto (`create_expense`):
- Si el rendidor usa `FONDO_POR_RENDIR`, descuenta de `fondo_por_rendir_available`.
- Si usa otro tipo, descuenta de `budget_available`.
- Nunca permite pasar del límite de sobregiro configurado.

2. Al cambiar estado (`update_expense_status`):
- De no rechazado -> rechazado: devuelve monto al saldo disponible correspondiente.
- De rechazado -> no rechazado: vuelve a descontar, respetando sobregiro.
- En `APROBADO` guarda `approved_at`.

3. Al eliminar gasto (`delete_expense`):
- Si no estaba rechazado, devuelve el monto al saldo disponible (con tope en monto asignado).

4. Liquidación de saldo a favor (`settle_user_balance`):
- Solo aplica si `budget_available < 0`.
- Registra movimiento con `balance_before` y deja asignado/disponible en 0.

## 6) API (endpoints)

Base por defecto: `https://rindefixbackend-nxwf.onrender.com`

Autenticación actual: login simple por correo/clave, **sin JWT**.

## Gastos

- `POST /expenses` (multipart con archivo)
- `GET /expenses` (filtros: `status`, `user_id`, `rendition_type`, `start_date`, `end_date`, `limit`, `offset`)
- `PATCH /expenses/{expense_id}/status`
- `DELETE /expenses/{expense_id}`

## Reportes

- `GET /reports/summary`
- `GET /reports/pending-excel`
- `POST /reports/send-email`
- `GET /reports/pending-excel-debug`

## Plantilla de correo

- `GET /settings/email-template`
- `PUT /settings/email-template`

Placeholders soportados:

- `{{rendidor_nombre}}`
- `{{monto_total_pendiente}}`

## Usuarios y auth

- `GET /users`
- `POST /users`
- `GET /users/{user_id}`
- `PATCH /users/{user_id}`
- `DELETE /users/{user_id}`
- `POST /auth/login`

## Cartola/transferencias

- `POST /users/{user_id}/settlements`
- `GET /users/{user_id}/settlements`
- `DELETE /settlements/{movement_id}`

## Tiempo real

- `WS /ws/approvals`

Eventos emitidos (broadcast):

- `expense_created`
- `expense_updated`
- `expense_deleted`
- `settlement_created`

## 7) Frontend por pantalla (mapa para delegación)

- `LoginPage.jsx`: autenticación (`/auth/login`).
- `SummaryPage.jsx`: resumen de caja chica + exportaciones.
- `FondoSummaryPage.jsx`: resumen específico de fondos por rendir.
- `UploadPage.jsx`: creación de rendición con adjunto (`POST /expenses`).
- `MyExpensesPage.jsx`: listado paginado por estado del rendidor.
- `ApprovalPage.jsx`: aprobación/rechazo/eliminación en flujo operativo.
- `ReportsPage.jsx`: resumen agregado, detalle filtrable y cartola del usuario seleccionado.
- `ReportExportsPage.jsx`: vista previa de informe, descarga Excel y envío por correo.
- `UsersPage.jsx`: administración de montos, sobregiros, fondos y transferencias.
- `CreateUserPage.jsx`: alta de usuarios.
- `EmailTemplatePage.jsx`: configuración de asunto/cuerpo de correo.
- `CartolaPage.jsx`: cartola personal del rendidor.
- `AdminCartolaPage.jsx`: cartola global por rendidor con opción de eliminación.

## 8) Variables de entorno

## Backend

- `DATABASE_URL` (default MySQL local)
- `UPLOAD_DIR` (default `backend/uploads`)
- `CORS_ALLOW_ALL` (`true` por defecto)
- `SMTP_HOST`
- `SMTP_PORT` (default `587`)
- `SMTP_USER`
- `SMTP_PASSWORD`
- `EMAIL_SENDER`
- `EMAIL_RECIPIENT`

## Frontend

- `VITE_API_URL` (si no existe usa `https://rindefixbackend-nxwf.onrender.com`)
- `VITE_WS_URL` (opcional; si no existe deriva desde `VITE_API_URL`)

## 9) Cómo levantar en local

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Despliegue en Render (Web Service)

- Si el `Root Directory` de Render es `backend`, usa:
  - `Start Command`: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Si el `Root Directory` es la raíz del repo, usa:
  - `Start Command`: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

Si aparece `ModuleNotFoundError: No module named 'backend'`, el `Start Command` no coincide con el `Root Directory`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend local: `http://localhost:5173`

## 10) Convenciones y notas operativas

- API docs (`/docs`) están deshabilitadas en `FastAPI(...)`.
- La validación de sucursales está centralizada en `BRANCHES` (backend y frontend).
- El backend crea tablas al iniciar (`models.Base.metadata.create_all(bind=engine)`).
- En startup intenta agregar columnas de fondos por rendir con `ALTER TABLE ... IF NOT EXISTS`.
- Archivos adjuntos quedan servidos bajo `/uploads/...`.
- Plantilla Excel de informe: `backend/plantillas/FORMATO REND.xlsx`.

## 11) Checklist para delegar trabajo al equipo

Usar esta lista para repartir tareas sin perder contexto:

1. Definir módulo objetivo: backend (`crud/main/schemas`) o frontend (`pages/utils`).
2. Confirmar rol afectado (`RENDIDOR`, `APROBADOR`, `ADMIN`).
3. Verificar impacto en saldos (`budget_*`, `fondo_por_rendir_*`).
4. Si hay cambios de estado, validar transición `PENDIENTE/APROBADO/RECHAZADO`.
5. Revisar si requiere evento WebSocket para refresco en vivo.
6. Si toca reportes, validar Excel y placeholders de correo.
7. Ejecutar pruebas manuales mínimas: crear gasto, aprobar/rechazar, exportar, cartola.

## 12) Deuda técnica / mejoras recomendadas

- Incorporar autenticación con token (JWT) y control de permisos en backend.
- Agregar migraciones formales (Alembic) en lugar de `create_all` + `ALTER TABLE` en runtime.
- Añadir test automatizados para reglas de saldo/sobregiro.
- Consolidar validaciones compartidas (tipos/estados) para evitar duplicación frontend/backend.
- Agregar observabilidad básica (logs estructurados y trazas por operación crítica).

---

Si vas a delegar por tickets, usa este README como base y referencia siempre el archivo origen (`backend/crud.py`, `backend/main.py`, `frontend/src/pages/...`) para cambios funcionales.
