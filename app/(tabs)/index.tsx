import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";

export default function FrontPage() {
  const [isHelperMode, setIsHelperMode] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "requests"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setRequests(items);
    }, (err) => {
      console.warn("Failed to listen to requests:", err);
    });
    return () => unsub();
  }, []);

  const openRequests = requests.filter((r) => !r.worker);
  const closedRequests = requests.filter((r) => !!r.worker);
  const [selectedTab, setSelectedTab] = useState<'open' | 'closed'>('open');

  return (
    <View style={styles.container}>

      {/* ברכת שלום */}
      <Text style={styles.greeting}>ערב טוב, ליאור</Text>

      {/* כפתור צור בקשה */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={styles.buttonPrimary}
          onPress={() => router.push("/new-request")}
        >
          <Text style={styles.plusIcon}>+</Text>
          <Text style={styles.buttonPrimaryText}>צור בקשה חדשה</Text>
        </TouchableOpacity>
      </View>

      {/* מתג/סגמנט לעבור בין פתוחות/סגורות */}
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

      {/* רשימות בקשות - פתוחות וסגורות */}
      <ScrollView style={styles.listsContainer}>
        {selectedTab === 'open' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>בקשות פתוחות</Text>
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
              <Text style={styles.emptyText}>אין בקשות פתוחות</Text>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>בקשות סגורות</Text>
            {closedRequests.length > 0 ? (
              closedRequests.map((r) => (
                <View key={r.id} style={styles.requestItem}>
                  <Text style={styles.requestTitle}>{r.title}</Text>
                  <Text style={styles.requestMeta}>עובד: {r.worker}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>אין בקשות סגורות</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* מתג למצב נותן יד */}
      <View style={styles.helperSwitchContainer}>
        <Switch
          value={isHelperMode}
          onValueChange={setIsHelperMode}
          thumbColor={isHelperMode ? "#588157" : "#ccc"}
          trackColor={{ false: "#ddd", true: "#a3c9a8" }}
        />
        <Text style={styles.helperSwitchText}>עבור למצב נותן יד</Text>
      </View>

    </View>
  );
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
    top: 10, 
    left: 100,
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
});
