import { useEffect, useState } from "react";
import api from "../api";
import { BRANCHES } from "../constants";
import { formatCLP, parseCLP } from "../utils/format";
import ConfirmDialog from "../components/ConfirmDialog";

const roleLabels = {
  RENDIDOR: "Rendidor",
  APROBADOR: "Aprobador",
  ADMIN: "Administrador",
};

export default function UsersPage({ user, onUserRefresh }) {
  const [users, setUsers] = useState([]);
  const [branchFilter, setBranchFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [budgetInputs, setBudgetInputs] = useState({});
  const [overdraftInputs, setOverdraftInputs] = useState({});
  const [fondoRendirInputs, setFondoRendirInputs] = useState({});
  const [fondoRendirOverdraftInputs, setFondoRendirOverdraftInputs] = useState({});
  const [availableTopupInputs, setAvailableTopupInputs] = useState({});
  const [fondoRendirAvailableTopupInputs, setFondoRendirAvailableTopupInputs] =
    useState({});
  const [budgetMessage, setBudgetMessage] = useState("");
  const [confirmState, setConfirmState] = useState(null);

  const canAssignBudget = user.role === "ADMIN";
  const canViewUsers = user.role === "ADMIN" || user.role === "APROBADOR";
  const canDeleteUsers = user.role === "ADMIN";
  const getSaldoAFavor = (item) => Math.max(0, -Number(item?.budget_available ?? 0));

  const loadUsers = async () => {
    if (!branchFilter) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = {};
      if (branchFilter !== "ALL") params.branch = branchFilter;
      const { data } = await api.get("/users", { params });
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canViewUsers) {
      loadUsers();
    }
  }, [canViewUsers, branchFilter]);

  if (!canViewUsers) {
    return (
      <div className="card">
        <p>Solo Gerencia o un administrador pueden visualizar los usuarios.</p>
      </div>
    );
  }

  const handleBudgetInput = (id, value) => {
    setBudgetInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleBudgetSave = async (id) => {
    const rawValue = budgetInputs[id];
    const amount = parseCLP(rawValue);
    setBudgetMessage("");
    if (!rawValue) {
      setBudgetMessage("Ingresa un monto válido.");
      return;
    }
    try {
      await api.patch(`/users/${id}`, { budget_assigned: amount });
      setBudgetMessage("Monto asignado/actualizado correctamente.");
      setBudgetInputs((prev) => ({ ...prev, [id]: "" }));
      await loadUsers();
      if (user.id === id && onUserRefresh) {
        await onUserRefresh();
      }
    } catch (err) {
      console.error(err);
      const detail =
        err.response?.data?.detail ?? "No se pudo actualizar el monto asignado.";
      setBudgetMessage(detail);
    }
  };

  const handleOverdraftInput = (id, value) => {
    setOverdraftInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleOverdraftSave = async (id) => {
    const rawValue = overdraftInputs[id];
    const amount = parseCLP(rawValue);
    setBudgetMessage("");
    if (rawValue === undefined || rawValue === "") {
      setBudgetMessage("Ingresa un monto válido.");
      return;
    }
    try {
      await api.patch(`/users/${id}`, { overdraft_limit: amount });
      setBudgetMessage("Límite de sobregiro actualizado.");
      setOverdraftInputs((prev) => ({ ...prev, [id]: "" }));
      await loadUsers();
      if (user.id === id && onUserRefresh) {
        await onUserRefresh();
      }
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail ?? "No se pudo actualizar el límite.";
      setBudgetMessage(detail);
    }
  };

  const handleFondoRendirInput = (id, value) => {
    setFondoRendirInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleFondoRendirSave = async (id) => {
    const rawValue = fondoRendirInputs[id];
    const amount = parseCLP(rawValue);
    setBudgetMessage("");
    if (rawValue === undefined || rawValue === "") {
      setBudgetMessage("Ingresa un monto válido.");
      return;
    }
    try {
      await api.patch(`/users/${id}`, { fondo_por_rendir_assigned: amount });
      setBudgetMessage("Fondo por rendir asignado/actualizado correctamente.");
      setFondoRendirInputs((prev) => ({ ...prev, [id]: "" }));
      await loadUsers();
      if (user.id === id && onUserRefresh) {
        await onUserRefresh();
      }
    } catch (err) {
      console.error(err);
      const detail =
        err.response?.data?.detail ??
        "No se pudo actualizar el fondo por rendir.";
      setBudgetMessage(detail);
    }
  };

  const handleFondoRendirAvailableTopupInput = (id, value) => {
    setFondoRendirAvailableTopupInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleFondoRendirAvailableTopupSave = async (userItem) => {
    const id = userItem.id;
    const rawValue = fondoRendirAvailableTopupInputs[id];
    const amount = parseCLP(rawValue);
    setBudgetMessage("");
    if (rawValue === undefined || rawValue === "" || !amount || amount <= 0) {
      setBudgetMessage("Ingresa un monto válido mayor a 0.");
      return;
    }
    try {
      const currentAvailable = Number(userItem.fondo_por_rendir_available ?? 0);
      const newAvailable = currentAvailable + amount;
      await api.patch(`/users/${id}`, { fondo_por_rendir_available: newAvailable });
      setBudgetMessage(
        "Fondo por rendir disponible actualizado correctamente (sin cambiar el asignado)."
      );
      setFondoRendirAvailableTopupInputs((prev) => ({ ...prev, [id]: "" }));
      await loadUsers();
      if (user.id === id && onUserRefresh) {
        await onUserRefresh();
      }
    } catch (err) {
      console.error(err);
      const detail =
        err.response?.data?.detail ??
        "No se pudo actualizar el fondo por rendir disponible.";
      setBudgetMessage(detail);
    }
  };

  const handleAvailableTopupInput = (id, value) => {
    setAvailableTopupInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleAvailableTopupSave = async (userItem) => {
    const id = userItem.id;
    const rawValue = availableTopupInputs[id];
    const amount = parseCLP(rawValue);
    setBudgetMessage("");
    if (rawValue === undefined || rawValue === "" || !amount || amount <= 0) {
      setBudgetMessage("Ingresa un monto válido mayor a 0.");
      return;
    }
    try {
      const currentAvailable = Number(userItem.budget_available ?? 0);
      const newAvailable = currentAvailable + amount;
      await api.patch(`/users/${id}`, { budget_available: newAvailable });
      setBudgetMessage("Saldo disponible actualizado correctamente (sin cambiar el asignado).");
      setAvailableTopupInputs((prev) => ({ ...prev, [id]: "" }));
      await loadUsers();
      if (user.id === id && onUserRefresh) {
        await onUserRefresh();
      }
    } catch (err) {
      console.error(err);
      const detail =
        err.response?.data?.detail ??
        "No se pudo actualizar el saldo disponible.";
      setBudgetMessage(detail);
    }
  };

  const handleFondoRendirOverdraftInput = (id, value) => {
    setFondoRendirOverdraftInputs((prev) => ({ ...prev, [id]: value }));
  };

  const handleFondoRendirOverdraftSave = async (id) => {
    const rawValue = fondoRendirOverdraftInputs[id];
    const amount = parseCLP(rawValue);
    setBudgetMessage("");
    if (rawValue === undefined || rawValue === "") {
      setBudgetMessage("Ingresa un monto válido.");
      return;
    }
    try {
      await api.patch(`/users/${id}`, { fondo_por_rendir_overdraft_limit: amount });
      setBudgetMessage("Límite de sobregiro de fondos por rendir actualizado.");
      setFondoRendirOverdraftInputs((prev) => ({ ...prev, [id]: "" }));
      await loadUsers();
      if (user.id === id && onUserRefresh) {
        await onUserRefresh();
      }
    } catch (err) {
      console.error(err);
      const detail =
        err.response?.data?.detail ??
        "No se pudo actualizar el límite de sobregiro de fondos por rendir.";
      setBudgetMessage(detail);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!canDeleteUsers) return;
    setConfirmState({
      type: "delete-user",
      userId: id,
      title: "Eliminar usuario",
      message:
        "¿Seguro que quieres eliminar este usuario? Esta acción no se puede deshacer.",
    });
  };

  const handleMarkTransferDone = async (id, saldoAFavor) => {
    if (saldoAFavor <= 0) return;
    setConfirmState({
      type: "settlement",
      userId: id,
      amount: saldoAFavor,
      title: "Confirmar transferencia",
      message: `Vas a registrar una transferencia por ${formatCLP(
        saldoAFavor
      )}. El resumen del usuario se reiniciará a 0. ¿Continuar?`,
    });
  };

  const handleConfirmExecute = async () => {
    if (!confirmState) return;
    const current = confirmState;
    setConfirmState(null);
    try {
      if (current.type === "delete-user") {
        await api.delete(`/users/${current.userId}`);
        if (user.id === current.userId && onUserRefresh) {
          await onUserRefresh();
        }
        await loadUsers();
      } else if (current.type === "settlement") {
        await api.post(`/users/${current.userId}/settlements`, {
          description: "Transferencia registrada desde panel administrador",
        });
        setBudgetMessage("Transferencia registrada correctamente.");
        await loadUsers();
        if (user.id === current.userId && onUserRefresh) {
          await onUserRefresh();
        }
      }
    } catch (err) {
      console.error(err);
      if (current.type === "delete-user") {
        setBudgetMessage("No se pudo eliminar el usuario.");
      } else if (current.type === "settlement") {
        const detail =
          err.response?.data?.detail ??
          "No se pudo registrar la transferencia. Verifica que exista saldo a favor.";
        setBudgetMessage(detail);
      }
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Administración de Usuarios</h1>
          <p className="page-subtitle">
            Gestiona saldos, sobregiros y fondos por rendir de cada rendidor.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header-row">
          <div>
            <h2>Usuarios registrados</h2>
            <p className="card-subtitle">
              Filtra por sucursal y ajusta montos desde una sola vista.
            </p>
          </div>
          <div className="users-legend">
            <span className="legend-dot legend-dot-asignado" /> Asignado
            <span className="legend-separator">•</span>
            <span className="legend-dot legend-dot-disponible" /> Disponible
            <span className="legend-separator">•</span>
            <span className="legend-dot legend-dot-fondo" /> Fondos por rendir
          </div>
        </div>

        <div className="filters users-filters">
          <label>
            Sucursal / área
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">Selecciona una sucursal</option>
              <option value="ALL">Todos</option>
              {BRANCHES.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!branchFilter ? (
          <p className="muted-text">
            Selecciona una sucursal o la opción “Todos” para ver el listado.
          </p>
        ) : loading ? (
          <p className="muted-text">Cargando usuarios...</p>
        ) : users.length === 0 ? (
          <p className="muted-text">No hay usuarios para los filtros seleccionados.</p>
        ) : (
          <div className="table-wrapper users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Sucursal/Área</th>
                  <th className="users-col-group">
                    <div>Caja chica</div>
                    <div className="users-col-sub">Asignado / Disponible</div>
                  </th>
                  {canAssignBudget && <th>+ Disponible caja chica</th>}
                  {canAssignBudget && <th>Sobregiro máx. caja chica</th>}
                  {canAssignBudget && <th>Actualizar asignado</th>}
                  {canAssignBudget && <th>Ajustar sobregiro</th>}
                  <th className="users-col-group">
                    <div>Fondos por rendir</div>
                    <div className="users-col-sub">Asignado / Disponible</div>
                  </th>
                  {canAssignBudget && <th>+ Disp. fondos por rendir</th>}
                  {canAssignBudget && <th>Sobregiro máx. fondos</th>}
                  {canAssignBudget && <th>Ajustar sobregiro fondos</th>}
                  {canAssignBudget && <th>Ajustar fondos asignados</th>}
                  <th>Saldo a favor</th>
                  {canAssignBudget && <th>Transferencias</th>}
                  {canDeleteUsers && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="user-main">
                        <span className="user-name">{item.name}</span>
                      </div>
                    </td>
                    <td className="user-email-cell">
                      <span className="user-email">{item.email}</span>
                    </td>
                    <td>
                      <span className="role-tag">
                        {roleLabels[item.role] ?? item.role}
                      </span>
                    </td>
                    <td>{item.branch}</td>
                    <td>
                      <div className="users-money-pair">
                        <span className="money-chip money-chip-asignado">
                          {formatCLP(item.budget_assigned)}
                        </span>
                        <span className="money-chip money-chip-disponible">
                          {formatCLP(item.budget_available)}
                        </span>
                      </div>
                    </td>
                    {canAssignBudget && (
                      <td>
                        <div className="form-inline compact">
                          <input
                            type="number"
                            value={availableTopupInputs[item.id] ?? ""}
                            onChange={(e) =>
                              handleAvailableTopupInput(item.id, e.target.value)
                            }
                            placeholder="Ej: 50.000"
                          />
                          <button
                            type="button"
                            onClick={() => handleAvailableTopupSave(item)}
                          >
                            Agregar
                          </button>
                        </div>
                      </td>
                    )}
                    {canAssignBudget && (
                      <td>{formatCLP(item.overdraft_limit)}</td>
                    )}
                    {canAssignBudget && (
                      <td>
                        <div className="form-inline compact">
                          <input
                            type="number"
                            value={budgetInputs[item.id] ?? ""}
                            onChange={(e) => handleBudgetInput(item.id, e.target.value)}
                            placeholder="Ej: 300.000"
                          />
                          <button type="button" onClick={() => handleBudgetSave(item.id)}>
                            Asignar
                          </button>
                        </div>
                      </td>
                    )}
                    {canAssignBudget && (
                      <td>
                        <div className="form-inline compact">
                          <input
                            type="number"
                            value={overdraftInputs[item.id] ?? ""}
                            onChange={(e) => handleOverdraftInput(item.id, e.target.value)}
                            placeholder="Ej: 100.000"
                          />
                          <button type="button" onClick={() => handleOverdraftSave(item.id)}>
                            Guardar
                          </button>
                        </div>
                      </td>
                    )}
                    <td>
                      <div className="users-money-pair">
                        <span className="money-chip money-chip-fondo">
                          {formatCLP(item.fondo_por_rendir_assigned || 0)}
                        </span>
                        <span className="money-chip">
                          {formatCLP(item.fondo_por_rendir_available || 0)}
                        </span>
                      </div>
                    </td>
                    {canAssignBudget && (
                      <td>
                        <div className="form-inline compact">
                          <input
                            type="number"
                            value={fondoRendirAvailableTopupInputs[item.id] ?? ""}
                            onChange={(e) =>
                              handleFondoRendirAvailableTopupInput(
                                item.id,
                                e.target.value
                              )
                            }
                            placeholder="Ej: 50.000"
                          />
                          <button
                            type="button"
                            onClick={() => handleFondoRendirAvailableTopupSave(item)}
                          >
                            Agregar
                          </button>
                        </div>
                      </td>
                    )}
                    {canAssignBudget && (
                      <td>{formatCLP(item.fondo_por_rendir_overdraft_limit || 0)}</td>
                    )}
                    {canAssignBudget && (
                      <td>
                        <div className="form-inline compact">
                          <input
                            type="number"
                            value={fondoRendirOverdraftInputs[item.id] ?? ""}
                            onChange={(e) =>
                              handleFondoRendirOverdraftInput(item.id, e.target.value)
                            }
                            placeholder="Ej: 50.000"
                          />
                          <button
                            type="button"
                            onClick={() => handleFondoRendirOverdraftSave(item.id)}
                          >
                            Guardar
                          </button>
                        </div>
                      </td>
                    )}
                    {canAssignBudget && (
                      <td>
                        <div className="form-inline compact">
                          <input
                            type="number"
                            value={fondoRendirInputs[item.id] ?? ""}
                            onChange={(e) =>
                              handleFondoRendirInput(item.id, e.target.value)
                            }
                            placeholder="Ej: 200.000"
                          />
                          <button type="button" onClick={() => handleFondoRendirSave(item.id)}>
                            Asignar
                          </button>
                        </div>
                      </td>
                    )}
                    <td>{formatCLP(getSaldoAFavor(item))}</td>
                    {canAssignBudget && (
                      <td>
                        {getSaldoAFavor(item) > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              handleMarkTransferDone(item.id, getSaldoAFavor(item))
                            }
                          >
                            Transferencia lista
                          </button>
                        ) : (
                          <span className="muted-text">Sin saldo a favor</span>
                        )}
                      </td>
                    )}
                    {canDeleteUsers && (
                      <td>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleDeleteUser(item.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {budgetMessage && <p className="message">{budgetMessage}</p>}
      </div>
      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        onCancel={() => setConfirmState(null)}
        onConfirm={handleConfirmExecute}
      />
    </div>
  );
}
