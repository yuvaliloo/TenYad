import { router, useLocalSearchParams } from 'expo-router';
import { arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from './services/firebase';

export default function TaskDetails() {
    const [userName, setUserName] = useState("אורח");
  const params = useLocalSearchParams();
  const { id, title, description, location, createdBy, imageUrl, paymentAmount } = params;

  const handleTakeTask = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('שגיאה', 'עליך להיות מחובר כדי לקחת משימה');
        return;
      }

      // שלוף את המשימה כדי לבדוק אם המשתמש כבר הגיש בקשה
      const requestRef = doc(db, 'requests', id as string);
      const requestSnap = await getDoc(requestRef);
      
      if (requestSnap.exists()) {
        const requestData = requestSnap.data();
        const interestedTaskers = requestData.interestedTaskers || [];
        
        // בדוק אם המשתמש כבר נמצא ברשימה
        const alreadyApplied = interestedTaskers.some(
          (tasker: any) => tasker.taskerId === user.uid
        );
        
        if (alreadyApplied) {
          Alert.alert('', 'כבר נשלחה בקשה למשימה זו');
          return;
        }
      }

      // הוסף את המשתמש לרשימת המעוניינים
      await updateDoc(requestRef, {
        interestedTaskers: arrayUnion({
          taskerId: user.uid,
          taskerName: user.displayName || user.email || 'לא ידוע',
          profileImage: user.photoURL || null,
          timestamp: new Date().toISOString()
        })
      });

      router.back();
      setTimeout(() => {
        Alert.alert('', 'בקשתך נשלחה');
      }, 300);
    } catch (error) {
      console.error('Error taking task:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לשלוח את הבקשה');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>פרטי המשימה</Text>
      </View>

      <ScrollView style={styles.content}>
        
        {/* Task Image */}
        {imageUrl ? (
          <View style={styles.imageContainer}>
             <Image source={{ uri: imageUrl as string }} style={styles.taskImage} />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.label}>כותרת</Text>
          <Text style={styles.value}>{title || 'ללא כותרת'}</Text>
        </View>
      
        <View style={styles.section}>
          <Text style={styles.label}>תיאור</Text>
          <Text style={styles.value}>{description || 'אין תיאור'}</Text>
        </View>

        <View style={styles.section}>
            <Text style={styles.label}>תשלום</Text>
            <Text style={styles.value}>{paymentAmount ? `₪${paymentAmount}` : 'ללא תשלום'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>מיקום</Text>
          <Text style={styles.value}>{location || 'לא צוין'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>פורסם על ידי</Text>
          <Text style={styles.value}>{createdBy || 'לא ידוע'}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.takeButton} onPress={handleTakeTask}>
          <Text style={styles.takeButtonText}>קח משימה</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8EF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },

  closeButton: {
    position: 'absolute',
    right: 20,
    top: 60,
  },

  closeButtonText: {
    fontSize: 28,
    color: '#333',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6f411d',
  },

  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  section: {
    marginBottom: 24,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
    textAlign: 'right',
  },

  value: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },

  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },

  takeButton: {
    backgroundColor: '#588157',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },

  takeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  taskImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
});