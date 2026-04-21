// Notes Realtime Database Operations
import { ref, set, update, remove, push, rtdbQuery as query, orderByChild, equalTo, get } from "../../../app/backend/services/Firebase";
import { db } from "../../../app/backend/services/Firebase";
import type { Note } from "../interfaces/Notes";

const NOTES_PATH = "admin/notes";

/**
 * Get all notes
 */
export const getNotes = async (adminId?: string): Promise<Note[]> => {
  try {
    const notesRef = ref(db, NOTES_PATH);
    let snapshot;
    
    if (adminId) {
      const q = query(notesRef, orderByChild("createdBy"), equalTo(adminId));
      snapshot = await get(q);
    } else {
      snapshot = await get(notesRef);
    }
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      })) as Note[];
    }
    return [];
  } catch (error) {
    console.error("Error getting notes:", error);
    return [];
  }
};

/**
 * Add a note
 */
export const addNote = async (noteData: Omit<Note, "id" | "timestamp">): Promise<string> => {
  try {
    const notesRef = ref(db, NOTES_PATH);
    const newNoteRef = push(notesRef);
    const noteId = newNoteRef.key;
    
    if (!noteId) {
      throw new Error("Failed to generate note ID");
    }
    
    await set(newNoteRef, {
      ...noteData,
      id: noteId,
      timestamp: Date.now(),
    });
    
    return noteId;
  } catch (error) {
    console.error("Error adding note:", error);
    throw error;
  }
};

/**
 * Update a note
 */
export const updateNote = async (noteId: string, updates: Partial<Note>): Promise<boolean> => {
  try {
    const noteRef = ref(db, `${NOTES_PATH}/${noteId}`);
    await update(noteRef, updates);
    return true;
  } catch (error) {
    console.error("Error updating note:", error);
    return false;
  }
};

/**
 * Delete a note
 */
export const deleteNote = async (noteId: string): Promise<boolean> => {
  try {
    const noteRef = ref(db, `${NOTES_PATH}/${noteId}`);
    await remove(noteRef);
    return true;
  } catch (error) {
    console.error("Error deleting note:", error);
    return false;
  }
};
