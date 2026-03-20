import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Introduce email y contraseña');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      Alert.alert('Error', e.message || 'Email o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <Image
          source={require('../../assets/logo-hartford.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Tablón Corporativo</Text>
        <Text style={styles.subtitle}>Intervención Social, Cultural y Educativa</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Entrar</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1e30', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 28, alignItems: 'center' },
  logo: { width: 220, height: 80, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700', color: '#1B3A6B', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#888', marginBottom: 24, textAlign: 'center' },
  input: {
    width: '100%', backgroundColor: '#f5f7fa', borderWidth: 1.5, borderColor: '#dde3ee',
    borderRadius: 10, padding: 12, color: '#1B3A6B', fontSize: 14, marginBottom: 12,
  },
  btn: {
    width: '100%', backgroundColor: '#E8192C', borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 4,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
