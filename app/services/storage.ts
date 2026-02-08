import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
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
    // Make sure the path doesn't have double slashes
    const fullPath = `${folderName}/${fileName}_${Date.now()}.jpg`;
    console.log("📍 Creating reference at:", fullPath);
    const fileRef = ref(storage, fullPath);

    console.log("⬆️ Starting uploadBytes...");
    // 3. Upload the Blob with Timeout
    
    // Add timeout to detect hanging uploads (common in Metro Tunnel)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
    );

    const uploadTask = uploadBytes(fileRef, blob);

    // Race the upload against the timeout
    const result: any = await Promise.race([uploadTask, timeoutPromise]);
    
    console.log("✅ Upload finished. Metadata:", result?.metadata?.fullPath);

    // 4. Close the blob to free memory
    // @ts-ignore
    if (blob.close) {
        // @ts-ignore
        blob.close();
    }

    // 5. Get and Return the Download URL
    const url = await getDownloadURL(fileRef);
    console.log("🔗 Generated URL:", url);
    return url;

  } catch (error: any) {
    console.error("❌ Storage Upload Error:", error);
    
    // Enhanced Error Logging
    if (error.code === 'storage/unknown') {
        console.error("⚠️ Detailed Server Response:", error.serverResponse);
        console.error("⚠️ Make sure the Bucket Name in .env matches your Firebase Console Storage Bucket URL exactly.");
    }
    
    throw error;
  }
};