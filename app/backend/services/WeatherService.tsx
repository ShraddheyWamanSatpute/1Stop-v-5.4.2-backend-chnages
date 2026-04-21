import { getDatabase, ref, set, get } from "firebase/database";
import { debugWarn } from "../utils/debugLog";
import { APP_KEYS } from "../config/keys";

interface WeatherData {
  temperature: number;
  condition: string;
  icon: string;
  timestamp: number;
}

interface CachedWeatherData {
  [date: string]: WeatherData;
}

interface WeatherCache {
  [cityKey: string]: {
    data: CachedWeatherData;
    lastFetched: number;
  };
}

// Cache weather data for 30 minutes
const CACHE_DURATION_MS = 30 * 60 * 1000;

/**
 * Fetches weather data for a specific city, using cache when available
 * @param city City name
 * @param country Country code (optional)
 * @param companyId Company ID for caching
 * @param siteId Site ID for caching
 * @returns Weather data for the next 5 days
 */
export const fetchWeatherForCity = async (
  city: string,
  country: string = "",
  companyId: string,
  siteId: string
): Promise<CachedWeatherData | null> => {
  try {
    const db = getDatabase();
    const cacheRef = ref(db, `weatherCache/${companyId}/${siteId}`);
    const cityKey = `${city.toLowerCase()},${country.toLowerCase()}`;
    
    // Check if we have cached data
    const snapshot = await get(cacheRef);
    const cache: WeatherCache = snapshot.exists() ? snapshot.val() : {};
    
    // If we have cached data that's less than 30 minutes old, use it
    if (
      cache[cityKey] && 
      cache[cityKey].lastFetched && 
      Date.now() - cache[cityKey].lastFetched < CACHE_DURATION_MS
    ) {
      return cache[cityKey].data;
    }
    
    // Otherwise fetch new data using Google Geocoding (via Maps key) + OpenWeather
    const GOOGLE_API_KEY = APP_KEYS.google.mapsApiKey;
    
    if (!GOOGLE_API_KEY) {
      debugWarn("WeatherService: VITE_GOOGLE_MAPS_API_KEY not configured");
      return null;
    }
    
    try {
      // First, get coordinates using Google Geocoding API
      const baseGeocode = `https://maps.googleapis.com/maps/api/geocode/json`;
      const qsWithCountry = new URLSearchParams({
        address: city,
        region: (country || 'us').toLowerCase(),
        language: 'en',
        key: GOOGLE_API_KEY,
      });
      if (country) qsWithCountry.append('components', `country:${country}`);
      const qsNoCountry = new URLSearchParams({
        address: city,
        region: 'us',
        language: 'en',
        key: GOOGLE_API_KEY,
      });

      let geocodeResponse = await fetch(`${baseGeocode}?${qsWithCountry.toString()}`);
      let geocodeData = await geocodeResponse.json();
      if (!geocodeResponse.ok) {
        throw new Error(`Geocoding HTTP error: ${geocodeResponse.status}`);
      }
      if (geocodeData.status && geocodeData.status !== 'OK') {
        if (geocodeData.status === 'ZERO_RESULTS') {
          // Retry without country
          geocodeResponse = await fetch(`${baseGeocode}?${qsNoCountry.toString()}`);
          geocodeData = await geocodeResponse.json();
        } else {
          const msg = geocodeData.error_message ? ` (${geocodeData.error_message})` : '';
          throw new Error(`Geocoding API status ${geocodeData.status}${msg}`);
        }
      }
      if (!geocodeData.results || geocodeData.results.length === 0) {
        const attempted = country ? `${city},${country}` : city;
        throw new Error(`No location found for ${attempted}`);
      }
      
      const { lat, lng } = geocodeData.results[0].geometry.location;
      
      // Call Google Maps Platform Weather API - Daily Forecast (up to 10 days)
      const days = 5;
      const weatherUrl = `https://weather.googleapis.com/v1/forecast/days:lookup?key=${GOOGLE_API_KEY}&location.latitude=${lat}&location.longitude=${lng}&days=${days}`;
      const weatherResponse = await fetch(weatherUrl);
      
      if (!weatherResponse.ok) {
        throw new Error(`Weather API error: ${weatherResponse.status}`);
      }
      
      const data = await weatherResponse.json();
      
      // Process Google Weather API daily forecast
      const processedData: CachedWeatherData = {};
      const daysArr = (data?.forecastDays || []) as any[];
      const toDateStr = (y: number, m: number, d: number) => {
        const mm = `${m}`.padStart(2, '0');
        const dd = `${d}`.padStart(2, '0');
        return `${y}-${mm}-${dd}`;
      };
      daysArr.forEach((day: any) => {
        const disp = day?.displayDate;
        if (!disp) return;
        const date = toDateStr(disp.year, disp.month, disp.day);
        const daytime = day?.daytimeForecast;
        const maxTemp = day?.maxTemperature?.degrees ?? daytime?.temperature?.degrees;
        const conditionText = daytime?.weatherCondition?.description?.text || day?.daytimeForecast?.weatherCondition?.type || 'Unknown';
        const iconBase = daytime?.weatherCondition?.iconBaseUri || '';
        processedData[date] = {
          temperature: Math.round(Number(maxTemp ?? 0)),
          condition: String(conditionText),
          icon: String(iconBase),
          timestamp: Date.now(),
        };
      });
      
      // Update cache
      if (!cache[cityKey]) {
        cache[cityKey] = {
          data: {},
          lastFetched: 0
        };
      }
      
      cache[cityKey].data = processedData;
      cache[cityKey].lastFetched = Date.now();
      
      await set(cacheRef, cache);
      
      return processedData;
    } catch (weatherError) {
      console.error("Error fetching weather from APIs:", weatherError);
      return null;
    }
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return null;
  }
};

/**
 * Gets company location data from the database
 * @param companyId Company ID
 * @returns Array of company locations
 */
export const getCompanyLocations = async (companyId: string): Promise<Array<{city: string, country: string, siteId: string}>> => {
  try {
    const db = getDatabase();
    const locationsRef = ref(db, `companies/${companyId}/locations`);
    const snapshot = await get(locationsRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const locations = snapshot.val();
    return Object.entries(locations).map(([siteId, location]: [string, any]) => ({
      city: location.city || "London",
      country: location.country || "UK",
      siteId
    }));
  } catch (error) {
    console.error("Error fetching company locations:", error);
    return [];
  }
};

/**
 * Fetches weather data for all company locations
 * @param companyId Company ID
 * @returns Weather data for all company locations
 */
export const fetchWeatherForCompany = async (companyId: string): Promise<Record<string, CachedWeatherData>> => {
  try {
    const locations = await getCompanyLocations(companyId);
    const weatherData: Record<string, CachedWeatherData> = {};
    
    // Fetch weather data for each location
    for (const location of locations) {
      const data = await fetchWeatherForCity(
        location.city,
        location.country,
        companyId,
        location.siteId
      );
      
      if (data) {
        weatherData[location.siteId] = data;
      }
    }
    
    return weatherData;
  } catch (error) {
    console.error("Error fetching weather for company:", error);
    return {};
  }
};
