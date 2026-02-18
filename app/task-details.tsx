import { router, useLocalSearchParams } from 'expo-router';
import { arrayUnion,getDoc, doc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'; 
import { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View, Image, ActivityIndicator } from 'react-native';
import { auth, db } from './services/firebase';
import PayPalModal from '../components/PayPalModal'; 
import { sendPushNotification } from './services/notifications'; // 👈 Import helper

export default function TaskDetails() {
  const { id } = useLocalSearchParams(); 
  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);
  
  const [isPayModalVisible, setPayModalVisible] = useState(false);
  
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

  const isSeeker = user?.uid === request.seekerId;
  const isApplicant = request.interestedTaskers?.some((t: any) => t.taskerId === user?.uid);
  
  // Logic to determine if I am the active worker
  const isWorker = user?.uid === request.workerId || (request.status === 'in_progress' && isApplicant);

  // --- ACTIONS ---

  const handleApply = async () => {
    if (!user) return Alert.alert('שגיאה', 'עליך להתחבר');
    try {
      await updateDoc(doc(db, 'requests', id as string), {
        interestedTaskers: arrayUnion({
          taskerId: user.uid,
          taskerName: user.displayName || 'Anonymous',
          timestamp: new Date().toISOString()
        })
      });
      if (request.seekerId) {
          const seekerSnap = await getDoc(doc(db, "users", request.seekerId));
          if (seekerSnap.exists()) {
              const seekerData = seekerSnap.data();
              if (seekerData.pushToken) {
                  await sendPushNotification(
                      seekerData.pushToken,
                      "יש לך מועמד חדש! 🎉",
                      `${user.displayName || "מישהו"} מעוניין לעזור לך במשימה "${request.title}"`
                  );
              }
          }
      }

      Alert.alert('הצלחה', 'הבקשה נשלחה והודעה נשלחה למבקש!');
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to apply');
    }
  };

  const handleMarkAsDone = async () => {
    try {
      await updateDoc(doc(db, "requests", id as string), {
        status: "pending_payment", 
        completedAt: serverTimestamp()
      });
      Alert.alert("סטטוס עודכן", "הודעה נשלחה למבקש לאישור ותשלום.");
    } catch (error) {
      Alert.alert("Error", "Update failed");
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      await updateDoc(doc(db, "requests", id as string), {
        status: "completed",       
        paymentStatus: "paid",     
        paidAt: serverTimestamp()
      });
      setPayModalVisible(false);
      Alert.alert("תשלום התקבל! 🏆", "המשימה הושלמה ונסגרה בהצלחה.");
      router.back();
    } catch (error) {
      console.error(error);
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
        
        {request.image && (
           <Image source={{ uri: request.image }} style={styles.taskImage} resizeMode="cover" />
        )}

        <View style={styles.titleRow}>
           <Text style={styles.title}>{request.title}</Text>
           {request.paymentAmount && (
             <Text style={styles.priceTag}>₪{request.paymentAmount}</Text>
           )}
        </View>

        <View style={[styles.statusBar, { backgroundColor: getStatusColor(request.status) }]}>
            <Text style={styles.statusText}>{getStatusText(request.status)}</Text>
        </View>

        {/* DETAILS CARD */}
        <View style={styles.card}>
          <InfoRow label="תיאור" value={request.description} />
          {/* 🟢 Fix 1: Display the Address explicitly */}
          <InfoRow label="כתובת" value={request.address || "לא צוין"} />
          <InfoRow label="פורסם ע״י" value={request.seekerName || 'אנונימי'} />
        </View>

        {/* ACTION AREA */}
        <View style={styles.actionArea}>
            
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

            {isWorker && request.status === 'in_progress' && (
                <TouchableOpacity style={styles.mainButton} onPress={handleMarkAsDone}>
                    <Text style={styles.buttonText}>✅ סיימתי את העבודה</Text>
                </TouchableOpacity>
            )}

            {isSeeker && request.status === 'pending_payment' && (
                <View>
                    <Text style={styles.infoText}>העובד דיווח על סיום. נא לאשר ולשלם.</Text>
                    <TouchableOpacity 
                        style={[styles.mainButton, styles.payButton]} 
                        onPress={() => setPayModalVisible(true)}
                    >
                        <Text style={styles.buttonText}>💳 אישור ותשלום ₪{request.paymentAmount}</Text>
                    </TouchableOpacity>
                </View>
            )}

            {request.status === 'completed' && (
                <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>🏆 המשימה הושלמה ושולמה</Text>
                </View>
            )}
        </View>

      </ScrollView>

      <PayPalModal 
        visible={isPayModalVisible}
        amount={parseFloat(request.paymentAmount) || 0}
        onClose={() => setPayModalVisible(false)}
        onSuccess={handlePaymentSuccess}
      />
    </View>
  );
}

// --- HELPER COMPONENTS ---

// 🟢 Fix 2: InfoRow updated for RTL
const InfoRow = ({ label, value }: { label: string, value: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value}>{value}</Text>
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
        default: return '#999';
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
  
  // Title Row (RTL)
  titleRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#333', flex: 1, textAlign: 'right', writingDirection: 'rtl' },
  priceTag: { fontSize: 20, fontWeight: 'bold', color: '#588157', backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, overflow: 'hidden' },
  
  statusBar: { width: '100%', padding: 8, alignItems: 'center', justifyContent: 'center' },
  statusText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  
  card: { backgroundColor: 'white', marginHorizontal: 20, marginTop: 15, padding: 15, borderRadius: 12, elevation: 2 },
  
  // 🟢 Fix 3: Row Styles for RTL
  row: { 
    flexDirection: 'row-reverse', // Label on right, Value on left
    justifyContent: 'flex-start', // Start from right
    marginBottom: 12,
    alignItems: 'flex-start' // Align top if text wraps
  },
  label: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#888', 
    marginLeft: 10, // Space between label and value
    textAlign: 'right',
    minWidth: 70 
  },
  value: { 
    fontSize: 16, 
    color: '#333', 
    flex: 1, 
    textAlign: 'right', // Ensure multi-line text aligns right
    writingDirection: 'rtl' // Force RTL for mixed text
  },

  actionArea: { padding: 20, paddingBottom: 40 },
  infoText: { textAlign: 'center', marginBottom: 10, color: '#e74c3c', fontWeight: 'bold' },
  mainButton: { backgroundColor: '#588157', paddingVertical: 16, borderRadius: 12, alignItems: 'center', elevation: 3 },
  payButton: { backgroundColor: '#e74c3c' }, 
  disabledButton: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  completedBadge: { backgroundColor: '#dff9fb', padding: 20, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#c7ecee' },
  completedText: { fontSize: 20, fontWeight: 'bold', color: '#22a6b3' }
});