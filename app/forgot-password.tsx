import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');// Input State 
  const [error, setError] = useState('');// Error State

  const handleSendCode = () => {
    // Simple Email Regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    // TODO: Call Backend to send email here
    console.log('Sending code to:', email);

    // Navigate to next step and pass the email as a parameter
    router.push({ pathname: '/reset-password', params: { email } });
  };

  //return Render
  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#588157" />
      </TouchableOpacity>

      <ThemedText type="title" style={{color: "#588157"}}>Forgot Password?</ThemedText>
      <ThemedText style={styles.subtitle}>
        Enter your email address and we'll send you a code to reset your password.
      </ThemedText>

      <View style={styles.inputContainer}>
        <ThemedText type="defaultSemiBold">Email</ThemedText>
        <TextInput 
          style={[styles.input, error ? styles.inputError : null]} 
          placeholder="john@example.com" 
          placeholderTextColor="#999"
          value={email}
          onChangeText={(t) => { setEmail(t); setError(''); }}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSendCode}>
        <ThemedText style={styles.buttonText}>Send Code</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60, backgroundColor: '#FAF8EF' },
  backButton: { marginBottom: 20 },
  title: { fontSize: 32, marginBottom: 10 },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 30, lineHeight: 22 },
  inputContainer: { gap: 8 },
  input: {
    height: 50,
    borderWidth: 1,//width of border
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: { borderColor: '#ff4d4d', backgroundColor: '#fff0f0' },
  errorText: { color: '#ff4d4d', fontSize: 12 },
  button: {
    marginTop: 20,
    backgroundColor: '#588157',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#588157',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});