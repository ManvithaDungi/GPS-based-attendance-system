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
  Platform,
  Image
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
import { rs, rms, rvs, wp } from '../../utils/responsive'; // ← responsive helpers

const getDeviceId = async (): Promise<string> => {
  if (Platform.OS === 'android') {
    return Application.getAndroidId() ?? 'unknown-android';
  } else if (Platform.OS === 'ios') {
    return await Application.getIosIdForVendorAsync() ?? 'unknown-ios';
  } else {
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
      const { accessToken, refreshToken, user, csrfToken } = response.data;
      await login(accessToken, refreshToken, user, csrfToken);
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
            <Image
              source={require('../../../assets/logo.png')}
              style={{ width: rs(96), height: rs(96), borderRadius: rs(24) }}
              resizeMode="contain"
            />
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
              <Icon name="email-outline" size={rs(20)} color={themeColors.outline} style={styles.inputIcon} />
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
              <Icon name="lock-outline" size={rs(20)} color={themeColors.outline} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: themeColors.text }]}
                placeholder="••••••••"
                placeholderTextColor={themeColors.outline + '80'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Icon name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={rs(20)} color={themeColors.outline} />
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
                <Icon name="arrow-right" size={rs(20)} color="#FFF" />
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
    padding: rs(24),
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: rvs(48),
  },
  logoContainer: {
    width: rs(96),
    height: rs(96),
    borderRadius: rs(32),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rvs(16),
  },
  title: {
    fontSize: rms(42),
    fontWeight: '900',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: rms(12),
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: rvs(4),
  },
  form: { gap: rvs(24) },
  inputGroup: { gap: rvs(8) },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: rs(4),
  },
  label: {
    fontSize: rms(10),
    fontWeight: '700',
    letterSpacing: 1,
  },
  forgotText: {
    fontSize: rms(10),
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: rs(20),
    paddingHorizontal: rs(16),
    height: rvs(56),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  inputIcon: { marginRight: rs(12) },
  input: {
    flex: 1,
    fontSize: rms(14),
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#48BB78',
    height: rvs(60),
    borderRadius: rs(30),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(12),
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: rms(16),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});