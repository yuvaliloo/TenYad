
// import { router } from 'expo-router';
// import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
// import { useEffect, useState } from 'react';
// import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
// import { db } from './services/firebase';

// export default function TaskerHomeScreen() {
//   const [requests, setRequests] = useState<any[]>([]);
//   const [isHelperMode, setIsHelperMode] = useState(true);

//   useEffect(() => {
//     // שליפת רק בקשות פתוחות (ללא עובד)
//     const q = query(
//       collection(db, "requests"), 
//       where("worker", "==", null),
//       orderBy("createdAt", "desc")
//     );
    
//     const unsub = onSnapshot(q, (snap) => {
//       const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
//       setRequests(items);
//     }, (err) => {
//       console.warn("Failed to listen to requests:", err);
//     });
    
//     return () => unsub();
//   }, []);

//   return (
//     <View style={styles.container}>
//       <Text style={styles.header}>ברוך הבאלמצב נותן יד </Text>
//       <Text style={styles.subtitle}>בחר משימה והתחל להרוויח</Text>

//       <ScrollView style={styles.requestsList}>
//         {requests.length > 0 ? (
//           requests.map((r) => (
//             <View key={r.id} style={styles.requestCard}>
//               <Text style={styles.requestTitle}>{r.title}</Text>
//               {/* {r.description && (
//                 <Text style={styles.requestDescription} numberOfLines={2}>
//                   {r.description}
//                 </Text>
//               )} */}
//               <TouchableOpacity style={styles.takeButton}>
//                 <Text style={styles.takeButtonText}>הצג משימה</Text>
//               </TouchableOpacity>
//             </View>
//           ))
//         ) : (
//           <Text style={styles.emptyText}>אין משימות זמינות כרגע</Text>
//         )}
//       </ScrollView>

//       {/* מתג למצב מקבל יד */}
//       <View style={styles.helperSwitchContainer}>
//         <Switch
//           value={isHelperMode}
//           onValueChange={(value) => {
//             setIsHelperMode(value);
//             if (!value) {
//               router.back();
//             }
//           }}
//           thumbColor={isHelperMode ? "#588157" : "#ccc"}
//           trackColor={{ false: "#ddd", true: "#a3c9a8" }}
//         />
//         <Text style={styles.helperSwitchText}>עבור למצב מקבל יד</Text>
//       </View>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#FAF8EF",
//     paddingTop: 90,
//     paddingHorizontal: 20,
//   },

//   header: {
//     fontSize: 26,
//     fontWeight: "700",
//     color: "#6f411d",
//     textAlign: "center",
//     marginBottom: 8,
//     top: 50,
//   },

//   subtitle: {
//     fontSize: 16,
//     color: "#888",
//     textAlign: "center",
//     marginBottom: 24,
//     top: 60,
//   },

//   requestsList: {
//     flex: 1,
//     top: 70,
//   },

//   requestCard: {
//     backgroundColor: "#fff",
//     padding: 16,
//     borderRadius: 12,
//     marginBottom: 12,
//     borderWidth: 1,
//     borderColor: "#ddd",
//     shadowColor: "#000",
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     elevation: 2,
//   },

//   requestTitle: {
//     fontSize: 18,
//     fontWeight: "600",
//     color: "#333",
//     textAlign: "right",
//     marginBottom: 8,
//     //top: 50,
//   },

//   requestDescription: {
//     fontSize: 14,
//     color: "#666",
//     textAlign: "right",
//     marginBottom: 12,
//   },

//   takeButton: {
//     backgroundColor: "#588157",
//     paddingVertical: 10,
//     borderRadius: 8,
//     alignItems: "center",
//   },

//   takeButtonText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "600",
//   },

//   emptyText: {
//     fontSize: 16,
//     color: "#999",
//     textAlign: "center",
//     marginTop: 40,
//   },

//   helperSwitchContainer: {
//     position: "absolute",
//     top: 80,
//     left: 20,
//     alignItems: "center",
//   },

//   helperSwitchText: {
//     marginTop: 6,
//     fontSize: 14,
//     color: "#6f411d",
//     fontWeight: "500",
//   },
// });
