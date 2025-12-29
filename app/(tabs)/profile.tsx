import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { router } from "expo-router";
import { signOut, updateProfile } from "firebase/auth";
import { auth } from "../services/firebase"; // Adjust path if needed

export default function ProfileScreen() {
  const [user, setUser] = useState(auth.currentUser);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || "");
  const [loading, setLoading] = useState(false);

  // Update local state if auth changes
  useEffect(() => {
    setUser(auth.currentUser);
    setNewName(auth.currentUser?.displayName || "");
  }, []);

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
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>משימות</Text>
        </View>
        <View style={styles.statCard}>
            <Text style={styles.statNumber}>5.0</Text>
            <Text style={styles.statLabel}>דירוג</Text>
        </View>
      </View>

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
    marginTop: 20,
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