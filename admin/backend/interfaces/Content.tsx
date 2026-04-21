// Content Interfaces for Admin Backend
export interface ContentPost {
  id?: string;
  platform: "instagram" | "facebook" | "linkedin" | "twitter" | "google_ads";
  content: string;
  mediaUrls?: string[];
  scheduledDate: number; // timestamp
  publishedDate?: number; // timestamp
  status: "draft" | "scheduled" | "published" | "failed";
  hashtags?: string[];
  targetAudience?: string;
  campaignId?: string;

  // Analytics data
  impressions?: number;
  reach?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  saves?: number;
  engagementRate?: number;

  // Ad specific data (for paid posts)
  isAd?: boolean;
  adBudget?: number;
  adSpent?: number;
  cpm?: number;
  cpc?: number;
  conversions?: number;

  // Platform specific data
  platformPostId?: string;
  platformUrl?: string;

  timestamp?: number;
  createdBy?: string;
}

export interface PlatformSettings {
  id?: string;
  platform: "instagram" | "facebook" | "linkedin" | "twitter" | "google_ads";
  isConnected: boolean;
  accessToken?: string;
  refreshToken?: string;
  accountId?: string;
  accountName?: string;
  permissions?: string[];
  lastSync?: number;
  apiLimits?: {
    postsPerDay?: number;
    postsPerHour?: number;
    remaining?: number;
  };
  timestamp?: number;
}
