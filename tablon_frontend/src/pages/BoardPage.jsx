import { useState, useEffect, useRef } from "react";
import Sidebar from "../components/layout/Sidebar";
import MessageItem from "../components/messages/MessageItem";
import MessageInput from "../components/messages/MessageInput";
import { useMessages } from "../hooks/useMessages";
import { useChannels } from "../hooks/useChannels";
import { useUnread } from "../hooks/useUnread";
import { useAuth } from "../context/AuthContext";

export default function BoardPage() {
  const { user } = useAuth();
  const { channels } = useChannels();
  const [activeChannel, setActiveChannel] = useState(null);
  const [activeSubchannel, setActiveSubchannel] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);

  const { unread, markRead } = useUnread(user, activeSubchannel?.id);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const { messages, loading, error, sendMessage, deleteMessage, toggleReaction } =
    useMessages(activeSubchannel?.id, activeSubchannel?.name, user, null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSelect = (channel, subchannel) => {
    setActiveChannel(channel);
    setActiveSubchannel(subchannel);
    markRead(subchannel.id);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <div style={styles.root}>
      <Sidebar
        activeSubchannel={activeSubchannel}
        onSelect={handleSelect}
        collapsed={!sidebarOpen}
        unread={unread}
      />
      <div style={styles.main}>
        <div style={styles.header}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={styles.menuBtn}>☰</button>
          {activeSubchannel ? (
            <>
              <div style={{ ...styles.subIcon, background: `${activeChannel?.color}22`, border: `1px solid ${activeChannel?.color}44` }}>
                {activeSubchannel.icon}
              </div>
              <div>
                <div style={styles.breadcrumb}>
                  <span style={{ color: activeChannel?.color, fontWeight: 600, fontSize: 12 }}>
                    {activeChannel?.icon} {activeChannel?.name}
                  </span>
                  <span style={{ color: "#333", margin: "0 4px" }}>/</span>
                  <span style={{ color: "#f0f0f0", fontWeight: 700, fontSize: 14 }}>
                    {activeSubchannel.name}
                  </span>
                </div>
                <div style={styles.msgCount}>{messages.length} mensajes</div>
              </div>
            </>
          ) : (
            <div style={styles.headerPlaceholder}>Selecciona un canal</div>
          )}
        </div>

        <div style={styles.messages}>
          {!activeSubchannel && (
            <div style={styles.empty}>
              <img src="/logo-hartford.png" alt="Hartford" style={{ width: 180, opacity: 0.15, marginBottom: 20 }} />
              <div style={{ fontSize: 18, color: "#444", fontWeight: 600 }}>Bienvenido al Tablón</div>
              <div style={{ fontSize: 13, color: "#333", marginTop: 6 }}>Selecciona un departamento y subcanal para empezar</div>
            </div>
          )}
          {activeSubchannel && loading && (
            <div style={styles.empty}><div style={{ fontSize: 13, color: "#555" }}>Cargando mensajes…</div></div>
          )}
          {activeSubchannel && error && (
            <div style={styles.empty}><div style={{ color: "#ff6b6b", fontSize: 13 }}>Error: {error}</div></div>
          )}
          {activeSubchannel && !loading && messages.length === 0 && (
            <div style={styles.empty}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{activeSubchannel.icon}</div>
              <div style={{ fontSize: 15, color: "#444" }}>Sin mensajes todavía</div>
              <div style={{ fontSize: 13, color: "#333", marginTop: 4 }}>Sé el primero en escribir en {activeSubchannel.name}</div>
            </div>
          )}
          {messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} onReact={toggleReaction} onDelete={deleteMessage} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {activeSubchannel && (
          <MessageInput onSend={sendMessage} accentColor={activeChannel?.color || "#E8192C"} subchannelName={activeSubchannel.name} />
        )}
      </div>
    </div>
  );
}

const styles = {
  root: { display: "flex", height: "100vh", background: "#0d0d12", overflow: "hidden", fontFamily: "'Segoe UI', sans-serif" },
  main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  header: { padding: "0 20px", height: 58, borderBottom: "1px solid #1e1e28", background: "#0f0f16", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  menuBtn: { background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 18, padding: 4, borderRadius: 6, fontFamily: "inherit" },
  subIcon: { width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  breadcrumb: { display: "flex", alignItems: "center" },
  msgCount: { fontSize: 11, color: "#555" },
  headerPlaceholder: { fontSize: 14, color: "#444" },
  messages: { flex: 1, overflowY: "auto", padding: "20px 20px 10px" },
  empty: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#555", textAlign: "center" },
};
