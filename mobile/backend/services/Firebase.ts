// Import Firebase services from mobile-specific initialization
// Each section has its own Firebase initialization to avoid code-splitting issues
import { 
  app, 
  auth, 
  firestore as dbs, 
  database as db, 
  storage
} from '../../firebase/config';

// Import Firebase functions and types for re-export
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, User, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc, getDocs, where, updateDoc, serverTimestamp, onSnapshot, collection, query, orderBy, addDoc } from 'firebase/firestore';
import { ref, set, remove, update, get, push, onValue, DatabaseReference, off, child, orderByChild, equalTo, limitToLast, query as rtdbQuery } from 'firebase/database';
import { useAuthState } from "react-firebase-hooks/auth";
import { useDocument, useCollection, useCollectionData } from "react-firebase-hooks/firestore";
import { ref as ref1, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// Re-export initialized services
export { auth, dbs, db, storage, app };

export { ref, child, set, ref1, storageRef, orderByChild,
  equalTo,
  limitToLast,
   getDocs, where,off, rtdbQuery, updateDoc, uploadBytes, getDownloadURL, addDoc, useCollection,query, orderBy, serverTimestamp, onSnapshot,collection, useCollectionData, onValue, remove, update, get, push, doc, setDoc, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, useAuthState, useDocument, signOut };
export type {User, DatabaseReference}

export interface ExtendedDatabaseReference extends DatabaseReference {
  orderByChild(childPath: string): any;
  equalTo(value: any, key?: string): DatabaseReference;
}

export const uploadFile = async (file: File, folder: string = "files"): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!storage) {
      reject(new Error("Storage is not available"));
      return;
    }
    const fileRef = ref1(storage, `${folder}/${Date.now()}_${file.name}`);
    uploadBytes(fileRef, file)
      .then(() => getDownloadURL(fileRef))
      .then((url) => resolve(url))
      .catch((error) => reject(error));
  });
};
