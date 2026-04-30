import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    // TODO: Validate email and password
    // TODO: Call signIn from AuthContext
    // TODO: Handle errors and show user feedback
    // TODO: Navigation to dashboard on success
  };

  return (
    <View style={styles.container}>
      {/* TODO: Add login form UI */}
      {/* Email input */}
      {/* Password input */}
      {/* Login button */}
      {/* Sign up link */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  // TODO: Add more styles
});
