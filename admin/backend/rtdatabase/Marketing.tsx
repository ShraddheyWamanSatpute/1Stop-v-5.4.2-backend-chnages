// Marketing Realtime Database Operations
import { ref, set, update, remove, push, rtdbQuery as query, orderByChild, equalTo, get } from "../../../app/backend/services/Firebase";
import { db } from "../../../app/backend/services/Firebase";
import type { MarketingEvent } from "../interfaces/Marketing";

const MARKETING_PATH = "admin/marketing";

/**
 * Get all marketing events
 */
export const getMarketingEvents = async (adminId?: string): Promise<MarketingEvent[]> => {
  try {
    const marketingRef = ref(db, MARKETING_PATH);
    let snapshot;
    
    if (adminId) {
      const q = query(marketingRef, orderByChild("createdBy"), equalTo(adminId));
      snapshot = await get(q);
    } else {
      snapshot = await get(marketingRef);
    }
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      })) as MarketingEvent[];
    }
    return [];
  } catch (error) {
    console.error("Error getting marketing events:", error);
    return [];
  }
};

/**
 * Add a marketing event
 */
export const addMarketingEvent = async (eventData: Omit<MarketingEvent, "id" | "timestamp">): Promise<string> => {
  try {
    const marketingRef = ref(db, MARKETING_PATH);
    const newEventRef = push(marketingRef);
    const eventId = newEventRef.key;
    
    if (!eventId) {
      throw new Error("Failed to generate event ID");
    }
    
    await set(newEventRef, {
      ...eventData,
      id: eventId,
      timestamp: Date.now(),
    });
    
    return eventId;
  } catch (error) {
    console.error("Error adding marketing event:", error);
    throw error;
  }
};

/**
 * Update a marketing event
 */
export const updateMarketingEvent = async (eventId: string, updates: Partial<MarketingEvent>): Promise<boolean> => {
  try {
    const eventRef = ref(db, `${MARKETING_PATH}/${eventId}`);
    await update(eventRef, updates);
    return true;
  } catch (error) {
    console.error("Error updating marketing event:", error);
    return false;
  }
};

/**
 * Delete a marketing event
 */
export const deleteMarketingEvent = async (eventId: string): Promise<boolean> => {
  try {
    const eventRef = ref(db, `${MARKETING_PATH}/${eventId}`);
    await remove(eventRef);
    return true;
  } catch (error) {
    console.error("Error deleting marketing event:", error);
    return false;
  }
};
