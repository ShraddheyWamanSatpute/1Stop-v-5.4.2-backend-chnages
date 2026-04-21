/**
 * Lightspeed Restaurant (K-Series) API Client
 * Handles API calls to Lightspeed Restaurant K-Series APIs
 */

import { LightspeedAuthService } from './LightspeedAuthService'
import {
  LightspeedSettings,
  POSProduct,
  POSSale,
  POSCustomer,
  POSInventory,
  POSSyncResult
} from '../types'

type KSeriesEnvironment = 'production' | 'trial'

type KSeriesItem = {
  id: number | string
  name?: string
  docketName?: string
  sku?: string
  active?: boolean
  barcode?: string
  barcodes?: string[]
  costPrice?: number
  prices?: Array<Record<string, any>>
  [key: string]: any
}

type KSeriesSaleResponse = {
  sales?: Array<Record<string, any>>
  nextPageToken?: string
}

type KSeriesItemAvailabilityResponse = {
  data?: Array<Record<string, any>>
  metadata?: Record<string, any>
}

export class LightspeedAPIClient {
  private authService: LightspeedAuthService

  constructor() {
    this.authService = new LightspeedAuthService()
  }

  private getBaseUrl(environment: KSeriesEnvironment = 'production'): string {
    return environment === 'trial' ? 'https://api.trial.lsk.lightspeed.app' : 'https://api.lsk.lightspeed.app'
  }

