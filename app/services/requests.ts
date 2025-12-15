import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Define the shape of the data for TypeScript safety
export type RequestData = {
  title: string;
  description: string;
  address: string;
  latitude?: number;
  longitude?: number;
};

export const createRequest = async (data: RequestData) => {
  // 1. Check if user is logged in
  const user = auth.currentUser;
  if (!user) throw new Error("User must be logged in to post a request.");

  try {
    // 2. Reference the "requests" collection
    // (If it doesn't exist, Firebase creates it automatically!)
    const requestsRef = collection(db, 'requests');

    // 3. Add the document
    const docRef = await addDoc(requestsRef, {
      ...data,
      seekerId: user.uid,            // The ID column
      seekerName: user.displayName || "Anonymous", // User info snapshot
      status: "open",                // Default Status ID
      createdAt: serverTimestamp(), 
      location: data.latitude && data.longitude ? {
        latitude: data.latitude,
        longitude: data.longitude
      } : null,
      address: data.address
    });

    console.log("Request created with ID:", docRef.id);
    return docRef.id;

  } catch (error) {
    console.error("Error adding request:", error);
    throw error;
  }
};