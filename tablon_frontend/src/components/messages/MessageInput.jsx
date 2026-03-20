import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiUploadFile, getToken } from "../../api/client";

const BASE = import.meta.env.VITE_API_URL || "";
const COLORS = ["#E85D04", "#3A86FF", "#8338EC", "#06D6A0", "#FB5607", "#FF006E", "#FFBE0B"];

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(filename = "") {
  const ext = filename.split(".").pop().toLowerCase();
  if (["jpg","jpeg","png","gif","webp"].includes(ext)) return "🖼️";
  if (ext === "pdf") return "📄";
  if (["xls","xlsx"].includes(ext)) return "📊";
  if (["doc","docx"].includes(ext)) return "📝";
  if (["ppt","pptx"].includes(ext)) return "📋";
  if (["zip","rar","tar","gz"].includes(ext)) return "🗜️";
  return "📁";
}

export default function MessageInput({ onSend, accentColor, subchannelName }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [users, setUsers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null); // { query, start }
  const [mentionResults, setMentionResults] = useState([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const avatarColor = COLORS[(user?.name || "").charCodeAt(0) % COLORS.length];

  // Cargar usuarios para menciones
  useEffect(() => {
    const token = getToken();
    fetch(`${BASE}/api/users/mentionables`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Detectar @ mientras se escribe
  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);

    const cursor = e.target.selectionStart;
    const beforeCursor = val.slice(0, cursor);
    const match = beforeCursor.match(/@(\w*)$/);

    if (match) {
      const query = match[1].toLowerCase();
      const results = users.filter((u) =>
        u.name.toLowerCase().includes(query) && u.id !== user?.id
      ).slice(0, 5);
      setMentionQuery({ query, start: beforeCursor.lastIndexOf("@") });
      setMentionResults(results);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
      setMentionResults([]);
    }
  };

  const insertMention = (u) => {
    if (!mentionQuery) return;
    const before = text.slice(0, mentionQuery.start);
    const after = text.slice(mentionQuery.start + mentionQuery.query.length + 1);
    const newText = `${before}@${u.name} ${after}`;
    setText(newText);
    setMentionQuery(null);
    setMentionResults([]);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (mentionResults.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, mentionResults.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); insertMention(mentionResults[mentionIndex]); return; }
      if (e.key === "Escape") { setMentionQuery(null); setMentionResults([]); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    try {
      const result = await apiUploadFile(file);
      setPendingFile({ url: result.url, name: result.original_name, size: result.size });
    } catch (err) {
      alert(`Error al subir el archivo: ${err.message}`);
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && !pendingFile) || sending) return;
    setSending(true);
    try {
      await onSend(text.trim(), pendingFile);
      setText("");
      setPendingFile(null);
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const canSend = (text.trim() || pendingFile) && !sending && !uploadingFile;

  return (
    <div style={styles.wrap}>
      {/* Archivo pendiente */}
      {pendingFile && (
        <div style={styles.filePreview}>
          <span style={{ fontSize: 20 }}>{getFileIcon(pendingFile.name)}</span>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <span style={styles.fileName}>{pendingFile.name}</span>
            <span style={styles.fileSize}>{formatSize(pendingFile.size)}</span>
          </div>
          <button onClick={() => setPendingFile(null)} style={styles.removeFile}>✕</button>
        </div>
      )}

      {/* Desplegable de menciones */}
      {mentionResults.length > 0 && (
        <div style={styles.mentionDropdown}>
          <div style={styles.mentionHeader}>Mencionar usuario</div>
          {mentionResults.map((u, i) => (
            <div
              key={u.id}
              onClick={() => insertMention(u)}
              style={{ ...styles.mentionItem, background: i === mentionIndex ? "#1e2a3a" : "transparent" }}
              onMouseEnter={() => setMentionIndex(i)}
            >
              <div style={{ ...styles.mentionAvatar, background: COLORS[u.name.charCodeAt(0) % COLORS.length] }}>
                {u.avatar_initials}
              </div>
              <span style={styles.mentionName}>{u.name}</span>
              <span style={styles.mentionEmail}>{u.email}</span>
            </div>
          ))}
          <div style={styles.mentionHint}>↑↓ navegar · Enter seleccionar · Esc cerrar</div>
        </div>
      )}

      <div style={styles.inputBox}>
        <div style={{ ...styles.avatar, background: avatarColor }}>
          {user?.avatar_initials || "??"}
        </div>
        <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} style={styles.attachBtn} title="Adjuntar archivo">
          {uploadingFile ? "⏳" : "📎"}
        </button>
        <input ref={fileInputRef} type="file" onChange={handleFileChange} style={{ display: "none" }} />
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={`Mensaje en ${subchannelName}… usa @ para mencionar`}
          rows={1}
          style={styles.textarea}
          onInput={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
          }}
        />
        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{ ...styles.sendBtn, background: canSend ? (accentColor || "#E8192C") : "#2a2a35", cursor: canSend ? "pointer" : "default" }}
        >↑</button>
      </div>
      <div style={styles.hint}>Enter enviar · Shift+Enter nueva línea · 📎 adjuntar · @ mencionar</div>
    </div>
  );
}

const styles = {
  wrap: { padding: "12px 20px 16px", borderTop: "1px solid #1e1e28", position: "relative" },
  filePreview: { display: "flex", alignItems: "center", gap: 10, background: "#1a1a22", border: "1px solid #2a2a35", borderRadius: 10, padding: "8px 12px", marginBottom: 8 },
  fileName: { display: "block", color: "#ddd", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  fileSize: { color: "#666", fontSize: 11, display: "block" },
  removeFile: { background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: 16, padding: 2, fontFamily: "inherit" },
  mentionDropdown: { position: "absolute", bottom: "100%", left: 20, right: 20, background: "#111118", border: "1px solid #2a2a35", borderRadius: 10, overflow: "hidden", boxShadow: "0 -8px 32px rgba(0,0,0,0.5)", zIndex: 100, marginBottom: 4 },
  mentionHeader: { padding: "6px 12px", fontSize: 11, color: "#555", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", borderBottom: "1px solid #1e1e28" },
  mentionItem: { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", transition: "background 0.1s" },
  mentionAvatar: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 },
  mentionName: { fontWeight: 600, fontSize: 13, color: "#e0e0e0", flex: 1 },
  mentionEmail: { fontSize: 11, color: "#555" },
  mentionHint: { padding: "4px 12px 6px", fontSize: 10, color: "#444", fontFamily: "monospace", borderTop: "1px solid #1e1e28" },
  inputBox: { display: "flex", gap: 8, alignItems: "flex-end", background: "#1a1a22", borderRadius: 14, border: "1px solid #2a2a35", padding: "10px 12px" },
  avatar: { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 },
  attachBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: "0 2px", color: "#666", flexShrink: 0, fontFamily: "inherit" },
  textarea: { flex: 1, background: "transparent", border: "none", color: "#e0e0e0", fontSize: 13.5, resize: "none", fontFamily: "inherit", lineHeight: 1.5, maxHeight: 120, overflowY: "auto", outline: "none" },
  sendBtn: { width: 34, height: 34, borderRadius: 10, border: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, transition: "all 0.2s", flexShrink: 0, color: "#fff", fontFamily: "inherit" },
  hint: { fontSize: 10, color: "#333", marginTop: 5, textAlign: "right", fontFamily: "monospace" },
};
