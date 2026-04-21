import { db, ref, get, set, push, update, remove } from "../services/Firebase"

// Location interface
interface Location {
  id: string
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  phone?: string
  email?: string
  type: "warehouse" | "store" | "office" | "other"
  active: boolean
  coordinates?: {
    latitude: number
    longitude: number
  }
  createdAt: string
  updatedAt: string
}

// Locations
export const fetchLocations = async (basePath: string): Promise<Location[]> => {
  try {
    const locationsRef = ref(db, `${basePath}/locations`)
    const snapshot = await get(locationsRef)

    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]: [string, any]) => ({
        id,
        ...data,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching locations:", error)
    throw error
  }
}

export const createLocation = async (basePath: string, location: Omit<Location, "id">): Promise<Location> => {
  try {
    const locationsRef = ref(db, `${basePath}/locations`)
    const newLocationRef = push(locationsRef)
    const id = newLocationRef.key as string

    const newLocation = {
      ...location,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await set(newLocationRef, newLocation)
    return newLocation
  } catch (error) {
    console.error("Error creating location:", error)
    throw error
  }
}

export const updateLocation = async (
  basePath: string,
  locationId: string,
  updates: Partial<Location>,
): Promise<void> => {
  try {
    const locationRef = ref(db, `${basePath}/locations/${locationId}`)
    const updatedFields = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    await update(locationRef, updatedFields)
  } catch (error) {
    console.error("Error updating location:", error)
    throw error
  }
}

export const deleteLocation = async (basePath: string, locationId: string): Promise<void> => {
  try {
    const locationRef = ref(db, `${basePath}/locations/${locationId}`)
    await remove(locationRef)
  } catch (error) {
    console.error("Error deleting location:", error)
    throw error
  }
}

// Get location by type
export const getLocationsByType = async (basePath: string, type: Location["type"]): Promise<Location[]> => {
  try {
    const locations = await fetchLocations(basePath)
    return locations.filter((location) => location.type === type && location.active)
  } catch (error) {
    console.error("Error getting locations by type:", error)
    throw error
  }
}

// Get active locations
export const getActiveLocations = async (basePath: string): Promise<Location[]> => {
  try {
    const locations = await fetchLocations(basePath)
    return locations.filter((location) => location.active)
  } catch (error) {
    console.error("Error getting active locations:", error)
    throw error
  }
}

// Search locations
export const searchLocations = async (basePath: string, searchTerm: string): Promise<Location[]> => {
  try {
    const locations = await fetchLocations(basePath)
    return locations.filter(
      (location) =>
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.city.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  } catch (error) {
    console.error("Error searching locations:", error)
    throw error
  }
}
