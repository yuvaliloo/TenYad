import * as Location from 'expo-location';
import { router } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

// Imports from your specific project structure
import PaymentModal from '../../components/PaymentModal';
import ReviewModal from '../../components/ReviewModal';
import { auth, db } from "../services/firebase";
import { getReviewsForUser, getReviewsWrittenByUser } from '../services/reviews';
import { processFeedForTasker } from '../services/logicHelpers';

export default function FrontPage() {

  // --- STATE ---
  const [taskerMode, setTaskerMode] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("אורח");
  
  // Location State (From Friend's Logic)
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);

  // Seeker Logic State (From Your Logic)
  const [hiddenRequests, setHiddenRequests] = useState<Set<string>>(new Set());
  const [selectedTasker, setSelectedTasker] = useState<any>(null);
  const [showTaskerModal, setShowTaskerModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'open' | 'closed'>('open');

  // Review System State (From Your Logic)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [reviewTask, setReviewTask] = useState<any>(null);
  const [taskerReviews, setTaskerReviews] = useState<any[]>([]);
  const [reviewedTaskIds, setReviewedTaskIds] = useState<Set<string>>(new Set());

  // --- EFFECTS ---

  // 1. Auth, Location & Main Data Fetching (Merged Logic)
  useEffect(() => {
    let firestoreUnsub: (() => void) | undefined;

    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      if (user.displayName) setUserName(user.displayName);
      setLoading(true);

      // Get Location (Friend's Logic)
      let myCoords = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          myCoords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setMyLocation(myCoords);
        }
      } catch (err) {
        console.log("Location skipped:", err);
      }

      // Define Query based on Mode
      let q;
      if (taskerMode) {
        // TASKER MODE: Get all open jobs (Friend's query logic + Your status logic)
        // We look for status 'open' OR worker 'OPEN' (handling both data versions)
        q = query(
          collection(db, "requests"), 
          where("status", "==", "open"), // Ensure we only see open requests
          orderBy("createdAt", "desc")
        );
      } else {
        // SEEKER MODE: Get ONLY my jobs (Your logic)
        q = query(
          collection(db, "requests"), 
          where("seekerId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
      }

      firestoreUnsub = onSnapshot(q, (snap) => {
        const currentUserId = user.uid;

        let items = snap.docs.map((d) => {
          const data = d.data();
          // Calculate Distance (Friend's Logic)
          let dist = Infinity;
          if (data.location && data.location.latitude && myCoords) {
             dist = getDistanceFromLatLonInKm(
               myCoords.lat, myCoords.lng,
               data.location.latitude, data.location.longitude
             );
          }
          return { id: d.id, ...data, distance: dist };
        });

        if (taskerMode) {
          // TASKER FILTER: Use shared logic + Sort by distance
          items = processFeedForTasker(items, currentUserId)
            .sort((a: any, b: any) => a.distance - b.distance);

            //new- change(19.01.26)
            // items = items
            // .filter((item: any) => item.seekerId !== currentUserId)
            // .filter((item: any) => !item.worker || item.worker === "OPEN") // Handle both null and "OPEN" string
            // .sort((a, b) => a.distance - b.distance);
        }   
        
        setRequests(items);
        setLoading(false);
      }, (err) => {
        console.warn("Firestore Error:", err);
        setLoading(false);
      });
    });

    return () => {
      authUnsub();
      if (firestoreUnsub) firestoreUnsub();
    };
  }, [taskerMode]);

  // 2. Fetch My Written Reviews (Your Logic)
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

  // 3. Fetch Reviews for Selected Tasker (Your Logic)
  useEffect(() => {
    if (selectedTasker && (selectedTasker.taskerId || selectedTasker.uid)) {
      const tId = selectedTasker.taskerId || selectedTasker.uid;
      getReviewsForUser(tId).then((res) => {
        if (res.success) {
          setTaskerReviews(res.reviews);
        }
      });
    } else {
      setTaskerReviews([]);
    }
  }, [selectedTasker]);

  // --- HELPER FUNCTIONS ---

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return `בוקר טוב, ${userName}`;
    if (hour >= 12 && hour < 18) return `צהריים טובים, ${userName}`;
    if (hour >= 18 && hour < 22) return `ערב טוב, ${userName}`;
    return `לילה טוב, ${userName}`;
  };

  const openReviewModal = (task: any) => {
    setReviewTask(task);
    setShowReviewModal(true);
  };

  const openTaskerDetails = (tasker: any, requestId: string) => {
    setSelectedTasker(tasker);
    setSelectedRequestId(requestId);
    setShowTaskerModal(true);
  };

  const closeTaskerModal = () => {
    setShowTaskerModal(false);
    setSelectedTasker(null);
    setSelectedRequestId(null);
  };

  const acceptSelectedTasker = async () => {
    try {
      if (!selectedRequestId || !selectedTasker) return;
      const requestRef = doc(db, "requests", selectedRequestId);
      await updateDoc(requestRef, {
        worker: selectedTasker.taskerName || selectedTasker.name || "",
        workerId: selectedTasker.taskerId || selectedTasker.uid || null,
        status: "closed"
      });
      closeTaskerModal();
    } catch (err) {
      console.warn("Failed to accept tasker:", err);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    Alert.alert(
      "מחיקת משימה",
      "האם אתה בטוח שברצונך למחוק את המשימה?",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "מחק",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "requests", requestId));
              // The onSnapshot listener will automatically update the list
            } catch (err) {
              Alert.alert("שגיאה", "לא ניתן למחוק את המשימה");
              console.error("Error deleting request:", err);
            }
          }
        }
      ]
    );
  };

  const toggleRequestVisibility = (requestId: string) => {
    setHiddenRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) newSet.delete(requestId);
      else newSet.add(requestId);
      return newSet;
    });
  };

  // Seeker Filters
  const myOpenRequests = requests.filter((r) => !r.worker || r.worker === "OPEN");
  const myClosedRequests = requests.filter((r) => r.worker && r.worker !== "OPEN");

  // Calculate Average Rating
  const computedRating = taskerReviews.length > 0 
    ? (taskerReviews.reduce((acc, r) => acc + (r.rating || 0), 0) / taskerReviews.length).toFixed(1) 
    : null;

  return (
    <View style={styles.container}>

      {/* --- TASKER MODE UI --- */}
      {taskerMode ? (
        <>
          <Text style={styles.taskerHeader}>ברוך הבא למצב נותן יד</Text>
          <Text style={styles.taskerSubtitle}>בחר משימה והתחל להרוויח</Text>

          {loading ? (
             <ActivityIndicator size="large" color="#588157" style={{marginTop: 20}} />
          ) : (
            <ScrollView style={styles.taskerRequestsList}>
              {requests.length > 0 ? (
                requests.map((r) => (
                  <View key={r.id} style={styles.taskerRequestCard}>
                    
                    {/* Header: Distance Badge + Title */}
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5}}>
                        <Text style={styles.distanceBadge}>
                          {r.distance !== Infinity ? `📍 ${r.distance.toFixed(1)} ק"מ` : "📍 ? ק\"מ"}
                        </Text>
                        <Text style={styles.taskerRequestTitle}>{r.title}</Text>
                    </View>

                    {/* Description */}
                    {/* {r.description && (
                      <Text style={styles.taskerRequestDescription} numberOfLines={2}>
                        {r.description}
                      </Text>
                    )} */}

                    <TouchableOpacity 
                      style={styles.taskerTakeButton}
                      onPress={() => router.push({
                        pathname: '/task-details',
                        params: {
                          id: r.id,
                          title: r.title,
                          description: r.description || '',
                          location: r.address || '',
                          createdBy: r.seekerName || 'לא ידוע',
                          distance: r.distance, // Pass distance to details
                          imageUrl: r.imageUrl || '',
                          paymentAmount: r.paymentAmount || ''
                        }
                      })}
                    >
                      <Text style={styles.taskerTakeButtonText}>הצג משימה</Text>
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <Text style={styles.taskerEmptyText}>אין משימות זמינות באזורך</Text>
              )}
            </ScrollView>
          )}
        </>
      ) : (
        /* --- SEEKER MODE UI --- */
        <>
          <Text style={styles.greeting}>{getGreeting()}</Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={styles.buttonPrimary}
              onPress={() => router.push("/new-request")}
            >
              <Text style={styles.plusIcon}>+</Text>
              <Text style={styles.buttonPrimaryText}>צור משימה חדשה</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs (Open / Closed) */}
          <View style={styles.segmentedContainer}>
            <View style={styles.segment}>
              <TouchableOpacity
                style={[styles.segmentButton, selectedTab === 'open' && styles.segmentButtonActive]}
                onPress={() => setSelectedTab('open')}
              >
                <Text style={[styles.segmentText, selectedTab === 'open' && styles.segmentTextActive]}>פתוחות</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentButton, selectedTab === 'closed' && styles.segmentButtonActive]}
                onPress={() => setSelectedTab('closed')}
              >
                <Text style={[styles.segmentText, selectedTab === 'closed' && styles.segmentTextActive]}>סגורות</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Lists Container */}
          <ScrollView style={styles.listsContainer}>
            {selectedTab === 'open' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>משימות פתוחות</Text>
                {myOpenRequests.length > 0 ? (
                  myOpenRequests.map((r) => (
                    <View key={r.id} style={styles.requestItem}>
                      <View style={styles.requestHeader}>
                        <TouchableOpacity 
                          style={styles.closeButton}
                          onPress={() => toggleRequestVisibility(r.id)}
                        >
                          <Text style={styles.closeButtonText}>
                            {hiddenRequests.has(r.id) ? 'הצג בקשות' : 'הסתר בקשות'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.editButton, { backgroundColor: '#c0392b' }]}
                          onPress={() => handleDeleteRequest(r.id)}
                        >
                          <Text style={styles.editButtonText}>הסר</Text>
                        </TouchableOpacity>                        <Text style={styles.requestTitle}>{r.title}</Text>
                      </View>
                      
                      {/* Interested Taskers List */}
                      {!hiddenRequests.has(r.id) && r.interestedTaskers && r.interestedTaskers.length > 0 && (
                        <View style={styles.interestedTaskersContainer}>
                          <Text style={styles.interestedTaskersTitle}>מעוניינים:</Text>
                          {r.interestedTaskers.map((tasker: any, index: number) => (
                            <View key={index} style={styles.interestedTaskerRow}>
                              <TouchableOpacity 
                                style={styles.showTaskerButton}
                                onPress={() => openTaskerDetails(tasker, r.id)}
                              >
                                <Text style={styles.showTaskerButtonText}>הצג</Text>
                              </TouchableOpacity>
                              <Text style={styles.interestedTaskerName}>
                                {tasker.taskerName}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>אין בקשות פתוחות</Text>
                )}
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>משימות סגורות</Text>
                {myClosedRequests.length > 0 ? (
                  myClosedRequests.map((r) => (
                    <View key={r.id} style={[styles.requestItem, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                      <View>
                        {r.workerId ? (
                            reviewedTaskIds.has(r.id) ? (
                                <Text style={{color: '#588157', fontSize: 14, fontWeight: '600'}}>
                                    ✓ ביקורת נשלחה
                                </Text>
                            ) : (
                                <TouchableOpacity 
                                  style={styles.reviewButton} 
                                  onPress={() => openReviewModal(r)}
                                >
                                  <Text style={styles.reviewButtonText}>סמן כבוצע</Text>
                                </TouchableOpacity>
                            )
                        ) : null}
                      </View>
                      <View style={{flex: 1, alignItems: 'flex-end', marginLeft: 12}}>
                        <Text style={styles.requestTitle}>{r.title}</Text>
                        <Text style={{fontSize: 12, color: "#666", marginTop: 4}}>עובד: {r.worker}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>אין משימות סגורות</Text>
                )}
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* Helper Switch */}
      <View style={styles.helperSwitchContainer}>
        <Switch
          value={taskerMode}
          onValueChange={(value) => setTaskerMode(value)}
          thumbColor={taskerMode ? "#588157" : "#ccc"}
          trackColor={{ false: "#ddd", true: "#a3c9a8" }}
        />
        <Text style={styles.helperSwitchText}>
          {taskerMode ? "עבור למצב מקבל יד" : "עבור למצב נותן יד"}
        </Text>
      </View>

      {/* Tasker Details Modal (With Accept Logic) */}
      <Modal
        visible={showTaskerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeTaskerModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeTaskerModal} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>פרטי מועמד</Text>
            </View>

            {selectedTasker && (
              <View style={styles.modalBody}>
                <View style={styles.profileImageContainer}>
                  <Image
                    source={selectedTasker.profileImage ? { uri: selectedTasker.profileImage } : require('../../assets/images/react-logo.png')}
                    style={styles.profileImage}
                  />
                </View>
                <View style={styles.modalSection}>
                  <Text style={styles.modalNameText}>{selectedTasker.taskerName}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalRatingText}>
                    {selectedTasker.rating 
                        ? `⭐ ${selectedTasker.rating}/5` 
                        : (computedRating ? `⭐ ${computedRating}/5` : 'טרם דורג')}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>טלפון</Text>
                  <Text style={styles.modalInfoText}>
                    {selectedTasker.phone || 'לא קיים טלפון'}
                  </Text>
                </View>

                {/* Reviews List */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>חוות דעת ({taskerReviews.length})</Text>
                  {taskerReviews.length > 0 ? (
                    taskerReviews.map((review, index) => (
                      <View key={index} style={{marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5}}>
                         <Text style={{fontWeight: 'bold', textAlign: 'right'}}>{review.rating} ⭐</Text>
                         {review.comment ? <Text style={{textAlign: 'right'}}>{review.comment}</Text> : null}
                         {review.createdAt ? <Text style={{textAlign: 'right', fontSize: 10, color: '#888'}}>
                           {new Date(review.createdAt.toDate ? review.createdAt.toDate() : review.createdAt).toLocaleDateString('he-IL')}
                         </Text> : null}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.modalInfoText}>
                      {selectedTasker.review || 'טרם ניתנה חוות דעת'}
                    </Text>
                  )}
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.modalAcceptButton} onPress={acceptSelectedTasker}>
              <Text style={styles.modalAcceptButtonText}>קבל מועמד</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCloseAction} onPress={closeTaskerModal}>
              <Text style={styles.modalCloseActionText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      {reviewTask && (
        <ReviewModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSuccess={() => {
            setShowReviewModal(false);
            setShowPaymentModal(true);
          }}
          reviewedUserId={reviewTask.workerId}
          reviewedUserName={reviewTask.worker}
          taskTitle={reviewTask.title}
          taskId={reviewTask.id}
        />
      )}

      {/* Payment Modal */}
      {reviewTask && (
        <PaymentModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          taskerName={reviewTask.worker}
        />
      )}

    </View>
  );
}

// --- MATH HELPERS (From Friend) ---
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  var R = 6371; 
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat1)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8EF",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  topRow: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
  },

  topText: {
    fontSize: 16,
    color: "#588157",
    fontWeight: "600",
  },

  greeting: {
    marginTop: 70,
    fontSize: 24,
    textAlign: "right",
    marginRight: 12,
    fontWeight: "600",
    color: "#6f411d",
  },

  buttonsContainer: {
    marginTop: 30, // Adjusted spacing
    alignItems: "center",
  },

  buttonPrimary: {
    backgroundColor: "#588157",
    width: 150,
    height: 150,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  plusIcon: {
    color: "white",
    fontSize: 48,
    fontWeight: "600",
    marginBottom: 8,
  },

  buttonPrimaryText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  segmentedContainer: {
    marginTop: 30,
    alignItems: 'center',
    width: '100%'
  },

  segment: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    borderRadius: 999,
    padding: 4,
    width: 260,
    justifyContent: 'space-between'
  },

  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center'
  },

  segmentButtonActive: {
    backgroundColor: '#588157'
  },

  segmentText: {
    color: '#6f411d',
    fontWeight: '600'
  },

  segmentTextActive: {
    color: '#fff'
  },

  listsContainer: {
    marginTop: 24,
    width: "100%",
  },

  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6f411d",
    marginBottom: 8,
    textAlign: "right",
  },

  requestItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },

  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  editButton: {
    backgroundColor: "#e74c3c",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  closeButton: {
    backgroundColor: "#6f411d",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  closeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  requestTitle: {
    fontSize: 16,
    color: "#333",
    textAlign: "right",
    flex: 1,
    marginRight: 10,
  },

  requestMeta: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
    textAlign: "right",
  },

  emptyText: {
    color: "#c0392b",
    fontWeight: "600",
    textAlign: "right",
  },

  helperSwitchContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    alignItems: "center",
  },

  helperSwitchText: {
    marginTop: 6,
    fontSize: 14,
    color: "#6f411d",
    fontWeight: "500",
  },

  // Tasker Mode Styles
  taskerHeader: {
    fontSize: 26,
    fontWeight: "700",
    color: "#6f411d",
    textAlign: "center",
    marginBottom: 8,
    marginTop: 110,
  },

  taskerSubtitle: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginBottom: 24,
  },

  taskerRequestsList: {
    flex: 1,
    marginTop: 20,
  },

  taskerRequestCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  taskerRequestTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "right",
    marginBottom: 8,
    flex: 1, // Allow text to wrap
  },

  taskerRequestDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "right",
    marginBottom: 12,
  },

  taskerTakeButton: {
    backgroundColor: "#588157",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },

  taskerTakeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  taskerEmptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 40,
  },

  // Distance Badge (Added from friend)
  distanceBadge: { 
    fontSize: 14, 
    color: "#588157", 
    fontWeight: "bold", 
    backgroundColor: "#e9f5e9", 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8, 
    overflow: 'hidden' 
  },

  // Interested Taskers
  interestedTaskersContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },

  interestedTaskersTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#588157",
    textAlign: "right",
    marginBottom: 6,
  },

  interestedTaskerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  interestedTaskerName: {
    fontSize: 14,
    color: "#333",
    textAlign: "right",
    flex: 1,
  },

  showTaskerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 10,
  },

  showTaskerButtonText: {
    color: "#588157",
    fontSize: 14,
    fontWeight: "600",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxHeight: '80%', // Limit height for scroll
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  modalCloseButton: {
    position: 'absolute',
    right: 0,
    top: 0,
  },

  modalCloseText: {
    fontSize: 24,
    color: '#333',
    fontWeight: '600',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6f411d',
  },

  modalBody: {
    marginBottom: 20,
  },

  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },

  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#588157',
  },

  modalSection: {
    marginBottom: 16,
  },

  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 6,
    textAlign: 'right',
  },

  modalValue: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },

  modalNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },

  modalRatingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },

  modalInfoText: {
    fontSize: 15,
    color: '#333',
    textAlign: 'right',
    backgroundColor: 'transparent',
  },

  modalAcceptButton: {
    backgroundColor: '#588157',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 14,
  },

  modalAcceptButtonText: {
    color: '#f6f6f6ff',
    fontSize: 16,
    fontWeight: '600',
  },

  modalCloseAction: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 2,
  },
  modalCloseActionText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },

  reviewButton: {
    backgroundColor: '#6f411d',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  reviewButtonText: {
    color: '#ffffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});