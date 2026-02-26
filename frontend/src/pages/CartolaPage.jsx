import { useEffect, useRef, useState } from "react";
import api from "../api";
import { formatCLP } from "../utils/format";
import { downloadExcel } from "../utils/export";

export default function CartolaPage({ user }) {
  const isRendidor = user.role === "RENDIDOR";
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementStart, setMovementStart] = useState("");
  const [movementEnd, setMovementEnd] = useState("");
  const wsRef = useRef(null);

  const loadMovements = async () => {
    setLoadingMovements(true);
    try {
      const { data } = await api.get(`/users/${user.id}/settlements`);
      setMovements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    if (!isRendidor) return;
    loadMovements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  useEffect(() => {
    if (!isRendidor) return;
    let retryTimeout;
    const connectWS = () => {
      const httpBase = api.defaults.baseURL || window.location.origin;
      const wsBase = (import.meta.env.VITE_WS_URL || httpBase)
        .replace(/^http/, "ws")
        .replace(/\/$/, "");
      const socket = new WebSocket(`${wsBase}/ws/approvals`);
      wsRef.current = socket;

      socket.onmessage = () => {
        loadMovements();
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
  }, [user.id, isRendidor]);

  if (!isRendidor) {
    return (
      <div className="card">
        <p>Solo los rendidores pueden ver la cartola de transferencias.</p>
      </div>
    );
  }

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

  return (
    <div className="upload-shell">
      <div className="card summary-card full">
        <h1>Cartola de transferencias</h1>
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
              downloadExcel(
                `cartola_usuario_${user.id}`,
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
        {loadingMovements ? (
          <p>Cargando movimientos...</p>
        ) : movements.length === 0 ? (
          <p>Aún no se han registrado transferencias.</p>
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
      </div>
    </div>
  );
}

