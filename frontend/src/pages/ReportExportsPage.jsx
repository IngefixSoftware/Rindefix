import { useEffect, useState } from "react";
import api from "../api";
import { BRANCHES, RENDITION_TYPES } from "../constants";
import { triggerDownload } from "../utils/export";
import { formatCLP, formatDate } from "../utils/format";

export default function ReportExportsPage({ user }) {
  const [branchFilter, setBranchFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [users, setUsers] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [renditionTypeFilter, setRenditionTypeFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [dateError, setDateError] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");

  const canView = user.role === "APROBADOR" || user.role === "ADMIN";

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const params = { role: "RENDIDOR" };
      if (branchFilter) params.branch = branchFilter;
      const { data } = await api.get("/users", { params });
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (canView) {
      loadUsers();
      setUserFilter("");
      setExpenses([]);
      setStartDateFilter("");
      setEndDateFilter("");
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
        const params = { user_id: Number(userFilter) };
        if (statusFilter) params.status = statusFilter;
        if (renditionTypeFilter) params.rendition_type = renditionTypeFilter;
        if (startDateFilter) params.start_date = startDateFilter;
        if (endDateFilter) params.end_date = endDateFilter;
        const { data } = await api.get("/expenses", { params });
        setExpenses(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingExpenses(false);
      }
    };

    if (canView) {
      fetchExpenses();
    }
  }, [canView, userFilter, statusFilter, renditionTypeFilter, startDateFilter, endDateFilter]);

  if (!canView) {
    return null;
  }

  const rendidores = users.filter((item) => item.role === "RENDIDOR");

  const handleExportExcel = async () => {
    if (!userFilter) return;

    const selectedUser = users.find(
      (item) => item.id === Number(userFilter)
    );
    const todayStr = new Date().toISOString().slice(0, 10);
    const rawName = selectedUser?.name || `usuario-${userFilter}`;
    const safeName = rawName.replace(/[^a-zA-Z0-9 \-_]/g, "_").trim();
    const filename = `${safeName}_${todayStr}`;

    try {
      const params = { user_id: Number(userFilter) };
      if (branchFilter) params.branch = branchFilter;
      if (renditionTypeFilter) params.rendition_type = renditionTypeFilter;
      if (startDateFilter) params.start_date = startDateFilter;
      if (endDateFilter) params.end_date = endDateFilter;

      const response = await api.get("/reports/pending-excel", {
        params,
        responseType: "blob",
      });

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      triggerDownload(blob, filename, ".xlsx");
    } catch (err) {
      console.error(err);
      let detail = "No se pudo generar el archivo de Excel.";
      try {
        const respData = err.response?.data;
        if (respData instanceof Blob) {
          const text = await respData.text();
          try {
            const parsed = JSON.parse(text);
            if (parsed?.detail) {
              detail = parsed.detail;
            } else if (text) {
              detail = text;
            }
          } catch {
            if (text) {
              detail = text;
            }
          }
        } else if (respData?.detail) {
          detail = respData.detail;
        }
      } catch (parseError) {
        console.error("Error al leer detalle del error:", parseError);
      }
      window.alert(detail);
    }
  };

  const handleClearDateFilters = () => {
    setStartDateFilter("");
    setEndDateFilter("");
  };

  const handleSendByEmail = async () => {
    if (!userFilter) return;
    setEmailStatus("");
    setSendingEmail(true);
    try {
      await api.post("/reports/send-email", {
        branch: branchFilter || null,
        user_id: Number(userFilter),
        status: statusFilter || null,
        start_date: startDateFilter || null,
        end_date: endDateFilter || null,
        rendition_type: renditionTypeFilter || null,
      });
      setEmailStatus("Informe enviado por correo correctamente.");
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail ?? "No se pudo enviar el correo.";
      setEmailStatus(detail);
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div>
      <h1>Generar informes</h1>
      <p>Exporta la información consolidada en formato XLSX para análisis externo.</p>

      <div className="filters">
        <label>
          Sucursal
          <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
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
          <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
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
          Estado
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} disabled={!userFilter}>
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="APROBADO">Aprobado</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
        </label>
        <label>
          Tipo de rendición
          <select
            value={renditionTypeFilter}
            onChange={(e) => setRenditionTypeFilter(e.target.value)}
            disabled={!userFilter}
          >
            <option value="">Todas</option>
            {RENDITION_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Desde
          <input
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            disabled={!userFilter}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            disabled={!userFilter}
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

      <div className="export-actions">
        <button
          type="button"
          className="secondary"
          onClick={handleExportExcel}
          disabled={!userFilter || loadingExpenses}
        >
          Informe rendiciones del usuario
        </button>
        <button
          type="button"
          onClick={handleSendByEmail}
          disabled={!userFilter || sendingEmail}
        >
          {sendingEmail ? "Enviando informe..." : "Enviar informe por correo"}
        </button>
      </div>

      {emailStatus && (
        <div className="status-card">
          {emailStatus}
        </div>
      )}

      <div className="card">
        <h2>Vista previa del informe</h2>
        {!userFilter && <p>Selecciona un rendidor para ver la vista previa.</p>}
        {userFilter && loadingExpenses && <p>Preparando rendiciones del usuario...</p>}
        {userFilter && !loadingExpenses && expenses.length === 0 && !dateError && (
          <p>El usuario no tiene rendiciones en el periodo seleccionado.</p>
        )}
        {userFilter && !loadingExpenses && expenses.length > 0 && (
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Proveedor</th>
                  <th>Título</th>
                  <th>Tipo de documento</th>
                  <th>N° Documento</th>
                  <th>Estado</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.expense_date)}</td>
                    <td>{item.provider}</td>
                    <td>{item.title}</td>
                    <td>{item.document_type}</td>
                    <td>{item.document_number}</td>
                    <td>{item.status}</td>
                    <td>{formatCLP(item.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={5} style={{ textAlign: "right", fontWeight: "bold" }}>
                    Total
                  </td>
                  <td style={{ fontWeight: "bold" }}>
                    {formatCLP(
                      expenses.reduce(
                        (sum, item) => sum + Number(item.amount || 0),
                        0
                      )
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
