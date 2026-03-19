import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BASE } from "../api/client";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Todos los campos son obligatorios"); return;
    }
    if (form.password !== form.confirm) {
      setError("Las contraseñas no coinciden"); return;
    }
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres"); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.detail || "Error al registrarse");
      }
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ color: "#06D6A0", margin: "0 0 12px" }}>Solicitud enviada</h2>
        <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6 }}>
          Tu cuenta ha sido creada pero está pendiente de activación.<br />
          Un administrador deberá activarla antes de que puedas acceder.
        </p>
        <Link to="/login" style={{ color: "#E85D04", fontSize: 14 }}>← Volver al login</Link>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.brand}>📌</div>
        <h1 style={styles.title}>Crear cuenta</h1>
        <p style={styles.subtitle}>Tablón Corporativo</p>

        {error && <div style={styles.error}>{error}</div>}

        <input
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Nombre completo" style={styles.input}
        />
        <input
          value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="Email corporativo" style={styles.input} type="email"
        />
        <input
          value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="Contraseña (mín. 6 caracteres)" style={styles.input} type="password"
        />
        <input
          value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
          placeholder="Confirmar contraseña" style={styles.input} type="password"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />

        <button onClick={handleSubmit} disabled={loading} style={styles.btn}>
          {loading ? "Enviando..." : "Solicitar acceso"}
        </button>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/login" style={{ color: "#666", fontSize: 13 }}>¿Ya tienes cuenta? Inicia sesión</Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#0d0d12", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" },
  card: { background: "#111118", border: "1px solid #1e1e28", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 400, textAlign: "center" },
  brand: { fontSize: 40, marginBottom: 12 },
  title: { margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#f0f0f0" },
  subtitle: { color: "#555", fontSize: 13, margin: "0 0 24px" },
  error: { background: "#2a1010", border: "1px solid #ff4444", borderRadius: 8, padding: "10px", color: "#ff8888", fontSize: 13, marginBottom: 12, textAlign: "left" },
  input: { width: "100%", background: "#1a1a22", border: "1px solid #2a2a35", borderRadius: 10, padding: "11px 14px", color: "#e0e0e0", fontSize: 14, fontFamily: "inherit", outline: "none", marginBottom: 10, boxSizing: "border-box", display: "block" },
  btn: { width: "100%", background: "#E85D04", border: "none", borderRadius: 10, padding: "12px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginTop: 4 },
};
