import { router } from "expo-router";
import { collection, onSnapshot, orderBy, query, where, doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, Alert, ActivityIndicator } from "react-native";
import * as Location from 'expo-location'; 
import { db, auth } from "../services/firebase";

export default function FrontPage() {
  const [taskerMode, setTaskerMode] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [userName, setUserName] = useState("אורח");
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter tabs for Seeker Mode
  const [selectedTab, setSelectedTab] = useState<'open' | 'closed'>('open');

  useEffect(() => {
    const user = auth.currentUser;
    if (user?.displayName) setUserName(user.displayName);

    const initData = async () => {
      setLoading(true);
      
      // 1. Get Location
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

      // 2. Define Query based on Mode
      let q;
      if (taskerMode) {
        // TASKER: Get ALL open jobs
        q = query(
          collection(db, "requests"), 
          where("status", "==", "open"),
          // 👇 FIX 1: Match the exact string we saved in NewRequestScreen
          where("worker", "==", "OPEN"), 
        );
      } else {
        // SEEKER: Get ONLY my jobs
        if (!user) return;
        q = query(
          collection(db, "requests"), 
          where("seekerId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
      }

      // 3. Listen to Realtime Updates
      const unsub = onSnapshot(q, (snap) => {
        const currentUserId = auth.currentUser?.uid;

        let items = snap.docs.map((d) => {
          const data = d.data();
          // Calculate Distance
          let dist = Infinity;
          if (data.location && myCoords) {
             dist = getDistanceFromLatLonInKm(
               myCoords.lat, myCoords.lng,
               data.location.latitude, data.location.longitude
             );
          }
          return { id: d.id, ...data, distance: dist };
        });

        // --- SPECIFIC FILTERS PER MODE ---
        if (taskerMode) {
          // TASKER: Hide my own requests & Sort by Distance
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

      return unsub;
    };

    const unsubPromise = initData();
    return () => { unsubPromise.then(unsub => unsub && unsub()); };

  }, [taskerMode]); 
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
            {loading ? <ActivityIndicator color="#588157" /> : (
              selectedTab === 'open' ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>הבקשות שלי (פתוחות)</Text>
                  {openRequests.length > 0 ? (
                    openRequests.map((r) => (
                      <View key={r.id} style={styles.requestItem}>
                        <View style={styles.requestHeader}>
                          <TouchableOpacity style={styles.editButton}>
                            <Text style={styles.editButtonText}>ערוך</Text>
                          </TouchableOpacity>
                          <Text style={styles.requestTitle}>{r.title}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>אין לך בקשות פתוחות</Text>
                  )}
                </View>
              ) : (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>היסטוריה</Text>
                  {closedRequests.length > 0 ? (
                    closedRequests.map((r) => (
                      <View key={r.id} style={styles.requestItem}>
                        <Text style={styles.requestTitle}>{r.title}</Text>
                        <Text style={styles.requestMeta}>עובד: {r.worker || "..."}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>אין היסטוריה</Text>
                  )}
                </View>
              )
            )}
          </ScrollView>
        </>
      )}

      {/* Switcher */}
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
  container: { flex: 1, backgroundColor: "#FAF8EF", paddingTop: 60, paddingHorizontal: 20 },
  greeting: { marginTop: 40, fontSize: 24, textAlign: "center", fontWeight: "600", color: "#6f411d", top: 60 },
  buttonsContainer: { marginTop: 100, alignItems: "center" },
  buttonPrimary: { backgroundColor: "#588157", width: 150, height: 150, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  plusIcon: { color: "white", fontSize: 48, fontWeight: "600", marginBottom: 8 },
  buttonPrimaryText: { color: "white", fontSize: 16, fontWeight: "600", textAlign: "center" },
  
  segmentedContainer: { marginTop: 18, alignItems: 'center', width: '100%' },
  segment: { flexDirection: 'row', backgroundColor: '#eee', borderRadius: 999, padding: 4, width: 260, justifyContent: 'space-between' },
  segmentButton: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  segmentButtonActive: { backgroundColor: '#588157' },
  segmentText: { color: '#6f411d', fontWeight: '600' },
  segmentTextActive: { color: '#fff' },

  listsContainer: { marginTop: 24, width: "100%" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#6f411d", marginBottom: 8, textAlign: "right" },
  
  requestItem: { backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: "#eee" },
  requestHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  editButton: { backgroundColor: "#e74c3c", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  editButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  requestTitle: { fontSize: 16, color: "#333", textAlign: "right", flex: 1, marginRight: 10 },
  requestMeta: { marginTop: 6, fontSize: 12, color: "#666", textAlign: "right" },
  emptyText: { color: "#c0392b", fontWeight: "600", textAlign: "right" },

  helperSwitchContainer: { position: "absolute", top: 80, left: 20, alignItems: "center" },
  helperSwitchText: { marginTop: 6, fontSize: 14, color: "#6f411d", fontWeight: "500" },

  // Tasker Styles
  taskerHeader: { fontSize: 26, fontWeight: "700", color: "#6f411d", textAlign: "center", marginBottom: 8, marginTop: 110 },
  taskerSubtitle: { fontSize: 16, color: "#888", textAlign: "center", marginBottom: 24 },
  taskerRequestsList: { flex: 1, marginTop: 20 },
  taskerRequestCard: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: "#ddd", elevation: 2 },
  taskerRequestTitle: { fontSize: 18, fontWeight: "600", color: "#333", textAlign: "right", flex: 1 }, 
  distanceBadge: { fontSize: 14, color: "#588157", fontWeight: "bold", backgroundColor: "#e9f5e9", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, overflow: 'hidden' }, 
  taskerRequestDescription: { fontSize: 14, color: "#666", textAlign: "right", marginBottom: 12 },
  taskerTakeButton: { backgroundColor: "#588157", paddingVertical: 10, borderRadius: 8, alignItems: "center" },
  taskerTakeButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  taskerEmptyText: { fontSize: 16, color: "#999", textAlign: "center", marginTop: 40 },
});