
import { initializeApp } from "firebase/app";
import { getAuth }       from "firebase/auth";
import { getFirestore }  from "firebase/firestore";
import { getStorage }    from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA9iYwDwojK_dG74GiSaQ64PMT97EUq85c",
  authDomain: "challenge1-kirari.firebaseapp.com",
  projectId: "challenge1-kirari",
  storageBucket: "challenge1-kirari.firebasestorage.app",
  messagingSenderId: "753884909362",
  appId: "1:753884909362:web:3aa9d05b685d8b50e8d12b",
  measurementId: "G-K6VV5RCYHD"
};

const app =    initializeApp(firebaseConfig);
const auth =   getAuth(app);
const db =     getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };

