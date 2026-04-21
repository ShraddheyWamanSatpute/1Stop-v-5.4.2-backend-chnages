// Analytics Realtime Database Operations
import type { AnalyticsData } from "../interfaces/Analytics";
import { getContentSchedule } from "./Content";
import { getMarketingEvents } from "./Marketing";
import { getLeads } from "./QR";

function startOfMonth(timestamp: number) {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function formatMonthLabel(timestamp: number) {
  return new Date(timestamp).toLocaleString("default", { month: "short" });
}

function toDateKey(timestamp: number) {
  return new Date(timestamp).toISOString().split("T")[0];
}

function clampBounceRate(value: number) {
  return Math.min(100, Math.max(0, Number(value.toFixed(2))));
}

/**
 * Get analytics data (aggregated from various sources)
 */
export const getAnalyticsData = async (): Promise<AnalyticsData> => {
  try {
    // Fetch data from various sources
    const [contentPosts, marketingEvents, leads] = await Promise.all([
      getContentSchedule(),
      getMarketingEvents(),
      getLeads(),
    ]);

    // Calculate social media stats
    const publishedPosts = contentPosts.filter((p) => p.status === "published");
    const totalImpressions = publishedPosts.reduce((sum, p) => sum + (p.impressions || 0), 0);
    const totalEngagements = publishedPosts.reduce(
      (sum, p) => sum + (p.likes || 0) + (p.comments || 0) + (p.shares || 0),
      0
    );
    const averageEngagementRate =
      publishedPosts.length > 0 ? totalEngagements / totalImpressions : 0;

    // Group by platform
    const platformStats: Record<string, { posts: number; impressions: number; engagements: number }> = {};
    publishedPosts.forEach((post) => {
      if (!platformStats[post.platform]) {
        platformStats[post.platform] = { posts: 0, impressions: 0, engagements: 0 };
      }
      platformStats[post.platform].posts++;
      platformStats[post.platform].impressions += post.impressions || 0;
      platformStats[post.platform].engagements += (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
    });

    const topPlatform = Object.entries(platformStats)
      .sort((a, b) => b[1].engagements - a[1].engagements)[0]?.[0] || "instagram";

    // Calculate marketing ROI
    const activeCampaigns = marketingEvents.filter((e) => e.status === "active").length;
    const totalSpent = marketingEvents.reduce((sum, e) => sum + (e.spent || 0), 0);
    const leadsGenerated = leads.length;
    const costPerLead = leadsGenerated > 0 ? totalSpent / leadsGenerated : 0;
    const revenue = leads.reduce((sum, lead) => {
      // Estimate revenue (you may want to track actual revenue differently)
      return sum + (lead.status === "won" ? 1000 : 0);
    }, 0);
    const roi = totalSpent > 0 ? ((revenue - totalSpent) / totalSpent) * 100 : 0;

    // Generate content performance array
    const contentPerformance = Object.entries(platformStats).map(([platform, stats]) => ({
      platform,
      posts: stats.posts,
      impressions: stats.impressions,
      engagements: stats.engagements,
      engagementRate: stats.impressions > 0 ? stats.engagements / stats.impressions : 0,
    }));

    const now = Date.now();

    // Generate sales data (last 6 months) from actual lead timestamps/statuses
    const monthBuckets = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i), 1);
      date.setHours(0, 0, 0, 0);
      const bucketStart = date.getTime();
      return {
        key: bucketStart,
        month: formatMonthLabel(bucketStart),
        sales: 0,
        leads: 0,
        wonLeads: 0,
      };
    });
    const monthMap = new Map(monthBuckets.map((bucket) => [bucket.key, bucket]));

    leads.forEach((lead) => {
      const timestamp = Number(lead.timestamp || lead.lastContactDate || 0);
      if (!timestamp) return;
      const monthKey = startOfMonth(timestamp);
      const bucket = monthMap.get(monthKey);
      if (!bucket) return;
      bucket.leads += 1;
      if (lead.status === "won") {
        bucket.wonLeads += 1;
        bucket.sales += 1000;
      }
    });

    const salesData = monthBuckets.map((bucket) => ({
      month: bucket.month,
      sales: bucket.sales,
      leads: bucket.leads,
      conversion: bucket.leads > 0 ? bucket.wonLeads / bucket.leads : 0,
    }));

    // Generate marketing data
    const marketingData = [
      { name: "Google Ads", value: marketingEvents.filter((e) => e.type === "google_ads").length, color: "#4285F4" },
      { name: "Instagram", value: marketingEvents.filter((e) => e.type === "instagram_ads").length, color: "#E4405F" },
      { name: "Facebook", value: marketingEvents.filter((e) => e.type === "facebook_ads").length, color: "#1877F2" },
      { name: "Email", value: marketingEvents.filter((e) => e.type === "email_campaign").length, color: "#34A853" },
    ];

    // Generate traffic data (last 30 days) from real lead/content/marketing activity
    const trafficBuckets = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (29 - i));
      const key = toDateKey(date.getTime());
      return {
        key,
        visitors: 0,
        pageViews: 0,
        engagements: 0,
      };
    });
    const trafficMap = new Map(trafficBuckets.map((bucket) => [bucket.key, bucket]));

    leads.forEach((lead) => {
      const timestamp = Number(lead.timestamp || lead.lastContactDate || 0);
      if (!timestamp) return;
      const bucket = trafficMap.get(toDateKey(timestamp));
      if (!bucket) return;
      bucket.visitors += 1;
      bucket.pageViews += 2;
    });

    publishedPosts.forEach((post) => {
      const timestamp = Number(post.publishedDate || post.scheduledDate || post.timestamp || 0);
      if (!timestamp) return;
      const bucket = trafficMap.get(toDateKey(timestamp));
      if (!bucket) return;
      bucket.pageViews += Number(post.impressions || 0);
      bucket.engagements += Number(post.likes || 0) + Number(post.comments || 0) + Number(post.shares || 0) + Number(post.clicks || 0);
    });

    marketingEvents.forEach((event) => {
      const timestamp = Number(event.startDate || event.timestamp || 0);
      if (!timestamp) return;
      const bucket = trafficMap.get(toDateKey(timestamp));
      if (!bucket) return;
      bucket.pageViews += Number(event.impressions || 0);
      bucket.visitors += Number(event.leads || 0);
      bucket.engagements += Number(event.clicks || 0) + Number(event.conversions || 0);
    });

    const trafficData = trafficBuckets.map((bucket) => {
      const visitors = Math.max(bucket.visitors, bucket.engagements > 0 ? Math.ceil(bucket.engagements / 5) : 0);
      const pageViews = Math.max(bucket.pageViews, visitors);
      const bounceRate = pageViews > 0 ? clampBounceRate(((pageViews - Math.min(bucket.engagements, pageViews)) / pageViews) * 100) : 0;
      return {
        date: bucket.key,
        visitors,
        pageViews,
        bounceRate,
      };
    });

    const analyticsData: AnalyticsData = {
      totalRevenue: revenue,
      totalLeads: leadsGenerated,
      conversionRate: leadsGenerated > 0 ? (leads.filter((l) => l.status === "won").length / leadsGenerated) * 100 : 0,
      activeCampaigns,
      socialMediaStats: {
        totalPosts: publishedPosts.length,
        totalImpressions,
        totalEngagements,
        averageEngagementRate,
        topPerformingPlatform: topPlatform,
      },
      contentPerformance,
      salesData,
      marketingData,
      trafficData,
      socialROI: {
        totalSpent,
        leadsGenerated,
        costPerLead,
        revenue,
        roi,
      },
    };

    return analyticsData;
  } catch (error) {
    console.error("Error getting analytics data:", error);
    // Return default/empty analytics data
    return {
      totalRevenue: 0,
      totalLeads: 0,
      conversionRate: 0,
      activeCampaigns: 0,
      socialMediaStats: {
        totalPosts: 0,
        totalImpressions: 0,
        totalEngagements: 0,
        averageEngagementRate: 0,
        topPerformingPlatform: "instagram",
      },
      contentPerformance: [],
      salesData: [],
      marketingData: [],
      trafficData: [],
      socialROI: {
        totalSpent: 0,
        leadsGenerated: 0,
        costPerLead: 0,
        revenue: 0,
        roi: 0,
      },
    };
  }
};
