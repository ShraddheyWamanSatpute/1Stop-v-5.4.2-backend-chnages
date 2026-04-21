import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  doc,
  serverTimestamp,
  where,
  deleteDoc,
} from "firebase/firestore"
import { db } from "./config"

// Lead Management
export interface Lead {
  id?: string
  name: string
  email: string
  phone: string
  restaurantName: string
  message: string
  status: "new" | "contacted" | "qualified" | "demo_scheduled" | "proposal_sent" | "won" | "lost"
  source: "website" | "google_ads" | "instagram" | "referral" | "cold_outreach" | "event"
  acquisitionCost?: number
  assignedTo?: string
  lastContactDate?: any
  nextFollowUp?: any
  timestamp?: any
  notes?: string[]
}

// Calendar Events
export interface CalendarEvent {
  id?: string
  title: string
  description?: string
  startDate: any
  endDate: any
  type: "meeting" | "interview" | "demo" | "follow_up" | "marketing_event"
  attendees?: string[]
  location?: string
  meetingLink?: string
  qrCode?: string
  leadId?: string
  status: "scheduled" | "completed" | "cancelled"
  timestamp?: any
}

// Tasks/Todo
export interface Task {
  id?: string
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "pending" | "in_progress" | "completed" | "cancelled"
  assignedTo: string
  dueDate?: any
  category:
    | "lead_follow_up"
    | "marketing"
    | "admin"
    | "content_creation"
    | "general"
    | "sales"
    | "development"
    | "support"
    | "other"
  leadId?: string
  timestamp?: any
}

// Marketing Events
export interface MarketingEvent {
  id?: string
  name: string
  description?: string
  type: "google_ads" | "instagram_ads" | "facebook_ads" | "email_campaign" | "content_post" | "event"
  startDate: any
  endDate?: any
  budget?: number
  spent?: number
  impressions?: number
  clicks?: number
  conversions?: number
  leads?: number
  status: "planned" | "active" | "completed" | "paused"
  targetAudience?: string
  adContent?: string
  timestamp?: any
}

// Notes
export interface Note {
  id?: string
  title: string
  content: string
  category: "meeting" | "lead" | "marketing" | "general" | "strategy"
  tags?: string[]
  leadId?: string
  eventId?: string
  createdbsy: string
  timestamp?: any
}

// Enhanced Content Schedule with Analytics
export interface ContentPost {
  id?: string
  platform: "instagram" | "facebook" | "linkedin" | "twitter" | "google_ads"
  content: string
  mediaUrls?: string[]
  scheduledDate: any
  publishedDate?: any
  status: "draft" | "scheduled" | "published" | "failed"
  hashtags?: string[]
  targetAudience?: string
  campaignId?: string

  // Analytics data
  impressions?: number
  reach?: number
  likes?: number
  comments?: number
  shares?: number
  clicks?: number
  saves?: number
  engagementRate?: number

  // Ad specific data (for paid posts)
  isAd?: boolean
  adbsudget?: number
  adSpent?: number
  cpm?: number
  cpc?: number
  conversions?: number

  // Platform specific data
  platformPostId?: string
  platformUrl?: string

  timestamp?: any
}

// Social Media Campaign
export interface SocialCampaign {
  id?: string
  name: string
  description?: string
  platforms: ("instagram" | "facebook" | "linkedin" | "twitter" | "google_ads")[]
  startDate: any
  endDate: any
  budget: number
  spent: number
  status: "draft" | "active" | "paused" | "completed"
  objective: "awareness" | "engagement" | "traffic" | "conversions" | "leads"
  targetAudience: {
    demographics?: string
    interests?: string[]
    location?: string
    ageRange?: string
  }
  posts: string[] // ContentPost IDs

  // Campaign Analytics
  totalImpressions?: number
  totalReach?: number
  totalEngagements?: number
  totalClicks?: number
  totalConversions?: number
  averageEngagementRate?: number
  costPerClick?: number
  costPerConversion?: number

  timestamp?: any
}

// Platform Integration Settings
export interface PlatformSettings {
  id?: string
  platform: "instagram" | "facebook" | "linkedin" | "twitter" | "google_ads"
  isConnected: boolean
  accessToken?: string
  refreshToken?: string
  accountId?: string
  accountName?: string
  permissions?: string[]
  lastSync?: any
  apiLimits?: {
    postsPerDay?: number
    postsPerHour?: number
    remaining?: number
  }
  timestamp?: any
}

