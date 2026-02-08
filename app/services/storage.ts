import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "./firebase"; 

const storage = getStorage(app);

/**
 * Uploads an image to Firebase Storage and returns the download URL.
 * * @param uri - The local URI of the image (from ImagePicker)
 * @param folderName - The folder in Storage (e.g., "profile_pics" or "task_pics")
 * @param fileName - The name of the file (usually the UserID or RequestID)
 */
export const uploadImage = async (uri: string, folderName: string, fileName: string): Promise<string> => {
  try {
    // 1. Convert URI to Blob (Required for React Native Firebase)
    const blob: any = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = function () {
        resolve(xhr.response);
      };
      xhr.onerror = function (e) {
        console.error("XHR Error:", e);
        reject(new TypeError("Network request failed"));
      };
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });

    // 2. Create a Reference (e.g., task_pics/requestId_123456789.jpg)
    const fileRef = ref(storage, `${folderName}/${fileName}_${Date.now()}.jpg`);

    // 3. Upload the Blob
    await uploadBytes(fileRef, blob);

    // 4. Close the blob to free memory
    blob.close();

    // 5. Get and Return the Download URL
    const url = await getDownloadURL(fileRef);
    return url;

  } catch (error) {
    console.error("❌ Storage Upload Error:", error);
    throw error;
  }
};