import { router } from "expo-router";
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where, serverTimestamp, deleteDoc } from "firebase/firestore"; 
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, Alert } from "react-native";
import * as Location from 'expo-location'; 
import { onAuthStateChanged } from "firebase/auth";

// --- CUSTOM COMPONENTS ---
import ReviewModal from '../../components/ReviewModal';
import PayPalModal from '../../components/PayPalModal';        
import TaskerProfileModal from '../../components/TaskerProfileModal'; 
import { auth, db } from "../services/firebase";
import { getReviewsWrittenByUser } from '../services/reviews';

export default function FrontPage() {
  const [taskerMode, setTaskerMode] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("אורח");
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);

  // Seeker Logic
  const [hiddenRequests, setHiddenRequests] = useState<Set<string>>(new Set());
  const [selectedTab, setSelectedTab] = useState<'open' | 'closed'>('open');

  // Modals & Selection
  const [isPayModalVisible, setPayModalVisible] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<any>(null); 
  const [selectedTasker, setSelectedTasker] = useState<any>(null); 

  // Preview Profile State
  const [previewTasker, setPreviewTasker] = useState<{id: string, name: string, image?: string} | null>(null);

  // Reviews
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTask, setReviewTask] = useState<any>(null);
  const [reviewedTaskIds, setReviewedTaskIds] = useState<Set<string>>(new Set());

  // --- 1. DATA FETCHING ---
  useEffect(() => {
    let firestoreUnsub: (() => void) | undefined;

    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      if (user.displayName) setUserName(user.displayName);
      setLoading(true);

      // Location Logic
      let myCoords = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          myCoords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setMyLocation(myCoords);
        }
      } catch (err) { console.log("Location skipped:", err); }

      // Query Logic
      let q;
      if (taskerMode) {
        q = query(collection(db, "requests"), where("status", "==", "open"), orderBy("createdAt", "desc"));
      } else {
        q = query(collection(db, "requests"), where("seekerId", "==", user.uid), orderBy("createdAt", "desc"));
      }

      firestoreUnsub = onSnapshot(q, (snap) => {
        const currentUserId = user.uid;
        let items = snap.docs.map((d) => {
          const data = d.data();
          let dist = Infinity;
          if (data.location && data.location.latitude && myCoords) {
             dist = getDistanceFromLatLonInKm(myCoords.lat, myCoords.lng, data.location.latitude, data.location.longitude);
          }
          return { id: d.id, ...data, distance: dist };
        });

        if (taskerMode) {
          items = items
            .filter((item: any) => item.seekerId !== currentUserId)
            .filter((item: any) => !item.worker || item.worker === "OPEN")
            .sort((a, b) => a.distance - b.distance);
        } 
        setRequests(items);
        setLoading(false);
      });
    });

    return () => { authUnsub(); if (firestoreUnsub) firestoreUnsub(); };
  }, [taskerMode]);

  useEffect(() => {
    const fetchMyReviews = async () => {
        const user = auth.currentUser;
        if (user) {
            const res = await getReviewsWrittenByUser(user.uid);
            if (res.success) {
                const ids = new Set(res.reviews.filter(r => r.taskId).map(r => r.taskId!));
                setReviewedTaskIds(ids);
            }
        }
    };
    fetchMyReviews();
  }, [showReviewModal]); 

  // --- ACTIONS ---

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return `בוקר טוב, ${userName}`;
    if (hour >= 12 && hour < 18) return `צהריים טובים, ${userName}`;
    return `ערב טוב, ${userName}`;
  };

  const toggleRequestVisibility = (requestId: string) => {
    setHiddenRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) newSet.delete(requestId);
      else newSet.add(requestId);
      return newSet;
    });
  };

  // 🟢 ADDED THIS MISSING FUNCTION
  const openReviewModal = (task: any) => {
    setReviewTask(task);
    setShowReviewModal(true);
  };

  const handleDeleteRequest = (requestId: string) => {
    Alert.alert(
      "מחיקת משימה",
      "האם אתה בטוח שברצונך למחוק משימה זו? פעולה זו אינה הפיכה.",
      [
        { text: "ביטול", style: "cancel" },
        { 
          text: "מחק", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "requests", requestId));
            } catch (error) {
              Alert.alert("שגיאה", "לא ניתן היה למחוק את המשימה");
            }
          }
        }
      ]
    );
  };

  const handleSelectTasker = (tasker: any, request: any) => {
    setSelectedTasker(tasker);
    setPendingRequest(request);
    Alert.alert(
      "אישור מועמד",
      `האם לקבל את ${tasker.taskerName}?`,
      [
        { text: "ביטול", style: "cancel" },
        { text: "המשך לתשלום", onPress: () => setPayModalVisible(true) }
      ]
    );
  };

  const handlePaymentSuccess = async () => {
    try {
      if (!pendingRequest || !selectedTasker) return;
      const requestRef = doc(db, "requests", pendingRequest.id);
      await updateDoc(requestRef, {
        worker: selectedTasker.taskerName,
        workerId: selectedTasker.taskerId,
        status: "in_progress",       
        paymentStatus: "authorized", 
        startedAt: serverTimestamp()
      });
      setPayModalVisible(false);
      Alert.alert("התשלום אושר!", "המשימה יצאה לדרך.");
      setPendingRequest(null);
      setSelectedTasker(null);
    } catch (err) {
      Alert.alert("שגיאה", "עדכון נכשל");
    }
  };

  const myOpenRequests = requests.filter((r) => !r.worker || r.worker === "OPEN");
  const myClosedRequests = requests.filter((r) => r.worker && r.worker !== "OPEN");

  return (
    <View style={styles.container}>

      {/* --- TASKER MODE --- */}
      {taskerMode ? (
        <>
          <Text style={styles.taskerHeader}>ברוך הבא למצב נותן יד</Text>
          <Text style={styles.taskerSubtitle}>בחר משימה והתחל להרוויח</Text>
          {loading ? <ActivityIndicator size="large" color="#588157" style={{marginTop: 20}} /> : (
            <ScrollView style={styles.taskerRequestsList}>
              {requests.length > 0 ? requests.map((r) => (
                  <View key={r.id} style={styles.taskerRequestCard}>
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5}}>
                        <Text style={styles.distanceBadge}>{r.distance !== Infinity ? `📍 ${r.distance.toFixed(1)} ק"מ` : "📍 ? ק\"מ"}</Text>
                        <Text style={styles.taskerRequestTitle}>{r.title}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.taskerTakeButton}
                      onPress={() => router.push({ pathname: '/task-details', params: { id: r.id } })}
                    >
                      <Text style={styles.taskerTakeButtonText}>הצג משימה</Text>
                    </TouchableOpacity>
                  </View>
                )) : <Text style={styles.taskerEmptyText}>אין משימות זמינות באזורך</Text>}
            </ScrollView>
          )}
        </>
      ) : (
        /* --- SEEKER MODE --- */
        <>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.buttonPrimary} onPress={() => router.push("/new-request")}>
              <Text style={styles.plusIcon}>+</Text>
              <Text style={styles.buttonPrimaryText}>צור משימה חדשה</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.segmentedContainer}>
            <View style={styles.segment}>
              <TouchableOpacity style={[styles.segmentButton, selectedTab === 'open' && styles.segmentButtonActive]} onPress={() => setSelectedTab('open')}>
                <Text style={[styles.segmentText, selectedTab === 'open' && styles.segmentTextActive]}>פתוחות</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.segmentButton, selectedTab === 'closed' && styles.segmentButtonActive]} onPress={() => setSelectedTab('closed')}>
                <Text style={[styles.segmentText, selectedTab === 'closed' && styles.segmentTextActive]}>סגורות</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.listsContainer}>
            {selectedTab === 'open' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>משימות פתוחות</Text>
                {myOpenRequests.length > 0 ? myOpenRequests.map((r) => (
                    <View key={r.id} style={styles.requestItem}>
                      <View style={styles.requestHeader}>
                        <TouchableOpacity style={styles.closeButton} onPress={() => toggleRequestVisibility(r.id)}>
                          <Text style={styles.closeButtonText}>{hiddenRequests.has(r.id) ? 'הצג בקשות' : 'הסתר בקשות'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={() => handleDeleteRequest(r.id)}
                        >
                          <Text style={styles.deleteButtonText}>מחק</Text>
                        </TouchableOpacity>

                        <Text style={styles.requestTitle}>{r.title}</Text>
                      </View>
                      
                      {!hiddenRequests.has(r.id) && r.interestedTaskers && r.interestedTaskers.length > 0 && (
                        <View style={styles.interestedTaskersContainer}>
                          <Text style={styles.interestedTaskersTitle}>מועמדים ({r.interestedTaskers.length})</Text>
                          {r.interestedTaskers.map((tasker: any, index: number) => (
                            <View key={index} style={styles.applicantRow}>
                                <View style={styles.applicantActions}>
                                    <TouchableOpacity style={styles.acceptButton} onPress={() => handleSelectTasker(tasker, r)}>
                                        <Text style={styles.acceptText}>קבל</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles.previewButton}
                                        onPress={() => setPreviewTasker({
                                            id: tasker.taskerId, 
                                            name: tasker.taskerName,
                                            image: tasker.image 
                                        })}
                                    >
                                        <Text style={styles.previewText}>הצג</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{flex:1, alignItems: 'flex-end', marginRight: 10}}>
                                    <Text style={styles.applicantName}>{tasker.taskerName}</Text>
                                    <Text style={styles.applicantDate}>הגיש הצעה</Text>
                                </View>
                                <View style={styles.miniAvatar}>
                                    {tasker.image ? (
                                        <Image source={{uri: tasker.image}} style={styles.miniAvatarImage}/>
                                    ) : (
                                        <Text style={{color: '#555', fontWeight: 'bold'}}>{tasker.taskerName?.[0] || '?'}</Text>
                                    )}
                                </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  )) : <Text style={styles.emptyText}>אין בקשות פתוחות</Text>}
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>משימות סגורות</Text>
                {myClosedRequests.length > 0 ? myClosedRequests.map((r) => (
                    <View key={r.id} style={[styles.requestItem, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                      <View>
                        {r.workerId && r.status === 'completed' && !reviewedTaskIds.has(r.id) && (
                            <TouchableOpacity style={styles.reviewButton} onPress={() => openReviewModal(r)}>
                                <Text style={styles.reviewButtonText}>דרג</Text>
                            </TouchableOpacity>
                        )}
                        {reviewedTaskIds.has(r.id) && <Text style={{color: '#588157', fontSize: 12}}>✓ דורג</Text>}
                      </View>
                      <View style={{flex: 1, alignItems: 'flex-end', marginLeft: 12}}>
                        <Text style={styles.requestTitle}>{r.title}</Text>
                        <Text style={{fontSize: 12, color: "#666", marginTop: 4}}>עובד: {r.worker}</Text>
                      </View>
                    </View>
                  )) : <Text style={styles.emptyText}>אין משימות סגורות</Text>}
              </View>
            )}
          </ScrollView>
        </>
      )}

      <View style={styles.helperSwitchContainer}>
        <Switch value={taskerMode} onValueChange={(value) => setTaskerMode(value)} thumbColor={taskerMode ? "#588157" : "#ccc"} trackColor={{ false: "#ddd", true: "#a3c9a8" }} />
        <Text style={styles.helperSwitchText}>{taskerMode ? "עבור למצב מקבל יד" : "עבור למצב נותן יד"}</Text>
      </View>

      <TaskerProfileModal 
        visible={!!previewTasker}
        taskerId={previewTasker?.id || null}
        initialData={previewTasker ? { name: previewTasker.name, image: previewTasker.image } : undefined}
        onClose={() => setPreviewTasker(null)}
      />

      <PayPalModal 
        visible={isPayModalVisible}
        amount={pendingRequest ? parseFloat(pendingRequest.paymentAmount || "0") : 0}
        onClose={() => setPayModalVisible(false)}
        onSuccess={handlePaymentSuccess}
      />

      {reviewTask && (
        <ReviewModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          reviewedUserId={reviewTask.workerId}
          reviewedUserName={reviewTask.worker}
          taskTitle={reviewTask.title}
          taskId={reviewTask.id}
        />
      )}

    </View>
  );
}

// --- MATH HELPERS ---
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371; var dLat = deg2rad(lat2 - lat1); var dLon = deg2rad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat1)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}
function deg2rad(deg: number) { return deg * (Math.PI / 180); }

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAF8EF", paddingTop: 60, paddingHorizontal: 20 },
  greeting: { marginTop: 40, fontSize: 24, textAlign: "center", fontWeight: "600", color: "#6f411d" },
  buttonsContainer: { marginTop: 40, alignItems: "center" },
  buttonPrimary: { backgroundColor: "#588157", width: 150, height: 150, borderRadius: 12, alignItems: "center", justifyContent: "center", elevation: 3 },
  plusIcon: { color: "white", fontSize: 48, fontWeight: "600", marginBottom: 8 },
  buttonPrimaryText: { color: "white", fontSize: 16, fontWeight: "600", textAlign: "center" },
  segmentedContainer: { marginTop: 30, alignItems: 'center', width: '100%' },
  segment: { flexDirection: 'row', backgroundColor: '#eee', borderRadius: 999, padding: 4, width: 260, justifyContent: 'space-between' },
  segmentButton: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segmentButtonActive: { backgroundColor: '#588157' },
  segmentText: { color: '#6f411d', fontWeight: '600' },
  segmentTextActive: { color: '#fff' },
  listsContainer: { marginTop: 24, width: "100%" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#6f411d", marginBottom: 8, textAlign: "right" },
  requestItem: { backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: "#eee" },
  requestHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  deleteButton: { backgroundColor: "#e74c3c", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  deleteButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  closeButton: { backgroundColor: "#6f411d", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  closeButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  requestTitle: { fontSize: 16, color: "#333", textAlign: "right", flex: 1, marginRight: 10, fontWeight: 'bold' },
  emptyText: { color: "#c0392b", fontWeight: "600", textAlign: "right" },
  helperSwitchContainer: { position: "absolute", top: 60, left: 20, alignItems: "center" },
  helperSwitchText: { marginTop: 6, fontSize: 14, color: "#6f411d", fontWeight: "500" },
  taskerHeader: { fontSize: 26, fontWeight: "700", color: "#6f411d", textAlign: "center", marginBottom: 8, marginTop: 110 },
  taskerSubtitle: { fontSize: 16, color: "#888", textAlign: "center", marginBottom: 24 },
  taskerRequestsList: { flex: 1, marginTop: 20 },
  taskerRequestCard: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#ddd", elevation: 2 },
  taskerRequestTitle: { fontSize: 18, fontWeight: "600", color: "#333", textAlign: "right", marginBottom: 8, flex: 1 },
  taskerTakeButton: { backgroundColor: "#588157", paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  taskerTakeButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  taskerEmptyText: { fontSize: 16, color: "#999", textAlign: "center", marginTop: 40 },
  distanceBadge: { fontSize: 14, color: "#588157", fontWeight: "bold", backgroundColor: "#e9f5e9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' },
  interestedTaskersContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#eee" },
  interestedTaskersTitle: { fontSize: 14, fontWeight: "600", color: "#588157", textAlign: "right", marginBottom: 10 },
  applicantRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 10, borderRadius: 8, marginBottom: 8 },
  applicantActions: { flexDirection: 'row', gap: 8 },
  applicantName: { fontWeight: 'bold', fontSize: 15, textAlign: 'right', color: '#333' },
  applicantDate: { fontSize: 11, color: '#888', textAlign: 'right' },
  acceptButton: { backgroundColor: '#588157', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  acceptText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
  previewButton: { backgroundColor: 'white', borderWidth: 1, borderColor: '#588157', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  previewText: { color: '#588157', fontWeight: 'bold', fontSize: 13 },
  miniAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e1e1e1', justifyContent: 'center', alignItems: 'center', marginLeft: 10, overflow: 'hidden' },
  miniAvatarImage: { width: 40, height: 40, borderRadius: 20 },
  reviewButton: { backgroundColor: '#6f411d', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  reviewButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});