import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getToken } from "../../api/client";

const EMOJIS = ["👍", "❤️", "😂", "😮", "✅", "🙌", "🔥", "📅", "👀"];
const COLORS = ["#E85D04", "#3A86FF", "#8338EC", "#06D6A0", "#FB5607", "#FF006E", "#FFBE0B"];
const BASE = import.meta.env.VITE_API_URL || "";

function avatarColor(name = "") { return COLORS[name.charCodeAt(0) % COLORS.length]; }
function formatSize(bytes) {
  if (!bytes) return "";
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

// Renderiza el texto resaltando @menciones
function MessageText({ text, currentUserName }) {
  if (!text) return null;
  const parts = text.split(/(@\S+)/g);
  return (
    <p style={styles.bubbleText}>
      {parts.map((part, i) => {
        if (part.startsWith("@")) {
          const isMe = part.slice(1).toLowerCase().startsWith(currentUserName?.split(" ")[0]?.toLowerCase());
          return (
            <span key={i} style={{ ...styles.mention, background: isMe ? "#E8192C22" : "#3A86FF22", color: isMe ? "#E8192C" : "#3A86FF", fontWeight: 700 }}>
              {part}
            </span>
          );
        }
        return part;
      })}
    </p>
  );
}

function FileAttachment({ url, name, size }) {
  const handleDownload = () => {
    const token = getToken();
    fetch(`${BASE}${url}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
      });
  };
  return (
    <div style={styles.fileAttach} onClick={handleDownload} title="Descargar archivo">
      <span style={{ fontSize: 22, flexShrink: 0 }}>{getFileIcon(name)}</span>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <span style={styles.fileAttachName}>{name}</span>
        {size && <span style={styles.fileAttachSize}>{formatSize(size)}</span>}
      </div>
      <span style={{ fontSize: 16, flexShrink: 0 }}>⬇️</span>
    </div>
  );
}

export default function MessageItem({ message, onReact, onDelete }) {
  const { user } = useAuth();
  const [showEmojis, setShowEmojis] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const canDelete = user?.id === message.author.id || user?.is_admin;
  const time = new Date(message.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  // Resaltar si me mencionan
  const mentionsMe = message.text?.toLowerCase().includes(`@${user?.name?.split(" ")[0]?.toLowerCase()}`);

  return (
    <div
      style={{ ...styles.wrap, background: mentionsMe ? "#E8192C0a" : "transparent", borderLeft: mentionsMe ? "3px solid #E8192C" : "3px solid transparent", paddingLeft: mentionsMe ? 8 : 11 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojis(false); }}
    >
      <div style={{ ...styles.avatar, background: avatarColor(message.author.name) }}>
        {message.author.avatar_initials}
      </div>

      <div style={{ flex: 1 }}>
        <div style={styles.meta}>
          <span style={styles.authorName}>{message.author.name}</span>
          {mentionsMe && <span style={styles.mentionBadge}>@ te mencionó</span>}
          <span style={styles.time}>{time}</span>
        </div>
        <div style={styles.bubble}>
          <MessageText text={message.text} currentUserName={user?.name} />
          {message.file_url && <FileAttachment url={message.file_url} name={message.file_name || "archivo"} size={message.file_size} />}
          {message.reactions?.length > 0 && (
            <div style={styles.reactions}>
              {message.reactions.map((r) => (
                <button key={r.emoji} onClick={() => onReact(message.id, r.emoji)} style={styles.reactionBtn}>
                  {r.emoji} {r.count}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showActions && (
        <div style={styles.actions}>
          <div style={{ position: "relative" }}>
            <button onClick={() => setShowEmojis(!showEmojis)} style={styles.actionBtn} title="Reaccionar">😊</button>
            {showEmojis && (
              <div style={styles.emojiPicker}>
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => { onReact(message.id, e); setShowEmojis(false); }} style={styles.emojiBtn}>{e}</button>
                ))}
              </div>
            )}
          </div>
          {canDelete && (
            <button onClick={() => onDelete(message.id)} style={{ ...styles.actionBtn, color: "#ff6b6b" }} title="Borrar">🗑</button>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: { display: "flex", gap: 10, marginBottom: 14, position: "relative", borderRadius: 8, padding: "4px 11px 4px", transition: "background 0.2s" },
  avatar: { width: 36, height: 36, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" },
  meta: { display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 },
  authorName: { fontWeight: 700, fontSize: 13, color: "#f0f0f0" },
  mentionBadge: { background: "#E8192C22", color: "#E8192C", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10 },
  time: { fontSize: 11, color: "#555", fontFamily: "monospace" },
  bubble: { background: "#1e1e24", border: "1px solid #2a2a32", borderRadius: "4px 14px 14px 14px", padding: "10px 14px" },
  bubbleText: { color: "#d4d4d8", fontSize: 14, lineHeight: 1.55, margin: "0 0 6px" },
  mention: { borderRadius: 4, padding: "0 3px", display: "inline" },
  fileAttach: { display: "flex", alignItems: "center", gap: 10, background: "#16161e", border: "1px solid #2a2a35", borderRadius: 10, padding: "8px 12px", cursor: "pointer", marginTop: 4 },
  fileAttachName: { display: "block", color: "#ddd", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  fileAttachSize: { color: "#666", fontSize: 11, display: "block" },
  reactions: { display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 },
  reactionBtn: { background: "#2a2a35", border: "1px solid #3a3a48", borderRadius: 20, padding: "2px 8px", cursor: "pointer", fontSize: 12, color: "#ccc", fontFamily: "inherit" },
  actions: { position: "absolute", right: 0, top: 0, display: "flex", gap: 4, background: "#1a1a22", border: "1px solid #2a2a35", borderRadius: 8, padding: "2px 4px" },
  actionBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "2px 4px", borderRadius: 4, fontFamily: "inherit" },
  emojiPicker: { position: "absolute", bottom: "110%", right: 0, background: "#1a1a22", border: "1px solid #333", borderRadius: 10, padding: 8, display: "flex", flexWrap: "wrap", gap: 4, width: 180, zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" },
  emojiBtn: { background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: 2, borderRadius: 4, fontFamily: "inherit" },
};
