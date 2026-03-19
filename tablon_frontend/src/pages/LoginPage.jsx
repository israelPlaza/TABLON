import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Email o contraseña incorrectos");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Logo Hartford */}
        <div style={styles.logoWrap}>
          <img src="/logo-hartford.png" alt="Hartford" style={styles.logo} />
        </div>

        <h1 style={styles.title}>Tablón Corporativo</h1>
        <p style={styles.subtitle}>Intervención Social, Cultural y Educativa</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@hartford.es" style={styles.input} required autoFocus
          />
          <label style={styles.label}>Contraseña</label>
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" style={styles.input} required
          />
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <Link to="/register" style={{ color: "#888", fontSize: 13 }}>¿No tienes cuenta? Solicitar acceso</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1B3A6B 0%, #0d2040 100%)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Segoe UI', sans-serif", padding: 20,
  },
  card: {
    background: "#fff",
    borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 400,
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },
  logoWrap: { textAlign: "center", marginBottom: 20 },
  logo: { width: "100%", maxWidth: 260, height: "auto" },
  title: { margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: "#1B3A6B", textAlign: "center" },
  subtitle: { color: "#888", fontSize: 12, margin: "0 0 28px", textAlign: "center" },
  form: { display: "flex", flexDirection: "column", gap: 6, textAlign: "left" },
  label: { color: "#1B3A6B", fontSize: 12, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" },
  input: {
    background: "#f5f7fa", border: "1.5px solid #dde3ee", borderRadius: 8,
    padding: "10px 12px", color: "#1B3A6B", fontSize: 14,
    fontFamily: "inherit", marginBottom: 8, outline: "none",
    transition: "border-color 0.2s",
  },
  error: {
    background: "#fff0f0", border: "1px solid #ffcccc", borderRadius: 8,
    color: "#E8192C", fontSize: 13, padding: "10px 12px", marginBottom: 4,
  },
  button: {
    background: "linear-gradient(135deg, #E8192C, #F47920)",
    border: "none", borderRadius: 8,
    color: "#fff", fontSize: 15, fontWeight: 700, padding: "12px",
    cursor: "pointer", marginTop: 8, fontFamily: "inherit",
    transition: "opacity 0.2s",
  },
};