// Contacts Management
export interface Contact {
  id?: string
  name: string
  email?: string
  phone?: string
  photo?: string
  company?: string
  position?: string
  howWeMet?: string
  notes?: string
  type: "staff" | "freelancer" | "partner" | "vendor" | "other"
  qrCodeId?: string
  isLead?: boolean
  socialLinks?: {
    linkedin?: string
    instagram?: string
    twitter?: string
    website?: string
  }
  timestamp?: any
}

// Personal QR Codes - Updated with adminId
export interface PersonalQR {
  id?: string
  adminId: string // Add this field to store which admin created the QR
  contactId: string
  name: string
  photo?: string
  email?: string
  phone?: string
  company?: string
  position?: string
  howWeMet?: string
  socialLinks?: {
    linkedin?: string
    instagram?: string
    twitter?: string
    website?: string
  }
  qrUrl: string
  landingPageUrl: string
  scans?: number
  isActive: boolean
  timestamp?: any
}

// Enhanced Analytics Data Interface
export interface AnalyticsData {
  totalRevenue: number
  totalLeads: number
  conversionRate: number
  activeCampaigns: number

  // Social Media Analytics
  socialMediaStats: {
    totalPosts: number
    totalImpressions: number
    totalEngagements: number
    averageEngagementRate: number
    topPerformingPlatform: string
  }

  // Content Performance
  contentPerformance: Array<{
    platform: string
    posts: number
    impressions: number
    engagements: number
    engagementRate: number
  }>

  salesData: Array<{
    month: string
    sales: number
    leads: number
    conversion: number
  }>

  marketingData: Array<{
    name: string
    value: number
    color: string
  }>

  trafficData: Array<{
    date: string
    visitors: number
    pageViews: number
    bounceRate: number
  }>

  // Social Media ROI
  socialROI: {
    totalSpent: number
    leadsGenerated: number
    costPerLead: number
    revenue: number
    roi: number
  }
}

