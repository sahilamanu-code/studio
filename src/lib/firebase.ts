// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAf_3CYCYPzp1ujXb5c_61N1EDI1NY_PFM",
  authDomain: "trie-daily-operations.firebaseapp.com",
  projectId: "trie-daily-operations",
  storageBucket: "trie-daily-operations.appspot.com",
  messagingSenderId: "9174117106",
  appId: "1:9174117106:web:fc5bb160ca569dcc82fe6b",
  measurementId: "G-J23SQJY9X1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };
