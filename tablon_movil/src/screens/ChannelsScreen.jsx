import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiGetChannels } from '../api/client';

export default function ChannelsScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [unread, setUnread] = useState({});

  const loadChannels = useCallback(async () => {
    try {
      const data = await apiGetChannels();
      setChannels(data);
      // Expandir el primer canal por defecto
      if (data.length > 0 && Object.keys(expanded).length === 0) {
        setExpanded({ [data[0].id]: true });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadChannels(); }, []);

  const onRefresh = () => { setRefreshing(true); loadChannels(); };

  const toggleChannel = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const goToMessages = (channel, subchannel) => {
    setUnread((prev) => ({ ...prev, [subchannel.id]: 0 }));
    navigation.navigate('Messages', { channel, subchannel });
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#E8192C" />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📌 Tablón Hartford</Text>
        <View style={styles.headerRight}>
          <Text style={styles.userName}>{user?.name}</Text>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={channels}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#E8192C" />}
        renderItem={({ item: ch }) => {
          const chUnread = (ch.subchannels || []).reduce((s, sub) => s + (unread[sub.id] || 0), 0);
          return (
            <View style={styles.channelBlock}>
              <TouchableOpacity
                style={styles.channelRow}
                onPress={() => toggleChannel(ch.id)}
              >
                <Text style={styles.channelIcon}>{ch.icon}</Text>
                <Text style={styles.channelName}>{ch.name}</Text>
                {chUnread > 0 && !expanded[ch.id] && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{chUnread > 99 ? '99+' : chUnread}</Text>
                  </View>
                )}
                <Text style={styles.chevron}>{expanded[ch.id] ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {expanded[ch.id] && (ch.subchannels || []).map((sub) => {
                const count = unread[sub.id] || 0;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    style={[styles.subRow, { borderLeftColor: ch.color || '#E8192C' }]}
                    onPress={() => goToMessages(ch, sub)}
                  >
                    <Text style={styles.subIcon}>{sub.icon}</Text>
                    <Text style={[styles.subName, count > 0 && styles.subNameUnread]}>
                      {sub.name}
                    </Text>
                    {count > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No tienes acceso a ningún canal todavía.</Text>
            <Text style={styles.emptySubtext}>Contacta con el administrador.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d12' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    backgroundColor: '#0f1e30', paddingTop: 50, paddingBottom: 14,
    paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#1a2d45',
  },
  headerTitle: { color: '#f0f0f0', fontWeight: '700', fontSize: 16 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  userName: { color: '#7a9abf', fontSize: 12 },
  logoutBtn: { backgroundColor: '#1a2d45', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  logoutText: { color: '#E8192C', fontSize: 12, fontWeight: '600' },
  channelBlock: { marginBottom: 4 },
  channelRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: '#111118', borderBottomWidth: 1, borderBottomColor: '#1e1e28',
  },
  channelIcon: { fontSize: 18, marginRight: 10 },
  channelName: { flex: 1, color: '#f0f0f0', fontWeight: '700', fontSize: 14 },
  chevron: { color: '#555', fontSize: 10, marginLeft: 8 },
  subRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingLeft: 32, paddingRight: 16,
    backgroundColor: '#0d0d12', borderLeftWidth: 3, marginLeft: 16,
    borderBottomWidth: 1, borderBottomColor: '#1a1a22',
  },
  subIcon: { fontSize: 14, marginRight: 8 },
  subName: { flex: 1, color: '#7a9abf', fontSize: 13 },
  subNameUnread: { color: '#fff', fontWeight: '700' },
  badge: {
    backgroundColor: '#E8192C', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2, minWidth: 18, alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  emptyText: { color: '#555', fontSize: 15, textAlign: 'center' },
  emptySubtext: { color: '#333', fontSize: 13, marginTop: 6 },
});
