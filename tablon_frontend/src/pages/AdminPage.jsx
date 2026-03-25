import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useChannels } from "../hooks/useChannels";
import { BASE, getToken } from "../api/client";

const authFetch = (url, opts = {}) => {
  const token = getToken();
  return fetch(`${BASE}${url}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  }).then(async (r) => {
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || "Error"); }
    return r.status === 204 ? null : r.json();
  });
};

// ─── Emoji Picker ──────────────────────────────────────────────────────────────
const EMOJIS = {
  "Departamentos": ["📋","👥","⚙️","📢","💻","🏢","📊","🎯","🔧","📦","🚀","💡","🌐","📱","🔐"],
  "Comunicación": ["💬","📣","📩","📨","📬","🗣️","📞","📝","✉️","🔔","💌","📰","🗒️","📌","📎"],
  "Estado": ["✅","❌","⚠️","🔴","🟡","🟢","🔵","⭐","🚨","🆘","📅","🔄","⏸️","▶️","🏁"],
  "Personas": ["👤","👥","🧑‍💼","👨‍💻","👩‍💼","🧑‍🔧","👨‍🎓","🤝","🙌","👀","💪","🧠","🫂","👋","🎓"],
  "Objetos": ["📁","📂","🗂️","🗃️","💼","🖥️","⌨️","🖨️","📱","🔑","🔒","🛠️","⚡","💰","🏆"],
  "Naturaleza": ["🌴","🌿","🌸","🌍","☀️","🌙","⭐","🌊","🔥","❄️","🌈","🍃","🌺","🦋","🌻"],
};

function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Departamentos");

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{ width: 42, height: 34, background: "#1a1a22", border: "1px solid #2a2a35", borderRadius: 8, cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}
        title="Elegir icono"
      >
        {value || "📁"}
      </button>

      {open && (
        <div style={{ position: "absolute", top: "110%", left: 0, zIndex: 200, background: "#111118", border: "1px solid #2a2a35", borderRadius: 12, padding: 10, width: 280, boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {Object.keys(EMOJIS).map((tab) => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                style={{ background: activeTab === tab ? "#E8192C" : "#1a1a22", border: "none", borderRadius: 6, padding: "3px 8px", color: activeTab === tab ? "#fff" : "#888", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                {tab}
              </button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4 }}>
            {EMOJIS[activeTab].map((emoji) => (
              <button key={emoji} type="button" onClick={() => { onChange(emoji); setOpen(false); }}
                style={{ background: value === emoji ? "#E8192C22" : "none", border: value === emoji ? "1px solid #E8192C" : "1px solid transparent", borderRadius: 6, padding: 4, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {emoji}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setOpen(false)}
            style={{ marginTop: 8, width: "100%", background: "none", border: "1px solid #2a2a35", borderRadius: 6, padding: "4px 0", color: "#666", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Channels Tab ──────────────────────────────────────────────────────────────
function ChannelsTab() {
  const { channels, reload } = useChannels();
  const [form, setForm] = useState({ name: "", icon: "📁", color: "#3A86FF" });
  const [subForm, setSubForm] = useState({});
  const [editChannel, setEditChannel] = useState(null);
  const [editSub, setEditSub] = useState(null);
  const [expanded, setExpanded] = useState({});

  const createChannel = async () => {
    if (!form.name.trim()) return;
    await authFetch("/api/channels", { method: "POST", body: JSON.stringify(form) });
    setForm({ name: "", icon: "📁", color: "#3A86FF" });
    reload();
  };

  const deleteChannel = async (id) => {
    if (!confirm("¿Borrar este canal y todos sus mensajes?")) return;
    await authFetch(`/api/channels/${id}`, { method: "DELETE" });
    reload();
  };

  const saveEditChannel = async () => {
    await authFetch(`/api/channels/${editChannel.id}`, { method: "PATCH", body: JSON.stringify({ name: editChannel.name, icon: editChannel.icon, color: editChannel.color }) });
    setEditChannel(null); reload();
  };

  const createSub = async (chId) => {
    const sf = subForm[chId] || {};
    if (!sf.name?.trim()) return;
    await authFetch(`/api/channels/${chId}/subchannels`, { method: "POST", body: JSON.stringify({ name: sf.name, icon: sf.icon || "💬" }) });
    setSubForm((p) => ({ ...p, [chId]: { name: "", icon: "💬" } }));
    reload();
  };

  const deleteSub = async (chId, subId) => {
    if (!confirm("¿Borrar este subcanal?")) return;
    await authFetch(`/api/channels/${chId}/subchannels/${subId}`, { method: "DELETE" });
    reload();
  };

  const saveEditSub = async () => {
    await authFetch(`/api/channels/${editSub.channelId}/subchannels/${editSub.id}`, { method: "PATCH", body: JSON.stringify({ name: editSub.name, icon: editSub.icon }) });
    setEditSub(null); reload();
  };

  return (
    <div>
      <div style={s.card}>
        <h3 style={s.cardTitle}>➕ Nuevo canal</h3>
        <div style={s.row}>
          <EmojiPicker value={form.icon} onChange={(emoji) => setForm({ ...form, icon: emoji })} />
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ ...s.input, flex: 1 }} placeholder="Nombre del canal" />
          <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} style={s.colorPicker} />
          <button onClick={createChannel} style={s.btnPrimary}>Crear</button>
        </div>
      </div>

      {channels.map((ch) => (
        <div key={ch.id} style={s.card}>
          {editChannel?.id === ch.id ? (
            <div style={s.row}>
              <EmojiPicker value={editChannel.icon} onChange={(emoji) => setEditChannel({ ...editChannel, icon: emoji })} />
              <input value={editChannel.name} onChange={(e) => setEditChannel({ ...editChannel, name: e.target.value })} style={{ ...s.input, flex: 1 }} />
              <input type="color" value={editChannel.color} onChange={(e) => setEditChannel({ ...editChannel, color: e.target.value })} style={s.colorPicker} />
              <button onClick={saveEditChannel} style={s.btnPrimary}>Guardar</button>
              <button onClick={() => setEditChannel(null)} style={s.btnGhost}>Cancelar</button>
            </div>
          ) : (
            <div style={s.row}>
              <span style={{ fontSize: 20 }}>{ch.icon}</span>
              <span style={{ ...s.dot, background: ch.color }} />
              <span style={{ flex: 1, fontWeight: 700, color: "#f0f0f0" }}>{ch.name}</span>
              <button onClick={() => setExpanded((p) => ({ ...p, [ch.id]: !p[ch.id] }))} style={s.btnGhost}>{expanded[ch.id] ? "▲" : "▼ Subcanales"}</button>
              <button onClick={() => setEditChannel({ ...ch })} style={s.btnGhost}>✏️</button>
              <button onClick={() => deleteChannel(ch.id)} style={s.btnDanger}>🗑</button>
            </div>
          )}

          {expanded[ch.id] && (
            <div style={{ marginTop: 10, paddingLeft: 16, borderLeft: `3px solid ${ch.color}` }}>
              {ch.subchannels.map((sub) => (
                <div key={sub.id} style={{ ...s.row, marginBottom: 6 }}>
                  {editSub?.id === sub.id ? (
                    <>
                      <EmojiPicker value={editSub.icon} onChange={(emoji) => setEditSub({ ...editSub, icon: emoji })} />
                      <input value={editSub.name} onChange={(e) => setEditSub({ ...editSub, name: e.target.value })} style={{ ...s.input, flex: 1 }} />
                      <button onClick={saveEditSub} style={s.btnPrimary}>Guardar</button>
                      <button onClick={() => setEditSub(null)} style={s.btnGhost}>✕</button>
                    </>
                  ) : (
                    <>
                      <span>{sub.icon}</span>
                      <span style={{ flex: 1, color: "#bbb", fontSize: 13 }}>{sub.name}</span>
                      <button onClick={() => setEditSub({ ...sub, channelId: ch.id })} style={s.btnGhost}>✏️</button>
                      <button onClick={() => deleteSub(ch.id, sub.id)} style={s.btnDanger}>🗑</button>
                    </>
                  )}
                </div>
              ))}
              <div style={{ ...s.row, marginTop: 8 }}>
                <EmojiPicker value={subForm[ch.id]?.icon ?? "💬"} onChange={(emoji) => setSubForm((p) => ({ ...p, [ch.id]: { ...p[ch.id], icon: emoji } }))} />
                <input value={subForm[ch.id]?.name ?? ""} onChange={(e) => setSubForm((p) => ({ ...p, [ch.id]: { ...p[ch.id], name: e.target.value } }))} placeholder="Nuevo subcanal..." style={{ ...s.input, flex: 1 }} />
                <button onClick={() => createSub(ch.id)} style={s.btnPrimary}>+ Añadir</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "", is_admin: false });
  const [editUser, setEditUser] = useState(null);
  const [pwdUser, setPwdUser] = useState(null);
  const [newPwd, setNewPwd] = useState("");
  const [error, setError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    try { setUsers(await authFetch("/api/users")); } finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const createUser = async () => {
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) { setError("Nombre, email y contraseña son obligatorios"); return; }
    try { await authFetch("/api/users", { method: "POST", body: JSON.stringify(form) }); setForm({ name: "", email: "", password: "", is_admin: false }); loadUsers(); }
    catch (e) { setError(e.message); }
  };

  const saveEdit = async () => {
    setError("");
    try { await authFetch(`/api/users/${editUser.id}`, { method: "PATCH", body: JSON.stringify({ name: editUser.name, email: editUser.email, is_admin: editUser.is_admin }) }); setEditUser(null); loadUsers(); }
    catch (e) { setError(e.message); }
  };

  const changePassword = async () => {
    setError("");
    if (newPwd.length < 6) { setError("Mínimo 6 caracteres"); return; }
    try { await authFetch(`/api/users/${pwdUser.id}/password`, { method: "PATCH", body: JSON.stringify({ new_password: newPwd }) }); setPwdUser(null); setNewPwd(""); }
    catch (e) { setError(e.message); }
  };

  const toggleActive = async (user) => {
    try { await authFetch(`/api/users/${user.id}/toggle-active`, { method: "PATCH" }); loadUsers(); }
    catch (e) { setError(e.message); }
  };

  const deleteUser = async (user) => {
    if (!confirm(`¿Eliminar a ${user.name}?`)) return;
    try { await authFetch(`/api/users/${user.id}`, { method: "DELETE" }); loadUsers(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div>
      {error && <div style={s.errorBox}>{error}</div>}
      <div style={s.card}>
        <h3 style={s.cardTitle}>➕ Nuevo usuario</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre completo" style={s.input} />
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" style={s.input} type="email" />
          <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Contraseña" style={s.input} type="password" />
          <label style={{ color: "#aaa", fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="checkbox" checked={form.is_admin} onChange={(e) => setForm({ ...form, is_admin: e.target.checked })} /> Es administrador
          </label>
        </div>
        <button onClick={createUser} style={s.btnPrimary}>Crear usuario</button>
      </div>

      {loading ? <div style={{ color: "#666", padding: 20 }}>Cargando...</div> : (
        <div style={s.card}>
          <h3 style={s.cardTitle}>👥 Usuarios ({users.length})</h3>
          {users.map((u) => (
            <div key={u.id} style={{ borderBottom: "1px solid #1e1e28", paddingBottom: 10, marginBottom: 10 }}>
              {editUser?.id === u.id ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <input value={editUser.name} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} style={s.input} />
                    <input value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} style={s.input} type="email" />
                  </div>
                  <label style={{ color: "#aaa", fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginBottom: 8 }}>
                    <input type="checkbox" checked={editUser.is_admin} onChange={(e) => setEditUser({ ...editUser, is_admin: e.target.checked })} /> Es administrador
                  </label>
                  <div style={s.row}><button onClick={saveEdit} style={s.btnPrimary}>Guardar</button><button onClick={() => setEditUser(null)} style={s.btnGhost}>Cancelar</button></div>
                </div>
              ) : pwdUser?.id === u.id ? (
                <div>
                  <div style={{ color: "#ddd", marginBottom: 8, fontSize: 13 }}>Cambiar contraseña de <strong>{u.name}</strong></div>
                  <div style={s.row}>
                    <input value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="Nueva contraseña" style={{ ...s.input, flex: 1 }} type="password" />
                    <button onClick={changePassword} style={s.btnPrimary}>Guardar</button>
                    <button onClick={() => { setPwdUser(null); setNewPwd(""); }} style={s.btnGhost}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={s.row}>
                  <div style={{ ...s.avatar, background: u.is_admin ? "#E85D04" : "#3A86FF" }}>{u.avatar_initials}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#f0f0f0", fontWeight: 600, fontSize: 13 }}>
                      {u.name}
                      {u.is_admin && <span style={s.badge}>Admin</span>}
                      {!u.is_active && <span style={{ ...s.badge, background: "#ff4444" }}>Inactivo</span>}
                    </div>
                    <div style={{ color: "#666", fontSize: 12 }}>{u.email}</div>
                  </div>
                  <button onClick={() => toggleActive(u)} style={{ ...s.btnGhost, color: u.is_active ? "#ff9900" : "#06D6A0" }}>{u.is_active ? "⏸ Desactivar" : "▶ Activar"}</button>
                  <button onClick={() => setPwdUser(u)} style={s.btnGhost}>🔑</button>
                  <button onClick={() => setEditUser({ ...u })} style={s.btnGhost}>✏️</button>
                  <button onClick={() => deleteUser(u)} style={s.btnDanger}>🗑</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Permissions Tab ───────────────────────────────────────────────────────────
function PermissionsTab() {
  const { channels } = useChannels();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [perms, setPerms] = useState({ channel_ids: [], subchannel_ids: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    authFetch("/api/users").then(setUsers).catch(() => {});
  }, []);

  const loadPerms = async (user) => {
    setSelectedUser(user);
    const data = await authFetch(`/api/permissions/${user.id}`);
    setPerms(data);
  };

  const toggleChannel = async (ch) => {
    setSaving(true); setError("");
    try {
      const has = perms.channel_ids.includes(ch.id);
      if (has) {
        await authFetch(`/api/permissions/${selectedUser.id}/channels/${ch.id}`, { method: "DELETE" });
        const subsToRemove = ch.subchannels.map(s => s.id);
        setPerms((p) => ({ channel_ids: p.channel_ids.filter(id => id !== ch.id), subchannel_ids: p.subchannel_ids.filter(id => !subsToRemove.includes(id)) }));
      } else {
        await authFetch(`/api/permissions/${selectedUser.id}/channels/${ch.id}`, { method: "POST" });
        setPerms((p) => ({ ...p, channel_ids: [...p.channel_ids, ch.id] }));
      }
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const toggleSubchannel = async (sub) => {
    setSaving(true); setError("");
    try {
      const has = perms.subchannel_ids.includes(sub.id);
      if (has) {
        await authFetch(`/api/permissions/${selectedUser.id}/subchannels/${sub.id}`, { method: "DELETE" });
        setPerms((p) => ({ ...p, subchannel_ids: p.subchannel_ids.filter(id => id !== sub.id) }));
      } else {
        await authFetch(`/api/permissions/${selectedUser.id}/subchannels/${sub.id}`, { method: "POST" });
        setPerms((p) => ({ ...p, subchannel_ids: [...p.subchannel_ids, sub.id] }));
      }
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const grantAll = async () => {
    setSaving(true);
    try {
      for (const ch of channels) {
        if (!perms.channel_ids.includes(ch.id)) await authFetch(`/api/permissions/${selectedUser.id}/channels/${ch.id}`, { method: "POST" });
        for (const sub of ch.subchannels) {
          if (!perms.subchannel_ids.includes(sub.id)) await authFetch(`/api/permissions/${selectedUser.id}/subchannels/${sub.id}`, { method: "POST" });
        }
      }
      const data = await authFetch(`/api/permissions/${selectedUser.id}`);
      setPerms(data);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const revokeAll = async () => {
    if (!confirm(`¿Quitar todos los accesos de ${selectedUser.name}?`)) return;
    setSaving(true);
    try {
      for (const ch of channels) await authFetch(`/api/permissions/${selectedUser.id}/channels/${ch.id}`, { method: "DELETE" }).catch(() => {});
      setPerms({ channel_ids: [], subchannel_ids: [] });
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 14 }}>
      <div style={s.card}>
        <h3 style={s.cardTitle}>👥 Selecciona usuario</h3>
        {users.filter(u => !u.is_admin).map((u) => (
          <div key={u.id} onClick={() => loadPerms(u)}
            style={{ ...s.row, padding: "8px 10px", borderRadius: 8, cursor: "pointer", background: selectedUser?.id === u.id ? "#1e2a3a" : "transparent", marginBottom: 4 }}>
            <div style={{ ...s.avatar, background: "#3A86FF", width: 28, height: 28, fontSize: 10 }}>{u.avatar_initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#f0f0f0", fontSize: 13, fontWeight: 600 }}>{u.name}</div>
              <div style={{ color: "#555", fontSize: 11 }}>{u.is_active ? "Activo" : "Inactivo"}</div>
            </div>
          </div>
        ))}
        {users.filter(u => !u.is_admin).length === 0 && <div style={{ color: "#555", fontSize: 13 }}>No hay usuarios no-admin</div>}
      </div>

      <div>
        {!selectedUser ? (
          <div style={{ ...s.card, color: "#555", fontSize: 14, textAlign: "center", padding: 40 }}>← Selecciona un usuario para gestionar sus accesos</div>
        ) : (
          <div style={s.card}>
            <div style={{ ...s.row, marginBottom: 12 }}>
              <h3 style={{ ...s.cardTitle, margin: 0, flex: 1 }}>🔑 Accesos de {selectedUser.name}</h3>
              <button onClick={grantAll} disabled={saving} style={{ ...s.btnPrimary, fontSize: 11 }}>✅ Dar todo</button>
              <button onClick={revokeAll} disabled={saving} style={{ ...s.btnDanger, fontSize: 11 }}>❌ Quitar todo</button>
            </div>
            {error && <div style={s.errorBox}>{error}</div>}
            {saving && <div style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>Guardando...</div>}
            {channels.map((ch) => (
              <div key={ch.id} style={{ marginBottom: 12, background: "#16161e", borderRadius: 10, padding: 12 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 8 }}>
                  <input type="checkbox" checked={perms.channel_ids.includes(ch.id)} onChange={() => toggleChannel(ch)} disabled={saving} />
                  <span style={{ fontSize: 18 }}>{ch.icon}</span>
                  <span style={{ color: "#f0f0f0", fontWeight: 700, fontSize: 14 }}>{ch.name}</span>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: ch.color, display: "inline-block" }} />
                </label>
                {perms.channel_ids.includes(ch.id) && (
                  <div style={{ paddingLeft: 24, borderLeft: `2px solid ${ch.color}44` }}>
                    {ch.subchannels.map((sub) => (
                      <label key={sub.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 4 }}>
                        <input type="checkbox" checked={perms.subchannel_ids.includes(sub.id)} onChange={() => toggleSubchannel(sub)} disabled={saving} />
                        <span>{sub.icon}</span>
                        <span style={{ color: "#bbb", fontSize: 13 }}>{sub.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main AdminPage ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("channels");

  if (!user?.is_admin) { navigate("/"); return null; }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <button onClick={() => navigate("/")} style={s.backBtn}>← Volver al tablón</button>
        <h1 style={s.title}>⚙️ Panel de administración</h1>
      </div>
      <div style={s.tabs}>
        {[["channels", "📢 Canales"], ["users", "👥 Usuarios"], ["permissions", "🔑 Permisos"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ ...s.tab, ...(tab === id ? s.tabActive : {}) }}>{label}</button>
        ))}
      </div>
      <div style={s.content}>
        {tab === "channels" && <ChannelsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "permissions" && <PermissionsTab />}
      </div>
    </div>
  );
}

const s = {
  page: { background: "#0d0d12", minHeight: "100vh", color: "#f0f0f0", fontFamily: "system-ui, sans-serif" },
  header: { padding: "20px 28px 0", borderBottom: "1px solid #1e1e28", display: "flex", alignItems: "center", gap: 16, paddingBottom: 16 },
  backBtn: { background: "none", border: "1px solid #2a2a35", borderRadius: 8, color: "#888", padding: "6px 12px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" },
  title: { margin: 0, fontSize: 20, fontWeight: 700 },
  tabs: { display: "flex", gap: 4, padding: "16px 28px 0", borderBottom: "1px solid #1e1e28" },
  tab: { background: "none", border: "none", borderBottom: "2px solid transparent", padding: "8px 16px", cursor: "pointer", color: "#666", fontSize: 14, fontWeight: 600, fontFamily: "inherit", marginBottom: -1 },
  tabActive: { color: "#E85D04", borderBottomColor: "#E85D04" },
  content: { padding: "20px 28px", maxWidth: 900 },
  card: { background: "#111118", border: "1px solid #1e1e28", borderRadius: 12, padding: 16, marginBottom: 14 },
  cardTitle: { margin: "0 0 12px", fontSize: 14, color: "#aaa", fontWeight: 600 },
  row: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  input: { background: "#1a1a22", border: "1px solid #2a2a35", borderRadius: 8, padding: "7px 10px", color: "#e0e0e0", fontSize: 13, fontFamily: "inherit", outline: "none" },
  colorPicker: { width: 36, height: 34, border: "1px solid #2a2a35", borderRadius: 8, background: "#1a1a22", cursor: "pointer", padding: 2 },
  btnPrimary: { background: "#E85D04", border: "none", borderRadius: 8, padding: "7px 14px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  btnGhost: { background: "none", border: "1px solid #2a2a35", borderRadius: 8, padding: "6px 12px", color: "#888", fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  btnDanger: { background: "none", border: "1px solid #3a1a1a", borderRadius: 8, padding: "6px 10px", color: "#ff6b6b", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  dot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  avatar: { width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 },
  badge: { background: "#E85D04", color: "#fff", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 10, marginLeft: 6 },
  errorBox: { background: "#2a1010", border: "1px solid #ff4444", borderRadius: 8, padding: "10px 14px", color: "#ff8888", fontSize: 13, marginBottom: 12 },
};
