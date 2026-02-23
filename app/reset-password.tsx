import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View, Platform, ActivityIndicator } from 'react-native';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './services/firebase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleReset = async () => {
    if (!email) {
        Platform.OS === 'web' ? window.alert('אנא הזן כתובת אימייל.') : Alert.alert('שגיאה', 'אנא הזן כתובת אימייל.');
        return;
    }

    setLoading(true);
    try {
        await sendPasswordResetEmail(auth, email);
        const successMsg = 'נשלח קישור לאיפוס סיסמה למייל שלך.';
        if (Platform.OS === 'web') {
            window.alert(successMsg);
            router.replace('/login');
        } else {
            Alert.alert('הצלחה', successMsg, [{ text: 'הבנתי', onPress: () => router.replace('/login') }]);
        }
    } catch (error: any) {
        const errMsg = error.message;
        Platform.OS === 'web' ? window.alert('שגיאה: ' + errMsg) : Alert.alert('שגיאה', errMsg);
    } finally {
        setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#588157" />
      </TouchableOpacity>

      <ThemedText type="title" style={{color:"#588157"}}>איפוס סיסמה</ThemedText>
      <ThemedText style={styles.subtitle}>הזן את המייל שלך כדי לקבל קישור לאיפוס.</ThemedText>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
            <ThemedText type="defaultSemiBold">אימייל</ThemedText>
            <TextInput 
              style={styles.input} 
              placeholder="example@example.com" 
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleReset} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>שלח קישור לאיפוס</ThemedText>}
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60, backgroundColor: '#FAF8EF'},
  backButton: { marginBottom: 20 },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 30, marginTop: 10 },
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  input: { height: 50, borderWidth: 1, borderColor: '#ccc', borderRadius: 12, paddingHorizontal: 15, fontSize: 16, backgroundColor: '#f9f9f9' },
  button: { marginTop: 10, backgroundColor: '#588157', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});