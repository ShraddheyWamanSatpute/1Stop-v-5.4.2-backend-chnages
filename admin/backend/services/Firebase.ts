// Import Firebase services from admin-specific initialization
// Each section has its own Firebase initialization to avoid code-splitting issues
import { 
  app, 
  auth, 
  firestore as dbs, 
  database as db, 
  storage, 
  functions as functionsApp
} from '../../firebase/config';

// Import Firebase functions and types for re-export
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, User, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc, getDocs, where, updateDoc, serverTimestamp, onSnapshot, collection, query, orderBy, addDoc } from 'firebase/firestore';
import { ref, set, remove, update, get, push, onValue, DatabaseReference, off, child, orderByChild, equalTo, limitToLast, query as rtdbQuery } from 'firebase/database';
import { useAuthState } from "react-firebase-hooks/auth";
import { useDocument, useCollection, useCollectionData } from "react-firebase-hooks/firestore";
import { ref as ref1, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';

// Re-export initialized services
export { auth, dbs, db, storage, functionsApp, app };

export { ref, child, set, ref1, storageRef, orderByChild,
  equalTo,
  limitToLast,
   getDocs, where,off, rtdbQuery, updateDoc, uploadBytes, getDownloadURL, addDoc, useCollection,query, orderBy, serverTimestamp, onSnapshot,collection, useCollectionData, onValue, remove, update, get, push, doc, setDoc, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, useAuthState, useDocument, signOut, httpsCallable };
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
    const storageRef = ref(storage, `${folder}/${file.name}`);
    uploadBytes(storageRef, file)
      .then(() => getDownloadURL(storageRef))
      .then((url) => resolve(url))
      .catch((error) => reject(error));
  });
};
