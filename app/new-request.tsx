// import { router } from "expo-router";
// Make sure this path is correct based on your folder structure!
// If this file is in 'app/(tabs)/', you might need '../../services/firebase'
import { router } from 'expo-router';
import { db, auth } from './services/firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from "react-native";

export default function NewRequestScreen() {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const publish = async () => {
    console.log("--- START PUBLISH ---"); // Debug Log 1

    // 1. Validation
    if (!description.trim()) {
      Alert.alert("חסר מידע", "אנא הזן תיאור לבקשה");
      return;
    }

    // 2. User Check
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("שגיאה", "עליך להתחבר מחדש כדי לפרסם בקשה");
      console.log("Error: User is null");
      return;
    }

    try {
      setLoading(true);
      console.log("Attempting to write to Firestore..."); // Debug Log 2

      // 3. Create the Document
      // We add 'seekerId' so we know WHO opened the request
      const docRef = await addDoc(collection(db, "requests"), {
        title: description.split("\n")[0].substring(0, 30), // Take first line as title
        description: description,
        seekerId: user.uid,              // <--- CRITICAL LINK
        seekerName: user.displayName || "Anonymous",
        status: "open",                  // Status for filtering
        createdAt: serverTimestamp(),
      });
      
      console.log("Success! Document ID:", docRef.id); // Debug Log 3
      
      // 4. Reset & Navigate Back
      setLoading(false);
      Alert.alert("הצלחה", "הבקשה פורסמה!");
      router.back();

    } catch (err: any) {
      setLoading(false);
      console.error("FIREBASE ERROR:", err); // Debug Log 4
      Alert.alert("שגיאה", err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>תיאור הבקשה</Text>

      <TextInput
        value={description}
        onChangeText={setDescription}
        style={styles.input}
        placeholder="לדוגמה: צריך עזרה להרים ארגזים..."
        placeholderTextColor="#888"
        multiline
        textAlign="right"
        textAlignVertical="top"
      />

      <TouchableOpacity style={styles.publishButton} onPress={publish} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.publishText}>פרסם</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
        disabled={loading}
      >
        <Text style={styles.cancelText}>בטל בקשה</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FAF8EF" },
  title: { fontSize: 20, marginBottom: 10, color: "#6f411d", fontWeight: "600", textAlign: "right" },
  input: { height: 140, backgroundColor: "white", borderRadius: 12, padding: 12, textAlignVertical: "top", textAlign: "right", borderWidth: 1, borderColor: "#ddd", marginBottom: 30, fontSize: 16 },
  publishButton: { backgroundColor: "#588157", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginBottom: 15 },
  publishText: { color: "white", fontSize: 18, fontWeight: "600" },
  cancelButton: { backgroundColor: "white", paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: "#588157", alignItems: "center" },
  cancelText: { color: "#588157", fontSize: 18, fontWeight: "600" },
});