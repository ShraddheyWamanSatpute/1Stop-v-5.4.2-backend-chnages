// Marketing Functions
import { getMarketingEvents, addMarketingEvent, updateMarketingEvent, deleteMarketingEvent } from "../data/Marketing";
import type { MarketingEvent } from "../interfaces/Marketing";

export const fetchMarketingEvents = async (adminId?: string): Promise<MarketingEvent[]> => {
  return await getMarketingEvents(adminId);
};

export const createMarketingEvent = async (eventData: Omit<MarketingEvent, "id" | "timestamp">): Promise<string> => {
  return await addMarketingEvent(eventData);
};

export const updateMarketingEventFields = async (eventId: string, updates: Partial<MarketingEvent>): Promise<boolean> => {
  return await updateMarketingEvent(eventId, updates);
};

export const removeMarketingEvent = async (eventId: string): Promise<boolean> => {
  return await deleteMarketingEvent(eventId);
};
