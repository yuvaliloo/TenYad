import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithCredential 
} from 'firebase/auth';
import { auth } from './services/firebase';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  View,
  Text 
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as Linking from 'expo-linking';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// 1. Initialize Browser
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false); 

  // 🟢 FIX: POINT TO THE "EXIT PAGE" (/auth-callback)
  // This prevents the "App inside App" bug
  const url = Linking.createURL('/auth-callback'); 
  const redirectUri = url.replace("exp://", "https://");
  
  console.log("🔥 NEW TUNNEL URI:", redirectUri);

  const [request, response, promptAsync] = Google.useAuthRequest({
    // 🟢 MIRROR TRICK: Use Web Client ID for iOS too
    webClientId: "278245358919-8c2n5t37ijogknef1nakhke6bdh3s03s.apps.googleusercontent.com",
    iosClientId: "278245358919-8c2n5t37ijogknef1nakhke6bdh3s03s.apps.googleusercontent.com",
    androidClientId: "278245358919-3g3rvdmla5lat03lqqdg47go97pmdgp9.apps.googleusercontent.com",
    
    // 🟢 USE THE URI THAT POINTS TO THE EXIT PAGE
    redirectUri: redirectUri
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // The router will handle the navigation, but we ensure the browser is closed below
        router.replace('/(tabs)');
      } else {
        setInitializing(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // 🔎 Log the response to debug "Something went wrong" errors
    if (response) {
        console.log("Authentication Response:", JSON.stringify(response, null, 2));
    }

    if (response?.type === "success") {
      // 🟢 DOUBLE CHECK: Dismiss browser just in case auth-callback missed it
      WebBrowser.dismissAuthSession();

      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .catch((error) => {
          Alert.alert("Authentication Error", error.message);
          setLoading(false);
        });
    } else if (response?.type === 'error') {
        Alert.alert("Login Error", "Could not complete the sign-in.");
    }
  }, [response]);

  const handleLogin = async () => {
    if (!email || !password) {
        Alert.alert('Error', 'Please enter both email and password.');
        return;
    }
    setLoading(true);
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
        setLoading(false);
        let msg = error.message;
        if (error.code === 'auth/invalid-credential') {
            msg = 'Invalid email or password.';
        } else if (error.code === 'auth/user-not-found') {
            msg = 'No account found with this email.';
        }
        Alert.alert('Login Failed', msg);
    }
  };

  if (initializing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#588157" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        <ThemedView style={styles.header}>
          <Ionicons name="hand-right-outline" size={80} color="#588157" />
          <ThemedText type="title" style={styles.appName}>TenYad</ThemedText>
          <ThemedText style={styles.subtitle}>Welcome back!</ThemedText>
        </ThemedView>

        <ThemedView style={styles.formContainer}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Email</ThemedText>
          <TextInput
            testID="email_input"
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
            testID="password_input"
            style={styles.input}
            placeholder="********"
            placeholderTextColor="#888"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={loading}>
             {loading ? <ActivityIndicator color="#fff"/> : <ThemedText style={styles.loginButtonText}>Log In</ThemedText>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/forgot-password')}>
            <ThemedText style={styles.forgotPassword}>Forgot Password?</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        <View style={styles.dividerContainer}>
            <View style={styles.line} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.googleButton} disabled={!request || loading} onPress={() => promptAsync()}>
          <Ionicons name="logo-google" size={20} color="#4285F4" style={{marginRight: 10}} />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

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
  container: { flex: 1, backgroundColor: '#FAF8EF' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 40, backgroundColor: 'transparent' },
  appName: { fontSize: 32, color: '#588157', marginTop: 10 },
  subtitle: { marginTop: 5, color: 'gray', fontSize: 16 },
  formContainer: { width: '100%', backgroundColor: 'transparent' },
  label: { marginBottom: 8, marginLeft: 4 },
  input: { height: 50, borderWidth: 1, borderColor: '#ccc', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20, fontSize: 16, backgroundColor: '#f9f9f9' },
  loginButton: { backgroundColor: '#588157', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: '#588157', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 6, elevation: 5 },
  loginButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  forgotPassword: { textAlign: 'center', marginTop: 15, color: '#588157' },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: 25 },
  line: { flex: 1, height: 1, backgroundColor: '#ccc' },
  orText: { marginHorizontal: 10, color: '#888', fontWeight: '600' },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', paddingVertical: 12, borderRadius: 12, width: "100%", elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  googleButtonText: { color: "#333", fontSize: 16, fontWeight: "600" },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40, backgroundColor: 'transparent' },
  signupLink: { color: '#588157' },
});