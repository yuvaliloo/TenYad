import { router } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { db } from "./services/firebase";

export default function NewRequestScreen() {
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const publish = async () => {
    if (!description.trim()) {
      alert("אנא הזן תיאור לבקשה");
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, "requests"), {
        title: description.split("\n")[0] || "בקשה חדשה",
        description: description,
        worker: null,
        createdAt: serverTimestamp(),
      });
      
      // סגור את המסך מיד אחרי הצלחה
      router.back();
    } catch (err: any) {
      setLoading(false);
      alert("שגיאה ביצירת הבקשה: " + err.message);
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

      {/* כפתור פרסם */}
      <TouchableOpacity style={styles.publishButton} onPress={publish} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.publishText}>פרסם</Text>
        )}
      </TouchableOpacity>

      {showSuccess && (
        <View style={styles.successToast} pointerEvents="none">
          <Text style={styles.successText}>הבקשה פורסמה בהצלחה</Text>
        </View>
      )}

      {/* כפתור בטל */}
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
      >
        <Text style={styles.cancelText}>בטל בקשה</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#FAF8EF",
  },

  title: {
    fontSize: 20,
    marginBottom: 10,
    color: "#6f411d",
    fontWeight: "600",
    textAlign: "right",
  },

  input: {
    height: 140,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
    textAlign: "right",
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 30,
    fontSize: 16,
  },

  publishButton: {
    backgroundColor: "#588157",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
  },

  publishText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },

  cancelButton: {
    backgroundColor: "white",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#588157",
    alignItems: "center",
  },

  cancelText: {
    color: "#588157",
    fontSize: 18,
    fontWeight: "600",
  },
  successToast: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  successText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
