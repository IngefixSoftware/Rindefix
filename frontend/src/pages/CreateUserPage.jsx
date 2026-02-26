import { useState } from "react";
import api from "../api";
import { BRANCHES } from "../constants";
import { parseCLP } from "../utils/format";

const defaultForm = {
  name: "",
  email: "",
  role: "RENDIDOR",
  branch: "",
  password: "",
  budget_assigned: "",
  overdraft_limit: "",
  fondo_por_rendir_assigned: "",
  fondo_por_rendir_overdraft_limit: "",
};

export default function CreateUserPage({ user }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const canCreateUsers = user.role === "ADMIN";

  if (!canCreateUsers) {
    return (
      <div className="card">
        <p>Solo los administradores pueden crear nuevos usuarios.</p>
      </div>
    );
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    if (!form.name || !form.email || !form.branch || !form.password) {
      setMessage(
        "Completa todos los campos requeridos (nombre, correo, sucursal y contraseña)."
      );
      return;
    }
    const payload = {
      ...form,
      budget_assigned: parseCLP(form.budget_assigned),
      overdraft_limit: parseCLP(form.overdraft_limit),
      fondo_por_rendir_assigned: parseCLP(form.fondo_por_rendir_assigned),
      fondo_por_rendir_overdraft_limit: parseCLP(
        form.fondo_por_rendir_overdraft_limit
      ),
    };
    try {
      setSaving(true);
      await api.post("/users", payload);
      setMessage("Usuario creado correctamente.");
      setForm(defaultForm);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail ?? "Error al crear el usuario.";
      setMessage(detail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1>Crear nuevo usuario</h1>
      <p>Registra una nueva cuenta de rendidor, aprobador o administrador.</p>
      <form className="card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            Nombre completo
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ej: Rendidor Concepción"
            />
          </label>
          <label>
            Correo
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="ej: rendidor.concepcion@rindefix.cl"
            />
          </label>
        </div>
        <div className="form-grid">
          <label>
            Rol
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="RENDIDOR">Rendidor</option>
              <option value="APROBADOR">Aprobador</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </label>
          <label>
            Sucursal / Área
            <select name="branch" value={form.branch} onChange={handleChange}>
              <option value="">Selecciona sucursal</option>
              {BRANCHES.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            Contraseña inicial
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="********"
            />
          </label>
          <label>
            Monto asignado (opcional)
            <input
              type="number"
              name="budget_assigned"
              value={form.budget_assigned}
              onChange={handleChange}
              placeholder="Ej: 500000"
            />
          </label>
          <label>
            Límite de sobregiro (opcional)
            <input
              type="number"
              name="overdraft_limit"
              value={form.overdraft_limit}
              onChange={handleChange}
              placeholder="Ej: 100000"
            />
          </label>
          <label>
            Fondo por rendir asignado (opcional)
            <input
              type="number"
              name="fondo_por_rendir_assigned"
              value={form.fondo_por_rendir_assigned}
              onChange={handleChange}
              placeholder="Ej: 200000"
            />
          </label>
          <label>
            Límite de sobregiro fondos por rendir (opcional)
            <input
              type="number"
              name="fondo_por_rendir_overdraft_limit"
              value={form.fondo_por_rendir_overdraft_limit}
              onChange={handleChange}
              placeholder="Ej: 50000"
            />
          </label>
        </div>
        <button type="submit" disabled={saving}>
          {saving ? "Creando..." : "Crear usuario"}
        </button>
        {message && <p className="message">{message}</p>}
      </form>
    </div>
  );
}
