import { useState } from "react";
import api from "../api";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Completa tu correo y contraseña.");
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post("/auth/login", { email, password });
      onLogin(data);
    } catch (err) {
      console.error(err);
      setError("Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h1 className="login-logo">
          Rinde<span className="accent">fix</span>
        </h1>
        <p>La mejor aplicación para rendir gastos de tu equipo.</p>

        <form onSubmit={handleSubmit}>
          <label>
            Correo corporativo
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ej: rendidor.concepcion@rindefix.cl"
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        {error && <p className="message">{error}</p>}
        <p className="login-hint">¿Olvidaste tu contraseña? Contacta al administrador.</p>
        <p className="login-footer-note">Desarrollado por Ingefix 2025</p>
      </div>
    </div>
  );
}
