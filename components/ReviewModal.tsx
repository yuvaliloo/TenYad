import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { auth } from '../app/services/firebase';
import { createReview } from '../app/services/reviews';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  reviewedUserId: string; // The user receiving the review (the worker)
  reviewedUserName?: string;
  taskTitle: string;
  taskId: string;
}

export default function ReviewModal({ visible, onClose, onSuccess, reviewedUserId, reviewedUserName, taskTitle, taskId }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!auth.currentUser) return;
    
    if (!reviewedUserId) {
        Alert.alert('שגיאה', 'לא ניתן לשמור ביקורת ללא מזהה משתמש');
        return;
    }

    setLoading(true);

    const result = await createReview({
      reviewedUserId,
      reviewedUserName: reviewedUserName || 'משתמש',
      reviewerId: auth.currentUser.uid,
      reviewerName: auth.currentUser.displayName || 'משתמש',
      rating,
      comment,
      taskId,
      taskTitle
    });

    setLoading(false);
    
    if (result.success) {
      setComment('');
      setRating(5);
      if (onSuccess) {
        await onSuccess();
      }
      Alert.alert('תודה!', 'הביקורת נשמרה והמשימה סומנה כהושלמה');
      onClose();
    } else {
      Alert.alert('שגיאה', `לא ניתן היה לשמור את הביקורת\nהודעת שגיאה: ${result.error}`);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps='handled'>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.title}>דירוג עבור {taskTitle}</Text>
              {reviewedUserName && <Text style={styles.subtitle}>ביצוע ע"י: {reviewedUserName}</Text>}
              
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Text style={[styles.star, star <= rating ? styles.selectedStar : styles.unselectedStar]}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.ratingText}>{rating} מתוך 5</Text>

              <TextInput
                style={styles.input}
                placeholder="איך היה השירות? כתוב כאן..."
                value={comment}
                onChangeText={setComment}
                multiline
                textAlignVertical="top"
              />

              <View style={styles.buttons}>
                <TouchableOpacity onPress={onClose} style={styles.cancelButton} disabled={loading}>
                  <Text style={styles.cancelButtonText}>אולי אחר כך</Text>
                </TouchableOpacity>
                
                <TouchableOpacity onPress={handleSubmit} style={styles.submitButton} disabled={loading}>
                  {loading ? (
                      <ActivityIndicator color="#fff" size="small" />
                  ) : (
                      <Text style={styles.submitText}>שלח ביקורת</Text>
                  )}
                </TouchableOpacity>
              </View>
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
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    padding: 20 
  },
  modalContent: { 
    backgroundColor: 'white', 
    padding: 24, 
    borderRadius: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    marginBottom: 8, 
    textAlign: 'center',
    color: '#333'
  },
  subtitle: {
    fontSize: 16, 
    marginBottom: 20, 
    textAlign: 'center',
    color: '#666'
  },
  starsContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginBottom: 10 
  },
  star: { 
    fontSize: 40, 
    marginHorizontal: 4 
  },
  selectedStar: { 
    color: '#FFD700' 
  },
  unselectedStar: {
    color: '#E0E0E0'
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#588157',
    marginBottom: 20
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    padding: 12, 
    height: 100, 
    marginBottom: 24,
    backgroundColor: '#f9f9f9',
    textAlign: 'right'
  },
  buttons: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    gap: 12
  },
  cancelButton: { 
    padding: 14,
    flex: 1,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f0f0f0'
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600'
  },
  submitButton: { 
    backgroundColor: '#588157', 
    padding: 14, 
    borderRadius: 8,
    flex: 2,
    alignItems: 'center'
  },
  submitText: { 
    color: 'white', 
    fontWeight: 'bold' 
  }
});
