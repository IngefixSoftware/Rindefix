import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api";
import { BRANCHES, RENDITION_TYPE_LABELS } from "../constants";
import { formatCLP, formatDate } from "../utils/format";
import SummaryPage from "./SummaryPage";
import ConfirmDialog from "../components/ConfirmDialog";

const formatDocumentType = (value) => {
  switch (value) {
    case "FACTURA":
      return "Factura";
    case "BOLETA":
      return "Boleta";
    case "BOLETA_COMBUSTIBLE":
      return "Boleta de combustible";
    case "COMPROBANTE_RECIBO_TBK":
      return "Comprobante / Recibo / TBK";
    default:
      return value;
  }
};

const formatRenditionType = (value) => RENDITION_TYPE_LABELS[value] || value;

export default function ApprovalPage({ user }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusView, setStatusView] = useState("PENDIENTE");
  const [confirmApprove, setConfirmApprove] = useState(null);
  const [branchFilter, setBranchFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [dateError, setDateError] = useState("");
  const wsRef = useRef(null);
  const [confirmState, setConfirmState] = useState(null);

  const loadExpenses = async (statusToLoad) => {
    setLoading(true);
    try {
      const effectiveStatus = statusToLoad || statusView || "PENDIENTE";
      const params = { status: effectiveStatus };
      if (userFilter) {
        params.user_id = Number(userFilter);
      }
      if (startDateFilter) {
        params.start_date = startDateFilter;
      }
      if (endDateFilter) {
        params.end_date = endDateFilter;
      }
      const res = await api.get("/expenses", { params });
      const filtered =
        branchFilter && branchFilter !== ""
          ? res.data.filter((item) => item.branch === branchFilter)
          : res.data;
      setExpenses(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const params = { role: "RENDIDOR" };
      if (branchFilter) {
        params.branch = branchFilter;
      }
      const res = await api.get("/users", { params });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    let retryTimeout;
    const connectWS = () => {
      loadExpenses("PENDIENTE");
      const httpBase = api.defaults.baseURL || window.location.origin;
      const wsBase =
        (import.meta.env.VITE_WS_URL || httpBase).replace(/^http/, "ws").replace(/\/$/, "");
      const socket = new WebSocket(`${wsBase}/ws/approvals`);
      wsRef.current = socket;

      socket.onmessage = () => {
        loadExpenses();
      };

      socket.onclose = () => {
        retryTimeout = setTimeout(connectWS, 4000);
      };
    };

    connectWS();

    return () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAction = async (id, status) => {
    let approver_comment;
    if (status === "RECHAZADO") {
      approver_comment = window.prompt("Agrega un comentario para el rechazo:", "");
      if (approver_comment === null) {
        return;
      }
    }
    try {
      await api.patch(`/expenses/${id}/status`, { status, approver_comment });
      await loadExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    setConfirmState({
      type: "delete-expense",
      expenseId: id,
      title: "Eliminar rendición",
      message:
        "¿Seguro que quieres eliminar esta rendición? Esta acción no se puede deshacer.",
    });
  };

  const baseURL = useMemo(
    () => (api.defaults.baseURL || "").replace(/\/$/, ""),
    []
  );

  useEffect(() => {
    if (user.role === "APROBADOR" || user.role === "ADMIN") {
      loadUsers();
      setUserFilter("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchFilter]);

  useEffect(() => {
    if (!startDateFilter || !endDateFilter) {
      setDateError("");
      loadExpenses();
      return;
    }
    if (startDateFilter > endDateFilter) {
      setExpenses([]);
      setDateError("La fecha inicial no puede ser mayor a la final.");
      return;
    }
    setDateError("");
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDateFilter, endDateFilter, userFilter, branchFilter, statusView]);

  if (user.role !== "APROBADOR" && user.role !== "ADMIN") {
    return <SummaryPage user={user} onUserRefresh={null} />;
  }

  const isPendingView = statusView === "PENDIENTE";
  const rendidores = users.filter((item) => item.role === "RENDIDOR");

  const handleClearDateFilters = () => {
    setStartDateFilter("");
    setEndDateFilter("");
  };

  return (
    <div>
      <h1>Aprobación de Gastos</h1>
      <p>
        Revisa y aprueba las rendiciones enviadas por los usuarios para mantener
        el control interno.
      </p>

      <div className="filters">
        <label>
          Sucursal
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
          >
            <option value="">Todas</option>
            {BRANCHES.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </label>
        <label>
          Rendidor
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
          >
            <option value="">Todos</option>
            {loadingUsers ? (
              <option value="">Cargando...</option>
            ) : (
              rendidores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.branch})
                </option>
              ))
            )}
          </select>
        </label>
        <label>
          Desde
          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="secondary"
          onClick={handleClearDateFilters}
          disabled={!startDateFilter && !endDateFilter}
        >
          Limpiar fechas
        </button>
      </div>

      {dateError && <p className="message">{dateError}</p>}

      {user.role === "ADMIN" && (
        <div className="tabs">
          <button
            type="button"
            className={isPendingView ? "active" : ""}
            onClick={() => {
              setStatusView("PENDIENTE");
              loadExpenses("PENDIENTE");
            }}
          >
            Pendientes
          </button>
          <button
            type="button"
            className={!isPendingView ? "active" : ""}
            onClick={() => {
              setStatusView("APROBADO");
              loadExpenses("APROBADO");
            }}
          >
            Aprobadas
          </button>
        </div>
      )}

      {loading && <p>Cargando...</p>}

      <div className="card">
        {expenses.length === 0 && (
          <p>
            {isPendingView ? "No hay gastos pendientes." : "No hay gastos aprobados."}
          </p>
        )}
        {expenses.map((e) => (
          <div key={e.id} className="expense-row approval">
            <div>
              <strong>{e.provider}</strong>
              <div className="expense-meta">
                {e.title} · {formatDate(e.expense_date)} ·{" "}
                {e.branch}
              </div>
              <div className="expense-meta">
                {formatDocumentType(e.document_type)} · N° {e.document_number}
              </div>
              <div className="expense-meta">
                Tipo de rendición: {formatRenditionType(e.rendition_type)}
              </div>
              <p className="expense-description">{e.description}</p>
              <div className="expense-meta">Estado: {e.status}</div>
              <div className="expense-amount">
                {formatCLP(e.amount)}
              </div>
              {e.document_path && (
                <a
                  className="document-link"
                  href={`${baseURL}${e.document_path}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver documento
                </a>
              )}
            </div>
            <div className="actions">
              {isPendingView && (
                <>
                  <button onClick={() => setConfirmApprove(e)}>
                    Aprobar
                  </button>
                  <button
                    className="secondary"
                    onClick={() => handleAction(e.id, "RECHAZADO")}
                  >
                    Rechazar
                  </button>
                  {user.role === "ADMIN" && (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => handleDelete(e.id)}
                    >
                      Eliminar
                    </button>
                  )}
                </>
              )}
              {!isPendingView && user.role === "ADMIN" && (
                <>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => handleAction(e.id, "PENDIENTE")}
                  >
                    Desaprobar (volver a pendiente)
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleAction(e.id, "RECHAZADO")}
                  >
                    Marcar como rechazado
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {confirmApprove && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h2>Confirmar aprobación</h2>
            <p>Estás a punto de aprobar esta rendición:</p>
            <p className="modal-highlight">
              <strong>{confirmApprove.provider}</strong> · {confirmApprove.title} ·{" "}
              {formatCLP(confirmApprove.amount)}
            </p>
            <p>¿Confirmas que deseas aprobarla?</p>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setConfirmApprove(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleAction(confirmApprove.id, "APROBADO");
                  setConfirmApprove(null);
                }}
              >
                Sí, aprobar rendición
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        onCancel={() => setConfirmState(null)}
        onConfirm={async () => {
          if (!confirmState) return;
          const current = confirmState;
          setConfirmState(null);
          if (current.type === "delete-expense") {
            try {
              await api.delete(`/expenses/${current.expenseId}`);
              await loadExpenses();
            } catch (err) {
              console.error(err);
            }
          }
        }}
      />
    </div>
  );
}
