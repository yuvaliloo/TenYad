import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth } from "./services/firebase";
import { RequestObject, deleteRequestFromFirestore, fetchAllRequests } from "./services/requests";
import OpenSeekerRequest from "@/components/OpenSeekerRequest";
import ClosedSeekerRequest from "@/components/ClosedSeekerRequest";


export function SeekerMainPage() {
  const [selectedTab, setSelectedTab] = useState<'open' | 'closed'>('open');
  const [myRequests, setMyRequests] = useState<RequestObject[]>([]);
  const [selectedTasker, setSelectedTasker] = useState<any>(null);
  const [showTaskerModal, setShowTaskerModal] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [taskerReviews, setTaskerReviews] = useState<any[]>([]);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTask, setReviewTask] = useState<any>(null);

  const currentUser = auth.currentUser;
  if (!currentUser) {
    router.replace("/login");
    return <></>;
  }

  const userName = currentUser?.displayName;
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return `בוקר טוב, ${userName}`;
    if (hour >= 12 && hour < 18) return `צהריים טובים, ${userName}`;
    if (hour >= 18 && hour < 22) return `ערב טוב, ${userName}`;
    return `לילה טוב, ${userName}`;
  };



  const handleDeleteRequest = async (requestId: string) => {
    Alert.alert(
      "מחיקת משימה",
      "האם אתה בטוח שברצונך למחוק את המשימה?",
      [
        { text: "ביטול", style: "cancel" },
        {
          text: "מחק",
          style: "destructive",
          onPress: async () => {
            let res = await deleteRequestFromFirestore(requestId);
            if (res) {
              setMyRequests(myRequests.filter(r => r.requestId !== requestId));
              Alert.alert("המשימה נמחקה בהצלחה");
            }
            else {
              Alert.alert("אירעה שגיאה במחיקת המשימה. נסה שוב מאוחר יותר.");
            }
          }
        }
      ]
    );
  };

  const openReviewModal = (request: RequestObject) => {
    setReviewTask(request);
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
      // Update request with selected tasker
      setShowTaskerModal(false);
    } catch (err) {
      console.warn("Failed to accept tasker:", err);
    }
  };

  useEffect(() => {
    fetchAllRequests()
      .then((fetchedRequests: RequestObject[]) => {
        console.log("Fetched Requests:", fetchedRequests);
        const filteredRequests = fetchedRequests.filter(r => r.seekerId === currentUser?.uid);
        setMyRequests(filteredRequests);
      })
      .catch((err) => {
        console.error("Error fetching requests:", err);
      });
  }, [currentUser?.uid]);


  const myOpenRequests = myRequests.filter((r) => r.status === "open");
  const myClosedRequests = myRequests.filter((r) => r.status === "close");
  return (
    <>
      <Text style={styles.greeting}>{getGreeting()}</Text>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => router.push("/new-request")}
        >
          <Text style={styles.plusIcon}>+</Text>
          <Text style={styles.buttonPrimaryText}>צור משימה חדשה</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs (Open / Closed) */}
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

      {/* Lists Container */}
      <ScrollView style={styles.listsContainer}>
        {selectedTab === 'open' ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>משימות פתוחות</Text>
            {myOpenRequests.length > 0 ? (
              myOpenRequests.map((r) => (
                <OpenSeekerRequest key={r.requestId} request={r} />
              ))
            ) : (
              <Text style={styles.emptyText}>אין בקשות פתוחות</Text>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>משימות סגורות</Text>
            {myClosedRequests.length > 0 ? (
              myClosedRequests.map((r) => (
                <ClosedSeekerRequest key={r.requestId} request={r} />
              ))
            ) : (
              <Text style={styles.emptyText}>אין משימות סגורות</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Tasker Details Modal (With Accept Logic) */}
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
                <View style={styles.profileImageContainer}>
                  <Image
                    source={selectedTasker.profileImage ? { uri: selectedTasker.profileImage } : require('../assets/images/react-logo.png')}
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
                  <Text style={styles.modalLabel}>טלפון</Text>
                  <Text style={styles.modalInfoText}>
                    {selectedTasker.phone || 'לא קיים טלפון'}
                  </Text>
                </View>

                {/* Reviews List */}
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>חוות דעת ({taskerReviews.length})</Text>
                  {taskerReviews.length > 0 ? (
                    taskerReviews.map((review, index) => (
                      <View key={index} style={{ marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 }}>
                        <Text style={{ fontWeight: 'bold', textAlign: 'right' }}>{review.rating} ⭐</Text>
                        {review.comment ? <Text style={{ textAlign: 'right' }}>{review.comment}</Text> : null}
                        {review.createdAt ? <Text style={{ textAlign: 'right', fontSize: 10, color: '#888' }}>
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
    </>
  )
}

const styles = StyleSheet.create({
  greeting: {
    marginTop: 70,
    fontSize: 24,
    textAlign: "right",
    marginRight: 12,
    fontWeight: "600",
    color: "#6f411d",
  },
 

  buttonsContainer: {
    marginTop: 30, // Adjusted spacing
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
    marginTop: 30,
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


  emptyText: {
    color: "#c0392b",
    fontWeight: "600",
    textAlign: "right",
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
    maxHeight: '80%',
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
    marginTop: 2,
  },

  modalCloseActionText: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: '600',
  },
});

