import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useRouter } from "expo-router";
import { signOut, updateProfile, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore"; // Added Firestore imports
import { auth, db } from "../services/firebase";

export default function ProfileScreen() {
  const router = useRouter();
  
  // --- STATE ---
  const [user, setUser] = useState(auth.currentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  // Friend's State for Reviews/Stats
  const [reviews, setReviews] = useState<any[]>([]);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);

  // --- EFFECTS ---

  // 1. Auth Listener (Your Logic - Robust)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setNewName(currentUser.displayName || "");
      }
    });
    return unsubscribe;
  }, []);

  // 2. Fetch Stats & Reviews (Friend's Logic)
  useEffect(() => {
    if (!user?.uid) return;

    // A. Count Completed Tasks (Where I am the worker)
    const tasksQuery = query(
      collection(db, "requests"),
      where("workerId", "==", user.uid)
    );

    const tasksUnsub = onSnapshot(tasksQuery, (snapshot) => {
      setCompletedTasksCount(snapshot.size);
    }, (error) => console.error("Error tasks:", error));

    // B. Fetch Reviews (Where I am the reviewed user)
    const reviewsQuery = query(
      collection(db, "reviews"),
      where("reviewedUserId", "==", user.uid)
    );

    const reviewsUnsub = onSnapshot(reviewsQuery, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReviews(reviewsData);
    }, (error) => console.error("Error reviews:", error));

    return () => {
      tasksUnsub();
      reviewsUnsub();
    };
  }, [user?.uid]);

  // --- ACTIONS ---

  // Logout Logic (Your Logic + testID support)
  const handleLogout = async () => {
    if (Platform.OS === 'web') {
        if (window.confirm("האם אתה בטוח שברצונך להתנתק?")) await performLogout();
        return;
    }
    Alert.alert("התנתקות", "האם אתה בטוח שברצונך להתנתק?", [
      { text: "ביטול", style: "cancel" },
      { text: "התנתק", style: "destructive", onPress: performLogout }
    ]);
  };

  const performLogout = async () => {
    try {
      await signOut(auth);
      router.replace("/login"); // Kept your specific redirect
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to log out");
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (newName.trim() === "") {
        Alert.alert("שגיאה", "השם לא יכול להיות ריק");
        return;
    }
    setLoading(true);
    try {
        await updateProfile(user, { displayName: newName });
        setUser({ ...user, displayName: newName } as any); 
        setIsEditing(false);
        Alert.alert("הצלחה", "הפרופיל עודכן בהצלחה");
    } catch (error) {
        Alert.alert("שגיאה", "לא ניתן היה לעדכן את הפרופיל");
    } finally {
        setLoading(false);
    }
  };

  if (!user) {
      return (
          <View style={styles.container}>
              <ActivityIndicator size="large" color="#588157" />
          </View>
      );
  }

  // Calculate Average Rating
  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{flex: 1}}
    >
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      
      {/* --- HEADER --- */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
            </Text>
        </View>
        
        {isEditing ? (
            <TextInput 
                style={styles.nameInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="הכנס שם מלא"
                textAlign="center"
            />
        ) : (
            <Text style={styles.nameText}>{user.displayName || "משתמש אנונימי"}</Text>
        )}
        
        <Text style={styles.emailText}>{user.email}</Text>
      </View>

      {/* --- STATS (Dynamic from Friend) --- */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
            <Text style={styles.statNumber}>{completedTasksCount}</Text>
            <Text style={styles.statLabel}>משימות</Text>
        </View>
        <View style={styles.statCard}>
            <Text style={styles.statNumber}>{averageRating}</Text>
            <Text style={styles.statLabel}>דירוג</Text>
        </View>
      </View>

      {/* --- REVIEWS LIST (From Friend) --- */}
      {reviews.length > 0 && (
        <View style={styles.reviewsSection}>
          <Text style={styles.reviewsTitle}>חוות דעת</Text>
          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewerName}>{review.reviewerName || "משתמש אנונימי"}</Text>
                <View style={styles.ratingContainer}>
                   <Text style={styles.ratingText}>⭐ {review.rating || 0}</Text>
                </View>
              </View>
              {review.comment && (
                <Text style={styles.reviewComment}>{review.comment}</Text>
              )}
              {review.createdAt && review.createdAt.toDate && (
                <Text style={styles.reviewDate}>
                  {new Date(review.createdAt.toDate()).toLocaleDateString('he-IL')}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* --- BUTTONS --- */}
      <View style={styles.actionsContainer}>
        {isEditing ? (
            <View style={styles.editButtonsRow}>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.saveButton]} 
                    onPress={handleSaveProfile}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.buttonText}>שמור</Text>}
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.cancelButton]} 
                    onPress={() => {
                        setNewName(user.displayName || "");
                        setIsEditing(false);
                    }}
                    disabled={loading}
                >
                    <Text style={[styles.buttonText, {color: '#555'}]}>ביטול</Text>
                </TouchableOpacity>
            </View>
        ) : (
            <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => setIsEditing(true)}
            >
                <Text style={styles.buttonText}>ערוך פרופיל</Text>
            </TouchableOpacity>
        )}

        {/* LOGOUT BUTTON (Crucial: Includes testID for Maestro) */}
        <TouchableOpacity 
            style={[styles.actionButton, styles.logoutButton]} 
            onPress={handleLogout}
            testID="logout_button" 
        >
            <Text style={[styles.buttonText, styles.logoutText]}>התנתק</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8EF' },
  scrollContainer: { flexGrow: 1, backgroundColor: '#FAF8EF', padding: 20, paddingTop: 60, alignItems: 'center' },
  
  // Header
  header: { alignItems: 'center', marginBottom: 30, width: '100%' },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#A3C9A8', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 4, borderColor: 'white', elevation: 5 },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: '#386641' },
  nameText: { fontSize: 24, fontWeight: '700', color: '#386641', marginBottom: 5 },
  nameInput: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 5, borderBottomWidth: 1, borderBottomColor: '#588157', minWidth: 200, padding: 5 },
  emailText: { fontSize: 16, color: '#888' },
  
  // Stats
  statsContainer: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 20, marginBottom: 40, width: '100%' },
  statCard: { backgroundColor: 'white', padding: 20, borderRadius: 16, alignItems: 'center', width: 130, elevation: 3 },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#588157' },
  statLabel: { fontSize: 14, color: '#666', marginTop: 4 },
  
  // Reviews Section (New)
  reviewsSection: { width: '100%', marginBottom: 30 },
  reviewsTitle: { fontSize: 20, fontWeight: 'bold', color: '#386641', marginBottom: 15, textAlign: 'right' },
  reviewCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 2 },
  reviewHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewerName: { fontSize: 16, fontWeight: '600', color: '#333' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 14, fontWeight: '600', color: '#588157' },
  reviewComment: { fontSize: 14, color: '#555', textAlign: 'right', marginBottom: 8, lineHeight: 20 },
  reviewDate: { fontSize: 12, color: '#999', textAlign: 'right' },

  // Buttons
  actionsContainer: { width: '100%', alignItems: 'center', gap: 15 },
  editButtonsRow: { flexDirection: 'row-reverse', gap: 10, width: '100%', justifyContent: 'center' },
  actionButton: { backgroundColor: '#588157', paddingVertical: 15, borderRadius: 12, width: '100%', maxWidth: 300, alignItems: 'center', elevation: 2 },
  saveButton: { flex: 1 },
  cancelButton: { backgroundColor: '#e9e9e9', flex: 1 },
  logoutButton: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e74c3c', marginTop: 20 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  logoutText: { color: '#e74c3c' },
});