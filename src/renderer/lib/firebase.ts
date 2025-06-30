import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

(async () => {
  try {
    await enableIndexedDbPersistence(db);
    console.log('Firebase persistence enabled.');
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.log('Firebase persistence failed: multiple tabs open.');
    } else if (err.code === 'unimplemented') {
      console.log('Firebase persistence is not supported in this browser.');
    }
  }
})();

export { db };
export default app;