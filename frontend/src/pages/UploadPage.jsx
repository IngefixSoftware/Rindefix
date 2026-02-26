import { useEffect, useRef, useState } from "react";
import api from "../api";
import { RENDITION_TYPES } from "../constants";
import { parseCLP } from "../utils/format";

export default function UploadPage({ user, onUserRefresh }) {
  const [profile, setProfile] = useState(user);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState("");
  const [provider, setProvider] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("FACTURA");
  const [renditionType, setRenditionType] = useState("CAJA_CHICA");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  const canUpload = user.role === "RENDIDOR" || user.role === "ADMIN";

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

  useEffect(() => {
    setProfile(user);
    if (canUpload) {
      refreshProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  if (!canUpload) {
    return (
      <div className="card">
        <p>Solo los usuarios rendidores pueden cargar documentos.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !amount || !expenseDate || !provider || !documentNumber || !description) {
      setMessage("Completa todos los campos obligatorios.");
      return;
    }
    if (!file) {
      setMessage("Agrega la foto del documento.");
      return;
    }
    const formData = new FormData();
    formData.append("user_id", user.id);
    formData.append("title", title);
    formData.append("provider", provider);
    formData.append("document_number", documentNumber);
    formData.append("document_type", documentType);
    formData.append("rendition_type", renditionType);
    formData.append("description", description);
    formData.append("expense_date", expenseDate);
    formData.append("amount", parseCLP(amount));
    formData.append("file", file);

    try {
      setLoading(true);
      await api.post("/expenses", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage("Gasto enviado correctamente ✨");
      setTitle("");
      setAmount("");
      setExpenseDate("");
      setProvider("");
      setDocumentNumber("");
      setDescription("");
      setDocumentType("FACTURA");
      setRenditionType("CAJA_CHICA");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      try {
        await refreshProfile();
      } catch (refreshError) {
        console.error("No se pudo refrescar el perfil:", refreshError);
      }
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail ?? "Error al enviar el gasto";
      setMessage(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-shell">
      <div className="upload-layout single">
        <section className="upload-hero">
          <h1>Nuevo Gasto</h1>
        </section>

        <section className="upload-form card">
          <div className="upload-photo">
            <label className="upload-photo-label">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,.pdf"
                onChange={(e) => setFile(e.target.files[0])}
              />
              <span className="photo-icon">📷</span>
              <span>{file ? file.name : "Toca para agregar una foto"}</span>
            </label>
          </div>

          <form onSubmit={handleSubmit} className="app-form-grid mobile-stacked">
            <label>
              Título del gasto
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Almuerzo reunión"
              />
            </label>
            <label>
              Fecha del documento
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </label>
            <label>
              Proveedor
              <input
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                placeholder="Ej: Restaurante Central"
              />
            </label>
            <label>
              N° de documento
              <input
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Ej: F001-9854"
              />
            </label>
            <label>
              Tipo de documento
              <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                <option value="FACTURA">Factura</option>
                <option value="BOLETA">Boleta</option>
                <option value="BOLETA_COMBUSTIBLE">Boleta de combustible</option>
                <option value="COMPROBANTE_RECIBO_TBK">Comprobante / Recibo / TBK</option>
              </select>
            </label>
            <label>
              Tipo de rendición
              <select value={renditionType} onChange={(e) => setRenditionType(e.target.value)}>
                {RENDITION_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Monto
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej: 120.000"
              />
            </label>
            <label className="app-field-full">
              Describe el gasto
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Cuéntanos qué compraste y por qué."
                rows={3}
              />
            </label>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? "Enviando..." : "Cargar documento"}
            </button>
          </form>

          {message && <p className="message">{message}</p>}
        </section>
      </div>
    </div>
  );
}
