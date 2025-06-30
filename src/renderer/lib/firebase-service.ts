import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase'; // Assuming db is exported from firebase.ts

class FirebaseService {
  private getDocRef(key: string) {
    // For simplicity, we'll use a single collection 'storage' for all key-value pairs.
    // The document ID will be the key.
    return doc(db, 'storage', key);
  }

  async getValue<T>(key: string): Promise<T | null> {
    const docRef = this.getDocRef(key);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      // The 'value' field holds the stored data.
      return docSnap.data().value as T;
    }
    return null;
  }

  async setValue<T>(key: string, value: T): Promise<void> {
    const docRef = this.getDocRef(key);
    // We store the value in a 'value' field within the document.
    await setDoc(docRef, { value });
  }

  async deleteValue(key: string): Promise<void> {
    const docRef = this.getDocRef(key);
    await deleteDoc(docRef);
  }

  async getAllValues(): Promise<{ [key: string]: any }> {
    const querySnapshot = await getDocs(collection(db, 'storage'));
    const allData: { [key: string]: any } = {};
    querySnapshot.forEach((doc) => {
      allData[doc.id] = doc.data().value;
    });
    return allData;
  }
}

export const firebaseService = new FirebaseService();