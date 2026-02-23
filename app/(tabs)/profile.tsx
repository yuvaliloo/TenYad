import { router } from "expo-router";
import { signOut, updateProfile, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, where, doc, setDoc, getDoc } from "firebase/firestore";
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
  View,
  Image 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from "../services/firebase"; 
import { uploadImage } from "../services/storage"; 
import PayPalLinkModal from "../../components/PayPalLinkModal"; 

export default function ProfileScreen() {
  const [user, setUser] = useState(auth.currentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || "");
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  const [image, setImage] = useState<string | null>(user?.photoURL || null);

  // 💰 PayPal State
  const [paypalEmail, setPaypalEmail] = useState("");
  const [showPayPalModal, setShowPayPalModal] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setNewName(currentUser.displayName || "");
        setImage(currentUser.photoURL);
        
        const userDocRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
            const data = userSnap.data();
            if (data.paypalEmail) setPaypalEmail(data.paypalEmail);
        }
      }
    });
    return unsubAuth;
  }, []);

  // Stats & Reviews Fetching
  useEffect(() => {
    if (!user?.uid) return;
    const qTasks = query(collection(db, "requests"), where("workerId", "==", user.uid), where("status", "==", "completed"));
    const unsubTasks = onSnapshot(qTasks, (snap) => setCompletedTasksCount(snap.size));
    const qReviews = query(collection(db, "reviews"), where("reviewedUserId", "==", user.uid));
    const unsubReviews = onSnapshot(qReviews, (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubTasks(); unsubReviews(); };
  }, [user?.uid]);

  const pickImage = async () => {
    if (!isEditing) return; 
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0].uri) setImage(result.assets[0].uri); 
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      // 🌐 WEB: Use standard browser confirmation
      const confirmLogout = window.confirm("האם אתה בטוח שברצונך להתנתק?");
      if (confirmLogout) {
        await signOut(auth);
        router.replace("/login"); 
      }
    } else {
      // 📱 MOBILE: Use React Native's native Alert
      Alert.alert("התנתקות", "האם אתה בטוח?", [
        { text: "ביטול", style: "cancel" },
        { text: "התנתק", style: "destructive", onPress: async () => {
            await signOut(auth);
            router.replace("/login"); 
        }}
      ]);
    }
  };
  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
        let downloadUrl = user.photoURL;
        if (image && image !== user.photoURL && !image.startsWith('http')) {
            downloadUrl = await uploadImage(image, "profiles", user.uid);
        }
        await updateProfile(user, { displayName: newName, photoURL: downloadUrl });
        await setDoc(doc(db, "users", user.uid), {
            displayName: newName,
            photoURL: downloadUrl,
            email: user.email,
            paypalEmail: paypalEmail, 
        }, { merge: true });

        setUser({ ...user, displayName: newName, photoURL: downloadUrl } as any);
        setIsEditing(false);
        Alert.alert("הצלחה", "הפרופיל עודכן");
    } catch (error) {
        Alert.alert("שגיאה", "עדכון נכשל");
    } finally {
        setLoading(false);
    }
  };

  if (!user) return <ActivityIndicator style={{marginTop:50}} size="large" color="#588157" />;

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
    : "0.0";

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage} disabled={!isEditing}>
            <View style={[styles.avatarContainer, isEditing && styles.avatarEditing]}>
                {image ? (
                    <Image source={{ uri: image }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarText}>{user.displayName?.charAt(0).toUpperCase() || "U"}</Text>
                )}
                {isEditing && <View style={styles.editOverlay}><Text style={styles.overlayText}>שנה</Text></View>}
            </View>
        </TouchableOpacity>
        
        {isEditing ? (
            <TextInput style={styles.nameInput} value={newName} onChangeText={setNewName} textAlign="center" />
        ) : (
            <Text style={styles.nameText}>{user.displayName || "משתמש אנונימי"}</Text>
        )}
        <Text style={styles.emailText}>{user.email}</Text>
      </View>

      {/* STATS */}
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

      {/* 💳 PAYMENT SETTINGS CARD */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>אמצעי תשלום (לקבלת כספים)</Text>
        
        {/* Only clickable in Edit Mode */}
        <TouchableOpacity 
            style={[styles.paypalCard, paypalEmail ? styles.paypalConnected : {}]} 
            onPress={() => setShowPayPalModal(true)}
            disabled={!isEditing} 
        >
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={styles.paypalIcon}>
                    <Text style={{color: '#003087', fontWeight:'900', fontSize: 18}}>P</Text>
                </View>
                <View>
                    <Text style={styles.paypalTitle}>חשבון PayPal</Text>
                    {/* 🟢 THIS IS PURE TEXT - NO SQUIGGLES */}
                    <Text style={styles.paypalSubtitle}>
                        {paypalEmail ? paypalEmail : "לחץ לחיבור חשבון"}
                    </Text>
                </View>
            </View>
            
            {/* Status Icon */}
            {isEditing ? (
                <Text style={{fontSize: 20, color: '#555'}}>✎</Text>
            ) : (
                <Text style={{fontSize: 20, color: paypalEmail ? '#27ae60' : '#ccc'}}>
                    {paypalEmail ? "✓" : "›"}
                </Text>
            )}
        </TouchableOpacity>

        {!paypalEmail && (
            <Text style={styles.warningText}>⚠️ חובה לחבר חשבון כדי לקבל תשלומים</Text>
        )}
      </View>

      {/* ACTIONS */}
      <View style={styles.actionsContainer}>
        {isEditing ? (
            <View style={styles.editButtonsRow}>
                <TouchableOpacity style={[styles.actionButton, styles.saveButton]} onPress={handleSaveProfile} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff"/> : <Text style={styles.buttonText}>שמור</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={() => setIsEditing(false)}>
                    <Text style={[styles.buttonText, {color: '#555'}]}>ביטול</Text>
                </TouchableOpacity>
            </View>
        ) : (
            <TouchableOpacity style={styles.actionButton} onPress={() => setIsEditing(true)}>
                <Text style={styles.buttonText}>ערוך פרופיל</Text>
            </TouchableOpacity>
        )}

        <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}>
            <Text style={[styles.buttonText, styles.logoutText]}>התנתק</Text>
        </TouchableOpacity>
      </View>

      <PayPalLinkModal 
        visible={showPayPalModal}
        currentEmail={paypalEmail}
        onClose={() => setShowPayPalModal(false)}
        onSave={(email) => {
            setPaypalEmail(email);
            // We are already in editing mode, so user just needs to hit "Save"
        }}
      />

    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8EF' },
  scrollContainer: { flexGrow: 1, backgroundColor: '#FAF8EF', padding: 20, paddingTop: 60, alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 30, width: '100%' },
  
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#A3C9A8', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 4, borderColor: 'white', elevation: 5, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 40, fontWeight: 'bold', color: '#386641' },
  avatarEditing: { borderColor: '#588157', borderWidth: 2, borderStyle: 'dashed' },
  editOverlay: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center' },
  overlayText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  nameText: { fontSize: 24, fontWeight: '700', color: '#386641', marginBottom: 5 },
  nameInput: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 5, borderBottomWidth: 1, borderBottomColor: '#588157', minWidth: 200, textAlign: 'center' },
  emailText: { fontSize: 16, color: '#888' },
  
  statsContainer: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 20, marginBottom: 30, width: '100%' },
  statCard: { backgroundColor: 'white', padding: 20, borderRadius: 16, alignItems: 'center', width: 130, elevation: 3 },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#588157' },
  statLabel: { fontSize: 14, color: '#666', marginTop: 4 },

  sectionContainer: { width: '100%', marginBottom: 30, backgroundColor: 'white', padding: 15, borderRadius: 12, elevation: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#386641', marginBottom: 15, textAlign: 'right' },
  
  // 💳 PayPal Card Style
  paypalCard: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  paypalConnected: { borderColor: '#27ae60', backgroundColor: '#f0fbf4' },
  paypalIcon: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 15, borderWidth: 1, borderColor: '#eee' },
  paypalTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', textAlign: 'right' },
  paypalSubtitle: { fontSize: 14, color: '#555', textAlign: 'right', marginTop: 2 }, // Clean text style
  warningText: { color: '#e67e22', fontSize: 12, marginTop: 10, textAlign: 'right' },

  actionsContainer: { width: '100%', alignItems: 'center', gap: 15 },
  editButtonsRow: { flexDirection: 'row-reverse', gap: 10, width: '100%', justifyContent: 'center' },
  actionButton: { backgroundColor: '#588157', paddingVertical: 15, borderRadius: 12, width: '100%', maxWidth: 300, alignItems: 'center' },
  saveButton: { flex: 1 },
  cancelButton: { backgroundColor: '#e9e9e9', flex: 1 },
  logoutButton: { backgroundColor: 'white', borderWidth: 1, borderColor: '#e74c3c' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  logoutText: { color: '#e74c3c' },
});