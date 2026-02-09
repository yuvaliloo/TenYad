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
  Platform,
  LogBox
} from "react-native";
import { auth, db } from './services/firebase';
import { uploadImage } from './services/storage';

LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

export default function NewRequestScreen() {
  const [deviceLocation, setDeviceLocation] = useState<Location.LocationObject | null>(null);
  
  // 📍 SELECTED LOCATION (This is the only one that matters now)
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(null);

  const [address, setAddress] = useState(""); 
  const [title, setTitle] = useState("");     
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null); 
  const [paymentAmount, setPaymentAmount] = useState(""); 
  const [loading, setLoading] = useState(false);

  // 1. Get Device Location (Background only - for better autocomplete results)
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          let loc = await Location.getCurrentPositionAsync({});
          setDeviceLocation(loc);
        } catch (err) {
          // Ignore errors, we don't show this to the user anymore
        }
      }
    })();
  }, []);

  const handlePaymentChange = (text: string) => {
    const numericValue = text.replace(/[^0-9.]/g, '');
    setPaymentAmount(numericValue);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("אין הרשאה", "אנא אפשר גישה למצלמה");
      return;
    }
    Alert.alert("בחר תמונה", "מאיפה תרצה לבחור תמונה?", [
      {
        text: "מצלמה",
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
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
    
    // 🛑 STRICT VALIDATION: Must have coords from dropdown
    if (!selectedCoords) {
      Alert.alert("שגיאה בכתובת", "יש לבחור כתובת מתוך הרשימה (לא רק להקליד)");
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("שגיאה", "עליך להתחבר");
      return;
    }

    setLoading(true);

    try {
      const newRequestRef = doc(collection(db, "requests"));
      
      let imageUrl = null;
      if (photo) {
          imageUrl = await uploadImage(photo, "task_pics", newRequestRef.id);
      }

      console.log("🚀 Saving Address Coords:", selectedCoords);
      const finalGeoPoint = new GeoPoint(selectedCoords.lat, selectedCoords.lng);

      await setDoc(newRequestRef, {
        title: title,            
        description: description,
        seekerId: user.uid,
        seekerName: user.displayName || "Anonymous",
        status: "open",
        worker: "OPEN", 
        createdAt: serverTimestamp(),
        location: finalGeoPoint, // 👈 Correct Location
        address: address,         
        paymentAmount: paymentAmount ? parseFloat(paymentAmount) : null,
        image: imageUrl 
      });

      Alert.alert("הצלחה", "הבקשה פורסמה!");
      router.back();

    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to save request");
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

      <Text style={styles.label}>מיקום המשימה</Text>
      <View style={styles.autocompleteWrapper}>
        <GooglePlacesAutocomplete
          placeholder='הכנס כתובת מלאה...'
          fetchDetails={true} 
          query={{
            key: process.env.EXPO_PUBLIC_GOOGLE_API_KEY, 
            language: 'he', 
            components: 'country:il',
            // Uses device location to bias results (find closer places first)
            location: deviceLocation ? `${deviceLocation.coords.latitude},${deviceLocation.coords.longitude}` : undefined,
            radius: 10000, 
            fields: 'geometry,formatted_address,name'
          }}
          onPress={(data: GooglePlaceData, details: GooglePlaceDetail | null = null) => {
            setAddress(data.description || details?.formatted_address || "");
            if (details?.geometry?.location) {
              const { lat, lng } = details.geometry.location;
              setSelectedCoords({ lat, lng });
            }
          }}
          enablePoweredByContainer={false}
          textInputProps={{
            onChangeText: (text) => {
              setAddress(text);
              setSelectedCoords(null); // Reset coords if they type manually
            },
            value: address,
          }}
          styles={{
            container: { flex: 0, width: '100%' },
            textInput: {
              height: 50,
              borderWidth: 1,
              borderColor: selectedCoords ? '#588157' : '#ddd', // Green border when valid
              borderRadius: 10,
              paddingHorizontal: 15,
              backgroundColor: '#fff',
              fontSize: 16,
              textAlign: 'right', 
              marginBottom: 5,
            },
            listView: {
              zIndex: 9999,
              position: 'absolute',
              top: 55,
              width: '100%',
              backgroundColor: 'white',
              borderWidth: 1,
              borderColor: '#ccc',
              borderRadius: 5,
              elevation: 5,
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
      
      {/* 🟢 THE STATUS TEXT (Matches your styling request) */}
      <View style={{height: 25, justifyContent: 'center'}}>
        {selectedCoords ? (
            <Text style={styles.locationStatus}>
                📍 מיקום המשימה אותר
            </Text>
        ) : (
            <Text style={styles.missingLocation}>
                * חובה לבחור כתובת מהרשימה
            </Text>
        )}
      </View>

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
        placeholder="...פרט כאן"
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
  autocompleteWrapper: { marginBottom: 5, zIndex: 100, elevation: 10 },
  
  // 🟢 Green Success Style
  locationStatus: { 
    textAlign: 'right', 
    color: '#588157', // Dark Green
    fontSize: 14, 
    fontWeight: 'bold',
  },
  
  // 🔴 Missing Warning Style
  missingLocation: {
    textAlign: 'right',
    color: '#999',
    fontSize: 12,
    fontStyle: 'italic'
  },

  paymentContainer: { position: "relative", height: 150, zIndex: 1, elevation: 1 },
  inputPayment: { height: 150, backgroundColor: "white", borderRadius: 16, paddingHorizontal: 20, paddingLeft: 60, paddingVertical: 20, textAlign: "right", borderWidth: 2, borderColor: "#588157", fontSize: 56, fontWeight: "700" },
  currencySymbol: { position: "absolute", left: 20, top: 0, bottom: 0, fontSize: 40, fontWeight: "700", color: "#588157", textAlignVertical: "center", zIndex: 1, lineHeight: 150 },
  inputMulti: { height: 120, backgroundColor: "white", borderRadius: 12, padding: 15, textAlignVertical: "top", textAlign: "right", borderWidth: 1, borderColor: "#ddd", marginBottom: 30, fontSize: 16 },
  
  photoButton: { backgroundColor: "white", paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: "#588157", borderStyle: "dashed", alignItems: "center", marginBottom: 15 },
  photoButtonText: { color: "#588157", fontSize: 16, fontWeight: "600" },
  imagePreviewContainer: { marginBottom: 15, alignItems: "center" },
  imagePreview: { width: "100%", height: 200, borderRadius: 12, marginBottom: 10, backgroundColor: "#f0f0f0" },
  removeImageButton: { paddingVertical: 8, paddingHorizontal: 16 },
  removeImageText: { color: "#d32f2f", fontSize: 14, fontWeight: "600", textAlign: "right" },
  publishButton: { backgroundColor: "#588157", paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 15, marginTop: 10 },
  publishText: { color: "white", fontSize: 18, fontWeight: "600" },
  cancelButton: { backgroundColor: "white", paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: "#588157", alignItems: "center" },
  cancelText: { color: "#588157", fontSize: 18, fontWeight: "600" },
});