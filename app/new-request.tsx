import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from "expo-router";
import { addDoc, collection, GeoPoint, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from "firebase/storage"; // Import Storage functions
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { auth, db, storage } from './services/firebase'; // Import storage instance

export default function NewRequestScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState(""); // <--- New Address State
  const [title, setTitle] = useState("");     // <--- New Title State
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null); // <--- Photo State
  const [paymentAmount, setPaymentAmount] = useState(""); // <--- Payment Amount State
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

  // Handle Payment Amount - Only Numbers
  const handlePaymentChange = (text: string) => {
    // Remove any non-numeric characters except decimal point
    const numericValue = text.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = numericValue.split('.');
    const filteredValue = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('')
      : numericValue;
    setPaymentAmount(filteredValue);
  };

  // Handle Camera/Photo Selection
  const pickImage = async () => {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("אין הרשאה", "אנא אפשר גישה למצלמה בהגדרות");
      return;
    }

    // Show action sheet to choose camera or gallery
    Alert.alert(
      "בחר תמונה",
      "מאיפה תרצה לבחור תמונה?",
      [
        {
          text: "מצלמה",
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              aspect: [4, 3],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              setPhoto(result.assets[0].uri);
            }
          },
        },
        {
          text: "גלריה",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              setPhoto(result.assets[0].uri);
            }
          },
        },
        {
          text: "ביטול",
          style: "cancel",
        },
      ]
    );
  };

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
      // 1. Upload Image (if exists)
      let imageUrl = null;
      if (photo) {
        try {
          // Fetch the local file as a blob
          const response = await fetch(photo);
          const blob = await response.blob();
          
          // Create a reference
          const filename = `requests/${user.uid}/${Date.now()}.jpg`;
          const storageRef = ref(storage, filename);
          
          // Upload
          await uploadBytes(storageRef, blob);
          
          // Get URL
          imageUrl = await getDownloadURL(storageRef);
          
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          Alert.alert("שים לב", "העלאת התמונה נכשלה. המשימה תפורסם ללא תמונה.");
        }
      }

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
        worker: "OPEN", 
        
        createdAt: serverTimestamp(),
        location: locationData,   // <--- From Auto GPS
        address: address,         // <--- From Input
        paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,  // <--- Payment Amount
        imageUrl: imageUrl        // <--- Save Image URL
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
        placeholder="עזרה בהעברת דירה"
        placeholderTextColor="#999"
        textAlign="right"
      />

      {/* --- Address Input --- */}
      <Text style={styles.label}>כתובת</Text>
      <TextInput
        value={address}
        onChangeText={setAddress}
        style={styles.inputSingle}
        placeholder="רוטשילד 10, תל אביב"
        placeholderTextColor="#999"
        textAlign="right"
      />
      
      {/* Location Status Text */}
      <Text style={styles.locationStatus}>{locationStatus}</Text>

      {/* --- Photo Input --- */}
      <Text style={styles.label}>תמונה</Text>
      <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
        <Text style={styles.photoButtonText}>
          {photo ? "שנה תמונה" : "הוסף תמונה"}
        </Text>
      </TouchableOpacity>
      
      {photo && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: photo }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => setPhoto(null)}
          >
            <Text style={styles.removeImageText}>✕ הסר תמונה</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* --- Payment Amount Input --- */}
      <Text style={styles.label}>סה"כ לתשלום</Text>
      <View style={styles.paymentContainer}>
        <Text style={styles.currencySymbol}>₪</Text>
        <TextInput
          value={paymentAmount}
          onChangeText={handlePaymentChange}
          style={styles.inputPayment}
          placeholder="0"
          placeholderTextColor="#999"
          textAlign="right"
          keyboardType="numeric"
        />
      </View>

      {/* --- Description Input --- */}
      <Text style={styles.label}>תיאור מפורט</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        style={styles.inputMulti}
        placeholder="...פרט כאן מה בדיוק נדרש"
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

  paymentContainer: {
    position: "relative",
    height: 150,
  },
  inputPayment: {
    height: 150,
    backgroundColor: "white",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingLeft: 60,
    paddingVertical: 20,
    textAlign: "right",
    borderWidth: 2,
    borderColor: "#588157",
    fontSize: 56,
    fontWeight: "700",
  },
  currencySymbol: {
    position: "absolute",
    left: 20,
    top: 0,
    bottom: 0,
    fontSize: 40,
    fontWeight: "700",
    color: "#588157",
    textAlignVertical: "center",
    zIndex: 1,
    lineHeight: 150,
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

  photoButton: {
    backgroundColor: "white",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#588157",
    borderStyle: "dashed",
    alignItems: "center",
    marginBottom: 15,
  },
  photoButtonText: {
    color: "#588157",
    fontSize: 16,
    fontWeight: "600",
  },

  imagePreviewContainer: {
    marginBottom: 15,
    alignItems: "center",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: "#f0f0f0",
  },
  removeImageButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  removeImageText: {
    color: "#d32f2f",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
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