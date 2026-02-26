import { useEffect, useState } from "react";
import api from "../api";
import { formatCLP } from "../utils/format";

export default function FondoSummaryPage({ user, onUserRefresh }) {
  const [profile, setProfile] = useState(user);
  const [loading, setLoading] = useState(false);

  const isRendidor = user.role === "RENDIDOR";

  const loadProfile = async () => {
    if (!onUserRefresh) {
      setProfile(user);
      return;
    }
    setLoading(true);
    try {
      const updated = await onUserRefresh();
      if (updated) {
        setProfile(updated);
      }
    } catch (err) {
      console.error(err);
      try {
        const { data } = await api.get(`/users/${user.id}`);
        setProfile(data);
      } catch (err2) {
        console.error(err2);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isRendidor) {
      loadProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  if (!isRendidor) {
    return (
      <div className="card">
        <p>Solo los rendidores pueden ver el resumen de fondos por rendir.</p>
      </div>
    );
  }

  const assigned = Number(profile?.fondo_por_rendir_assigned ?? 0);
  const available = Number(profile?.fondo_por_rendir_available ?? 0);
  const hasFondoPorRendir = assigned > 0;
  const saldoAFavorFondo = available < 0 ? Math.abs(available) : 0;

  if (!hasFondoPorRendir && !loading) {
    return (
      <div className="card">
        <h1>Resumen fondos por rendir</h1>
        <p>
          Aún no tienes un fondo por rendir asignado. Cuando el administrador lo asigne,
          verás aquí tu resumen separado.
        </p>
      </div>
    );
  }

  return (
    <div className="upload-shell">
      <div className="card summary-card full">
        <h1>Resumen fondos por rendir</h1>
        {loading && <p>Cargando información…</p>}
        {!loading && (
          <div className="summary-grid cards">
            <article>
              <span>Fondo por rendir asignado</span>
              <strong>{formatCLP(assigned)}</strong>
            </article>
            <article>
              <span>Fondo por rendir disponible</span>
              <strong>{formatCLP(available)}</strong>
            </article>
            <article>
              <span>Saldo a favor fondos por rendir</span>
              <strong>{formatCLP(saldoAFavorFondo)}</strong>
              <small>
                Monto que la empresa debe devolverte solo por fondos por rendir.
              </small>
            </article>
          </div>
        )}
      </div>
    </div>
  );
}

