import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams(); // Get email from previous screen

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const handleReset = () => {
    if (code.length != 4 || newPassword.length < 6) {
        Alert.alert('Error', 'Invalid code or password');
        return;
    }

    // TODO: Verify code and update password in Backend
    Alert.alert('Success', 'Your password has been reset.', [
      { text: 'Login', onPress: () => router.replace('/') } // Go back to Login (index)
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#588157" />
      </TouchableOpacity>

      <ThemedText type="title" style={{color:"#588157"}}>Reset Password</ThemedText>
      <ThemedText style={styles.subtitle}>
        Enter the code sent to <ThemedText type="defaultSemiBold" style={{color:"#588157"}}>{email}</ThemedText>
      </ThemedText>

      <View style={styles.form}>
        {/* Code Input */}
        <View style={styles.inputGroup}>
            <ThemedText type="defaultSemiBold" >Verification Code</ThemedText>
            <TextInput 
            style={styles.input} 
            placeholder="123456" 
            placeholderTextColor="#999"
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
            maxLength={6}
            />
        </View>

        {/* New Password Input */}
        <View style={styles.inputGroup}>
            <ThemedText type="defaultSemiBold" >New Password</ThemedText>
            <TextInput 
            style={styles.input} 
            placeholder="********" 
            placeholderTextColor="#999"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleReset}>
            <ThemedText style={styles.buttonText}>Set New Password</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60, backgroundColor: '#FAF8EF'},
  backButton: { marginBottom: 20 },
  title: { fontSize: 32, marginBottom: 10 },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 30 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    letterSpacing: 2, // Spacing out the characters looks nice for codes
  },
  button: {
    marginTop: 10,
    backgroundColor: '#588157',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});