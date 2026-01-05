import { router } from "expo-router";
import { collection, onSnapshot, orderBy, query, where, doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Image, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, Alert, ActivityIndicator } from "react-native";
import * as Location from 'expo-location'; 
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../services/firebase";

export default function FrontPage() {
  const [taskerMode, setTaskerMode] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [userName, setUserName] = useState("אורח");
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [hiddenRequests, setHiddenRequests] = useState<Set<string>>(new Set());
  const [selectedTasker, setSelectedTasker] = useState<any>(null);
  const [showTaskerModal, setShowTaskerModal] = useState(false);

  // Filter tabs for Seeker Mode
  const [selectedTab, setSelectedTab] = useState<'open' | 'closed'>('open');

  useEffect(() => {
    let firestoreUnsub: (() => void) | undefined;

    // 1. Listen to Auth State (Waits for Firebase to initialize)
    const authUnsub = onAuthStateChanged(auth, async (user) => {
      
      // GUARD: If not logged in, stop loading and do nothing
      if (!user) {
        setLoading(false);
        return;
      }

      // If we have a user, set the name
      if (user.displayName) setUserName(user.displayName);
      
      setLoading(true);

      // 2. Get Location
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

      // 3. Define Query
      let q;
      if (taskerMode) {
        // TASKER: Get ALL open jobs
        q = query(
          collection(db, "requests"), 
          where("status", "==", "open"),
          where("worker", "==", "OPEN"), 
        );
      } else {
        // SEEKER: Get ONLY my jobs
        q = query(
          collection(db, "requests"), 
          where("seekerId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
      }

      // 4. Listen to Realtime Updates
      // We assign this to a variable so we can clean it up later
      firestoreUnsub = onSnapshot(q, (snap) => {
        const currentUserId = user.uid;

        let items = snap.docs.map((d) => {
          const data = d.data();
          let dist = Infinity;
          if (data.location && myCoords) {
             dist = getDistanceFromLatLonInKm(
               myCoords.lat, myCoords.lng,
               data.location.latitude, data.location.longitude
             );
          }
          return { id: d.id, ...data, distance: dist };
        });

        if (taskerMode) {
          // TASKER: Filter out my own requests & sort by distance
          items = items
            .filter((item: any) => item.seekerId !== currentUserId)
            .sort((a, b) => a.distance - b.distance);
        } 
        
        setRequests(items);
        setLoading(false);
      }, (err) => {
        console.warn("Firestore Error:", err);
        setLoading(false);
      });

    });

    // Cleanup: Unsubscribe from Auth AND Firestore when component unmounts
    return () => {
      authUnsub();
      if (firestoreUnsub) firestoreUnsub();
    };

  }, [taskerMode]);
  const openTaskerDetails = (tasker: any) => {
    setSelectedTasker(tasker);
    setShowTaskerModal(true);
  };

  const closeTaskerModal = () => {
    setShowTaskerModal(false);
    setSelectedTasker(null);
  };

  const toggleRequestVisibility = (requestId: string) => {
    setHiddenRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
  };
  const openTaskDetails = (request: any) => {
    // Navigate to the modal, passing the data as parameters
    router.push({
      pathname: "./task-details",
      params: { 
        id: request.id,
        title: request.title,
        description: request.description,
        price: request.price || "0", // Example if you have price
        distance: request.distance,
        address: request.address
      }
    });
  };
  // 👇 FIX 2: Correct logic for "Open" vs "Closed" 
  // Since worker is now a string "OPEN", checking !r.worker would fail.
  const openRequests = requests.filter((r) => r.worker === "OPEN");
  const closedRequests = requests.filter((r) => r.worker !== "OPEN");

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
                    
                    {/* Header: Distance + Title */}
                    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5}}>
                        <Text style={styles.distanceBadge}>
                          {r.distance !== Infinity ? `📍 ${r.distance.toFixed(1)} km` : "📍 ? km"}
                        </Text>
                        <Text style={styles.taskerRequestTitle}>{r.title}</Text>
                    </View>

                    {r.description && (
                      <Text style={styles.taskerRequestDescription} numberOfLines={2}>
                        {r.description}
                      </Text>
                    )}
                    <TouchableOpacity style={styles.taskerTakeButton}
                    onPress={() => openTaskDetails(r)}>
                      <Text style={styles.taskerTakeButtonText}>קח משימה</Text>
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
          <Text style={styles.greeting}>צהריים טובים, {userName}</Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={styles.buttonPrimary}
              onPress={() => router.push("/new-request")}
            >
              <Text style={styles.plusIcon}>+</Text>
              <Text style={styles.buttonPrimaryText}>צור בקשה חדשה</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
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

          {/* Seeker List */}
          <ScrollView style={styles.listsContainer}>
            {selectedTab === 'open' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>משימות פתוחות</Text>
                {openRequests.length > 0 ? (
                  openRequests.map((r) => (
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
                        <TouchableOpacity style={styles.editButton}>
                          <Text style={styles.editButtonText}>ערוך</Text>
                        </TouchableOpacity>
                        <Text style={styles.requestTitle}>{r.title}</Text>
                      </View>
                      {!hiddenRequests.has(r.id) && r.interestedTaskers && r.interestedTaskers.length > 0 && (
                        <View style={styles.interestedTaskersContainer}>
                          <Text style={styles.interestedTaskersTitle}>מעוניינים:</Text>
                          {r.interestedTaskers.map((tasker: any, index: number) => (
                            <View key={index} style={styles.interestedTaskerRow}>
                              <TouchableOpacity 
                                style={styles.showTaskerButton}
                                onPress={() => openTaskerDetails(tasker)}
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
                {closedRequests.length > 0 ? (
                  closedRequests.map((r) => (
                    <View key={r.id} style={styles.requestItem}>
                      <Text style={styles.requestTitle}>{r.title}</Text>
                      <Text style={styles.requestMeta}>עובד: {r.worker}</Text>
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

      {/* מתג למצב נותן יד / מקבל יד */}
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

      {/* Modal להצגת פרטי Tasker */}
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
                {/* תמונת פרופיל */}
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
                    {selectedTasker.rating ? `⭐ ${selectedTasker.rating}/5` : 'טרם דורג'}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>זמן בקשה</Text>
                  <Text style={styles.modalInfoText}>
                    {selectedTasker.timestamp ? new Date(selectedTasker.timestamp).toLocaleString('he-IL', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'לא זמין'}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>טלפון</Text>
                  <Text style={styles.modalInfoText}>
                    {selectedTasker.phone || 'לא קיים טלפון'}
                  </Text>
                </View>


                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>חוות דעת</Text>
                  <Text style={styles.modalInfoText}>
                    {selectedTasker.review || 'טרם ניתנה חוות דעת'}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.modalAcceptButton} onPress={closeTaskerModal}>
              <Text style={styles.modalAcceptButtonText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// --- MATH HELPERS ---
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
    flexDirection: "column",  // ← אחד מעל השני
    alignItems: "flex-end",
    gap: 4,
  },

  topText: {
    fontSize: 16,
    color: "#588157",
    fontWeight: "600",
  },

  greeting: {
    marginTop: 40,
    fontSize: 24,
    top: 60, 
    left: 80,
    textAlign: "center",
    fontWeight: "600",
    color: "#6f411d",
  },

  buttonsContainer: {
    marginTop: 100,
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
    marginTop: 18,
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
    top: 80,     // ← הורדנו למטה
    left: 20,
    alignItems: "center",
  },

  helperSwitchText: {
    marginTop: 6,
    fontSize: 14,
    color: "#6f411d",
    fontWeight: "500",
  },

  // סטיילים למצב Tasker
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
  },

  modalAcceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  distanceBadge: { fontSize: 14, color: "#588157", fontWeight: "bold", backgroundColor: "#e9f5e9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' }
});