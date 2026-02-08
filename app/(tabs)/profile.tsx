import * as ImagePicker from 'expo-image-picker'; // 👈 Imported ImagePicker
import { router } from "expo-router";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { collection, doc, onSnapshot, query, setDoc, where } from "firebase/firestore";
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image // 👈 Imported Image
  ,


  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from "../services/firebase";
import { uploadImage } from "../services/storage"; // 👈 Imported Storage Helper

export default function ProfileScreen() {
  const [user, setUser] = useState(auth.currentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || "");
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  
  // 📸 New State for Profile Image
  const [image, setImage] = useState<string | null>(user?.photoURL || null);

  // Update local state if auth changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setNewName(currentUser.displayName || "");
        setImage(currentUser.photoURL); // Sync image from Auth
      }
    });
    return unsub;
  }, []);

  // Fetch completed tasks count
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "requests"), where("workerId", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => setCompletedTasksCount(snapshot.size));
    return () => unsub();
  }, [user?.uid]);

  // Fetch reviews
  useEffect(() => {
    if (!user?.uid) return;
    const q = query(collection(db, "reviews"), where("reviewedUserId", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(reviewsData);
    });
    return () => unsub();
  }, [user?.uid]);

  // 📸 Function to Pick Image
  const pickImage = async () => {
    try {
      // Request permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('אין הרשאה', 'נדרשת הרשאה לגישה לגלריה');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        console.log("Image picked:", result.assets[0].uri);
        setImage(result.assets[0].uri); // Set local preview
        if (!isEditing) setIsEditing(true); // Auto-enter edit mode
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert('שגיאה', 'לא ניתן לבחור תמונה');
    }
  };

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
      setTimeout(() => {
        if (router.canGoBack()) router.dismissAll();
        router.replace("/"); 
      }, 100);
    } catch (error) {
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
        let downloadUrl = user.photoURL;

        // 1. Upload Image (only if changed and is local file)
        if (image && image !== user.photoURL && !image.startsWith('http')) {
            // Upload to 'profile-images/{uid}' to match storage.rules
            downloadUrl = await uploadImage(image, "profile-images", user.uid);
        }

        // 2. Update Auth Profile
        await updateProfile(user, { 
            displayName: newName,
            photoURL: downloadUrl 
        });

        // 3. Update Firestore User Doc (Sync for others to see)
        await setDoc(doc(db, "users", user.uid), {
            displayName: newName,
            photoURL: downloadUrl,
            email: user.email,
        }, { merge: true });

        // 4. Update Local State
        setUser({ ...user, displayName: newName, photoURL: downloadUrl } as any);
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
              <ActivityIndicator size="large" color="#588157" />
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
        <TouchableOpacity onPress={isEditing ? pickImage : undefined} disabled={!isEditing}>
            <View style={[styles.avatarContainer, isEditing && styles.avatarEditing]}>
                {image ? (
                    <Image source={{ uri: image }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarText}>
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : "U"}
                    </Text>
                )}
                {/* Visual Cue for Editing */}
                {isEditing && (
                <View style={styles.editIconOverlay}>
                    <Text style={{color: 'white', fontSize: 12, fontWeight: 'bold'}}>📷</Text>
                </View>
                )}
            </View>
        </TouchableOpacity>
        
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

      {/* --- STATS --- */}
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

      {/* --- REVIEWS --- */}
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
              {review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
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
                        setImage(user.photoURL); // Revert image
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
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF8EF' },
  scrollContainer: { flexGrow: 1, backgroundColor: '#FAF8EF', padding: 20, paddingTop: 60, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 30, width: '100%' },
  
  // Avatar Styles
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#A3C9A8', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 4, borderColor: 'white', elevation: 5, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: '#386641' },
  avatarEditing: { borderColor: '#588157', borderWidth: 2, borderStyle: 'dashed' },
  editIconOverlay: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', paddingVertical: 4 },

  nameText: { fontSize: 24, fontWeight: '700', color: '#386641', marginBottom: 5 },
  nameInput: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 5, borderBottomWidth: 1, borderBottomColor: '#588157', minWidth: 200, padding: 5 },
  emailText: { fontSize: 16, color: '#888' },
  
  statsContainer: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 20, marginBottom: 40, width: '100%' },
  statCard: { backgroundColor: 'white', padding: 20, borderRadius: 16, alignItems: 'center', width: 130, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#588157' },
  statLabel: { fontSize: 14, color: '#666', marginTop: 4 },

  reviewsSection: { width: '100%', marginBottom: 30 },
  reviewsTitle: { fontSize: 20, fontWeight: 'bold', color: '#386641', marginBottom: 15, textAlign: 'right' },
  reviewCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2 },
  reviewHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reviewerName: { fontSize: 16, fontWeight: '600', color: '#333' },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 14, fontWeight: '600', color: '#588157' },
  reviewComment: { fontSize: 14, color: '#555', textAlign: 'right', marginBottom: 8, lineHeight: 20 },
  reviewDate: { fontSize: 12, color: '#999', textAlign: 'right' },

  actionsContainer: { width: '100%', alignItems: 'center', gap: 15 },
  editButtonsRow: { flexDirection: 'row-reverse', gap: 10, width: '100%', justifyContent: 'center' },
  actionButton: { backgroundColor: '#588157', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 12, width: '100%', maxWidth: 300, alignItems: 'center', elevation: 2 },
  saveButton: { backgroundColor: '#588157', flex: 1 },
  cancelButton: { backgroundColor: '#e9e9e9', flex: 1 },
  logoutButton: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e74c3c', marginTop: 8 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  logoutText: { color: '#e74c3c' },
});