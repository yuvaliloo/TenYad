import { router, useLocalSearchParams } from 'expo-router';
import { arrayUnion, doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'; // Added onSnapshot & serverTimestamp
import { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, ActivityIndicator } from 'react-native';
import { auth, db } from './services/firebase';
import PayPalModal from '../components/PayPalModal'; // 👈 Make sure this file exists

export default function TaskDetails() {
  const { id } = useLocalSearchParams(); // We only rely on ID, we fetch the rest fresh
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);
  
  // 💳 PayPal State
  const [isPayModalVisible, setPayModalVisible] = useState(false);

  // 1. 🔄 Real-time Listener (Crucial for Status Updates)
  useEffect(() => {
    if (!id) return;
    
    const requestRef = doc(db, 'requests', id as string);
    const unsubscribe = onSnapshot(requestRef, (docSnap) => {
      if (docSnap.exists()) {
        setRequest({ id: docSnap.id, ...docSnap.data() });
      } else {
        Alert.alert("Error", "Task not found");
        router.back();
      }
      setLoading(false);
    }, (error) => {
      console.error("Fetch Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  if (loading || !request) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#588157" />
      </View>
    );
  }

  // --- 🎭 ROLES ---
  const isSeeker = user?.uid === request.seekerId;
  const isWorker = user?.uid === request.workerId; // Needs to be assigned in DB logic
  const isApplicant = request.interestedTaskers?.some((t: any) => t.taskerId === user?.uid);

  // --- ⚡ ACTIONS ---

  // 1. APPLY (For new users)
  const handleApply = async () => {
    if (!user) return Alert.alert('שגיאה', 'עליך להתחבר');
    if (isApplicant) return Alert.alert('שים לב', 'כבר הגשת בקשה למשימה זו');

    try {
      await updateDoc(doc(db, 'requests', id as string), {
        interestedTaskers: arrayUnion({
          taskerId: user.uid,
          taskerName: user.displayName || 'Anonymous',
          timestamp: new Date().toISOString()
        })
      });
      Alert.alert('הצלחה', 'הבקשה נשלחה לבעל המשימה!');
    } catch (error) {
      Alert.alert('Error', 'Failed to apply');
    }
  };

  // 2. WORKER: MARK DONE
  const handleMarkAsDone = async () => {
    try {
      await updateDoc(doc(db, "requests", id as string), {
        status: "pending_payment", // 🔒 Moves state forward
        completedAt: serverTimestamp()
      });
      Alert.alert("סטטוס עודכן", "הודעה נשלחה למבקש לאישור ותשלום.");
    } catch (error) {
      Alert.alert("Error", "Update failed");
    }
  };

  // 3. SEEKER: PAY & CLOSE
  const handlePaymentSuccess = async () => {
    try {
      await updateDoc(doc(db, "requests", id as string), {
        status: "completed",       // 🔒 Job Closed
        paymentStatus: "paid",     // 🔒 Money Confirmed
        paidAt: serverTimestamp()
      });
      setPayModalVisible(false);
      Alert.alert("תודה רבה!", "התשלום התקבל והמשימה נסגרה.");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Database update failed");
    }
  };

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>פרטי המשימה</Text>
      </View>

      <ScrollView style={styles.content}>
        
        {/* 📸 IMAGE SECTION (Matches new-request) */}
        {request.image && (
           <Image source={{ uri: request.image }} style={styles.taskImage} resizeMode="cover" />
        )}

        {/* TITLE & PRICE */}
        <View style={styles.titleRow}>
           <Text style={styles.title}>{request.title}</Text>
           {request.paymentAmount && (
             <Text style={styles.priceTag}>₪{request.paymentAmount}</Text>
           )}
        </View>

        {/* DETAILS */}
        <View style={styles.card}>
          <InfoRow label="תיאור" value={request.description} />
          <InfoRow label="כתובת" value={request.address || request.location?.latitude ? "מיקום במפה" : "לא צוין"} />
          <InfoRow label="סטטוס" value={getStatusText(request.status)} color={getStatusColor(request.status)} />
          <InfoRow label="פורסם ע״י" value={request.seekerName || 'אנונימי'} />
        </View>

        {/* --- 🧠 DYNAMIC ACTION AREA --- */}
        <View style={styles.actionArea}>
            
            {/* SCENARIO A: Job is Open -> Apply */}
            {!request.workerId && request.status === 'open' && (
                <TouchableOpacity 
                    style={[styles.mainButton, isApplicant && styles.disabledButton]} 
                    onPress={handleApply}
                    disabled={isApplicant}
                >
                    <Text style={styles.buttonText}>
                        {isApplicant ? 'הבקשה נשלחה ✅' : 'אני מעוניין/ת במשימה ✋'}
                    </Text>
                </TouchableOpacity>
            )}

            {/* SCENARIO B: I am Worker -> Mark Done */}
            {isWorker && request.status === 'in_progress' && (
                <TouchableOpacity style={styles.mainButton} onPress={handleMarkAsDone}>
                    <Text style={styles.buttonText}>✅ סיימתי את העבודה</Text>
                </TouchableOpacity>
            )}

            {/* SCENARIO C: I am Seeker -> Approve & Pay */}
            {isSeeker && request.status === 'pending_payment' && (
                <View>
                    <Text style={styles.infoText}>העובד סימן שהמשימה בוצעה.</Text>
                    <TouchableOpacity 
                        style={[styles.mainButton, styles.payButton]} 
                        onPress={() => setPayModalVisible(true)}
                    >
                        <Text style={styles.buttonText}>💳 אישור ותשלום ₪{request.paymentAmount}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* SCENARIO D: Job Completed */}
            {request.status === 'completed' && (
                <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>🏆 המשימה הושלמה</Text>
                </View>
            )}
        </View>

      </ScrollView>

      {/* PAYPAL MODAL */}
      <PayPalModal 
        visible={isPayModalVisible}
        amount={parseFloat(request.paymentAmount) || 0}
        onClose={() => setPayModalVisible(false)}
        onSuccess={handlePaymentSuccess}
      />
    </View>
  );
}

// --- 🛠️ HELPER COMPONENTS ---
const InfoRow = ({ label, value, color }: { label: string, value: string, color?: string }) => (
  <View style={styles.row}>
    <Text style={[styles.value, color ? { color, fontWeight: 'bold' } : {}]}>{value}</Text>
    <Text style={styles.label}>{label}:</Text>
  </View>
);

const getStatusText = (status: string) => {
    switch(status) {
        case 'open': return 'פתוח להצעות';
        case 'in_progress': return 'בעבודה';
        case 'pending_payment': return 'ממתין לתשלום';
        case 'completed': return 'הושלם';
        default: return status;
    }
};

const getStatusColor = (status: string) => {
    switch(status) {
        case 'open': return '#2ecc71';
        case 'in_progress': return '#f39c12';
        case 'pending_payment': return '#e74c3c';
        case 'completed': return '#3498db';
        default: return '#333';
    }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8EF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingBottom: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  closeButton: { position: 'absolute', right: 20, top: 55, padding: 10 },
  closeButtonText: { fontSize: 24, color: '#333' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#6f411d' },

  content: { flex: 1 },
  
  taskImage: { width: '100%', height: 200, backgroundColor: '#ddd' },
  
  titleRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333', flex: 1, textAlign: 'right' },
  priceTag: { fontSize: 20, fontWeight: 'bold', color: '#588157', backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden' },

  card: { backgroundColor: 'white', marginHorizontal: 20, padding: 15, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
  row: { flexDirection: 'row-reverse', justifyContent: 'flex-start', marginBottom: 12 },
  label: { fontSize: 14, color: '#888', marginLeft: 8, width: 70, textAlign: 'right' },
  value: { fontSize: 16, color: '#333', flex: 1, textAlign: 'right' },

  actionArea: { padding: 20, paddingBottom: 40 },
  infoText: { textAlign: 'center', marginBottom: 10, color: '#588157', fontWeight: 'bold' },
  
  mainButton: { backgroundColor: '#588157', paddingVertical: 16, borderRadius: 12, alignItems: 'center', elevation: 3 },
  payButton: { backgroundColor: '#2c3e50' }, // Dark Blue for payment
  disabledButton: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },

  completedBadge: { backgroundColor: '#dff9fb', padding: 20, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#c7ecee' },
  completedText: { fontSize: 20, fontWeight: 'bold', color: '#22a6b3' }
});