import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';

interface PayPalLinkModalProps {
  visible: boolean;
  currentEmail: string;
  onClose: () => void;
  onSave: (email: string) => void;
}

export default function PayPalLinkModal({ visible, currentEmail, onClose, onSave }: PayPalLinkModalProps) {
  const [email, setEmail] = useState(currentEmail);

  const handleSave = () => {
    if (email.length > 0 && (email.length < 5 || !email.includes('@'))) {
      Alert.alert("שגיאה", "אנא הזן כתובת אימייל תקינה");
      return;
    }
    onSave(email);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          
          <Text style={styles.logo}>Pay<Text style={{color: '#009cde'}}>Pal</Text></Text>
          <Text style={styles.title}>חיבור חשבון</Text>
          <Text style={styles.subtitle}>הכנס את כתובת האימייל של חשבון ה-PayPal שלך לקבלת כספים.</Text>

          <TextInput 
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            
            // 🟢 THESE 3 LINES REMOVE THE RED SQUIGGLES 🟢
            autoCorrect={false}
            spellCheck={false}
            textContentType="emailAddress"
          />

          <View style={styles.row}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>ביטול</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>שמור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  container: { width: '85%', backgroundColor: 'white', borderRadius: 20, padding: 25, alignItems: 'center', elevation: 5 },
  logo: { fontSize: 32, fontWeight: '900', color: '#003087', marginBottom: 10 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 },
  input: { width: '100%', backgroundColor: '#f0f0f0', borderRadius: 10, padding: 15, fontSize: 16, textAlign: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#ddd' },
  row: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', gap: 10 },
  cancelButton: { flex: 1, padding: 15, alignItems: 'center' },
  cancelText: { color: '#888', fontWeight: 'bold' },
  saveButton: { flex: 1, backgroundColor: '#003087', borderRadius: 10, padding: 15, alignItems: 'center' },
  saveText: { color: 'white', fontWeight: 'bold' },
});