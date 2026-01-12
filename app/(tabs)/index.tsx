import { router } from "expo-router";
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Image, Modal, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import ReviewModal from '../../components/ReviewModal';
import { auth, db } from "../services/firebase";
import { getReviewsForUser, getReviewsWrittenByUser } from '../services/reviews';

export default function FrontPage() {
  const [taskerMode, setTaskerMode] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [hiddenRequests, setHiddenRequests] = useState<Set<string>>(new Set());
  const [selectedTasker, setSelectedTasker] = useState<any>(null);
  const [showTaskerModal, setShowTaskerModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTask, setReviewTask] = useState<any>(null);
  const [taskerReviews, setTaskerReviews] = useState<any[]>([]);
  const [reviewedTaskIds, setReviewedTaskIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchMyReviews = async () => {
        const user = auth.currentUser;
        if (user) {
            const res = await getReviewsWrittenByUser(user.uid);
            if (res.success) {
                // Filter out reviews that don't have a taskId (if any)
                const ids = new Set(res.reviews.filter(r => r.taskId).map(r => r.taskId!));
                setReviewedTaskIds(ids);
            }
        }
    };
    fetchMyReviews();
  }, [showReviewModal]); // Refresh whenever a review modal closes/opens

  useEffect(() => {
    if (selectedTasker && selectedTasker.taskerId) {
      getReviewsForUser(selectedTasker.taskerId).then((res) => {
        if (res.success) {
          setTaskerReviews(res.reviews);
        }
      });
    } else {
      setTaskerReviews([]);
    }
  }, [selectedTasker]);

  const openReviewModal = (task: any) => {
    setReviewTask(task);
    setShowReviewModal(true);
  };

  const openTaskerDetails = (tasker: any, requestId: string) => {
    setSelectedTasker(tasker);
    setSelectedRequestId(requestId);
    setShowTaskerModal(true);
  };

  const closeTaskerModal = () => {
    setShowTaskerModal(false);
    setSelectedTasker(null);
    setSelectedRequestId(null);
  };

  const acceptSelectedTasker = async () => {
    try {
      if (!selectedRequestId || !selectedTasker) return;
      const requestRef = doc(db, "requests", selectedRequestId);
      await updateDoc(requestRef, {
        worker: selectedTasker.taskerName || selectedTasker.name || "",
        workerId: selectedTasker.taskerId || selectedTasker.uid || null,
        status: "closed"
      });
      closeTaskerModal();
    } catch (err) {
      console.warn("Failed to accept tasker:", err);
    }
  };

  const toggleRequestVisibility = (requestId: string) => {
    setHiddenRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    // אם במצב Tasker - שלוף רק בקשות פתוחות, אחרת שלוף הכל
    const q = taskerMode 
      ? query(collection(db, "requests"), where("worker", "==", null), orderBy("createdAt", "desc"))
      : query(collection(db, "requests"), orderBy("createdAt", "desc"));
    
    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setRequests(items);
    }, (err) => {
      console.warn("Failed to listen to requests:", err);
    });
    return () => unsub();
  }, [taskerMode]);

  const openRequests = requests.filter((r) => !r.worker);
  const closedRequests = requests.filter((r) => !!r.worker);
  const [selectedTab, setSelectedTab] = useState<'open' | 'closed'>('open');

  // פונקציה לקבלת ברכה לפי השעה
  const getGreeting = () => {
    const hour = new Date().getHours();
    const userName = auth.currentUser?.displayName || "משתמש";
    
    if (hour >= 4 && hour < 12) {
      return `בוקר טוב, ${userName}`;
    } else if (hour >= 12 && hour < 18) {
      return `צהריים טובים, ${userName}`;
    } else if (hour >= 18 && hour < 22) {
      return `ערב טוב, ${userName}`;
    } else {
      return `לילה טוב, ${userName}`;
    }
  };

  return (
    <View style={styles.container}>

      {/* תוכן למצב Tasker */}
      {taskerMode ? (
        <>
          <Text style={styles.taskerHeader}>ברוך הבא למצב נותן יד</Text>
          <Text style={styles.taskerSubtitle}>בחר משימה והתחל להרוויח</Text>

          <ScrollView style={styles.taskerRequestsList}>
            {requests.length > 0 ? (
              requests.map((r) => (
                <View key={r.id} style={styles.taskerRequestCard}>
                  <Text style={styles.taskerRequestTitle}>{r.title}</Text>
                  {/* {r.description && (
                    <Text style={styles.taskerRequestDescription} numberOfLines={2}>
                      {r.description}
                    </Text>
                  )} */}
                  <TouchableOpacity 
                    style={styles.taskerTakeButton}
                    onPress={() => router.push({
                      pathname: '/task-details',
                      params: {
                        id: r.id,
                        title: r.title,
                        description: r.description || '',
                        location: r.location || '',
                        createdBy: r.createdBy || ''
                      }
                    })}
                  >
                    <Text style={styles.taskerTakeButtonText}>הצג משימה</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.taskerEmptyText}>אין משימות זמינות כרגע</Text>
            )}
          </ScrollView>
        </>
      ) : (
        <>
          {/* תוכן למצב Seeker */}
          <Text style={styles.greeting}>{getGreeting()}</Text>

          {/* כפתור צור בקשה */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={styles.buttonPrimary}
              onPress={() => router.push("/new-request")}
            >
              <Text style={styles.plusIcon}>+</Text>
              <Text style={styles.buttonPrimaryText}>צור משימה חדשה</Text>
            </TouchableOpacity>
          </View>

          {/* מתג/סגמנט לעבור בין פתוחות/סגורות */}
          <View style={styles.segmentedContainer}>
            <View style={styles.segment}>
              <TouchableOpacity
                style={[styles.segmentButton, selectedTab === 'open' && styles.segmentButtonActive]}
                onPress={() => setSelectedTab('open')}
              >
                <Text style={[styles.segmentText, selectedTab === 'open' && styles.segmentTextActive]}>פתוחות</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.segmentButton, selectedTab === 'closed' && styles.segmentButtonActive]}
                onPress={() => setSelectedTab('closed')}
              >
                <Text style={[styles.segmentText, selectedTab === 'closed' && styles.segmentTextActive]}>סגורות</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* רשימות בקשות - פתוחות וסגורות */}
          <ScrollView style={styles.listsContainer}>
            {selectedTab === 'open' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>משימות פתוחות</Text>
                {openRequests.length > 0 ? (
                  openRequests.map((r) => (
                    <View key={r.id} style={styles.requestItem}>
                      <View style={styles.requestHeader}>
                        <TouchableOpacity 
                          style={styles.closeButton}
                          onPress={() => toggleRequestVisibility(r.id)}
                        >
                          <Text style={styles.closeButtonText}>
                            {hiddenRequests.has(r.id) ? 'הצג בקשות' : 'הסתר בקשות'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.editButton}>
                          <Text style={styles.editButtonText}>ערוך</Text>
                        </TouchableOpacity>
                        <Text style={styles.requestTitle}>{r.title}</Text>
                      </View>
                      {!hiddenRequests.has(r.id) && r.interestedTaskers && r.interestedTaskers.length > 0 && (
                        <View style={styles.interestedTaskersContainer}>
                          <Text style={styles.interestedTaskersTitle}>מעוניינים:</Text>
                          {r.interestedTaskers.map((tasker: any, index: number) => (
                            <View key={index} style={styles.interestedTaskerRow}>
                              <TouchableOpacity 
                                style={styles.showTaskerButton}
                                onPress={() => openTaskerDetails(tasker, r.id)}
                              >
                                <Text style={styles.showTaskerButtonText}>הצג</Text>
                              </TouchableOpacity>
                              <Text style={styles.interestedTaskerName}>
                                {tasker.taskerName}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>אין בקשות פתוחות</Text>
                )}
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>משימות סגורות</Text>
                {closedRequests.length > 0 ? (
                  closedRequests.map((r) => (
                    <View key={r.id} style={[styles.requestItem, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                      <View>
                        {r.workerId ? (
                            reviewedTaskIds.has(r.id) ? (
                                <Text style={{color: '#588157', fontSize: 14, fontWeight: '600'}}>
                                    ✓ ביקורת נשלחה
                                </Text>
                            ) : (
                                <TouchableOpacity 
                                  style={styles.reviewButton} 
                                  onPress={() => openReviewModal(r)}
                                >
                                  <Text style={styles.reviewButtonText}>דרג</Text>
                                </TouchableOpacity>
                            )
                        ) : null}
                      </View>
                      <View style={{flex: 1, alignItems: 'flex-end', marginLeft: 12}}>
                        <Text style={styles.requestTitle}>{r.title}</Text>
                        <Text style={{fontSize: 12, color: "#666", marginTop: 4}}>עובד: {r.worker}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>אין משימות סגורות</Text>
                )}
              </View>
            )}
          </ScrollView>
        </>
      )}

      {/* מתג למצב נותן יד / מקבל יד */}
      <View style={styles.helperSwitchContainer}>
        <Switch
          value={taskerMode}
          onValueChange={(value) => setTaskerMode(value)}
          thumbColor={taskerMode ? "#588157" : "#ccc"}
          trackColor={{ false: "#ddd", true: "#a3c9a8" }}
        />
        <Text style={styles.helperSwitchText}>
          {taskerMode ? "עבור למצב מקבל יד" : "עבור למצב נותן יד"}
        </Text>
      </View>

      {/* Modal להצגת פרטי Tasker */}
      <Modal
        visible={showTaskerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeTaskerModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeTaskerModal} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>פרטי מועמד</Text>
            </View>

            {selectedTasker && (
              <View style={styles.modalBody}>
                {/* תמונת פרופיל */}
                <View style={styles.profileImageContainer}>
                  <Image
                    source={selectedTasker.profileImage ? { uri: selectedTasker.profileImage } : require('../../assets/images/react-logo.png')}
                    style={styles.profileImage}
                  />
                </View>
                <View style={styles.modalSection}>
                  <Text style={styles.modalNameText}>{selectedTasker.taskerName}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalRatingText}>
                    {selectedTasker.rating ? `⭐ ${selectedTasker.rating}/5` : 'טרם דורג'}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>זמן בקשה</Text>
                  <Text style={styles.modalInfoText}>
                    {selectedTasker.timestamp ? new Date(selectedTasker.timestamp).toLocaleString('he-IL', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'לא זמין'}
                  </Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>טלפון</Text>
                  <Text style={styles.modalInfoText}>
                    {selectedTasker.phone || 'לא קיים טלפון'}
                  </Text>
                </View>


                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>חוות דעת ({taskerReviews.length})</Text>
                  {taskerReviews.length > 0 ? (
                    taskerReviews.map((review, index) => (
                      <View key={index} style={{marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5}}>
                         <Text style={{fontWeight: 'bold', textAlign: 'right'}}>{review.rating} ⭐</Text>
                         {review.comment ? <Text style={{textAlign: 'right'}}>{review.comment}</Text> : null}
                         {review.createdAt ? <Text style={{textAlign: 'right', fontSize: 10, color: '#888'}}>
                            {new Date(review.createdAt.toDate ? review.createdAt.toDate() : review.createdAt).toLocaleDateString('he-IL')}
                         </Text> : null}
                      </View>
                    ))
                  ) : (
                    <Text style={styles.modalInfoText}>
                      {selectedTasker.review || 'טרם ניתנה חוות דעת'}
                    </Text>
                  )}
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.modalAcceptButton} onPress={acceptSelectedTasker}>
              <Text style={styles.modalAcceptButtonText}>קבל מועמד</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCloseAction} onPress={closeTaskerModal}>
              <Text style={styles.modalCloseActionText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {reviewTask && (
        <ReviewModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          reviewedUserId={reviewTask.workerId}
          reviewedUserName={reviewTask.worker}
          taskTitle={reviewTask.title}
          taskId={reviewTask.id}
        />
      )}

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
    top: 60, 
    left: 60,
    textAlign: "center",
    fontWeight: "600",
    color: "#6f411d",
  },

  buttonsContainer: {
    marginTop: 100,
    alignItems: "center",
  },

  buttonPrimary: {
    backgroundColor: "#588157",
    width: 150,
    height: 150,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  plusIcon: {
    color: "white",
    fontSize: 48,
    fontWeight: "600",
    marginBottom: 8,
  },

  buttonPrimaryText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  segmentedContainer: {
    marginTop: 18,
    alignItems: 'center',
    width: '100%'
  },

  segment: {
    flexDirection: 'row',
    backgroundColor: '#eee',
    borderRadius: 999,
    padding: 4,
    width: 260,
    justifyContent: 'space-between'
  },

  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center'
  },

  segmentButtonActive: {
    backgroundColor: '#588157'
  },

  segmentText: {
    color: '#6f411d',
    fontWeight: '600'
  },

  segmentTextActive: {
    color: '#fff'
  },

  listsContainer: {
    marginTop: 24,
    width: "100%",
  },

  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6f411d",
    marginBottom: 8,
    textAlign: "right",
  },

  requestItem: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },

  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  editButton: {
    backgroundColor: "#e74c3c",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  closeButton: {
    backgroundColor: "#6f411d",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },

  closeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  requestTitle: {
    fontSize: 16,
    color: "#333",
    textAlign: "right",
    flex: 1,
    marginRight: 10,
  },

  requestMeta: {
    marginTop: 6,
    fontSize: 12,
    color: "#666",
    textAlign: "right",
  },

  emptyText: {
    color: "#c0392b",
    fontWeight: "600",
    textAlign: "right",
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

  // סטיילים למצב Tasker
  taskerHeader: {
    fontSize: 26,
    fontWeight: "700",
    color: "#6f411d",
    textAlign: "center",
    marginBottom: 8,
    marginTop: 110,
  },

  taskerSubtitle: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginBottom: 24,
  },

  taskerRequestsList: {
    flex: 1,
    marginTop: 20,
  },

  taskerRequestCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  taskerRequestTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "right",
    marginBottom: 8,
  },

  taskerRequestDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "right",
    marginBottom: 12,
  },

  taskerTakeButton: {
    backgroundColor: "#588157",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },

  taskerTakeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  taskerEmptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginTop: 40,
  },

  interestedTaskersContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },

  interestedTaskersTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#588157",
    textAlign: "right",
    marginBottom: 6,
  },

  interestedTaskerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  interestedTaskerName: {
    fontSize: 14,
    color: "#333",
    textAlign: "right",
    flex: 1,
  },

  showTaskerButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 10,
  },

  showTaskerButtonText: {
    color: "#588157",
    fontSize: 14,
    fontWeight: "600",
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '85%',
    maxWidth: 400,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  modalCloseButton: {
    position: 'absolute',
    right: 0,
    top: 0,
  },

  modalCloseText: {
    fontSize: 24,
    color: '#333',
    fontWeight: '600',
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6f411d',
  },

  modalBody: {
    marginBottom: 20,
  },

  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },

  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#588157',
  },

  modalSection: {
    marginBottom: 16,
  },

  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 6,
    textAlign: 'right',
  },

  modalValue: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },

  modalNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },

  modalRatingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },

  modalInfoText: {
    fontSize: 15,
    color: '#333',
    textAlign: 'right',
    backgroundColor: 'transparent',
  },

  modalAcceptButton: {
    backgroundColor: '#588157',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 14,
  },

  modalAcceptButtonText: {
    color: '#f6f6f6ff',
    fontSize: 16,
    fontWeight: '600',
  },

  modalCloseAction: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    alignItems: 'center',
    // Extra space from the accept button
    marginTop: 2,
  },
  modalCloseActionText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },

  reviewButton: {
    backgroundColor: '#6f411d',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },

  reviewButtonText: {
    color: '#ffffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
