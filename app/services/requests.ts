
import { collection, DocumentSnapshot, GeoPoint, onSnapshot, orderBy,query,where,Timestamp,deleteDoc,doc, addDoc,updateDoc} from "firebase/firestore";
import {db} from "./firebase";


export interface RequestObject{
  requestId:string;
  seekerId:string;
  address:string;
  location:GeoPoint;
  title:string;
  description:string;
  imageUrls?:string[];
  paymentAmount:number;
  createdAt:Timestamp;
  interestedTaskers:Array<{
  userId: string;
  timestamp: Timestamp;
}>;
  status: "open"|"close";
  workerId: string | null;
  distance?:number;   
}

export function convertDocumentToRequest(
  doc: DocumentSnapshot
): RequestObject | null {
  const data = doc.data() as any;
  console.log(doc.data());
  if (!data) return null;

  // Required fields check (keep it strict so we don't create half-baked objects)
  if (
    !doc.id ||
    !data.seekerId ||
    !data.address ||
    !data.location ||
    !data.title ||
    !data.createdAt ||
    !data.status
  ) {
    return null;
  }


  // Firestore fields:
  // - createdAt: Timestamp
  // - intrestedTaskers: Array<{userId: string, timestamp: Timestamp}>
  // - workerId: string | null (can be missing)
  return {
    requestId: doc.id,
    seekerId: data.seekerId,
    address: data.address,
    location: data.location as GeoPoint,
    title: data.title,
    description: data.description,
    imageUrls: data.imageUrls as string[] | undefined,
    paymentAmount: Number(data.paymentAmount ?? 0),
    createdAt: data.createdAt as Timestamp,
    interestedTaskers: (data.interestedTaskers ?? []) as Array<{userId: string, timestamp: Timestamp}>,
    status: data.status as "open" | "close",
    workerId: (data.workerId ?? null) as string | null,
  };
}






export const fetchAllRequests = async () => {
  return new Promise((resolve: (requests: RequestObject[]) => void) => {
    let unsubscribe = onSnapshot(
      query(
        collection(db, "requests"),
        orderBy("createdAt", "desc")
      ),
      (snapshot) => {
        const fetchedRequests = snapshot.docs
          .map((doc) => convertDocumentToRequest(doc))
          .filter((r) => r !== null);
        resolve(fetchedRequests);
        unsubscribe(); // Stop listening after first load
      },
      (error) => {
        console.error("Error fetching requests:", error);
        resolve([]);
      }
    );
  });
};


export const deleteRequestFromFirestore = async (requestId:string)=>{
  try {
    await deleteDoc(doc(db, "requests", requestId));
    return true;
    // The onSnapshot listener will automatically update the list
  } catch (err) {
    console.error("Error deleting request:", err);
  }
  return false;
};


export const addRequestToFirestore = async (req: RequestObject) => {
  try{
    await addDoc(collection(db, 'requests'), {
      seekerId: req.seekerId,
      address: req.address,
      location: req.location,
      title: req.title,
      description: req.description,
      paymentAmount: req.paymentAmount,
      createdAt: req.createdAt,
      interestedTaskers:[],
      status: req.status,
      workerId: req.workerId
    });
    console.log("New request added to Firestore");
    return true;
  } 
  catch (error) {
    console.error("Error adding request to Firestore:", error);
  }
  return false
}

export const updateRequestInFirestore = async (req: RequestObject) => {
  try {
    const requestRef = doc(db, "requests", req.requestId);
    await updateDoc(requestRef, {
      seekerId: req.seekerId,
      address: req.address,
      location: req.location,
      title: req.title,
      description: req.description,
      paymentAmount: req.paymentAmount,
      createdAt: req.createdAt,
      interestedTaskers: req.interestedTaskers,
      status: req.status,
      workerId: req.workerId
    });
    console.log("Request updated in Firestore");
    return true;
  } catch (error) {
    console.error("Error updating request in Firestore:", error);
  }
  return false;
};