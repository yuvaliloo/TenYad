import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'; // Import this
import { auth } from './services/firebase'; // Import your configured auth instance
import { 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  View, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SignupScreen() {
  const router = useRouter();

  // Input State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Error State
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    general: ''
  });

  const validate = () => {
    let isValid = true;
    let newErrors = { email: '', password: '', confirmPassword: '', general: '' };

    // 1. Validate Email (Regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      newErrors.email = 'Please enter a valid email address.';
      isValid = false;
    }

    // 2. Validate Password Length
    if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
      isValid = false;
    }

    // 3. Validate Match
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
      isValid = false;
    }

    // 4. Validate Empty Fields
    if (!fullName || !email || !password) {
      newErrors.general = 'All fields are required.';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignup = async () => {
    if (validate()) {
      try {
        // 1. Create the user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // 2. (Optional) Set the Display Name immediately
        if (userCredential.user) {
            await updateProfile(userCredential.user, { displayName: fullName });
        }

        console.log('User created:', userCredential.user.email);
        
        // 3. Navigate to the App
        router.replace('/(tabs)'); 
        
      } catch (error: any) {
        // Handle Firebase Errors specifically
        if (error.code === 'auth/email-already-in-use') {
            setErrors({...errors, email: 'This email is already registered.'});
        } else if (error.code === 'auth/weak-password') {
            setErrors({...errors, password: 'Password should be at least 6 chars.'});
        } else {
            setErrors({...errors, general: error.message});
        }
      }
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <ThemedView style={styles.container}>
          
          {/* Back Button */}
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#588157" />
          </TouchableOpacity>

          <ThemedText type="title" style={{color:"#588157"}}>Create Account</ThemedText>
          <ThemedText style={styles.subtitle}>Join the TenYad community today.</ThemedText>

          <View style={styles.form}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <ThemedText type="defaultSemiBold">Full Name</ThemedText>
              <TextInput 
                style={styles.input} 
                placeholder="John Doe" 
                placeholderTextColor="#999"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <ThemedText type="defaultSemiBold">Email</ThemedText>
              <TextInput 
                style={[styles.input, errors.email ? styles.inputError : null]} 
                placeholder="john@example.com" 
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrors({...errors, email: ''}); // Clear error on type
                }}
              />
              {errors.email ? <ThemedText style={styles.errorText}>{errors.email}</ThemedText> : null}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <ThemedText type="defaultSemiBold">Password</ThemedText>
              <TextInput 
                style={[styles.input, errors.password ? styles.inputError : null]} 
                placeholder="******" 
                placeholderTextColor="#999"
                secureTextEntry
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrors({...errors, password: ''});
                }}
              />
              {errors.password ? <ThemedText style={styles.errorText}>{errors.password}</ThemedText> : null}
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <ThemedText type="defaultSemiBold">Confirm Password</ThemedText>
              <TextInput 
                style={[styles.input, errors.confirmPassword ? styles.inputError : null]} 
                placeholder="******" 
                placeholderTextColor="#999"
                secureTextEntry
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrors({...errors, confirmPassword: ''});
                }}
              />
              {errors.confirmPassword ? <ThemedText style={styles.errorText}>{errors.confirmPassword}</ThemedText> : null}
            </View>

            {/* General Error */}
            {errors.general ? <ThemedText style={[styles.errorText, {textAlign:'center'}]}>{errors.general}</ThemedText> : null}

            {/* Sign Up Button */}
            <TouchableOpacity style={styles.button} onPress={handleSignup}>
              <ThemedText style={styles.buttonText}>Sign Up</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  backButton: {
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  title: {
    fontSize: 32,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: 'gray',
    marginBottom: 30,
    marginTop: 5,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f9f9f9',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#ff4d4d',
    backgroundColor: '#fff0f0',
  },
  errorText: {
    color: '#ff4d4d',
    fontSize: 12,
    marginTop: -4,
  },
  button: {
    marginTop: 20,
    backgroundColor: '#588157',
    height: 55,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#588157',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});