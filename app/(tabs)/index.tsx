import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { TaskerMainPage } from '../tasker-main-page';


// Imports from your specific project structure
import PaymentModal from '../../components/PaymentModal';
import ReviewModal from '../../components/ReviewModal';
import { SeekerMainPage } from '../seeker-main-page';
import { auth, db } from "../services/firebase";
import { getReviewsForUser, getReviewsWrittenByUser } from '../services/reviews';

export default function FrontPage() {

  // --- STATE ---
  const [taskerMode, setTaskerMode] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);

  const [userName, setUserName] = useState("אורח");
  
  // Location State (From Friend's Logic)
  const [myLocation, setMyLocation] = useState<{lat: number, lng: number} | null>(null);

  // Seeker Logic State (From Your Logic)
  const [hiddenRequests, setHiddenRequests] = useState<Set<string>>(new Set());
  const [selectedTasker, setSelectedTasker] = useState<any>(null);
  const [showTaskerModal, setShowTaskerModal] = useState(true);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'open' | 'closed'>('open');

  // Review System State (From Your Logic)
  const [showReviewModal, setShowReviewModal] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [reviewTask, setReviewTask] = useState<any>(null);
  const [taskerReviews, setTaskerReviews] = useState<any[]>([]);
  const [reviewedTaskIds, setReviewedTaskIds] = useState<Set<string>>(new Set());
  // --- EFFECTS ---

  // 2. Fetch My Written Reviews (Your Logic)
  useEffect(() => {
    const fetchMyReviews = async () => {
        const user = auth.currentUser;
        if (user) {
            const res = await getReviewsWrittenByUser(user.uid);
            if (res.success) {
                const ids = new Set(res.reviews.filter(r => r.taskId).map(r => r.taskId!));
                setReviewedTaskIds(ids);
            }
        }
    };
    fetchMyReviews();
  }, [showReviewModal]); 

  // 3. Fetch Reviews for Selected Tasker (Your Logic)
  useEffect(() => {
    if (selectedTasker && (selectedTasker.taskerId || selectedTasker.uid)) {
      const tId = selectedTasker.taskerId || selectedTasker.uid;
      getReviewsForUser(tId).then((res) => {
        if (res.success) {
          setTaskerReviews(res.reviews);
        }
      });
    } else {
      setTaskerReviews([]);
    }
  }, [selectedTasker]);

  // --- HELPER FUNCTIONS ---

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

  return (
    <View style={styles.container}>
      {/* --- TASKER MODE UI --- */}
      {taskerMode ? (
        <TaskerMainPage></TaskerMainPage>
      ) : (
        /* --- SEEKER MODE UI --- */
        <SeekerMainPage />
      )}

      {/* Helper Switch */}
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


      

      {/* Review Modal */}
      {reviewTask && (
        <ReviewModal
          visible={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSuccess={() => {
            setShowReviewModal(false);
            setShowPaymentModal(true);
          }}
          reviewedUserId={reviewTask.workerId}
          reviewedUserName={reviewTask.worker}
          taskTitle={reviewTask.title}
          taskId={reviewTask.id}
        />
      )}

      {/* Payment Modal */}
      {/*reviewTask && (
        <PaymentModal
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          taskerName={reviewTask.worker}
        />
      )*/}

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

  helperSwitchContainer: {
    position: "absolute",
    top: 60,
    left: 20,
    alignItems: "center",
  },

  helperSwitchText: {
    marginTop: 6,
    fontSize: 14,
    color: "#6f411d",
    fontWeight: "500",
  },

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