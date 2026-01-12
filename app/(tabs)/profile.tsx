import { router } from "expo-router";
import { signOut, updateProfile } from "firebase/auth";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from "../services/firebase"; // Adjust path if needed

export default function ProfileScreen() {
  const [user, setUser] = useState(auth.currentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || "");
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);

  // Update local state if auth changes
  useEffect(() => {
    setUser(auth.currentUser);
    setNewName(auth.currentUser?.displayName || "");
  }, []);

  // Fetch completed tasks count
  useEffect(() => {
    if (!user?.uid) return;

    // Check requests where I am the worker
    const q = query(
      collection(db, "requests"),
      where("workerId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setCompletedTasksCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching completed tasks:", error);
    });

    return () => unsub();
  }, [user?.uid]);

  // Fetch reviews for the current user
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "reviews"),
      where("reviewedUserId", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[]; // 👈 Force type to any[] for debugging
      console.log("DEBUG: Current User ID:", user.uid);
      console.log("DEBUG: Reviews found in Firestore:", reviewsData.length);
      if (reviewsData.length > 0) {
          console.log("DEBUG: First review reviewedUserId:", reviewsData[0].reviewedUserId);
      }
      setReviews(reviewsData);
    }, (error) => {
      console.error("Error fetching reviews:", error);
    });

    return () => unsub();
  }, [user?.uid]);

  const handleLogout = async () => {
    console.log("Logout button pressed!"); // 🔍 Debug Log

    // --- 1. WEB SUPPORT ---
    if (Platform.OS === 'web') {
        const confirm = window.confirm("האם אתה בטוח שברצונך להתנתק?");
        if (confirm) {
            await performLogout();
        }
        return;
    }

    // --- 2. MOBILE SUPPORT ---
    Alert.alert("התנתקות", "האם אתה בטוח שברצונך להתנתק?", [
      { text: "ביטול", style: "cancel" },
      {
        text: "התנתק",
        style: "destructive",
        onPress: performLogout // Call the helper function
      }
    ]);
  };

  // Helper function to do the actual work
  const performLogout = async () => {
    try {
      await signOut(auth);
      console.log("Signed out successfully");
      
      // 👇 TRICK: Wait 100ms for Firebase to fully update local state
      setTimeout(() => {
        if (router.canGoBack()) {
            router.dismissAll(); // Close any open modals/stacks
        }
        
        // Force navigation to the ABSOLUTE root (app/index.tsx)
        router.replace("/"); 
      }, 100);

    } catch (error) {
      console.error("Logout Error:", error);
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
        setUser({ ...user, displayName: newName } as any); // Force UI update
        setIsEditing(false);
        Alert.alert("הצלחה", "הפרופיל עודכן בהצלחה");
    } catch (error) {
        console.error(error);
        Alert.alert("שגיאה", "לא ניתן היה לעדכן את הפרופיל");
    } finally {
        setLoading(false);
    }
  };

  if (!user) {
      return (
          <View style={styles.container}>
              <Text>טוען נתונים...</Text>
          </View>
      );
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{flex: 1}}
    >
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      
      {/* --- HEADER / AVATAR --- */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
            {/* Placeholder Avatar - using first letter of name */}
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

      {/* --- STATS CARDS (Placeholders for future logic) --- */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
            <Text style={styles.statNumber}>{completedTasksCount}</Text>
            <Text style={styles.statLabel}>מונה משימות </Text>
        </View>
        <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {reviews.length > 0 
                ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
                : "0.0"}
            </Text>
            <Text style={styles.statLabel}>דירוג</Text>
        </View>
      </View>

      {/* --- REVIEWS SECTION --- */}
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
              {review.createdAt && (
                <Text style={styles.reviewDate}>
                  {new Date(review.createdAt.toDate()).toLocaleDateString('he-IL')}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* --- ACTION BUTTONS --- */}
      <View style={styles.actionsContainer}>
        
        {isEditing ? (
            <View style={styles.editButtonsRow}>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.saveButton]} 
                    onPress={handleSaveProfile}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.buttonText}>שמור שינויים</Text>}
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

        {/* LOGOUT BUTTON */}
        <TouchableOpacity 
            style={[styles.actionButton, styles.logoutButton]} 
            onPress={handleLogout}
        >
            <Text style={[styles.buttonText, styles.logoutText]}>התנתק</Text>
        </TouchableOpacity>

      </View>

    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF8EF',
  },
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#FAF8EF',
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#A3C9A8', // Soft green
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 4,
    borderColor: 'white',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#386641',
  },
  nameText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#386641',
    marginBottom: 5,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#588157',
    minWidth: 200,
    padding: 5,
  },
  emailText: {
    fontSize: 16,
    color: '#888',
  },
  
  statsContainer: {
    flexDirection: 'row-reverse', // RTL layout for stats
    justifyContent: 'center',
    gap: 20,
    marginBottom: 40,
    width: '100%',
  },
  statCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    width: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#588157',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  reviewsSection: {
    width: '100%',
    marginBottom: 30,
  },
  reviewsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#386641',
    marginBottom: 15,
    textAlign: 'right',
  },
  reviewCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#588157',
  },
  reviewComment: {
    fontSize: 14,
    color: '#555',
    textAlign: 'right',
    marginBottom: 8,
    lineHeight: 20,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },

  actionsContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 15,
  },
  editButtonsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  actionButton: {
    backgroundColor: '#588157',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
    elevation: 2,
  },
  saveButton: {
    backgroundColor: '#588157',
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#e9e9e9',
    flex: 1,
  },
  logoutButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e74c3c',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutText: {
    color: '#e74c3c',
  },
});