  /**
   * Make authenticated API request
   */
  private async makeAPIRequest<T>(
    settings: LightspeedSettings,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
  ): Promise<T> {
    const accessToken = await this.authService.getValidAccessToken(settings)
    const baseUrl = this.getBaseUrl(settings.environment || 'production')

    const headers: HeadersInit = {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Lightspeed API Error (${response.status}): ${errorText}`)
    }

    return response.json()
  }

  /**
   * Get products from Lightspeed
   * K-Series items endpoint: GET /items/v1/items?businessLocationId=...
   */
  async getProducts(settings: LightspeedSettings): Promise<POSProduct[]> {
    try {
      if (!settings.businessLocationId) {
        throw new Error('Lightspeed business location not selected. Please connect and choose a location.')
      }

      const products: POSProduct[] = []
      const pageSize = 200
      let offset = 0

      while (true) {
        const qs = new URLSearchParams({
          businessLocationId: String(settings.businessLocationId),
          offset: String(offset),
          amount: String(pageSize),
        })

        const resp = await this.makeAPIRequest<any>(settings, `/items/v1/items?${qs.toString()}`, 'GET')

        const items: KSeriesItem[] = Array.isArray(resp)
          ? resp
          : Array.isArray(resp?.items)
            ? resp.items
            : Array.isArray(resp?.data)
              ? resp.data
              : (resp ? [resp] : [])

        if (!items.length) break

        for (const it of items) {
          const rawPrices = Array.isArray(it.prices) ? it.prices : []
          const firstPrice = rawPrices[0] || {}
          const priceNum =
            typeof (firstPrice as any)?.amount === 'number'
              ? (firstPrice as any).amount
              : typeof (firstPrice as any)?.price === 'number'
                ? (firstPrice as any).price
                : typeof (firstPrice as any)?.value === 'number'
                  ? (firstPrice as any).value
                  : typeof (firstPrice as any)?.amount === 'string'
                    ? parseFloat((firstPrice as any).amount)
                    : typeof (firstPrice as any)?.price === 'string'
                      ? parseFloat((firstPrice as any).price)
                      : 0

          products.push({
            id: String(it.id ?? ''),
            name: String(it.name || it.docketName || 'Unnamed item'),
            description: it.docketName ? String(it.docketName) : undefined,
            sku: it.sku ? String(it.sku) : undefined,
            price: Number.isFinite(priceNum) ? priceNum : 0,
            cost: typeof it.costPrice === 'number' ? it.costPrice : undefined,
            barcode: it.barcode ? String(it.barcode) : undefined,
            active: it.active !== false,
            metadata: {
              lightspeedKSeries: true,
              businessLocationId: settings.businessLocationId,
              raw: it,
            },
          })
        }

        if (items.length < pageSize) break
        offset += pageSize
      }

      return products
    } catch (error) {
      console.error('Error fetching products from Lightspeed:', error)
      throw error
    }
  }

  /**
   * Get businesses + business locations for the current token.
   * K-Series endpoint: GET /o/op/data/businesses
   */
  async getBusinesses(settings: LightspeedSettings): Promise<any[]> {
    const resp = await this.makeAPIRequest<any>(settings, '/o/op/data/businesses', 'GET')
    return Array.isArray(resp) ? resp : (resp ? [resp] : [])
  }

  /**
   * Get sales from Lightspeed
   */
  async getSales(
    settings: LightspeedSettings,
    startDate?: string,
    endDate?: string
  ): Promise<POSSale[]> {
    try {
      if (!settings.businessLocationId) {
        throw new Error('Lightspeed business location not selected. Please connect and choose a location.')
      }

      // Financial v2: GET /f/v2/business-location/{id}/sales?from&to&include=...
      const fromIso = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const toIso = endDate || new Date().toISOString()

      const sales: POSSale[] = []
      let nextPageToken: string | undefined = undefined

      while (true) {
        const qs = new URLSearchParams({
          from: fromIso,
          to: toIso,
          include: 'payments,table,staff',
          pageSize: '200',
        })
        if (nextPageToken) qs.set('nextPageToken', nextPageToken)

        const resp = await this.makeAPIRequest<KSeriesSaleResponse>(
          settings,
          `/f/v2/business-location/${settings.businessLocationId}/sales?${qs.toString()}`,
          'GET'
        )

        const rows = Array.isArray(resp?.sales) ? resp.sales : []
        for (const row of rows) {
          const id = String((row as any)?.id ?? (row as any)?.receiptId ?? (row as any)?.accountReference ?? '')
          const closed = (row as any)?.timeClosed || (row as any)?.closeDate || (row as any)?.closedAt || (row as any)?.date
          const total = Number((row as any)?.total ?? (row as any)?.totalAmount ?? 0) || 0
          const tax = Number((row as any)?.tax ?? (row as any)?.totalTax ?? 0) || 0

          sales.push({
            id: id || `${Date.now()}-${Math.random()}`,
            saleNumber: String((row as any)?.saleNumber ?? (row as any)?.receiptId ?? ''),
            date: closed ? String(closed) : new Date().toISOString(),
            items: [], // raw row stored in metadata
            subtotal: Math.max(0, total - tax),
            tax,
            total,
            paymentMethod: String((row as any)?.paymentMethod ?? 'Unknown'),
            paymentStatus: 'completed',
            customerId: (row as any)?.consumer?.id ? String((row as any)?.consumer?.id) : undefined,
            customerName: (row as any)?.consumer?.name ? String((row as any)?.consumer?.name) : undefined,
            metadata: { raw: row },
          })
        }

        nextPageToken = resp?.nextPageToken
        if (!nextPageToken) break
      }

      return sales
    } catch (error) {
      console.error('Error fetching sales from Lightspeed:', error)
      throw error
    }
  }

  /**
   * Get customers from Lightspeed
   */
  async getCustomers(settings: LightspeedSettings): Promise<POSCustomer[]> {
    try {
      // K-Series customer data is not exposed via a single stable endpoint for all merchants.
      // Any consumer/customer data from Financial endpoints is stored on each sale record metadata.
      return []
    } catch (error) {
      console.error('Error fetching customers from Lightspeed:', error)
      throw error
    }
  }

  /**
   * Get inventory levels from Lightspeed
   */
  async getInventory(settings: LightspeedSettings): Promise<POSInventory[]> {
    try {
      if (!settings.businessLocationId) {
        throw new Error('Lightspeed business location not selected. Please connect and choose a location.')
      }

      // K-Series item availability endpoint works with SKU lists.
      // We fetch items first to build the SKU list, then request availability in chunks.
      const products = await this.getProducts(settings)
      const skus = products.map(p => p.sku).filter(Boolean) as string[]

      const inventories: POSInventory[] = []
      const chunkSize = 50

      for (let i = 0; i < skus.length; i += chunkSize) {
        const chunk = skus.slice(i, i + chunkSize)
        const qs = new URLSearchParams({
          businessLocationId: String(settings.businessLocationId),
          page: '0',
          size: String(chunk.length),
        })
        for (const sku of chunk) qs.append('skus', sku)

        const resp = await this.makeAPIRequest<KSeriesItemAvailabilityResponse>(
          settings,
          `/o/op/1/itemAvailability?${qs.toString()}`,
          'GET'
        )

        const rows = Array.isArray(resp?.data) ? resp.data : []
        for (const row of rows) {
          const sku = String((row as any)?.sku ?? '')
          const qty = Number((row as any)?.availableQuantity ?? (row as any)?.quantity ?? 0) || 0
          const productId = products.find(p => p.sku === sku)?.id || sku

          inventories.push({
            productId,
            quantity: qty,
            locationId: String(settings.businessLocationId),
            locationName: settings.businessLocationName,
            lastUpdated: new Date().toISOString(),
            metadata: { raw: row },
          })
        }
      }

      return inventories
    } catch (error) {
      console.error('Error fetching inventory from Lightspeed:', error)
      throw error
    }
  }

  /**
   * Full sync - fetch all enabled data types
   */
  async fullSync(settings: LightspeedSettings): Promise<POSSyncResult> {
    const result: POSSyncResult = {
      success: true,
      provider: 'lightspeed',
      syncedAt: Date.now(),
      products: { created: 0, updated: 0, errors: 0 },
      sales: { created: 0, updated: 0, errors: 0 },
      customers: { created: 0, updated: 0, errors: 0 },
      inventory: { updated: 0, errors: 0 },
      errors: []
    }

    try {
      // Sync products
      if (settings.syncProducts) {
        try {
          await this.getProducts(settings)
          // Counts would be handled by the sync service
          result.products!.created = 0 // Will be updated by sync service
        } catch (error: any) {
          result.success = false
          result.products!.errors++
          result.errors!.push({
            type: 'product',
            message: error.message || 'Failed to sync products'
          })
        }
      }

      // Sync sales (last 30 days by default)
      if (settings.syncSales) {
        try {
          const endDate = new Date().toISOString()
          const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          await this.getSales(settings, startDate, endDate)
        } catch (error: any) {
          result.success = false
          result.sales!.errors++
          result.errors!.push({
            type: 'sale',
            message: error.message || 'Failed to sync sales'
          })
        }
      }

      // Sync customers
      if (settings.syncCustomers) {
        try {
          await this.getCustomers(settings)
        } catch (error: any) {
          result.success = false
          result.customers!.errors++
          result.errors!.push({
            type: 'customer',
            message: error.message || 'Failed to sync customers'
          })
        }
      }

      // Sync inventory
      if (settings.syncInventory) {
        try {
          await this.getInventory(settings)
        } catch (error: any) {
          result.success = false
          result.inventory!.errors++
          result.errors!.push({
            type: 'inventory',
            message: error.message || 'Failed to sync inventory'
          })
        }
      }
    } catch (error: any) {
      result.success = false
      result.errors!.push({
        type: 'product',
        message: error.message || 'Sync failed'
      })
    }

    return result
  }
}

