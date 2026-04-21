// Marketing Interfaces for Admin Backend
export interface MarketingEvent {
  id?: string;
  name: string;
  description?: string;
  type: "google_ads" | "instagram_ads" | "facebook_ads" | "email_campaign" | "content_post" | "event";
  startDate: number; // timestamp
  endDate?: number; // timestamp
  budget?: number;
  spent?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  leads?: number;
  status: "planned" | "active" | "completed" | "paused";
  targetAudience?: string;
  adContent?: string;
  timestamp?: number;
  createdBy?: string;
}
