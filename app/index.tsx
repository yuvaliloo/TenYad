import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'; // Used for navigation
import { signInWithEmailAndPassword } from 'firebase/auth'; // Import this
import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { auth } from './services/firebase'; // Import your configured auth instance

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
        Alert.alert('Error', 'Please enter both email and password.');
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Logged in as:', userCredential.user.email);
        
        // Navigate to dashboard
        router.replace('/(tabs)');
        
    } catch (error: any) {
        let msg = error.message;
        if (error.code === 'auth/invalid-credential') {
            msg = 'Invalid email or password.';
        } else if (error.code === 'auth/user-not-found') {
            msg = 'No account found with this email.';
        }
        Alert.alert('Login Failed', msg);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        {/* Header / Logo Area */}
        <ThemedView style={styles.header}>
          <Ionicons name="hand-right-outline" size={80} color="#588157" />
          <ThemedText type="title" style={styles.appName}>TenYad</ThemedText>
          <ThemedText style={styles.subtitle}>Welcome back!</ThemedText>
        </ThemedView>

        {/* Form Area */}
        <ThemedView style={styles.formContainer}>
          <ThemedText type="defaultSemiBold" style={styles.label} >Email</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="example@example.com"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <ThemedText type="defaultSemiBold" style={styles.label}>Password</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="********"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <ThemedText style={styles.loginButtonText}>Log In</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/forgot-password')}>
            <ThemedText style={styles.forgotPassword}>Forgot Password?</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* Footer / Sign Up */}
        <ThemedView style={styles.footer}>
          <ThemedText>Don't have an account? </ThemedText>
          <TouchableOpacity onPress={() => router.push('/signup')}>
            <ThemedText type="defaultSemiBold" style={styles.signupLink}>Sign Up</ThemedText>
          </TouchableOpacity>
        </ThemedView>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8EF', // Or use your theme background color
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: 'transparent',
  },
  appName: {
    fontSize: 32,
    color: '#588157',
    marginTop: 10,
  },
  subtitle: {
    marginTop: 5,
    color: 'gray',
    fontSize: 16,
  },
  formContainer: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  label: {
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  loginButton: {
    backgroundColor: '#588157',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#588157',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPassword: {
    textAlign: 'center',
    marginTop: 15,
    color: '#588157',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
    backgroundColor: 'transparent',
  },
  signupLink: {
    color: '#588157',
  },
});