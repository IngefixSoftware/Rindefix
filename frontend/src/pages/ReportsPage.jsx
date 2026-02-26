import { useEffect, useMemo, useState } from "react";
import api from "../api";
import { BRANCHES, RENDITION_TYPE_LABELS } from "../constants";
import { formatCLP, formatDate } from "../utils/format";
import SummaryPage from "./SummaryPage";
import ConfirmDialog from "../components/ConfirmDialog";

export default function ReportsPage({ user }) {
  const [summary, setSummary] = useState(null);
  const [branchFilter, setBranchFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [users, setUsers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [dateError, setDateError] = useState("");
  const baseURL = useMemo(() => (api.defaults.baseURL || "").replace(/\/$/, ""), []);

  const canView = user.role === "APROBADOR" || user.role === "ADMIN";
  const canDeleteExpenses = user.role === "ADMIN";
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementStart, setMovementStart] = useState("");
  const [movementEnd, setMovementEnd] = useState("");
  const [confirmState, setConfirmState] = useState(null);

  const loadSummary = async () => {
    if (!userFilter) {
      setSummary(null);
      return;
    }
    setLoadingSummary(true);
    try {
      const params = {};
      if (branchFilter && branchFilter !== "ALL") params.branch = branchFilter;
      if (userFilter !== "ALL") {
        params.user_id = Number(userFilter);
      }
      const res = await api.get("/reports/summary", { params });
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const params = { role: "RENDIDOR" };
      if (branchFilter && branchFilter !== "ALL") params.branch = branchFilter;
      const res = await api.get("/users", { params });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (canView) {
      loadSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchFilter, userFilter]);

  useEffect(() => {
    if (canView) {
      loadUsers();
      setUserFilter("");
      setExpenses([]);
      setMovements([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchFilter]);

  useEffect(() => {
    const fetchExpenses = async () => {
      if (!userFilter) {
        setExpenses([]);
        setDateError("");
        return;
      }
      if (startDateFilter && endDateFilter && startDateFilter > endDateFilter) {
        setExpenses([]);
        setDateError("La fecha inicial no puede ser mayor a la final.");
        return;
      }
      setDateError("");
      setLoadingExpenses(true);
      try {
        const params = {};
        if (userFilter !== "ALL") {
          params.user_id = Number(userFilter);
        }
        if (statusFilter) params.status = statusFilter;
        if (startDateFilter) params.start_date = startDateFilter;
        if (endDateFilter) params.end_date = endDateFilter;
        const { data } = await api.get("/expenses", {
          params,
        });
        const filtered =
          userFilter === "ALL" && branchFilter && branchFilter !== "ALL"
            ? data.filter((item) => item.branch === branchFilter)
            : data;
        setExpenses(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingExpenses(false);
      }
    };

    if (canView) {
      fetchExpenses();
    }
  }, [userFilter, statusFilter, startDateFilter, endDateFilter, canView]);

  useEffect(() => {
    const fetchMovements = async () => {
      if (!canView || !userFilter || userFilter === "ALL") {
        setMovements([]);
        return;
      }
      setLoadingMovements(true);
      try {
        const { data } = await api.get(`/users/${Number(userFilter)}/settlements`);
        setMovements(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMovements(false);
      }
    };
    fetchMovements();
  }, [canView, userFilter]);

  const hasInvalidMovementRange =
    movementStart && movementEnd && movementStart > movementEnd;

  const filteredMovements = hasInvalidMovementRange
    ? []
    : movements.filter((m) => {
        const dateStr = (m.created_at || "").slice(0, 10);
        if (movementStart && dateStr < movementStart) return false;
        if (movementEnd && dateStr > movementEnd) return false;
        return true;
      });

  if (!canView) {
    return <SummaryPage user={user} onUserRefresh={null} />;
  }

  const rendidores = users.filter((item) => item.role === "RENDIDOR");
  const selectedRendidor =
    userFilter && userFilter !== "ALL"
      ? rendidores.find((item) => item.id === Number(userFilter))
      : null;
  const saldoAFavorSeleccionado = selectedRendidor
    ? Math.max(0, -Number(selectedRendidor.budget_available ?? 0))
    : 0;

  const handleClearDateFilters = () => {
    setStartDateFilter("");
    setEndDateFilter("");
  };

  const hasUserSelection = Boolean(userFilter);
  const isAllSelection = userFilter === "ALL";

  return (
    <div>
      <h1>Resumen de rendiciones</h1>
      <p>
        Visualiza en tiempo real los totales por sucursal o rendidor y revisa la tabla detallada con
        filtros por estado y fecha.
      </p>

      <div className="filters">
        <label>
          Sucursal
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="">Selecciona una sucursal</option>
            <option value="ALL">Todas</option>
            {BRANCHES.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </label>
        <label>
          Rendidor
          <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
            <option value="">Selecciona un rendidor</option>
            <option value="ALL">Todos</option>
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
          Estado
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="APROBADO">Aprobado</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
        </label>
        <label>
          Desde
          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            disabled={!hasUserSelection}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            disabled={!hasUserSelection}
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

      {loadingSummary && hasUserSelection ? (
        <p>Cargando resumen...</p>
      ) : (
        <div className="grid">
          <div className="card stat">
            <span>Total de gastos</span>
            <strong>{formatCLP(summary?.total_gastos || 0)}</strong>
          </div>
          <div className="card stat">
            <span>Pendientes (documentos)</span>
            <strong>{summary?.pendiente_count || 0}</strong>
          </div>
          <div className="card stat">
            <span>Aprobados (documentos)</span>
            <strong>{summary?.aprobado_count || 0}</strong>
          </div>
          <div className="card stat">
            <span>Rechazados (documentos)</span>
            <strong>{summary?.rechazado_count || 0}</strong>
          </div>
          <div className="card stat">
            <span>Cantidad de rendiciones</span>
            <strong>{summary?.cantidad_gastos || 0}</strong>
          </div>
          {selectedRendidor && (
            <div className="card stat">
              <span>Saldo a favor del rendidor</span>
              <strong>{formatCLP(saldoAFavorSeleccionado)}</strong>
            </div>
          )}
        </div>
      )}
      {!hasUserSelection && <p>Selecciona un rendidor o elige "Todos" para ver el resumen.</p>}

      <div className="card">
        <h2>{isAllSelection ? "Rendiciones (todos los usuarios)" : "Rendiciones del usuario"}</h2>
        {!hasUserSelection && <p>Selecciona un rendidor para ver sus movimientos.</p>}
        {hasUserSelection && (
          <>
            {dateError && <p className="message">{dateError}</p>}
            {loadingExpenses ? (
              <p>Cargando rendiciones...</p>
            ) : expenses.length === 0 ? (
              <p>
                {isAllSelection
                  ? "No hay rendiciones registradas con los filtros seleccionados."
                  : "El usuario no tiene rendiciones registradas."}
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Proveedor</th>
                      <th>Descripción</th>
                      <th>N° Documento</th>
                      <th>Tipo de rendición</th>
                      <th>Comentario</th>
                      <th>Estado</th>
                      <th>Monto</th>
                      <th>Documento</th>
                      {canDeleteExpenses && <th>Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((item) => {
                      const docUrl = item.document_path
                        ? `${baseURL}${item.document_path}`
                        : null;
                      return (
                        <tr key={item.id}>
                          <td>{formatDate(item.expense_date)}</td>
                          <td>{item.provider}</td>
                          <td>{item.description}</td>
                          <td>{item.document_number}</td>
                          <td>{RENDITION_TYPE_LABELS[item.rendition_type] || item.rendition_type}</td>
                          <td>{item.approver_comment || "-"}</td>
                          <td>{item.status}</td>
                          <td>{formatCLP(item.amount)}</td>
                          <td>
                            {docUrl ? (
                              <a
                                href={docUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="document-link button-link"
                              >
                                Ver documento
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                          {canDeleteExpenses && (
                            <td>
                              <button
                                type="button"
                                className="danger"
                                onClick={() => {
                                  setConfirmState({
                                    type: "delete-expense",
                                    expenseId: item.id,
                                    title: "Eliminar rendición",
                                    message:
                                      "¿Seguro que quieres eliminar esta rendición? Esta acción no se puede deshacer.",
                                  });
                                }}
                              >
                                Eliminar
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
      {hasUserSelection && userFilter !== "ALL" && (
        <div className="card">
          <h2>Cartola de transferencias del rendidor</h2>
          {loadingMovements ? (
            <p>Cargando movimientos...</p>
          ) : (
            <>
              <div className="filters">
                <label>
                  Desde
                  <input
                    type="date"
                    value={movementStart}
                    onChange={(e) => setMovementStart(e.target.value)}
                  />
                </label>
                <label>
                  Hasta
                  <input
                    type="date"
                    value={movementEnd}
                    onChange={(e) => setMovementEnd(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setMovementStart("");
                    setMovementEnd("");
                  }}
                  disabled={!movementStart && !movementEnd}
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!movements.length) return;
                    const rows = filteredMovements.map((m) => [
                      new Date(m.created_at).toLocaleString(),
                      m.amount,
                      m.balance_before,
                      m.balance_after,
                      m.description || "",
                    ]);
                    if (!rows.length) return;
                    const userId = userFilter && userFilter !== "ALL" ? userFilter : "todos";
                    downloadExcel(
                      `cartola_rendidor_${userId}`,
                      ["Fecha", "Monto transferido", "Saldo antes", "Saldo después", "Detalle"],
                      rows
                    );
                  }}
                  disabled={loadingMovements || !movements.length}
                >
                  Descargar cartola
                </button>
              </div>
              {hasInvalidMovementRange && (
                <p className="message">
                  La fecha inicial no puede ser mayor a la final.
                </p>
              )}
              {movements.length === 0 ? (
            <p>Este rendidor aún no tiene transferencias registradas.</p>
              ) : filteredMovements.length === 0 && !hasInvalidMovementRange ? (
                <p>No hay transferencias en el período seleccionado.</p>
              ) : (
            <div className="table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Monto transferido</th>
                    <th>Saldo antes</th>
                    <th>Saldo después</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((m) => (
                    <tr key={m.id}>
                      <td>{new Date(m.created_at).toLocaleString()}</td>
                      <td>{formatCLP(m.amount)}</td>
                      <td>{formatCLP(m.balance_before)}</td>
                      <td>{formatCLP(m.balance_after)}</td>
                      <td>{m.description || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
              )}
            </>
          )}
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
              const params = {};
              if (userFilter && userFilter !== "ALL") {
                params.user_id = Number(userFilter);
              }
              if (statusFilter) params.status = statusFilter;
              if (startDateFilter) params.start_date = startDateFilter;
              if (endDateFilter) params.end_date = endDateFilter;
              const { data } = await api.get("/expenses", { params });
              setExpenses(data);
              loadSummary();
            } catch (err) {
              console.error(err);
            }
          }
        }}
      />
    </div>
  );
}
