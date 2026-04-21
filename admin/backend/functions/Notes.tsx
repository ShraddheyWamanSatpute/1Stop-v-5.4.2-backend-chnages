// Notes Functions
import { getNotes, addNote, updateNote, deleteNote } from "../data/Notes";
import type { Note } from "../interfaces/Notes";

export const fetchNotes = async (adminId?: string): Promise<Note[]> => {
  return await getNotes(adminId);
};

export const createNote = async (noteData: Omit<Note, "id" | "timestamp">): Promise<string> => {
  return await addNote(noteData);
};

export const updateNoteFields = async (noteId: string, updates: Partial<Note>): Promise<boolean> => {
  return await updateNote(noteId, updates);
};

export const removeNote = async (noteId: string): Promise<boolean> => {
  return await deleteNote(noteId);
};
