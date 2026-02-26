import { useEffect, useState } from "react";
import api from "../api";

export default function EmailTemplatePage({ user }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const canConfigure = user.role === "ADMIN";

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const { data } = await api.get("/settings/email-template");
        setSubject(data.subject || "");
        setBody(data.body || "");
      } catch (err) {
        console.error(err);
        setMessage("No se pudo cargar la plantilla de correo.");
      } finally {
        setLoading(false);
      }
    };
    if (canConfigure) {
      loadTemplate();
    } else {
      setLoading(false);
    }
  }, [canConfigure]);

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");
    setSaving(true);
    try {
      await api.put("/settings/email-template", {
        subject,
        body,
      });
      setMessage("Plantilla guardada correctamente.");
    } catch (err) {
      console.error(err);
      setMessage("No se pudo guardar la plantilla.");
    } finally {
      setSaving(false);
    }
  };

  if (!canConfigure) {
    return (
      <div className="card">
        <p>Solo los administradores pueden configurar el correo de informes.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>Configurar correo de informes</h1>
      <p>
        Personaliza el asunto y el cuerpo del correo que se envía con el informe de
        rendiciones pendientes. Puedes usar el marcador{" "}
        <code>{"{{rendidor_nombre}}"}</code> para insertar el nombre del rendidor.
      </p>

      {loading ? (
        <p>Cargando plantilla...</p>
      ) : (
        <form onSubmit={handleSave} className="app-form-grid two-column">
          <label className="app-field-full">
            Asunto
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej: Informe de rendiciones pendientes - {{rendidor_nombre}}"
            />
          </label>
          <label className="app-field-full">
            Cuerpo del correo
            <textarea
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={
                "Ej:\nEstimado,\n\nAdjunto encontrarás el informe de rendiciones pendientes del usuario {{rendidor_nombre}}.\n\nSaludos."
              }
            />
          </label>
          <div className="app-field-full" style={{ display: "flex", gap: "0.75rem" }}>
            <button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar plantilla"}
            </button>
          </div>
          {message && (
            <p className="message" style={{ gridColumn: "1 / -1" }}>
              {message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

