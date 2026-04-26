import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { apiLogin } from '@/api/endpoints';

export default function LoginScreen() {
  const router        = useRouter();
  const login         = useAuthStore((s) => s.login);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      const data = await apiLogin({ email: email.trim().toLowerCase(), password });
      await login(data.user, data.accessToken, data.refreshToken);
      router.replace('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error ?? 'Login failed';
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoBox} />
          <Text style={styles.title}>TaskManager</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor="#8E9385"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#8E9385"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Sign In</Text>
            }
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" style={styles.link}>Register</Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F0' },
  inner:     { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header:    { alignItems: 'center', marginBottom: 40 },
  logoBox:   { width: 64, height: 64, backgroundColor: '#1C2E1D', borderRadius: 16, marginBottom: 20 },
  title:     { fontSize: 32, fontWeight: '800', color: '#1C2E1D', letterSpacing: -1 },
  subtitle:  { fontSize: 16, color: '#5C6C52', marginTop: 8, fontWeight: '500' },
  form:      { gap: 8 },
  label:     { fontSize: 13, color: '#5C6C52', fontWeight: '600', marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    color: '#1C2E1D',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  btn: {
    backgroundColor: '#1C2E1D',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:      { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText:  { color: '#5C6C52', fontSize: 14, fontWeight: '500' },
  link:        { color: '#1C2E1D', fontSize: 14, fontWeight: '700' },
});
