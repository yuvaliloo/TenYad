import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { GooglePlacesAutocomplete, GooglePlaceData, GooglePlaceDetail } from 'react-native-google-places-autocomplete';
import { router } from "expo-router";
import { collection, GeoPoint, serverTimestamp, doc, setDoc } from 'firebase/firestore';
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
  View,
  KeyboardAvoidingView, 
  Platform
} from "react-native";
import { auth, db } from './services/firebase';
import { uploadImage } from './services/storage';

export default function NewRequestScreen() {
  // Device Location (GPS) - Used as fallback or for initial region
  const [deviceLocation, setDeviceLocation] = useState<Location.LocationObject | null>(null);
  
  // 📍 SELECTED LOCATION (From Address) - This is what we want to save!
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(null);

  const [address, setAddress] = useState(""); 
  const [title, setTitle] = useState("");     
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null); 
  const [paymentAmount, setPaymentAmount] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState("מאתר מיקום...");

  // 1. Get Device Location Automatically (Just for helper, not for saving)
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus("אין אישור מיקום");
        return;
      }
      try {
        let loc = await Location.getCurrentPositionAsync({});
        setDeviceLocation(loc);
        setLocationStatus("📍 מיקום נוכחי זוהה (אופציונלי)");
      } catch (err) {
        setLocationStatus("שגיאה בזיהוי מיקום");
      }
    })();
  }, []);

  const handlePaymentChange = (text: string) => {
    const numericValue = text.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');
    const filteredValue = parts.length > 2 
      ? parts[0] + '.' + parts.slice(1).join('')
      : numericValue;
    setPaymentAmount(filteredValue);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("אין הרשאה", "אנא אפשר גישה למצלמה בהגדרות");
      return;
    }

    Alert.alert("בחר תמונה", "מאיפה תרצה לבחור תמונה?", [
      {
        text: "מצלמה",
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            aspect: [4, 3],
            quality: 0.5,
          });
          if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
        },
      },
      {
        text: "גלריה",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.5,
          });
          if (!result.canceled && result.assets[0]) setPhoto(result.assets[0].uri);
        },
      },
      { text: "ביטול", style: "cancel" },
    ]);
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
      const newRequestRef = doc(collection(db, "requests"));
      const requestId = newRequestRef.id;
      
      let imageUrl = null;
      if (photo) {
          imageUrl = await uploadImage(photo, "task_pics", requestId);
      }

      // 📍 LOGIC FIX: Prioritize the Selected Address Coordinates
      let finalGeoPoint = null;

      if (selectedCoords) {
        // Option A: User selected an address from Google
        finalGeoPoint = new GeoPoint(selectedCoords.lat, selectedCoords.lng);
      } else if (deviceLocation) {
        // Option B: Fallback to GPS if they typed manually but have GPS on (less accurate for address)
        finalGeoPoint = new GeoPoint(deviceLocation.coords.latitude, deviceLocation.coords.longitude);
      }

      await setDoc(newRequestRef, {
        title: title,            
        description: description,
        seekerId: user.uid,
        seekerName: user.displayName || "Anonymous",
        status: "open",
        worker: "OPEN", 
        createdAt: serverTimestamp(),
        location: finalGeoPoint, // 👈 Saving the correct location now!
        address: address,         
        paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,
        image: imageUrl 
      });

      console.log("✅ Request created:", requestId);
      Alert.alert("הצלחה", "הבקשה פורסמה בהצלחה!");
      router.back();

    } catch (err) {
      console.error("❌ Error creating request:", err);
      Alert.alert("Error", "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{flex:1}} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={{paddingBottom: 40}}
      keyboardShouldPersistTaps="handled"
    >
      
      <Text style={styles.label}>כותרת הבקשה</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        style={styles.inputSingle}
        placeholder="עזרה בהעברת דירה"
        placeholderTextColor="#999"
        textAlign="right"
      />

      {/* --- GOOGLE AUTOCOMPLETE SECTION --- */}
      <Text style={styles.label}>מיקום המשימה</Text>
      
      <View style={styles.autocompleteWrapper}>
        <GooglePlacesAutocomplete
          placeholder='חפש כתובת, עיר או עסק...'
          
          // 1. THIS IS CRITICAL: Fetch Geometry (Lat/Lng)
          fetchDetails={true} 

          onPress={(data: GooglePlaceData, details: GooglePlaceDetail | null = null) => {
            setAddress(data.description);
            
            // 2. Capture the Lat/Lng from the details
            if (details?.geometry?.location) {
              const { lat, lng } = details.geometry.location;
              setSelectedCoords({ lat, lng });
              console.log("📍 Address Selected:", lat, lng);
            }
          }}

          query={{
            key: process.env.EXPO_PUBLIC_GOOGLE_API_KEY, 
            language: 'he', 
            components: 'country:il', 
          }}
          enablePoweredByContainer={false}
          
          textInputProps={{
            onChangeText: (text) => setAddress(text),
            value: address,
          }}
          
          styles={{
            container: { flex: 0, width: '100%' },
            textInput: {
              height: 50,
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 10,
              paddingHorizontal: 15,
              backgroundColor: '#fff',
              fontSize: 16,
              textAlign: 'right', 
              marginBottom: 5,
            },
            listView: {
              position: 'absolute', 
              top: 55, 
              zIndex: 1000,   
              elevation: 1000, 
              backgroundColor: 'white',
              borderRadius: 5,
              borderWidth: 1,
              borderColor: '#ddd',
            },
            row: {
              backgroundColor: '#FFFFFF',
              padding: 13,
              height: 44,
              flexDirection: 'row-reverse', 
            },
            description: {
              fontWeight: 'bold',
              textAlign: 'right', 
            },
          }}
        />
      </View>
      
      <Text style={styles.locationStatus}>{locationStatus}</Text>

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#FAF8EF" },
  label: { fontSize: 18, marginBottom: 8, marginTop: 10, color: "#6f411d", fontWeight: "600", textAlign: "right" },
  inputSingle: { height: 50, backgroundColor: "white", borderRadius: 12, paddingHorizontal: 15, textAlign: "right", borderWidth: 1, borderColor: "#ddd", fontSize: 16 },
  autocompleteWrapper: { marginBottom: 15, zIndex: 100, elevation: 10 },
  paymentContainer: { position: "relative", height: 150, zIndex: 1, elevation: 1 },
  inputPayment: { height: 150, backgroundColor: "white", borderRadius: 16, paddingHorizontal: 20, paddingLeft: 60, paddingVertical: 20, textAlign: "right", borderWidth: 2, borderColor: "#588157", fontSize: 56, fontWeight: "700" },
  currencySymbol: { position: "absolute", left: 20, top: 0, bottom: 0, fontSize: 40, fontWeight: "700", color: "#588157", textAlignVertical: "center", zIndex: 1, lineHeight: 150 },
  inputMulti: { height: 120, backgroundColor: "white", borderRadius: 12, padding: 15, textAlignVertical: "top", textAlign: "right", borderWidth: 1, borderColor: "#ddd", marginBottom: 30, fontSize: 16 },
  locationStatus: { textAlign: 'right', color: '#588157', fontSize: 12, marginTop: 4, marginBottom: 5, fontWeight: 'bold' },
  photoButton: { backgroundColor: "white", paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: "#588157", borderStyle: "dashed", alignItems: "center", marginBottom: 15 },
  photoButtonText: { color: "#588157", fontSize: 16, fontWeight: "600" },
  imagePreviewContainer: { marginBottom: 15, alignItems: "center" },
  imagePreview: { width: "100%", height: 200, borderRadius: 12, marginBottom: 10, backgroundColor: "#f0f0f0" },
  removeImageButton: { paddingVertical: 8, paddingHorizontal: 16 },
  removeImageText: { color: "#d32f2f", fontSize: 14, fontWeight: "600", textAlign: "right" },
  publishButton: { backgroundColor: "#588157", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginBottom: 15, marginTop: 10 },
  publishText: { color: "white", fontSize: 18, fontWeight: "600" },
  cancelButton: { backgroundColor: "white", paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: "#588157", alignItems: "center" },
  cancelText: { color: "#588157", fontSize: 18, fontWeight: "600" },
});