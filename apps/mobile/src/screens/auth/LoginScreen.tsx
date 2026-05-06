import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from '../../components/Icon';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { colors } from '../../theme/colors';
import { NeumorphicCard } from '../../components/NeumorphicCard';
import { api } from '../../services/api';
import { shadow } from '../../utils/styles';

const getDeviceId = async (): Promise<string> => {
  if (Platform.OS === 'android') {
    return Application.getAndroidId() ?? 'unknown-android';
  } else if (Platform.OS === 'ios') {
    return await Application.getIosIdForVendorAsync() ?? 'unknown-ios';
  } else {
    // Web fallback — generate/persist a UUID
    let id = localStorage.getItem('deviceId');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('deviceId', id);
    }
    return id;
  }
};

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { theme } = useTheme();
  const themeColors = colors[theme];

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const deviceId = await getDeviceId();
      const response = await api.post('/auth/login', { email, password, deviceId });
      const { accessToken, refreshToken, user } = response.data;
      await login(accessToken, refreshToken, user);
    } catch (err: any) {
      Alert.alert('Login Failed', err.response?.data?.message || 'Please check your credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.header}>
          <NeumorphicCard style={styles.logoContainer}>
            <Icon name="fingerprint" size={48} color={themeColors.primary} />
          </NeumorphicCard>
          <Text style={[styles.title, { color: themeColors.text }]}>InDaZone</Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            NOT IN ZONE, NO ATTENDANCE
          </Text>
        </View>

        {/* FORM */}
        <View style={styles.form}>

          {/* EMAIL */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>
              EMAIL ADDRESS
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: themeColors.surface }]}>
              <Icon name="email-outline" size={20} color={themeColors.outline} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: themeColors.text }]}
                placeholder="student@university.edu"
                placeholderTextColor={themeColors.outline + '80'}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* PASSWORD */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                PASSWORD
              </Text>
              <Pressable>
                <Text style={[styles.forgotText, { color: colors.light.success }]}>
                  Forgot?
                </Text>
              </Pressable>
            </View>

            <View style={[styles.inputWrapper, { backgroundColor: themeColors.surface }]}>
              <Icon name="lock-outline" size={20} color={themeColors.outline} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: themeColors.text }]}
                placeholder="••••••••"
                placeholderTextColor={themeColors.outline + '80'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={themeColors.outline} />
              </Pressable>
            </View>
          </View>

          {/* LOGIN BUTTON */}
          <Pressable
            onPress={handleLogin}
            disabled={isLoading}
            style={[
              styles.loginButton,
              shadow(themeColors.shadowDark, { x: 4, y: 4 }, 0.3, 8, 4)
            ]}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.loginButtonText}>Sign In to Dashboard</Text>
                <Icon name="arrow-right" size={20} color="#FFF" />
              </>
            )}
          </Pressable>

        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 4,
  },
  form: { gap: 24 },
  inputGroup: { gap: 8 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  forgotText: {
    fontSize: 10,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#48BB78',
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});