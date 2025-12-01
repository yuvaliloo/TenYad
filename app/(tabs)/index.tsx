import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";

export default function FrontPage() {
  const [isHelperMode, setIsHelperMode] = useState(false);

  return (
    <View style={styles.container}>

      {/* כותרות */} 
      <View style={styles.topRow}>
        <Text style={styles.topText}>בקשות סגורות</Text>
        <Text style={styles.topText}>בקשות פתוחות</Text>
      </View>

      {/* ברכת שלום */}
      <Text style={styles.greeting}>ערב טוב, ליאור</Text>

      {/* כפתור צור בקשה */}
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={styles.buttonPrimary}
          onPress={() => router.push("/new-request")}
        >
          <Text style={styles.buttonPrimaryText}>
            + צור בקשה חדשה</Text>
        </TouchableOpacity>
      </View>

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
    textAlign: "center",
    fontWeight: "600",
    color: "#6f411d",
  },

  buttonsContainer: {
    marginTop: 100,
  },

  buttonPrimary: {
    backgroundColor: "#588157",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
  },

  buttonPrimaryText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
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
