import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  taskerName: string;
}

export default function PaymentModal({ visible, onClose, taskerName }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!amount) {
      Alert.alert('שגיאה', 'אנא הזן סכום לתשלום');
      return;
    }

    setLoading(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setLoading(false);
      Alert.alert('תשלום בוצע', `התשלום על סך ₪${amount} ל-${taskerName} הועבר בהצלחה!`);
      setAmount('');
      onClose();
    }, 1500);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
            <Text style={styles.modalCloseText}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.modalTitle}>תשלום לנותן השירות</Text>
          <Text style={styles.modalSubtitle}>עבור {taskerName}</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>₪</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          <TouchableOpacity 
            style={styles.payButton} 
            onPress={handlePayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payButtonText}>בצע תשלום</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '85%',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalCloseButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 5,
  },
  modalCloseText: {
    fontSize: 20,
    color: '#888',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#588157',
    marginBottom: 30,
    paddingBottom: 5,
    width: '60%',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '600',
    color: '#333',
    marginRight: 5,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: '600',
    color: '#333',
    minWidth: 100,
    textAlign: 'center',
  },
  payButton: {
    backgroundColor: '#588157',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
