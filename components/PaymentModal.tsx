import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../app/services/firebase';
import { createPayment, Payment } from '../app/services/payment';

interface PaymentModalProps {
  visible: boolean;
  onClose: () => void;
  taskerName: string;
  taskerId: string;
  taskId: string;
  taskTitle: string;
  onSuccess?: () => void;
}

export default function PaymentModal({ 
  visible, 
  onClose, 
  taskerName, 
  taskerId,
  taskId,
  taskTitle,
  onSuccess 
}: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'paypal' | 'credit_card' | 'apple_pay' | 'google_pay'>('paypal');
  const [description, setDescription] = useState('');

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('שגיאה', 'אנא הזן סכום תקין לתשלום');
      return;
    }

    if (!auth.currentUser) {
      Alert.alert('שגיאה', 'אנא התחבר תחילה');
      return;
    }

    setLoading(true);

    try {
      const paymentData: Omit<Payment, 'id' | 'createdAt'> = {
        payerId: auth.currentUser.uid,
        payerName: auth.currentUser.displayName || 'משתמש',
        recipientId: taskerId,
        recipientName: taskerName,
        amount: parseFloat(amount),
        currency: 'ILS',
        taskId,
        taskTitle,
        paymentMethod: selectedMethod,
        status: 'pending',
        description: description || `תשלום עבור משימה: ${taskTitle}`,
      };

      const result = await createPayment(paymentData);

      if (result.success) {
        Alert.alert('הצלחה', `התשלום על סך ₪${amount} ל-${taskerName} נרשם בהצלחה!`);
        setAmount('');
        setDescription('');
        setSelectedMethod('paypal');
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        Alert.alert('שגיאה', 'לא ניתן היה לעבד את התשלום. אנא נסה שוב');
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בעת עיבוד התשלום');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>

              <Text style={styles.modalTitle}>תשלום לנותן השירות</Text>
              <Text style={styles.modalSubtitle}>עבור {taskerName}</Text>

              {/* Amount Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>₪</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  placeholderTextColor="#ccc"
                />
              </View>

              {/* Payment Method Selection */}
              <Text style={styles.methodLabel}>שיטת תשלום:</Text>
              <View style={styles.methodContainer}>
                {(['paypal', 'credit_card', 'apple_pay', 'google_pay'] as const).map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.methodButton,
                      selectedMethod === method && styles.methodButtonActive,
                    ]}
                    onPress={() => setSelectedMethod(method)}
                  >
                    <Text style={[
                      styles.methodButtonText,
                      selectedMethod === method && styles.methodButtonTextActive,
                    ]}>
                      {method === 'paypal' && 'PayPal'}
                      {method === 'credit_card' && 'כרטיס אשראי'}
                      {method === 'apple_pay' && 'Apple Pay'}
                      {method === 'google_pay' && 'Google Pay'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Description Input */}
              <Text style={styles.descriptionLabel}>הערות (אופציונלי):</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="הוסף הערה או תיאור..."
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
                placeholderTextColor="#ccc"
              />

              {/* Pay Button */}
              <TouchableOpacity 
                style={[styles.payButton, loading && styles.payButtonDisabled]} 
                onPress={handlePayment}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.payButtonText}>בצע תשלום</Text>
                )}
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginVertical: 40,
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
    marginBottom: 20,
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
  methodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    alignSelf: 'flex-start',
    marginBottom: 10,
    marginLeft: 10,
  },
  methodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    gap: 8,
  },
  methodButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  methodButtonActive: {
    borderColor: '#588157',
    backgroundColor: '#E8F5E9',
  },
  methodButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  methodButtonTextActive: {
    color: '#588157',
    fontWeight: '600',
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    alignSelf: 'flex-start',
    marginBottom: 10,
    marginLeft: 10,
  },
  descriptionInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#333',
    maxHeight: 80,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  payButton: {
    backgroundColor: '#588157',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#588157',
  },
  cancelButtonText: {
    color: '#588157',
    fontSize: 16,
    fontWeight: '600',
  },
});