// Lead Functions
export const addLeadAdmin = async (leadData: Omit<Lead, "id" | "timestamp">) => {
  try {
    const docRef = await addDoc(collection(db, "leads"), {
      ...leadData,
      timestamp: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding lead:", error)
    throw error
  }
}

export const getLeads = async (): Promise<Lead[]> => {
  try {
    const q = query(collection(db, "leads"), orderBy("timestamp", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Lead)
  } catch (error) {
    console.error("Error getting leads:", error)
    throw error
  }
}

export const updateLead = async (leadId: string, updates: Partial<Lead>) => {
  try {
    await updateDoc(doc(db, "leads", leadId), updates)
  } catch (error) {
    console.error("Error updating lead:", error)
    throw error
  }
}

// Calendar Functions
export const addCalendarEvent = async (eventData: Omit<CalendarEvent, "id" | "timestamp">) => {
  try {
    const docRef = await addDoc(collection(db, "calendar_events"), {
      ...eventData,
      timestamp: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding calendar event:", error)
    throw error
  }
}

export const getCalendarEvents = async (): Promise<CalendarEvent[]> => {
  try {
    const q = query(collection(db, "calendar_events"), orderBy("startDate", "asc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as CalendarEvent)
  } catch (error) {
    console.error("Error getting calendar events:", error)
    throw error
  }
}

// Task Functions
export const addTask = async (taskData: Omit<Task, "id" | "timestamp">) => {
  try {
    const docRef = await addDoc(collection(db, "tasks"), {
      ...taskData,
      timestamp: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding task:", error)
    throw error
  }
}

export const getTasks = async (): Promise<Task[]> => {
  try {
    const q = query(collection(db, "tasks"), orderBy("dueDate", "asc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Task)
  } catch (error) {
    console.error("Error getting tasks:", error)
    throw error
  }
}

export const updateTask = async (taskId: string, updates: Partial<Task>) => {
  try {
    await updateDoc(doc(db, "tasks", taskId), updates)
  } catch (error) {
    console.error("Error updating task:", error)
    throw error
  }
}

// Delete Functions
export const deleteTask = async (taskId: string) => {
  try {
    await deleteDoc(doc(db, "tasks", taskId))
  } catch (error) {
    console.error("Error deleting task:", error)
    throw error
  }
}

// Marketing Functions
export const addMarketingEvent = async (eventData: Omit<MarketingEvent, "id" | "timestamp">) => {
  try {
    const docRef = await addDoc(collection(db, "marketing_events"), {
      ...eventData,
      timestamp: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding marketing event:", error)
    throw error
  }
}

export const getMarketingEvents = async (): Promise<MarketingEvent[]> => {
  try {
    const q = query(collection(db, "marketing_events"), orderBy("startDate", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as MarketingEvent)
  } catch (error) {
    console.error("Error getting marketing events:", error)
    throw error
  }
}

export const updateMarketingEvent = async (eventId: string, updates: Partial<MarketingEvent>) => {
  try {
    await updateDoc(doc(db, "marketing_events", eventId), updates)
  } catch (error) {
    console.error("Error updating marketing event:", error)
    throw error
  }
}

export const deleteMarketingEvent = async (eventId: string) => {
  try {
    await deleteDoc(doc(db, "marketing_events", eventId))
  } catch (error) {
    console.error("Error deleting marketing event:", error)
    throw error
  }
}

// Notes Functions
export const addNote = async (noteData: Omit<Note, "id" | "timestamp">) => {
  try {
    const docRef = await addDoc(collection(db, "notes"), {
      ...noteData,
      timestamp: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding note:", error)
    throw error
  }
}

export const getNotes = async (): Promise<Note[]> => {
  try {
    const q = query(collection(db, "notes"), orderBy("timestamp", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Note)
  } catch (error) {
    console.error("Error getting notes:", error)
    throw error
  }
}

export const updateNote = async (noteId: string, updates: Partial<Note>) => {
  try {
    await updateDoc(doc(db, "notes", noteId), updates)
  } catch (error) {
    console.error("Error updating note:", error)
    throw error
  }
}

export const deleteNote = async (noteId: string) => {
  try {
    await deleteDoc(doc(db, "notes", noteId))
  } catch (error) {
    console.error("Error deleting note:", error)
    throw error
  }
}

// Enhanced Content Schedule Functions
export const addContentPost = async (postData: Omit<ContentPost, "id" | "timestamp">) => {
  try {
    const docRef = await addDoc(collection(db, "content_schedule"), {
      ...postData,
      timestamp: serverTimestamp(),
    })

    // If scheduled for immediate publishing, trigger the publishing process
    if (postData.status === "scheduled" && new Date(postData.scheduledDate) <= new Date()) {
      await publishContentPost(docRef.id)
    }

    return docRef.id
  } catch (error) {
    console.error("Error adding content post:", error)
    throw error
  }
}

export const getContentSchedule = async (): Promise<ContentPost[]> => {
  try {
    const q = query(collection(db, "content_schedule"), orderBy("scheduledDate", "asc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ContentPost)
  } catch (error) {
    console.error("Error getting content schedule:", error)
    throw error
  }
}

export const updateContentPost = async (postId: string, updates: Partial<ContentPost>) => {
  try {
    const updateData: Record<string, any> = {}

    // Manually copy each property to avoid spread operator issues
    if (updates.platform !== undefined) updateData.platform = updates.platform
    if (updates.content !== undefined) updateData.content = updates.content
    if (updates.mediaUrls !== undefined) updateData.mediaUrls = updates.mediaUrls
    if (updates.scheduledDate !== undefined) updateData.scheduledDate = updates.scheduledDate
    if (updates.publishedDate !== undefined) updateData.publishedDate = updates.publishedDate
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.hashtags !== undefined) updateData.hashtags = updates.hashtags
    if (updates.targetAudience !== undefined) updateData.targetAudience = updates.targetAudience
    if (updates.campaignId !== undefined) updateData.campaignId = updates.campaignId
    if (updates.impressions !== undefined) updateData.impressions = updates.impressions
    if (updates.reach !== undefined) updateData.reach = updates.reach
    if (updates.likes !== undefined) updateData.likes = updates.likes
    if (updates.comments !== undefined) updateData.comments = updates.comments
    if (updates.shares !== undefined) updateData.shares = updates.shares
    if (updates.clicks !== undefined) updateData.clicks = updates.clicks
    if (updates.saves !== undefined) updateData.saves = updates.saves
    if (updates.engagementRate !== undefined) updateData.engagementRate = updates.engagementRate
    if (updates.isAd !== undefined) updateData.isAd = updates.isAd
    if (updates.adbsudget !== undefined) updateData.adbsudget = updates.adbsudget
    if (updates.adSpent !== undefined) updateData.adSpent = updates.adSpent
    if (updates.cpm !== undefined) updateData.cpm = updates.cpm
    if (updates.cpc !== undefined) updateData.cpc = updates.cpc
    if (updates.conversions !== undefined) updateData.conversions = updates.conversions
    if (updates.platformPostId !== undefined) updateData.platformPostId = updates.platformPostId
    if (updates.platformUrl !== undefined) updateData.platformUrl = updates.platformUrl

    // Add timestamp if not provided
    if (updates.timestamp === undefined) {
      updateData.timestamp = serverTimestamp()
    } else {
      updateData.timestamp = updates.timestamp
    }

    await updateDoc(doc(db, "content_schedule", postId), updateData)
  } catch (error) {
    console.error("Error updating content post:", error)
    throw error
  }
}

export const deleteContentPost = async (postId: string) => {
  try {
    await deleteDoc(doc(db, "content_schedule", postId))
  } catch (error) {
    console.error("Error deleting content post:", error)
    throw error
  }
}

// Social Media Publishing Functions
export const publishContentPost = async (postId: string): Promise<boolean> => {
  try {
    // Get the post data
    const posts = await getContentSchedule()
    const post = posts.find((p) => p.id === postId)

    if (!post) {
      throw new Error("Post not found")
    }

    // Check platform settings
    const platformSettingsResult = await getPlatformSettings(post.platform)
    const platformSettings = Array.isArray(platformSettingsResult) ? null : platformSettingsResult

    if (!platformSettings?.isConnected) {
      await updateContentPost(postId, {
        status: "failed",
        publishedDate: serverTimestamp(),
      })
      return false
    }

    // Simulate API call to social media platform
    const publishResult = await publishToSocialPlatform(post, platformSettings)

    if (publishResult.success) {
      // Update post with published status and platform data
      await updateContentPost(postId, {
        status: "published",
        publishedDate: serverTimestamp(),
        platformPostId: publishResult.platformPostId,
        platformUrl: publishResult.platformUrl,
      })

      // Generate initial analytics data (simulated)
      setTimeout(() => {
        updatePostAnalytics(postId)
      }, 5000)

      return true
    } else {
      await updateContentPost(postId, {
        status: "failed",
        publishedDate: serverTimestamp(),
      })
      return false
    }
  } catch (error) {
    console.error("Error publishing content post:", error)
    await updateContentPost(postId, {
      status: "failed",
      publishedDate: serverTimestamp(),
    })
    return false
  }
}

// Simulated social media API integration
const publishToSocialPlatform = async (post: ContentPost, settings: PlatformSettings) => {
  // This would be replaced with actual API calls to each platform
  return new Promise<{ success: boolean; platformPostId?: string; platformUrl?: string }>((resolve) => {
    setTimeout(() => {
      // Simulate success/failure based on platform connection
      const success = settings && settings.isConnected ? Math.random() > 0.1 : false // 90% success rate if connected

      if (success) {
        resolve({
          success: true,
          platformPostId: `${post.platform}_${Date.now()}`,
          platformUrl: `https://${post.platform}.com/post/${Date.now()}`,
        })
      } else {
        resolve({ success: false })
      }
    }, 2000) // Simulate API delay
  })
}

// Analytics Functions
export const updatePostAnalytics = async (postId: string) => {
  try {
    // Simulate fetching analytics from social media APIs
    const analyticsData = generateMockAnalytics()

    await updateContentPost(postId, analyticsData)
  } catch (error) {
    console.error("Error updating post analytics:", error)
  }
}

const generateMockAnalytics = () => {
  return {
    impressions: Math.floor(Math.random() * 10000) + 500,
    reach: Math.floor(Math.random() * 8000) + 400,
    likes: Math.floor(Math.random() * 500) + 10,
    comments: Math.floor(Math.random() * 50) + 1,
    shares: Math.floor(Math.random() * 100) + 1,
    clicks: Math.floor(Math.random() * 200) + 5,
    saves: Math.floor(Math.random() * 50) + 1,
    engagementRate: Math.random() * 10 + 1, // 1-11%
  }
}

// Platform Settings Functions
export const addPlatformSettings = async (settingsData: Omit<PlatformSettings, "id" | "timestamp">) => {
  try {
    const docRef = await addDoc(collection(db, "platform_settings"), {
      ...settingsData,
      timestamp: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding platform settings:", error)
    throw error
  }
}

export const getPlatformSettings = async (platform?: string): Promise<PlatformSettings | PlatformSettings[] | null> => {
  try {
    let q
    if (platform) {
      q = query(collection(db, "platform_settings"), where("platform", "==", platform))
      const querySnapshot = await getDocs(q)
      const settings = querySnapshot.docs.map((doc) => {
        const data = doc.data() as Omit<PlatformSettings, "id">
        return { id: doc.id, ...data }
      })
      return settings[0] || null
    } else {
      q = query(collection(db, "platform_settings"), orderBy("timestamp", "desc"))
      const querySnapshot = await getDocs(q)
      return querySnapshot.docs.map((doc) => {
        const data = doc.data() as Omit<PlatformSettings, "id">
        return { id: doc.id, ...data }
      })
    }
  } catch (error) {
    console.error("Error getting platform settings:", error)
    throw error
  }
}

export const updatePlatformSettings = async (settingsId: string, updates: Partial<PlatformSettings>) => {
  try {
    const updateData: Record<string, any> = {}

    // Manually copy each property to avoid spread operator issues
    if (updates.platform !== undefined) updateData.platform = updates.platform
    if (updates.isConnected !== undefined) updateData.isConnected = updates.isConnected
    if (updates.accessToken !== undefined) updateData.accessToken = updates.accessToken
    if (updates.refreshToken !== undefined) updateData.refreshToken = updates.refreshToken
    if (updates.accountId !== undefined) updateData.accountId = updates.accountId
    if (updates.accountName !== undefined) updateData.accountName = updates.accountName
    if (updates.permissions !== undefined) updateData.permissions = updates.permissions
    if (updates.lastSync !== undefined) updateData.lastSync = updates.lastSync
    if (updates.apiLimits !== undefined) updateData.apiLimits = updates.apiLimits

    // Add timestamp if not provided
    if (updates.timestamp === undefined) {
      updateData.timestamp = serverTimestamp()
    } else {
      updateData.timestamp = updates.timestamp
    }

    await updateDoc(doc(db, "platform_settings", settingsId), updateData)
  } catch (error) {
    console.error("Error updating platform settings:", error)
    throw error
  }
}

// Campaign Functions
export const addSocialCampaign = async (campaignData: Omit<SocialCampaign, "id" | "timestamp">) => {
  try {
    const docRef = await addDoc(collection(db, "social_campaigns"), {
      ...campaignData,
      timestamp: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding social campaign:", error)
    throw error
  }
}

export const getSocialCampaigns = async (): Promise<SocialCampaign[]> => {
  try {
    const q = query(collection(db, "social_campaigns"), orderBy("timestamp", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as SocialCampaign)
  } catch (error) {
    console.error("Error getting social campaigns:", error)
    throw error
  }
}

// Contact Functions
export const addContact = async (contactData: Omit<Contact, "id" | "timestamp">) => {
  try {
    const docRef = await addDoc(collection(db, "contacts"), {
      ...contactData,
      timestamp: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding contact:", error)
    throw error
  }
}

export const getContacts = async (): Promise<Contact[]> => {
  try {
    const q = query(collection(db, "contacts"), orderBy("timestamp", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as Contact)
  } catch (error) {
    console.error("Error getting contacts:", error)
    throw error
  }
}

export const updateContact = async (contactId: string, updates: Partial<Contact>) => {
  try {
    await updateDoc(doc(db, "contacts", contactId), updates)
  } catch (error) {
    console.error("Error updating contact:", error)
    throw error
  }
}

export const convertContactToLead = async (contactId: string, additionalLeadData?: Partial<Lead>) => {
  try {
    const contactDoc = await getDocs(query(collection(db, "contacts"), orderBy("timestamp", "desc")))
    const contact = contactDoc.docs.find((doc) => doc.id === contactId)?.data() as Contact

    if (contact) {
      const leadData: Omit<Lead, "id" | "timestamp"> = {
        name: contact.name,
        email: contact.email || "",
        phone: contact.phone || "",
        restaurantName: contact.company || "",
        message: `Converted from contact. ${contact.howWeMet ? `How we met: ${contact.howWeMet}` : ""}`,
        status: "new",
        source: "referral",
        ...additionalLeadData,
      }

      const leadId = await addLeadAdmin(leadData)
      await updateContact(contactId, { isLead: true })
      return leadId
    }
  } catch (error) {
    console.error("Error converting contact to lead:", error)
    throw error
  }
}

// Personal QR Functions
export const addPersonalQR = async (qrData: Omit<PersonalQR, "id" | "timestamp">) => {
  try {
    const docRef = await addDoc(collection(db, "personal_qrs"), {
      ...qrData,
      timestamp: serverTimestamp(),
    })
    return docRef.id
  } catch (error) {
    console.error("Error adding personal QR:", error)
    throw error
  }
}

export const getPersonalQRs = async (): Promise<PersonalQR[]> => {
  try {
    const q = query(collection(db, "personal_qrs"), orderBy("timestamp", "desc"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as PersonalQR)
  } catch (error) {
    console.error("Error getting personal QRs:", error)
    throw error
  }
}

export const getPersonalQRByUrl = async (url: string): Promise<PersonalQR | null> => {
  try {
    // Remove query parameters from URL for matching
    const baseUrl = url.split("?")[0]

    // First try exact match
    let q = query(collection(db, "personal_qrs"), where("landingPageUrl", "==", url))
    let querySnapshot = await getDocs(q)

    // If no results, try with base URL (without query params)
    if (querySnapshot.empty) {
      q = query(collection(db, "personal_qrs"), where("landingPageUrl", "==", baseUrl))
      querySnapshot = await getDocs(q)
    }

    // If still no results, try with startsWith to match URL pattern
    if (querySnapshot.empty) {
      q = query(
        collection(db, "personal_qrs"),
        where("landingPageUrl", ">=", baseUrl),
        where("landingPageUrl", "<=", baseUrl + "\uf8ff"),
      )
      querySnapshot = await getDocs(q)
    }

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      return { id: doc.id, ...doc.data() } as PersonalQR
    }
    return null
  } catch (error) {
    console.error("Error getting personal QR by URL:", error)
    throw error
  }
}

// Analytics Functions
export const getLeadsBySource = async () => {
  try {
    const leads = await getLeads()
    const sourceBreakdown = leads.reduce(
      (acc, lead) => {
        acc[lead.source] = (acc[lead.source] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
    return sourceBreakdown
  } catch (error) {
    console.error("Error getting leads by source:", error)
    throw error
  }
}

export const calculateCAC = async () => {
  try {
    const leads = await getLeads()
    const marketingEvents = await getMarketingEvents()

    const totalSpent = marketingEvents.reduce((sum, event) => sum + (event.spent || 0), 0)
    const wonLeads = leads.filter((lead) => lead.status === "won").length

    return wonLeads > 0 ? totalSpent / wonLeads : 0
  } catch (error) {
    console.error("Error calculating CAC:", error)
    throw error
  }
}

// Enhanced Analytics Functions
export const getAnalyticsData = async (): Promise<AnalyticsData> => {
  try {
    // Get real data from Firebase
    const posts = await getContentSchedule()
    const campaigns = await getSocialCampaigns()
    const leads = await getLeads()

    // Calculate social media stats
    const publishedPosts = posts.filter((p) => p.status === "published")
    const totalImpressions = publishedPosts.reduce((sum, post) => sum + (post.impressions || 0), 0)
    const totalEngagements = publishedPosts.reduce(
      (sum, post) => sum + (post.likes || 0) + (post.comments || 0) + (post.shares || 0),
      0,
    )

    // Calculate platform performance
    const platformStats = publishedPosts.reduce(
      (acc, post) => {
        if (!acc[post.platform]) {
          acc[post.platform] = { posts: 0, impressions: 0, engagements: 0 }
        }
        acc[post.platform].posts++
        acc[post.platform].impressions += post.impressions || 0
        acc[post.platform].engagements += (post.likes || 0) + (post.comments || 0) + (post.shares || 0)
        return acc
      },
      {} as Record<string, any>,
    )

    const contentPerformance = Object.entries(platformStats).map(([platform, stats]) => ({
      platform,
      posts: stats.posts,
      impressions: stats.impressions,
      engagements: stats.engagements,
      engagementRate: stats.impressions > 0 ? (stats.engagements / stats.impressions) * 100 : 0,
    }))

    // Find top performing platform
    const topPlatform = contentPerformance.reduce(
      (top, current) => (current.engagementRate > top.engagementRate ? current : top),
      contentPerformance[0] || { platform: "instagram", engagementRate: 0 },
    )

    // Calculate social ROI
    const totalSpent = campaigns.reduce((sum, campaign) => sum + (campaign.spent || 0), 0)
    const socialLeads = leads.filter((lead) => ["instagram", "facebook", "google_ads"].includes(lead.source)).length

    return {
      totalRevenue: 45230,
      totalLeads: leads.length,
      conversionRate: 3.2,
      activeCampaigns: campaigns.filter((c) => c.status === "active").length,

      socialMediaStats: {
        totalPosts: publishedPosts.length,
        totalImpressions,
        totalEngagements,
        averageEngagementRate: totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0,
        topPerformingPlatform: topPlatform.platform,
      },

      contentPerformance,

      salesData: [
        { month: "Jan", sales: 4000, leads: 240, conversion: 6 },
        { month: "Feb", sales: 3000, leads: 198, conversion: 15.2 },
        { month: "Mar", sales: 2000, leads: 180, conversion: 11.1 },
        { month: "Apr", sales: 2780, leads: 220, conversion: 12.6 },
        { month: "May", sales: 1890, leads: 160, conversion: 11.8 },
        { month: "Jun", sales: 2390, leads: 200, conversion: 12.0 },
      ],

      marketingData: [
        { name: "Google Ads", value: 400, color: "#4285F4" },
        { name: "Facebook", value: 300, color: "#1877F2" },
        { name: "Instagram", value: 200, color: "#E4405F" },
        { name: "LinkedIn", value: 100, color: "#0A66C2" },
        { name: "Email", value: 150, color: "#34A853" },
      ],

      trafficData: [
        { date: "Mon", visitors: 120, pageViews: 340, bounceRate: 45 },
        { date: "Tue", visitors: 132, pageViews: 398, bounceRate: 42 },
        { date: "Wed", visitors: 101, pageViews: 280, bounceRate: 48 },
        { date: "Thu", visitors: 134, pageViews: 410, bounceRate: 38 },
        { date: "Fri", visitors: 90, pageViews: 250, bounceRate: 52 },
        { date: "Sat", visitors: 230, pageViews: 600, bounceRate: 35 },
        { date: "Sun", visitors: 210, pageViews: 550, bounceRate: 40 },
      ],

      socialROI: {
        totalSpent,
        leadsGenerated: socialLeads,
        costPerLead: socialLeads > 0 ? totalSpent / socialLeads : 0,
        revenue: socialLeads * 500, // Assume $500 average revenue per social lead
        roi: totalSpent > 0 ? ((socialLeads * 500 - totalSpent) / totalSpent) * 100 : 0,
      },
    }
  } catch (error) {
    console.error("Error getting analytics data:", error)
    throw error
  }
}

// Automated posting scheduler (would run as a background service)
export const checkScheduledPosts = async () => {
  try {
    const posts = await getContentSchedule()
    const now = new Date()

    const postsToPublish = posts.filter((post) => {
      const scheduledDate = post.scheduledDate?.toDate ? post.scheduledDate.toDate() : new Date(post.scheduledDate)
      return post.status === "scheduled" && scheduledDate <= now
    })

    for (const post of postsToPublish) {
      await publishContentPost(post.id!)
    }

    return postsToPublish.length
  } catch (error) {
    console.error("Error checking scheduled posts:", error)
    return 0
  }
}

export const deleteCalendarEvent = async (eventId: string) => {
  try {
    await deleteDoc(doc(db, "calendar_events", eventId))
  } catch (error) {
    console.error("Error deleting calendar event:", error)
    throw error
  }
}
