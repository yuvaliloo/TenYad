import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";

export interface Review {
  id?: string;
  reviewedUserId: string; // UID של המשתמש שמקבל את הביקורת
  reviewedUserName?: string; // שם המשתמש שמקבל את הביקורת
  reviewerId: string; // UID של הכותב
  reviewerName: string; // שם הכותב
  rating: number; // דירוג 1-5
  comment: string; // תוכן הביקורת
  taskId?: string; // אופציונלי - ID של המשימה שקשורה לביקורת
  taskTitle?: string; // אופציונלי - כותרת המשימה
  createdAt?: any;
}

/**
 * יצירת ביקורת חדשה
 */
export const createReview = async (reviewData: Omit<Review, 'id' | 'createdAt'>) => {
  try {
    const reviewRef = await addDoc(collection(db, "reviews"), {
      ...reviewData,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: reviewRef.id };
  } catch (error) {
    console.error("Error creating review:", error);
    return { success: false, error };
  }
};

/**
 * שליפת כל הביקורות של משתמש מסוים
 */
export const getReviewsForUser = async (userId: string) => {
  try {
    const q = query(
      collection(db, "reviews"),
      where("reviewedUserId", "==", userId)
    );
    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Review[];
    
    // Sort in memory (descending)
    reviews.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
        return timeB - timeA;
    });

    return { success: true, reviews };
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return { success: false, reviews: [], error };
  }
};

/**
 * חישוב ממוצע דירוג של משתמש
 */
export const calculateAverageRating = (reviews: Review[]): number => {
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
  return sum / reviews.length;
};

/**
 * עדכון ביקורת קיימת
 */
export const updateReview = async (reviewId: string, updates: Partial<Review>) => {
  try {
    const reviewRef = doc(db, "reviews", reviewId);
    await updateDoc(reviewRef, updates);
    return { success: true };
  } catch (error) {
    console.error("Error updating review:", error);
    return { success: false, error };
  }
};

/**
 * מחיקת ביקורת
 */
export const deleteReview = async (reviewId: string) => {
  try {
    await deleteDoc(doc(db, "reviews", reviewId));
    return { success: true };
  } catch (error) {
    console.error("Error deleting review:", error);
    return { success: false, error };
  }
};

/**
 * בדיקה אם משתמש כבר כתב ביקורת על משימה מסוימת
 */
export const hasUserReviewedTask = async (reviewerId: string, taskId: string) => {
  try {
    const q = query(
      collection(db, "reviews"),
      where("reviewerId", "==", reviewerId),
      where("taskId", "==", taskId)
    );
    const snapshot = await getDocs(q);
    return { success: true, hasReviewed: !snapshot.empty };
  } catch (error) {
    console.error("Error checking review status:", error);
    return { success: false, hasReviewed: false, error };
  }
};

/**
 * שליפת כל הביקורות שמשתמש כתב (כדי לדעת אילו משימות כבר דורגו)
 */
export const getReviewsWrittenByUser = async (reviewerId: string) => {
  try {
    const q = query(
      collection(db, "reviews"),
      where("reviewerId", "==", reviewerId)
    );
    const snapshot = await getDocs(q);
    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Review[];
    return { success: true, reviews };
  } catch (error) {
    console.error("Error fetching written reviews:", error);
    return { success: false, reviews: [], error };
  }
};
