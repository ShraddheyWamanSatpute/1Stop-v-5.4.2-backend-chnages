// Analytics Functions
import { getAnalyticsData } from "../data/Analytics";
import type { AnalyticsData } from "../interfaces/Analytics";

export const fetchAnalyticsData = async (): Promise<AnalyticsData> => {
  return await getAnalyticsData();
};
