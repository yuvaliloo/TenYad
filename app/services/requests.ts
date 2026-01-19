import { addDoc, collection, GeoPoint, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// Define the shape of the data for TypeScript safety
export type RequestData = {
  title: string;
  description: string;
  address?: string;      
  latitude?: number;     
  longitude?: number;    
  seekerId?: string;     
  seekerName?: string;   
};

export const createRequest = async (data: RequestData) => {
  // 1. Check if user is logged in
  const user = auth.currentUser;
  if (!user) throw new Error("User must be logged in to post a request.");

  try {
    const requestsRef = collection(db, 'requests');

    // 2. Create the GeoPoint object if coords exist
    // This fills the variable 'locationData' used below
    const locationData = (data.latitude && data.longitude) 
      ? new GeoPoint(data.latitude, data.longitude) 
      : null;

    // 3. Add the document
    const docRef = await addDoc(requestsRef, {
      title: data.title,
      description: data.description,
      
      // User Info
      seekerId: user.uid,
      seekerName: user.displayName || "Anonymous",
      
      // Status & Assignment
      status: "open",
      worker: "OPEN", // <--- CRITICAL: Allows query where("worker", "==", null) to work
      
      // Metadata
      createdAt: serverTimestamp(),
      
      // Location Data
      location: locationData,
      address: data.address || "No address provided"
    });

    console.log("Request created with ID:", docRef.id);
    return docRef.id;

  } catch (error) {
    console.error("Error adding request:", error);
    throw error;
  }
};