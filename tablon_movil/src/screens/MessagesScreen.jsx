import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  apiGetMessages, apiSendMessage, apiDeleteMessage,
  apiToggleReaction, apiGetMentionables, openWebSocket, BASE, getToken,
} from '../api/client';
 
const EMOJIS = ['👍', '❤️', '😂', '😮', '✅', '🙌', '🔥', '📅'];
const COLORS = ['#E85D04', '#3A86FF', '#8338EC', '#06D6A0', '#FB5607', '#FF006E'];
 
function avatarColor(name = '') {
  return COLORS[name.charCodeAt(0) % COLORS.length];
}
 
function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
 
function MessageItem({ message, currentUser, onReact, onDelete }) {
  const [showEmojis, setShowEmojis] = useState(false);
  const canDelete = currentUser?.id === message.author.id || currentUser?.is_admin;
  const time = new Date(message.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  const firstName = currentUser?.name?.split(' ')[0]?.toLowerCase() || '';
  const mentionsMe = message.text?.toLowerCase().includes(`@${firstName}`);
 
  const handleLongPress = () => {
    const options = ['Reaccionar', canDelete ? 'Borrar mensaje' : null, 'Cancelar'].filter(Boolean);
    Alert.alert('Opciones', '', options.map((opt, i) => ({
      text: opt,
      style: opt === 'Cancelar' ? 'cancel' : opt === 'Borrar mensaje' ? 'destructive' : 'default',
      onPress: () => {
        if (opt === 'Reaccionar') setShowEmojis(true);
        if (opt === 'Borrar mensaje') onDelete(message.id);
      },
    })));
  };
 
  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      style={[styles.msgWrap, mentionsMe && styles.msgMention]}
      activeOpacity={0.8}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor(message.author.name) }]}>
        <Text style={styles.avatarText}>{message.author.avatar_initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.msgMeta}>
          <Text style={styles.msgAuthor}>{message.author.name}</Text>
          {mentionsMe && <Text style={styles.mentionBadge}>@ te mencionó</Text>}
          <Text style={styles.msgTime}>{time}</Text>
        </View>
        <View style={styles.bubble}>
          {message.text ? (
            <Text style={styles.msgText}>
              {message.text.split(/(@\S+)/g).map((part, i) => {
                if (part.startsWith('@')) {
                  const isMe = part.slice(1).toLowerCase().startsWith(firstName);
                  return <Text key={i} style={[styles.mention, isMe && styles.mentionMe]}>{part}</Text>;
                }
                return part;
              })}
            </Text>
          ) : null}
 
          {message.file_url && (
            <View style={styles.fileAttach}>
              <Text style={styles.fileIcon}>📎</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>{message.file_name}</Text>
                {message.file_size && <Text style={styles.fileSize}>{formatSize(message.file_size)}</Text>}
              </View>
            </View>
          )}
 
          {message.reactions?.length > 0 && (
            <View style={styles.reactions}>
              {message.reactions.map((r) => (
                <TouchableOpacity key={r.emoji} onPress={() => onReact(message.id, r.emoji)} style={styles.reactionBtn}>
                  <Text style={styles.reactionText}>{r.emoji} {r.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
 
        {showEmojis && (
          <View style={styles.emojiPicker}>
            {EMOJIS.map((e) => (
              <TouchableOpacity key={e} onPress={() => { onReact(message.id, e); setShowEmojis(false); }} style={styles.emojiBtn}>
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowEmojis(false)} style={styles.emojiClose}>
              <Text style={{ color: '#888', fontSize: 12 }}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
 
export default function MessagesScreen({ route, navigation }) {
  const { channel, subchannel } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [mentionUsers, setMentionUsers] = useState([]);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionResults, setMentionResults] = useState([]);
  const flatListRef = useRef(null);
  const wsRef = useRef(null);
  const subchannelIdRef = useRef(subchannel.id);
 
  useEffect(() => { subchannelIdRef.current = subchannel.id; }, [subchannel.id]);
 
  // Cargar usuarios para menciones
  useEffect(() => {
    apiGetMentionables().then(setMentionUsers).catch(() => {});
  }, []);
 
  const applyEvent = useCallback((event) => {
    if (event.subchannel_id !== subchannelIdRef.current) return;
    if (event.type === 'new_message') {
      setMessages((prev) => prev.find((m) => m.id === event.payload.id) ? prev : [...prev, event.payload]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } else if (event.type === 'reaction') {
      setMessages((prev) => prev.map((m) => m.id === event.payload.id ? event.payload : m));
    } else if (event.type === 'delete') {
      setMessages((prev) => prev.filter((m) => m.id !== event.payload.id));
    }
  }, []);
 
  useEffect(() => {
    setMessages([]);
    setLoading(true);
    apiGetMessages(subchannel.id)
      .then((data) => { setMessages(data.messages); setLoading(false); })
      .catch(() => setLoading(false));
 
    openWebSocket(subchannel.id, applyEvent).then((ws) => { wsRef.current = ws; });
    return () => { wsRef.current?.close(); };
  }, [subchannel.id]);
 
  const handleTextChange = (val) => {
    setText(val);
    const match = val.match(/@(\w*)$/);
    if (match) {
      const q = match[1].toLowerCase();
      const results = mentionUsers.filter((u) => u.name.toLowerCase().includes(q) && u.id !== user?.id).slice(0, 5);
      setMentionQuery({ query: match[1], start: val.lastIndexOf('@') });
      setMentionResults(results);
    } else {
      setMentionQuery(null);
      setMentionResults([]);
    }
  };
 
  const insertMention = (u) => {
    if (!mentionQuery) return;
    const before = text.slice(0, mentionQuery.start);
    const after = text.slice(mentionQuery.start + mentionQuery.query.length + 1);
    setText(`${before}@${u.name} ${after}`);
    setMentionQuery(null);
    setMentionResults([]);
  };
 
  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await apiSendMessage(subchannel.id, text.trim());
      setText('');
    } catch (e) {
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };
 
  const handleDelete = async (id) => {
    try { await apiDeleteMessage(id); } catch (e) { Alert.alert('Error', 'No se pudo borrar'); }
  };
 
  const handleReact = async (id, emoji) => {
    try { await apiToggleReaction(id, emoji); } catch (_) {}
  };
 
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={[styles.subIcon, { backgroundColor: `${channel.color}22` }]}>
          <Text>{subchannel.icon}</Text>
        </View>
        <View>
          <Text style={styles.headerChannel} numberOfLines={1}>{channel.name}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{subchannel.name}</Text>
        </View>
      </View>
 
      {/* Mensajes */}
      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#E8192C" /></View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <MessageItem
              message={item}
              currentUser={user}
              onReact={handleReact}
              onDelete={handleDelete}
            />
          )}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>{subchannel.icon}</Text>
              <Text style={{ color: '#555' }}>Sin mensajes todavía</Text>
            </View>
          }
          contentContainerStyle={{ padding: 12, flexGrow: 1 }}
        />
      )}
 
      {/* Desplegable menciones */}
      {mentionResults.length > 0 && (
        <View style={styles.mentionDropdown}>
          {mentionResults.map((u) => (
            <TouchableOpacity key={u.id} onPress={() => insertMention(u)} style={styles.mentionItem}>
              <View style={[styles.mentionAvatar, { backgroundColor: avatarColor(u.name) }]}>
                <Text style={styles.mentionAvatarText}>{u.avatar_initials}</Text>
              </View>
              <Text style={styles.mentionName}>{u.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
 
      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleTextChange}
          placeholder={`Mensaje en ${subchannel.name}…`}
          placeholderTextColor="#555"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: text.trim() ? '#E8192C' : '#2a2a35' }]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
 
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d12' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#0f1e30', paddingTop: 50, paddingBottom: 14, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: '#1a2d45',
  },
  backBtn: { padding: 4, marginRight: 4 },
  backText: { color: '#f0f0f0', fontSize: 22 },
  subIcon: { width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  headerChannel: { color: '#7a9abf', fontSize: 11, fontWeight: '600' },
  headerSub: { color: '#f0f0f0', fontSize: 14, fontWeight: '700' },
  msgWrap: { flexDirection: 'row', gap: 10, marginBottom: 14, paddingHorizontal: 4, borderLeftWidth: 3, borderLeftColor: 'transparent', borderRadius: 4 },
  msgMention: { backgroundColor: '#E8192C0a', borderLeftColor: '#E8192C' },
  avatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  msgAuthor: { color: '#f0f0f0', fontWeight: '700', fontSize: 12 },
  mentionBadge: { backgroundColor: '#E8192C22', color: '#E8192C', fontSize: 9, fontWeight: '700', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8 },
  msgTime: { color: '#555', fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  bubble: { backgroundColor: '#1e1e24', borderRadius: 12, padding: 10 },
  msgText: { color: '#d4d4d8', fontSize: 14, lineHeight: 20 },
  mention: { color: '#3A86FF', fontWeight: '700' },
  mentionMe: { color: '#E8192C' },
  fileAttach: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#16161e', borderRadius: 8, padding: 8, marginTop: 6 },
  fileIcon: { fontSize: 20 },
  fileName: { color: '#ddd', fontSize: 12, fontWeight: '600' },
  fileSize: { color: '#666', fontSize: 10 },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  reactionBtn: { backgroundColor: '#2a2a35', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  reactionText: { color: '#ccc', fontSize: 12 },
  emojiPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, backgroundColor: '#1a1a22', borderRadius: 10, padding: 8, marginTop: 6 },
  emojiBtn: { padding: 2 },
  emojiClose: { padding: 4 },
  mentionDropdown: { backgroundColor: '#111118', borderTopWidth: 1, borderTopColor: '#2a2a35', maxHeight: 180 },
  mentionItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: '#1e1e28' },
  mentionAvatar: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  mentionAvatarText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  mentionName: { color: '#e0e0e0', fontSize: 13, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    padding: 10, paddingBottom: 30,
    borderTopWidth: 1, borderTopColor: '#1e1e28', backgroundColor: '#111118',
  },
  input: {
    flex: 1, backgroundColor: '#1a1a22', borderWidth: 1, borderColor: '#2a2a35',
    borderRadius: 12, padding: 10, color: '#e0e0e0', fontSize: 14, maxHeight: 100,
  },
  sendBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sendText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
