import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../app/services/firebase';

interface TaskerProfileModalProps {
  visible: boolean;
  taskerId: string | null;
  // 👇 NEW: Accept data we already know (so it's never empty)
  initialData?: { name: string; image?: string | null }; 
  onClose: () => void;
}

export default function TaskerProfileModal({ visible, taskerId, initialData, onClose }: TaskerProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState({ count: 0, rating: "0.0" });

  useEffect(() => {
    if (!visible || !taskerId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        console.log("Fetching profile for:", taskerId);
        
        // 1. Fetch User Profile from 'users' collection
        const userSnap = await getDoc(doc(db, "users", taskerId));
        
        if (userSnap.exists()) {
            setUserData(userSnap.data());
        } else {
            console.log("User doc not found in 'users' collection. Using initialData.");
            // Fallback to the data passed from the list if DB doc is missing
            setUserData({
                displayName: initialData?.name,
                photoURL: initialData?.image
            });
        }

        // 2. Fetch Reviews
        const qReviews = query(collection(db, "reviews"), where("reviewedUserId", "==", taskerId));
        const reviewsSnap = await getDocs(qReviews);
        const reviewsData = reviewsSnap.docs.map(d => d.data());
        setReviews(reviewsData);

        // 3. Fetch Completed Tasks Count
        const qTasks = query(collection(db, "requests"), where("workerId", "==", taskerId), where("status", "==", "completed"));
        const tasksSnap = await getDocs(qTasks);
        
        // Calculate Rating
        const avg = reviewsData.length > 0 
            ? (reviewsData.reduce((acc, r:any) => acc + (r.rating || 0), 0) / reviewsData.length).toFixed(1)
            : "0.0";

        setStats({ count: tasksSnap.size, rating: avg });

      } catch (error) {
        console.error("Error fetching tasker profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [visible, taskerId]);

  if (!visible) return null;

  // Use DB data first, fallback to Initial Data, finally "Anonymous"
  const displayName = userData?.displayName || initialData?.name || "משתמש אנונימי";
  const photoURL = userData?.photoURL || initialData?.image;

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          {loading ? (
             <ActivityIndicator size="large" color="#588157" style={{marginTop: 50}} />
          ) : (
            <>
              {/* HEADER: Avatar & Name */}
              <View style={styles.header}>
                {photoURL ? (
                    <Image source={{ uri: photoURL }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={{fontSize: 30, color: '#588157'}}>
                            {displayName.charAt(0)}
                        </Text>
                    </View>
                )}
                
                <Text style={styles.name}>{displayName}</Text>
                <Text style={styles.subtext}>חבר בקהילה</Text>
              </View>

              {/* STATS ROW */}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                    <Text style={styles.statValue}>{stats.count}</Text>
                    <Text style={styles.statLabel}>עבודות</Text>
                </View>
                <View style={[styles.statBox, {borderLeftWidth:1, borderLeftColor:'#eee'}]}>
                    <Text style={styles.statValue}>⭐ {stats.rating}</Text>
                    <Text style={styles.statLabel}>דירוג</Text>
                </View>
              </View>

              {/* REVIEWS LIST */}
              <Text style={styles.sectionTitle}>ביקורות אחרונות:</Text>
              <ScrollView style={styles.reviewsList}>
                {reviews.length === 0 ? (
                    <Text style={styles.emptyText}>עדיין אין ביקורות למשתמש זה.</Text>
                ) : (
                    reviews.map((r, i) => (
                        <View key={i} style={styles.reviewCard}>
                            <View style={{flexDirection:'row-reverse', justifyContent:'space-between'}}>
                                <Text style={{fontWeight:'bold'}}>{r.rating} ⭐</Text>
                                <Text style={styles.reviewDate}>
                                    {r.createdAt?.toDate ? new Date(r.createdAt.toDate()).toLocaleDateString() : ''}
                                </Text>
                            </View>
                            <Text style={styles.reviewText}>"{r.comment}"</Text>
                            <Text style={styles.reviewAuthor}>- {r.reviewerName || "אנונימי"}</Text>
                        </View>
                    ))
                )}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { width: '85%', height: '60%', backgroundColor: 'white', borderRadius: 20, padding: 20, elevation: 10 },
  closeButton: { position: 'absolute', top: 15, right: 20, zIndex: 10 },
  closeText: { fontSize: 24, color: '#999' },
  
  header: { alignItems: 'center', marginTop: 10 },
  avatar: { width: 90, height: 90, borderRadius: 45, marginBottom: 10, borderWidth: 3, borderColor: '#588157' },
  avatarPlaceholder: { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  
  name: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  subtext: { color: '#888', fontSize: 14 },

  statsRow: { flexDirection: 'row-reverse', justifyContent: 'space-evenly', marginVertical: 20, backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12 },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#588157' },
  statLabel: { fontSize: 14, color: '#666' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'right' },
  reviewsList: { flex: 1 },
  reviewCard: { backgroundColor: '#f0f0f0', padding: 12, borderRadius: 8, marginBottom: 8 },
  reviewText: { fontSize: 14, fontStyle: 'italic', color: '#555', textAlign: 'right', marginTop: 4 },
  reviewAuthor: { fontSize: 12, color: '#999', textAlign: 'left', marginTop: 4 },
  reviewDate: { fontSize: 10, color: '#999' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 20 }
});