// Content Functions
import {
  getContentSchedule,
  addContentPost,
  updateContentPost,
  publishContentPost,
  deleteContentPost,
  getPlatformSettings,
  addPlatformSettings,
  updatePlatformSettings,
} from "../data/Content";
import type { ContentPost, PlatformSettings } from "../interfaces/Content";

export const fetchContentSchedule = async (adminId?: string): Promise<ContentPost[]> => {
  return await getContentSchedule(adminId);
};

export const createContentPost = async (postData: Omit<ContentPost, "id" | "timestamp">): Promise<string> => {
  return await addContentPost(postData);
};

export const updateContentPostFields = async (postId: string, updates: Partial<ContentPost>): Promise<boolean> => {
  return await updateContentPost(postId, updates);
};

export const publishPost = async (postId: string, publishedDate?: number): Promise<boolean> => {
  return await publishContentPost(postId, publishedDate);
};

export const removeContentPost = async (postId: string): Promise<boolean> => {
  return await deleteContentPost(postId);
};

export const fetchPlatformSettings = async (): Promise<PlatformSettings[]> => {
  return await getPlatformSettings();
};

export const createPlatformSettings = async (settingsData: Omit<PlatformSettings, "id" | "timestamp">): Promise<string> => {
  return await addPlatformSettings(settingsData);
};

export const updatePlatformSettingsFields = async (settingsId: string, updates: Partial<PlatformSettings>): Promise<boolean> => {
  return await updatePlatformSettings(settingsId, updates);
};
