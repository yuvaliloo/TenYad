import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";

export interface Payment {
  id?: string;
  payerId: string; // UID של המשלם (Seeker)
  payerName: string; // שם המשלם
  recipientId: string; // UID של המקבל (Tasker)
  recipientName: string; // שם המקבל
  amount: number; // סכום התשלום בשקלים
  currency: string; // מטבע (ILS, USD וכו')
  taskId: string; // ID של המשימה
  taskTitle: string; // כותרת המשימה
  paymentMethod: "paypal" | "credit_card" | "apple_pay" | "google_pay"; // שיטת התשלום
  status: "pending" | "completed" | "failed" | "refunded"; // סטטוס התשלום
  transactionId?: string; // ID של העסקה חיצונית (PayPal וכו')
  description?: string; // תיאור התשלום
  createdAt?: any; // זמן יצירה
  completedAt?: any; // זמן השלמה
}

/**
 * יצירת תשלום חדש
 */
export const createPayment = async (paymentData: Omit<Payment, 'id' | 'createdAt'>) => {
  try {
    const paymentRef = await addDoc(collection(db, "payments"), {
      ...paymentData,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: paymentRef.id };
  } catch (error) {
    console.error("Error creating payment:", error);
    return { success: false, error };
  }
};

/**
 * שליפת כל התשלומים של משתמש מסוים (כמשלם או כמקבל)
 */
export const getUserPayments = async (userId: string) => {
  try {
    const paymentsAsPayerQuery = query(
      collection(db, "payments"),
      where("payerId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const paymentsAsRecipientQuery = query(
      collection(db, "payments"),
      where("recipientId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const [payerSnapshot, recipientSnapshot] = await Promise.all([
      getDocs(paymentsAsPayerQuery),
      getDocs(paymentsAsRecipientQuery),
    ]);

    const payments = [
      ...payerSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })),
      ...recipientSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    ] as Payment[];

    return { success: true, payments };
  } catch (error) {
    console.error("Error fetching payments:", error);
    return { success: false, payments: [], error };
  }
};

/**
 * שליפת תשלומים ממתינים של משתמש מסוים
 */
export const getPendingPayments = async (userId: string) => {
  try {
    const q = query(
      collection(db, "payments"),
      where("recipientId", "==", userId),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Payment[];

    return { success: true, payments };
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    return { success: false, payments: [], error };
  }
};

/**
 * עדכון סטטוס תשלום
 */
export const updatePaymentStatus = async (
  paymentId: string,
  status: Payment['status'],
  transactionId?: string
) => {
  try {
    const paymentRef = doc(db, "payments", paymentId);
    const updateData: any = {
      status,
    };

    if (transactionId) {
      updateData.transactionId = transactionId;
    }

    if (status === "completed") {
      updateData.completedAt = serverTimestamp();
    }

    await updateDoc(paymentRef, updateData);
    return { success: true };
  } catch (error) {
    console.error("Error updating payment status:", error);
    return { success: false, error };
  }
};

/**
 * חישוב סכום כולל תשלומים שהושלמו
 */
export const calculateTotalReceivedPayments = (payments: Payment[]): number => {
  return payments
    .filter(p => p.status === "completed")
    .reduce((acc, payment) => acc + payment.amount, 0);
};

/**
 * חישוב סכום כולל תשלומים ממתינים
 */
export const calculateTotalPendingPayments = (payments: Payment[]): number => {
  return payments
    .filter(p => p.status === "pending")
    .reduce((acc, payment) => acc + payment.amount, 0);
};

/**
 * שליפת תשלום לפי ID
 */
export const getPaymentById = async (paymentId: string) => {
  try {
    const q = query(
      collection(db, "payments"),
      where("id", "==", paymentId)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: false, payment: null, error: "Payment not found" };
    }

    const payment = {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    } as Payment;

    return { success: true, payment };
  } catch (error) {
    console.error("Error fetching payment:", error);
    return { success: false, payment: null, error };
  }
};

/**
 * קבלת היסטוריית תשלומים בין שני משתמשים
 */
export const getPaymentHistoryBetweenUsers = async (userId1: string, userId2: string) => {
  try {
    const q = query(
      collection(db, "payments"),
      where("payerId", "==", userId1),
      where("recipientId", "==", userId2),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    const payments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Payment[];

    return { success: true, payments };
  } catch (error) {
    console.error("Error fetching payment history:", error);
    return { success: false, payments: [], error };
  }
};
