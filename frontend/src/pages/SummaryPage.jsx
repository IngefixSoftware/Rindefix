import { useEffect, useRef, useState } from "react";
import api from "../api";
import { RENDITION_TYPE_LABELS } from "../constants";
import { formatCLP } from "../utils/format";
import { downloadExcel } from "../utils/export";

export default function SummaryPage({ user, onUserRefresh }) {
  const [profile, setProfile] = useState(user);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [rejectedAmount, setRejectedAmount] = useState(0);
  const [loadingAmounts, setLoadingAmounts] = useState(false);
  const availableBalance = Number(profile?.budget_available ?? 0);
  const saldoAFavor = availableBalance < 0 ? Math.abs(availableBalance) : 0;
  const negativeBalance = availableBalance < 0;
  const isRendidor = user.role === "RENDIDOR";
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const showExportControls = user.role !== "RENDIDOR";
  const [exportScope, setExportScope] = useState(
    showExportControls ? (user.role === "ADMIN" || user.role === "APROBADOR" ? "global" : "mine") : "mine"
  );
  const [exportError, setExportError] = useState("");
  const [exporting, setExporting] = useState(false);
  const canExportGlobal = user.role === "ADMIN" || user.role === "APROBADOR";
  const [exportUsers, setExportUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loadingExportUsers, setLoadingExportUsers] = useState(false);
  const canViewSummary = user.role === "RENDIDOR" || canExportGlobal;
  const wsRef = useRef(null);

  const refreshProfile = async () => {
    if (!onUserRefresh) {
      setProfile(user);
      return;
    }
    const updated = await onUserRefresh();
    if (updated) {
      setProfile(updated);
    }
  };

  const loadAmounts = async () => {
    setLoadingAmounts(true);
    try {
      const [pendingRes, rejectedRes] = await Promise.all([
        api.get("/expenses", { params: { user_id: user.id, status: "PENDIENTE" } }),
        api.get("/expenses", { params: { user_id: user.id, status: "RECHAZADO" } }),
      ]);
      const sum = (items) => items.reduce((acc, item) => acc + Number(item.amount), 0);
      setPendingAmount(sum(pendingRes.data));
      setRejectedAmount(sum(rejectedRes.data));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAmounts(false);
    }
  };

  useEffect(() => {
    if (canViewSummary) {
      refreshProfile();
      loadAmounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, canViewSummary]);

  useEffect(() => {
    if (!canViewSummary) return;
    let retryTimeout;
    const connectWS = () => {
      const httpBase = api.defaults.baseURL || window.location.origin;
      const wsBase = (import.meta.env.VITE_WS_URL || httpBase)
        .replace(/^http/, "ws")
        .replace(/\/$/, "");
      const socket = new WebSocket(`${wsBase}/ws/approvals`);
      wsRef.current = socket;

      socket.onmessage = () => {
        refreshProfile();
        loadAmounts();
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
  }, [canViewSummary, user.id]);

  useEffect(() => {
    setExportScope(
      showExportControls && (user.role === "ADMIN" || user.role === "APROBADOR")
        ? "global"
        : "mine"
    );
    setSelectedUserId("");
  }, [user.role, showExportControls]);

  useEffect(() => {
    if (!canExportGlobal) return;
    const fetchUsers = async () => {
      setLoadingExportUsers(true);
      try {
        const { data } = await api.get("/users", { params: { role: "RENDIDOR" } });
        setExportUsers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingExportUsers(false);
      }
    };
    fetchUsers();
  }, [canExportGlobal]);

  if (!canViewSummary) {
    return (
      <div className="card">
        <p>Esta vista resume el saldo y pendientes de los rendidores.</p>
      </div>
    );
  }

  const handleExport = async () => {
    if (!showExportControls) return;
    if (startDate && endDate && startDate > endDate) {
      setExportError("La fecha inicial no puede ser mayor a la final.");
      return;
    }
    setExportError("");
    const params = {};
    const effectiveScope = canExportGlobal ? exportScope : "mine";
    if (effectiveScope === "mine") {
      params.user_id = user.id;
    } else if (effectiveScope === "user") {
      if (!selectedUserId) {
        setExportError("Selecciona un usuario para exportar.");
        return;
      }
      params.user_id = Number(selectedUserId);
    }
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    try {
      setExporting(true);
      const { data } = await api.get("/expenses", { params });
      if (!data.length) {
        setExportError("No hay rendiciones para exportar con los filtros seleccionados.");
        return;
      }
      let scopeLabel = "global";
      if (params.user_id) {
        scopeLabel = `usuario-${params.user_id}`;
      }
      const filenameParts = ["rendiciones", scopeLabel];
      if (startDate) filenameParts.push(`desde-${startDate}`);
      if (endDate) filenameParts.push(`hasta-${endDate}`);
      const rows = data.map((item) => [
        item.expense_date,
        item.provider,
        item.title,
        item.document_number,
        RENDITION_TYPE_LABELS[item.rendition_type] || item.rendition_type,
        item.status,
        item.approver_comment ?? "",
        item.description,
        item.amount,
        item.branch,
        item.user_id,
      ]);
      downloadExcel(
        filenameParts.join("_"),
        [
          "Fecha",
          "Proveedor",
          "Título",
          "N° Documento",
          "Tipo de rendición",
          "Estado",
          "Comentario",
          "Descripción",
          "Monto",
          "Sucursal",
          "User ID",
        ],
        rows
      );
    } catch (err) {
      console.error(err);
      setExportError("No se pudo generar el archivo. Inténtalo nuevamente.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="upload-shell">
      <div className="card summary-card full">
        <h1>Resumen de rendición</h1>
        {showExportControls && (
          <>
            <div className="filters">
              {canExportGlobal && (
                <label>
                  Alcance
                  <select
                    value={exportScope}
                    onChange={(e) => {
                      const value = e.target.value;
                      setExportScope(value);
                      if (value !== "user") {
                        setSelectedUserId("");
                      }
                    }}
                  >
                    <option value="global">Todas las rendiciones</option>
                    <option value="mine">Mis rendiciones</option>
                    <option value="user">Por rendidor</option>
                  </select>
                </label>
              )}
              {canExportGlobal && exportScope === "user" && (
                <label>
                  Rendidor
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    disabled={loadingExportUsers}
                  >
                    <option value="">Selecciona un rendidor</option>
                    {loadingExportUsers ? (
                      <option value="">Cargando...</option>
                    ) : (
                      exportUsers.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.branch})
                        </option>
                      ))
                    )}
                  </select>
                </label>
              )}
              <label>
                Desde
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label>
                Hasta
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
              <button type="button" onClick={handleExport} disabled={exporting}>
                {exporting ? "Generando..." : "Exportar a Excel"}
              </button>
            </div>
            {exportError && <p className="message">{exportError}</p>}
          </>
        )}
        <div className="summary-grid cards">
          <article>
            <span>Monto asignado</span>
            <strong>{formatCLP(profile?.budget_assigned)}</strong>
          </article>
          <article>
            <span>Saldo disponible</span>
            <strong className={negativeBalance ? "negative-balance" : ""}>
              {formatCLP(profile?.budget_available)}
            </strong>
          </article>
          <article>
            <span>Saldo a favor</span>
            <strong>{formatCLP(saldoAFavor)}</strong>
            <small>Este es el monto que la empresa debe devolverte.</small>
          </article>
          {!isRendidor && (
            <>
              <article>
                <span>Pendiente por aprobar</span>
                {loadingAmounts ? <strong>Cargando…</strong> : <strong>{formatCLP(pendingAmount)}</strong>}
              </article>
              <article>
                <span>Rechazado</span>
                {loadingAmounts ? <strong>Cargando…</strong> : <strong>{formatCLP(rejectedAmount)}</strong>}
              </article>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
