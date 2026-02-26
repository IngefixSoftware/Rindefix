import { useEffect, useRef, useState } from "react";
import api from "../api";
import { formatCLP } from "../utils/format";
import { downloadExcel } from "../utils/export";
import ConfirmDialog from "../components/ConfirmDialog";

export default function AdminCartolaPage({ user }) {
  const canView = user.role === "ADMIN" || user.role === "APROBADOR";
  const canDelete = canView;
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementStart, setMovementStart] = useState("");
  const [movementEnd, setMovementEnd] = useState("");
  const [error, setError] = useState("");
  const wsRef = useRef(null);
  const [confirmState, setConfirmState] = useState(null);

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

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get("/users", { params: { role: "RENDIDOR" } });
      setUsers(data);
    } catch (err) {
      console.error(err);
      setError("No se pudieron cargar los rendidores.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadMovements = async (userId) => {
    if (!userId) return;
    setLoadingMovements(true);
    try {
      const { data } = await api.get(`/users/${userId}/settlements`);
      setMovements(data);
    } catch (err) {
      console.error(err);
      setError("No se pudo cargar la cartola del usuario seleccionado.");
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    if (!canView) return;
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  useEffect(() => {
    if (!canView || !selectedUserId) return;
    loadMovements(selectedUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  useEffect(() => {
    if (!canView) return;
    let retryTimeout;
    const connectWS = () => {
      const httpBase = api.defaults.baseURL || window.location.origin;
      const wsBase = (import.meta.env.VITE_WS_URL || httpBase)
        .replace(/^http/, "ws")
        .replace(/\/$/, "");
      const socket = new WebSocket(`${wsBase}/ws/approvals`);
      wsRef.current = socket;

      socket.onmessage = () => {
        if (selectedUserId) {
          loadMovements(selectedUserId);
        }
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
  }, [canView, selectedUserId]);

  if (!canView) {
    return (
      <div className="card">
        <p>Solo un aprobador o administrador puede ver la cartola global.</p>
      </div>
    );
  }

  const handleDelete = async (movementId) => {
    if (!canDelete) return;
    setConfirmState({
      type: "delete-movement",
      movementId,
      title: "Eliminar registro de cartola",
      message:
        "¿Seguro que quieres eliminar este registro de cartola? Esta acción no se puede deshacer.",
    });
  };

  return (
    <div>
      <h1>Cartola de transferencias (rendidores)</h1>
      <div className="card">
        <div className="filters">
          <label>
            Rendidor
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loadingUsers}
            >
              <option value="">Selecciona un rendidor</option>
              {loadingUsers ? (
                <option value="">Cargando...</option>
              ) : (
                users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.branch})
                  </option>
                ))
              )}
            </select>
          </label>
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
            Limpiar fechas
          </button>
          <button
            type="button"
            onClick={() => {
              if (!selectedUserId || !filteredMovements.length) return;
              const rows = filteredMovements.map((m) => [
                new Date(m.created_at).toLocaleString(),
                m.amount,
                m.balance_before,
                m.balance_after,
                m.description || "",
              ]);
              if (!rows.length) return;
              downloadExcel(
                `cartola_usuario_${selectedUserId}`,
                ["Fecha", "Monto transferido", "Saldo antes", "Saldo después", "Detalle"],
                rows
              );
            }}
            disabled={!selectedUserId || loadingMovements || !filteredMovements.length}
          >
            Descargar cartola
          </button>
        </div>
        {hasInvalidMovementRange && (
          <p className="message">
            La fecha inicial no puede ser mayor a la final.
          </p>
        )}
        {error && <p className="message">{error}</p>}
        {loadingMovements ? (
          <p>Cargando movimientos...</p>
        ) : !selectedUserId ? (
          <p>Selecciona un rendidor para ver su cartola.</p>
        ) : movements.length === 0 ? (
          <p>Aún no se han registrado transferencias para este rendidor.</p>
        ) : filteredMovements.length === 0 && !hasInvalidMovementRange ? (
          <p>No hay transferencias en el período seleccionado.</p>
        ) : (
          <div className="table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Montó transferido</th>
                  <th>Saldo antes</th>
                  <th>Saldo después</th>
                  <th>Detalle</th>
                  {canDelete && <th>Acciones</th>}
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
                    {canDelete && (
                      <td>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleDelete(m.id)}
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
      </div>
      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        onCancel={() => setConfirmState(null)}
        onConfirm={async () => {
          if (!confirmState) return;
          const current = confirmState;
          setConfirmState(null);
          if (current.type === "delete-movement") {
            try {
              setError("");
              await api.delete(`/settlements/${current.movementId}`);
              setMovements((prev) =>
                prev.filter((m) => m.id !== current.movementId)
              );
            } catch (err) {
              console.error(err);
              setError("No se pudo eliminar el movimiento.");
            }
          }
        }}
      />
    </div>
  );
}
