import { useCallback, useEffect, useState } from "react";
import api from "../api";
import { RENDITION_TYPE_LABELS } from "../constants";
import { formatCLP, formatDate } from "../utils/format";

const STATUS_LABEL = {
  PENDIENTE: "pendientes",
  APROBADO: "aprobadas",
  RECHAZADO: "rechazadas",
};

const PAGE_SIZE = 6;

export default function MyExpensesPage({ user, status }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({ start: "", end: "" });
  const [filterError, setFilterError] = useState("");

  const title =
    status === "APROBADO"
      ? "Mis rendiciones aprobadas"
      : status === "RECHAZADO"
      ? "Mis rendiciones rechazadas"
      : "Mis rendiciones pendientes";

  if (user.role !== "RENDIDOR") {
    return null;
  }

  const loadExpenses = useCallback(
    async (pageToLoad = 0, reset = false) => {
      setLoading(true);
      try {
        const params = {
          user_id: user.id,
          status,
          limit: PAGE_SIZE,
          offset: pageToLoad * PAGE_SIZE,
        };
        if (appliedFilters.start) params.start_date = appliedFilters.start;
        if (appliedFilters.end) params.end_date = appliedFilters.end;
        const { data } = await api.get("/expenses", {
          params,
        });
        setHasMore(data.length === PAGE_SIZE);
        setExpenses((prev) => (reset || pageToLoad === 0 ? data : [...prev, ...data]));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [user.id, status, appliedFilters.start, appliedFilters.end]
  );

  useEffect(() => {
    setPage(0);
    loadExpenses(0, true);
  }, [status, appliedFilters.start, appliedFilters.end, loadExpenses]);

  useEffect(() => {
    if (page === 0) return;
    loadExpenses(page);
  }, [page, loadExpenses]);

  const handleApplyFilters = () => {
    if (startInput && endInput && startInput > endInput) {
      setFilterError("La fecha inicial no puede ser mayor a la final.");
      return;
    }
    setFilterError("");
    setAppliedFilters({ start: startInput, end: endInput });
  };

  const handleClearFilters = () => {
    setStartInput("");
    setEndInput("");
    setFilterError("");
    setAppliedFilters({ start: "", end: "" });
  };

  const handleLoadMore = () => {
    if (loading || !hasMore) return;
    setPage((prev) => prev + 1);
  };

  const disableClear =
    !startInput &&
    !endInput &&
    !appliedFilters.start &&
    !appliedFilters.end;

  return (
    <div>
      <h1>{title}</h1>
      <p>Revisa todas tus rendiciones {STATUS_LABEL[status] || ""} y su estado actual.</p>

      <div className="filters">
        <label>
          Desde
          <input type="date" value={startInput} onChange={(e) => setStartInput(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={endInput} onChange={(e) => setEndInput(e.target.value)} />
        </label>
        <button type="button" onClick={handleApplyFilters}>
          Buscar por fecha
        </button>
        <button type="button" className="secondary" onClick={handleClearFilters} disabled={disableClear}>
          Limpiar
        </button>
      </div>
      {filterError && <p className="message">{filterError}</p>}

      <div className="card">
        {loading && expenses.length === 0 ? (
          <p>Cargando rendiciones...</p>
        ) : expenses.length === 0 ? (
          <p>
            No tienes rendiciones {STATUS_LABEL[status]} en este periodo. Ajusta las fechas para ver
            otras rendiciones.
          </p>
        ) : (
          <>
            <ul className="pending-list">
              {expenses.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <div className="expense-meta">
                      {item.provider} · {formatDate(item.expense_date)}
                    </div>
                    <div className="expense-meta">N° documento: {item.document_number}</div>
                    <div className="expense-meta">
                      Tipo de rendición: {RENDITION_TYPE_LABELS[item.rendition_type] || item.rendition_type}
                    </div>
                    {item.approver_comment && (
                      <div className="expense-meta rejection-comment">
                        <strong>Comentario de rechazo:</strong> {item.approver_comment}
                      </div>
                    )}
                  </div>
                  <div className="expense-amount">{formatCLP(item.amount)}</div>
                </li>
              ))}
            </ul>
            {hasMore && (
              <button
                type="button"
                className="secondary"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? "Cargando..." : "Mostrar más"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
