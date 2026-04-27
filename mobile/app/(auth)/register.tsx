import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { apiRegister } from '@/api/endpoints';
import { C, shadow } from '@/lib/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const login  = useAuthStore((s) => s.login);

  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    setErrorMsg(null);
    setLoading(true);
    try {
      const data = await apiRegister({ name: name.trim(), email: email.trim().toLowerCase(), password });
      await login(data.user, data.accessToken, data.refreshToken);
      router.replace('/(app)');
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { error?: string } } })?.response;

      if (response?.status === 409) {
        Alert.alert(
          'Account Already Exists',
          'This email is already registered. Please sign in instead or use a different email.',
          [
            { text: 'Use Different Email', style: 'cancel' },
            { text: 'Go to Sign In', onPress: () => router.replace('/(auth)/login') },
          ],
        );
        setErrorMsg('This email is already registered. Sign in instead or use a different email.');
        return;
      }

      const msg = response?.data?.error ?? 'Registration failed';
      setErrorMsg(msg);
      if (Platform.OS !== 'web') Alert.alert('Registration Failed', msg);
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

        {/* ── Brand ──────────────────────────────────────────────── */}
        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <Feather name="layers" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Create account.</Text>
          <Text style={styles.subtitle}>Join your team's workspace</Text>
        </View>

        {/* ── Form ───────────────────────────────────────────────── */}
        <View style={styles.form}>

          <Text style={styles.label}>FULL NAME</Text>
          <View style={styles.inputWrap}>
            <Feather name="user" size={16} color={C.TEXT3} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Priya Sharma"
              placeholderTextColor={C.TEXT3}
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (errorMsg) setErrorMsg(null);
              }}
              autoCapitalize="words"
              autoComplete="name"
            />
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>EMAIL ADDRESS</Text>
          <View style={styles.inputWrap}>
            <Feather name="mail" size={16} color={C.TEXT3} />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={C.TEXT3}
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (errorMsg) setErrorMsg(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>PASSWORD</Text>
          <View style={styles.inputWrap}>
            <Feather name="lock" size={16} color={C.TEXT3} />
            <TextInput
              style={styles.input}
              placeholder="Min. 6 characters"
              placeholderTextColor={C.TEXT3}
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errorMsg) setErrorMsg(null);
              }}
              secureTextEntry={!showPwd}
              autoComplete="new-password"
            />
            <TouchableOpacity onPress={() => setShowPwd((p) => !p)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name={showPwd ? 'eye-off' : 'eye'} size={16} color={C.TEXT3} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Create Account</Text>
            }
          </TouchableOpacity>

          {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.link}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.BG },
  inner:     { flexGrow: 1, justifyContent: 'center', padding: 24 },

  brand: { alignItems: 'center', marginBottom: 48 },
  logoBox: {
    width: 72, height: 72,
    borderRadius: 22,
    backgroundColor: C.PRIMARY,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    ...shadow.md,
  },
  title:    { fontSize: 30, fontWeight: '800', color: C.TEXT, letterSpacing: -0.8 },
  subtitle: { fontSize: 15, color: C.TEXT2, marginTop: 6, fontWeight: '400' },

  form: { gap: 4 },

  label: {
    fontSize: 11,
    fontWeight: '700',
    color: C.TEXT3,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.BORDER,
    paddingHorizontal: 14,
    ...shadow.sm,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 15,
    color: C.TEXT,
  },

  btn: {
    backgroundColor: C.PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
    ...shadow.md,
  },
  btnDisabled: { opacity: 0.6 },
  btnText:     { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  errorText:   { color: C.DANGER, marginTop: 12, fontSize: 13, fontWeight: '500' },

  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { color: C.TEXT2, fontSize: 14, fontWeight: '400' },
  link:       { color: C.PRIMARY, fontSize: 14, fontWeight: '700' },
});
