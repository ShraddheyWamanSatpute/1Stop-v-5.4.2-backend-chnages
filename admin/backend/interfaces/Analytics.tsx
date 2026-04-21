// Analytics Interfaces for Admin Backend
export interface AnalyticsData {
  totalRevenue: number;
  totalLeads: number;
  conversionRate: number;
  activeCampaigns: number;

  // Social Media Analytics
  socialMediaStats: {
    totalPosts: number;
    totalImpressions: number;
    totalEngagements: number;
    averageEngagementRate: number;
    topPerformingPlatform: string;
  };

  // Content Performance
  contentPerformance: Array<{
    platform: string;
    posts: number;
    impressions: number;
    engagements: number;
    engagementRate: number;
  }>;

  salesData: Array<{
    month: string;
    sales: number;
    leads: number;
    conversion: number;
  }>;

  marketingData: Array<{
    name: string;
    value: number;
    color: string;
  }>;

  trafficData: Array<{
    date: string;
    visitors: number;
    pageViews: number;
    bounceRate: number;
  }>;

  // Social Media ROI
  socialROI: {
    totalSpent: number;
    leadsGenerated: number;
    costPerLead: number;
    revenue: number;
    roi: number;
  };
}
