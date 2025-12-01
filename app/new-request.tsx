import { router } from "expo-router";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function NewRequestScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>תיאור הבקשה</Text>

      <TextInput
        style={styles.input}
        placeholder="לדוגמה: צריך עזרה להרים ארגזים..."
        placeholderTextColor="#888"
        multiline
        textAlign="right"   // ← חשוב!!
        textAlignVertical="top"
      />

      {/* כפתור פרסם */}
      <TouchableOpacity style={styles.publishButton}>
        <Text style={styles.publishText}>פרסם</Text>
      </TouchableOpacity>

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
});
