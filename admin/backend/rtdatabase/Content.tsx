// Content Realtime Database Operations
import { ref, set, update, remove, push, rtdbQuery as query, orderByChild, equalTo, get } from "../../../app/backend/services/Firebase";
import { db } from "../../../app/backend/services/Firebase";
import type { ContentPost, PlatformSettings } from "../interfaces/Content";

const CONTENT_POSTS_PATH = "admin/content/posts";
const PLATFORM_SETTINGS_PATH = "admin/content/platforms";

/**
 * Get all content posts
 */
export const getContentSchedule = async (adminId?: string): Promise<ContentPost[]> => {
  try {
    const postsRef = ref(db, CONTENT_POSTS_PATH);
    let snapshot;
    
    if (adminId) {
      const q = query(postsRef, orderByChild("createdBy"), equalTo(adminId));
      snapshot = await get(q);
    } else {
      snapshot = await get(postsRef);
    }
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      })) as ContentPost[];
    }
    return [];
  } catch (error) {
    console.error("Error getting content schedule:", error);
    return [];
  }
};

/**
 * Add a content post
 */
export const addContentPost = async (postData: Omit<ContentPost, "id" | "timestamp">): Promise<string> => {
  try {
    const postsRef = ref(db, CONTENT_POSTS_PATH);
    const newPostRef = push(postsRef);
    const postId = newPostRef.key;
    
    if (!postId) {
      throw new Error("Failed to generate post ID");
    }
    
    await set(newPostRef, {
      ...postData,
      id: postId,
      timestamp: Date.now(),
    });
    
    return postId;
  } catch (error) {
    console.error("Error adding content post:", error);
    throw error;
  }
};

/**
 * Update a content post
 */
export const updateContentPost = async (postId: string, updates: Partial<ContentPost>): Promise<boolean> => {
  try {
    const postRef = ref(db, `${CONTENT_POSTS_PATH}/${postId}`);
    await update(postRef, updates);
    return true;
  } catch (error) {
    console.error("Error updating content post:", error);
    return false;
  }
};

/**
 * Publish a content post (update status to published)
 */
export const publishContentPost = async (postId: string, publishedDate?: number): Promise<boolean> => {
  try {
    const postRef = ref(db, `${CONTENT_POSTS_PATH}/${postId}`);
    await update(postRef, {
      status: "published",
      publishedDate: publishedDate || Date.now(),
    });
    return true;
  } catch (error) {
    console.error("Error publishing content post:", error);
    return false;
  }
};

/**
 * Delete a content post
 */
export const deleteContentPost = async (postId: string): Promise<boolean> => {
  try {
    const postRef = ref(db, `${CONTENT_POSTS_PATH}/${postId}`);
    await remove(postRef);
    return true;
  } catch (error) {
    console.error("Error deleting content post:", error);
    return false;
  }
};

/**
 * Get platform settings
 */
export const getPlatformSettings = async (): Promise<PlatformSettings[]> => {
  try {
    const settingsRef = ref(db, PLATFORM_SETTINGS_PATH);
    const snapshot = await get(settingsRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      })) as PlatformSettings[];
    }
    return [];
  } catch (error) {
    console.error("Error getting platform settings:", error);
    return [];
  }
};

/**
 * Add platform settings
 */
export const addPlatformSettings = async (settingsData: Omit<PlatformSettings, "id" | "timestamp">): Promise<string> => {
  try {
    const settingsRef = ref(db, PLATFORM_SETTINGS_PATH);
    const newSettingsRef = push(settingsRef);
    const settingsId = newSettingsRef.key;
    
    if (!settingsId) {
      throw new Error("Failed to generate settings ID");
    }
    
    await set(newSettingsRef, {
      ...settingsData,
      id: settingsId,
      timestamp: Date.now(),
    });
    
    return settingsId;
  } catch (error) {
    console.error("Error adding platform settings:", error);
    throw error;
  }
};

/**
 * Update platform settings
 */
export const updatePlatformSettings = async (settingsId: string, updates: Partial<PlatformSettings>): Promise<boolean> => {
  try {
    const settingsRef = ref(db, `${PLATFORM_SETTINGS_PATH}/${settingsId}`);
    await update(settingsRef, updates);
    return true;
  } catch (error) {
    console.error("Error updating platform settings:", error);
    return false;
  }
};
