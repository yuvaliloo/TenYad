import * as Location from 'expo-location';
import { router } from "expo-router";
import { addDoc, collection, GeoPoint, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from "react-native";
import { auth, db } from './services/firebase';

export default function NewRequestScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState(""); // <--- New Address State
  const [title, setTitle] = useState("");     // <--- New Title State
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState("מאתר מיקום...");

  // 1. Get Location Automatically on Mount
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus("אין אישור מיקום");
        return;
      }

      try {
        let loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
        setLocationStatus("📍 מיקום נוכחי זוהה בהצלחה");
      } catch (err) {
        setLocationStatus("שגיאה בזיהוי מיקום");
      }
    })();
  }, []);

  const publish = async () => {
    if (!title || !description || !address) {
      Alert.alert("חסרים פרטים", "אנא מלא כותרת, תיאור וכתובת");
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("שגיאה", "עליך להתחבר כדי לפרסם בקשה");
      return;
    }

    setLoading(true);

    try {
      // 2. Prepare GeoPoint
      let locationData = null;
      if (location) {
        locationData = new GeoPoint(location.coords.latitude, location.coords.longitude);
      }

      // 3. Write to Firestore
      await addDoc(collection(db, 'requests'), {
        title: title,             // <--- From Input
        description: description,
        
        seekerId: user.uid,
        seekerName: user.displayName || "Anonymous",
        
        status: "open",
        
        createdAt: serverTimestamp(),
        location: locationData,   // <--- From Auto GPS
        address: address          // <--- From Input
      });

      console.log("✅ Success! Request created.");
      Alert.alert("הצלחה", "הבקשה פורסמה בהצלחה!");
      router.back();

    } catch (err) {
      console.error("❌ Error writing document:", err);
      if (err instanceof Error) {
        Alert.alert("Error", err.message);
      } else {
        Alert.alert("Error", "Unknown error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 40}}>
      
      {/* --- Title Input --- */}
      <Text style={styles.label}>כותרת הבקשה</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={styles.inputSingle}
        placeholder="לדוגמה: עזרה בהעברת דירה"
        placeholderTextColor="#999"
        textAlign="right"
      />

      {/* --- Address Input --- */}
      <Text style={styles.label}>כתובת</Text>
      <TextInput
        value={address}
        onChangeText={setAddress}
        style={styles.inputSingle}
        placeholder="לדוגמה: תל אביב, רוטשילד 10"
        placeholderTextColor="#999"
        textAlign="right"
      />
      
      {/* Location Status Text */}
      <Text style={styles.locationStatus}>{locationStatus}</Text>

      {/* --- Description Input --- */}
      <Text style={styles.label}>תיאור מפורט</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        style={styles.inputMulti}
        placeholder="פרט כאן מה בדיוק נדרש..."
        placeholderTextColor="#999"
        multiline
        textAlign="right"
        textAlignVertical="top"
      />

      {/* --- Buttons --- */}
      <TouchableOpacity style={styles.publishButton} onPress={publish} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.publishText}>פרסם בקשה</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
        disabled={loading}
      >
        <Text style={styles.cancelText}>ביטול</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FAF8EF" },
  
  label: { 
    fontSize: 18, 
    marginBottom: 8, 
    marginTop: 10,
    color: "#6f411d", 
    fontWeight: "600", 
    textAlign: "right" 
  },
  
  inputSingle: { 
    height: 50, 
    backgroundColor: "white", 
    borderRadius: 12, 
    paddingHorizontal: 15, 
    textAlign: "right", 
    borderWidth: 1, 
    borderColor: "#ddd", 
    fontSize: 16 
  },

  inputMulti: { 
    height: 120, 
    backgroundColor: "white", 
    borderRadius: 12, 
    padding: 15, 
    textAlignVertical: "top", 
    textAlign: "right", 
    borderWidth: 1, 
    borderColor: "#ddd", 
    marginBottom: 30, 
    fontSize: 16 
  },
  
  locationStatus: {
    textAlign: 'right',
    color: '#588157',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 5,
    fontWeight: 'bold'
  },

  publishButton: { 
    backgroundColor: "#588157", 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: "center", 
    marginBottom: 15,
    marginTop: 10
  },
  publishText: { color: "white", fontSize: 18, fontWeight: "600" },
  
  cancelButton: { 
    backgroundColor: "white", 
    paddingVertical: 16, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: "#588157", 
    alignItems: "center" 
  },
  cancelText: { color: "#588157", fontSize: 18, fontWeight: "600" },
});
