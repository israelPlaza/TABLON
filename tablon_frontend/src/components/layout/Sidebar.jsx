import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useChannels } from "../../hooks/useChannels";

const HARTFORD_RED = "#E8192C";
const HARTFORD_ORANGE = "#F47920";

export default function Sidebar({ activeSubchannel, onSelect, collapsed, unread = {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { channels, loading } = useChannels();
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState("");

  const toggleChannel = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const filteredChannels = search
    ? channels.map((ch) => ({
        ...ch,
        subchannels: ch.subchannels.filter((s) =>
          s.name.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((ch) => ch.subchannels.length > 0)
    : channels;

  // Total de no leídos por canal (para badge en el canal padre)
  const channelUnread = (ch) =>
    (ch.subchannels || []).reduce((sum, s) => sum + (unread[s.id] || 0), 0);

  return (
    <div style={{ ...styles.sidebar, width: collapsed ? 0 : 260, minWidth: collapsed ? 0 : 260 }}>
      {/* Logo Hartford */}
      <div style={styles.brand}>
        <img src="/logo-hartford.png" alt="Hartford" style={styles.logo} />
        <div style={styles.brandSub}>Tablón Corporativo</div>
      </div>

      {/* Search */}
      <div style={styles.searchWrap}>
        <span style={styles.searchIcon}>🔍</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar canal..."
          style={styles.searchInput}
        />
      </div>

      {/* Channels */}
      <div style={styles.channelList}>
        <div style={styles.sectionLabel}>Departamentos</div>
        {loading && <div style={styles.hint}>Cargando...</div>}
        {filteredChannels.map((ch) => {
          const chUnread = channelUnread(ch);
          return (
            <div key={ch.id}>
              <button
                onClick={() => toggleChannel(ch.id)}
                style={styles.channelBtn}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#1e2a3a")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span>{ch.icon}</span>
                <span style={{ flex: 1, textAlign: "left" }}>{ch.name}</span>
                {chUnread > 0 && !expanded[ch.id] && (
                  <span style={styles.badge}>{chUnread > 99 ? "99+" : chUnread}</span>
                )}
                <span style={{ fontSize: 10, color: "#4a6080", display: "inline-block", transform: expanded[ch.id] ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}>▶</span>
              </button>

              {expanded[ch.id] && ch.subchannels.map((sub) => {
                const isActive = activeSubchannel?.id === sub.id;
                const count = unread[sub.id] || 0;
                return (
                  <button
                    key={sub.id}
                    onClick={() => onSelect(ch, sub)}
                    style={{
                      ...styles.subBtn,
                      color: isActive ? "#fff" : count > 0 ? "#fff" : "#7a9abf",
                      background: isActive ? "rgba(232,25,44,0.15)" : "transparent",
                      borderLeft: `3px solid ${isActive ? HARTFORD_RED : "transparent"}`,
                      fontWeight: isActive || count > 0 ? 700 : 400,
                    }}
                  >
                    <span>{sub.icon}</span>
                    <span style={{ flex: 1, textAlign: "left" }}>{sub.name}</span>
                    {count > 0 && (
                      <span style={styles.badge}>{count > 99 ? "99+" : count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Admin link */}
      {user?.is_admin && (
        <button
          onClick={() => navigate("/admin")}
          style={styles.adminBtn}
          onMouseEnter={(e) => e.currentTarget.style.background = "#1e2a3a"}
          onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
        >
          ⚙️ Panel de administración
        </button>
      )}

      {/* User footer */}
      <div style={styles.userFooter}>
        <div style={styles.avatar}>{user?.avatar_initials || "??"}</div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={styles.userName}>{user?.name}</div>
          <div style={styles.userStatus}><span style={styles.dot} />Conectado</div>
        </div>
        <button onClick={logout} title="Cerrar sesión" style={styles.logoutBtn}>⏻</button>
      </div>
    </div>
  );
}

const styles = {
  sidebar: { background: "#0f1e30", borderRight: "1px solid #1a2d45", display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.25s ease, min-width 0.25s ease", flexShrink: 0 },
  brand: { padding: "16px 14px 12px", borderBottom: "1px solid #1a2d45", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  logo: { width: "100%", maxWidth: 180, height: "auto" },
  brandSub: { fontSize: 11, color: "#4a6080", fontFamily: "monospace", letterSpacing: "0.5px" },
  searchWrap: { margin: "10px 10px 4px", position: "relative" },
  searchIcon: { position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#4a6080" },
  searchInput: { width: "100%", background: "#1a2d45", border: "1px solid #2a3d55", borderRadius: 8, padding: "7px 10px 7px 28px", color: "#ccc", fontSize: 12, fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
  channelList: { flex: 1, overflowY: "auto", padding: "8px 6px" },
  sectionLabel: { fontSize: 10, color: "#4a6080", fontWeight: 600, letterSpacing: "1.5px", padding: "4px 8px 6px", textTransform: "uppercase" },
  hint: { fontSize: 12, color: "#4a6080", padding: "8px 10px" },
  channelBtn: { width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "transparent", border: "none", cursor: "pointer", borderRadius: 8, color: "#a0b8cc", fontSize: 13, fontWeight: 600, transition: "background 0.15s", fontFamily: "inherit" },
  subBtn: { width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 10px 6px 22px", border: "none", cursor: "pointer", borderRadius: 7, fontSize: 12.5, transition: "all 0.15s", textAlign: "left", fontFamily: "inherit" },
  badge: { background: HARTFORD_RED, color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, minWidth: 18, textAlign: "center", flexShrink: 0 },
  adminBtn: { margin: "0 8px 8px", padding: "9px 12px", background: "transparent", border: "1px solid #1a2d45", borderRadius: 8, cursor: "pointer", color: HARTFORD_ORANGE, fontSize: 12, fontWeight: 600, fontFamily: "inherit", textAlign: "left", transition: "background 0.15s" },
  userFooter: { padding: "12px 14px", borderTop: "1px solid #1a2d45", display: "flex", alignItems: "center", gap: 10 },
  avatar: { width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0, background: `linear-gradient(135deg, #E8192C, #F47920)` },
  userName: { fontSize: 12, fontWeight: 600, color: "#ddd", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  userStatus: { fontSize: 10, color: "#4a6080", display: "flex", alignItems: "center", gap: 4 },
  dot: { width: 6, height: 6, borderRadius: "50%", background: "#06D6A0", display: "inline-block" },
  logoutBtn: { background: "none", border: "none", cursor: "pointer", color: "#4a6080", fontSize: 16, padding: 4, borderRadius: 6, fontFamily: "inherit" },
};
