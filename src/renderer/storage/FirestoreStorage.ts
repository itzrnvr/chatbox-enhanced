import { getFirestore, doc, setDoc, getDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import app from '../lib/firebase';

const db = getFirestore(app);

export default class FirestoreStorage {
  private getUserId(): string | null {
    const auth = getAuth(app);
    return auth.currentUser ? auth.currentUser.uid : null;
  }

  public async setItem<T>(key: string, value: T): Promise<void> {
    const userId = this.getUserId();
    if (!userId) {
      console.error("No user is signed in to set item.");
      return;
    }
    const docRef = doc(db, 'users', userId, 'data', key);
    await setDoc(docRef, { value });
  }

  public async setItemNow<T>(key: string, value: T): Promise<void> {
    return this.setItem(key, value);
  }

  public async getItem<T>(key: string, initialValue: T): Promise<T> {
    const userId = this.getUserId();
    if (!userId) {
      console.error("No user is signed in to get item.");
      return initialValue;
    }
    const docRef = doc(db, 'users', userId, 'data', key);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data().value as T;
    } else {
      await this.setItem(key, initialValue);
      return initialValue;
    }
  }

  public async removeItem(key: string): Promise<void> {
    const userId = this.getUserId();
    if (!userId) {
      console.error("No user is signed in to remove item.");
      return;
    }
    const docRef = doc(db, 'users', userId, 'data', key);
    await deleteDoc(docRef);
  }

  public async getAll(): Promise<{ [key: string]: any }> {
    const userId = this.getUserId();
    if (!userId) {
      console.error("No user is signed in to get all items.");
      return {};
    }
    const collectionRef = collection(db, 'users', userId, 'data');
    const querySnapshot = await getDocs(collectionRef);
    const allData: { [key: string]: any } = {};
    querySnapshot.forEach((doc) => {
      allData[doc.id] = doc.data().value;
    });
    return allData;
  }

  public async setAll(data: { [key: string]: any }): Promise<void> {
    const userId = this.getUserId();
    if (!userId) {
      console.error("No user is signed in to set all items.");
      return;
    }
    const batch = Object.keys(data).map(key => {
        const docRef = doc(db, 'users', userId, 'data', key);
        return setDoc(docRef, { value: data[key] });
    });
    await Promise.all(batch);
  }

  // For blobs, we can use Firebase Storage, but for now, we'll keep it simple
  // and store them as base64 strings in Firestore.
  // Note: Firestore has a 1MB limit per document.
  public async setBlob(key: string, value: string): Promise<void> {
    return this.setItem(key, value);
  }

  public async getBlob(key: string): Promise<string | null> {
    return this.getItem(key, null);
  }

  public async delBlob(key: string): Promise<void> {
    return this.removeItem(key);
  }

  public async getBlobKeys(): Promise<string[]> {
    const allData = await this.getAll();
    // This is not a perfect way to distinguish blobs, but it's a start.
    // A better approach would be to have a separate collection for blobs.
    return Object.keys(allData).filter(key => typeof allData[key] === 'string' && allData[key].startsWith('data:'));
  }
}