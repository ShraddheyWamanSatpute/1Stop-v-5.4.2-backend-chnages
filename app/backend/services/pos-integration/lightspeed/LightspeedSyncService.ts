/**
 * Lightspeed Sync Service
 * Handles syncing data between Lightspeed and local Stock/POS systems
 */

import { LightspeedAPIClient } from './LightspeedAPIClient'
import { LightspeedSettings, POSSyncResult } from '../types'
import { Product } from '../../../interfaces/Stock'
import { Bill } from '../../../interfaces/POS'
import * as StockDB from '../../../data/Stock'
import * as POSDB from '../../../data/POS'

// Helper to get base path (supports company/site/subsite levels)
function getBasePath(companyId: string, siteId?: string, subsiteId?: string): string {
  let path = `companies/${companyId}`
  
  if (subsiteId && siteId) {
    // Subsite level
    path = `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/data/stock`
  } else if (siteId) {
    // Site level
    path = `companies/${companyId}/sites/${siteId}/data/stock`
  } else {
    // Company level
    path = `companies/${companyId}/data/stock`
  }
  
  return path
}

function getPOSBasePath(companyId: string, siteId?: string, subsiteId?: string): string {
  let path = `companies/${companyId}`
  
  if (subsiteId && siteId) {
    // Subsite level
    path = `companies/${companyId}/sites/${siteId}/subsites/${subsiteId}/data/pos`
  } else if (siteId) {
    // Site level
    path = `companies/${companyId}/sites/${siteId}/data/pos`
  } else {
    // Company level
    path = `companies/${companyId}/data/pos`
  }
  
  return path
}

export class LightspeedSyncService {
  private apiClient: LightspeedAPIClient

  constructor() {
    this.apiClient = new LightspeedAPIClient()
  }

  private normKey(v: any): string {
    return String(v || "").trim().toLowerCase()
  }

  /**
   * Sync products from Lightspeed to local Stock system
   */
  async syncProductsToStock(
    settings: LightspeedSettings,
    companyId: string,
    siteId?: string,
    subsiteId?: string
  ): Promise<{ created: number; updated: number; errors: number }> {
    const result = { created: 0, updated: 0, errors: 0 }

    try {
      const lightspeedProducts = await this.apiClient.getProducts(settings)
      const basePath = getBasePath(companyId, siteId, subsiteId)

      // Fetch existing products once (avoid N× refetch inside loop)
      const existingProducts = await StockDB.fetchProducts(basePath)
      const bySku = new Map<string, Product>()
      const byName = new Map<string, Product>()
      for (const p of existingProducts) {
        if (p.sku) bySku.set(this.normKey(p.sku), p)
        if (p.name) byName.set(this.normKey(p.name), p)
      }

      for (const posProduct of lightspeedProducts) {
        try {
          // Map POS product to local Product format
          const localProduct: Partial<Product> = {
            name: posProduct.name,
            sku: posProduct.sku || posProduct.id,
            type: 'product',
            categoryId: posProduct.categoryId || 'default',
            subcategoryId: 'default',
            salesDivisionId: 'default',
            active: posProduct.active,
          }

          // Add sale pricing
          if (posProduct.price) {
            localProduct.sale = {
              price: posProduct.price,
              measure: 'unit',
              quantity: 1,
              supplierId: 'default',
              defaultMeasure: 'unit',
              units: [{
                measure: 'unit',
                price: posProduct.price,
                quantity: 1
              }]
            }
          }

          // Add purchase/cost pricing if available
          if (posProduct.cost) {
            localProduct.purchase = {
              price: posProduct.cost,
              measure: 'unit',
              quantity: 1,
              supplierId: 'default',
              defaultMeasure: 'unit',
              units: [{
                measure: 'unit',
                price: posProduct.cost,
                quantity: 1
              }]
            }
          }

          // Check if product already exists (by SKU or name)
          const skuKey = this.normKey(posProduct.sku || posProduct.id)
          const nameKey = this.normKey(posProduct.name)
          const existingProduct = (skuKey && bySku.get(skuKey)) || (nameKey && byName.get(nameKey)) || undefined

          if (existingProduct) {
            // Update existing product
            await StockDB.updateProduct(basePath, existingProduct.id, localProduct)
            result.updated++
          } else {
            // Create new product
            const created = await StockDB.createProduct(
              basePath,
              localProduct as Omit<Product, "id" | "createdAt" | "updatedAt">
            )
            result.created++

            // Update indexes so duplicates aren't created in the same run
            if ((created as any)?.id) {
              const createdProd = created as any as Product
              if (createdProd.sku) bySku.set(this.normKey(createdProd.sku), createdProd)
              if (createdProd.name) byName.set(this.normKey(createdProd.name), createdProd)
            }
          }
        } catch (error: any) {
          console.error(`Error syncing product ${posProduct.id}:`, error)
          result.errors++
        }
      }
    } catch (error) {
      console.error('Error syncing products:', error)
      throw error
    }

    return result
  }

  /**
   * Sync sales from Lightspeed to local POS system
   */
  async syncSalesToPOS(
    settings: LightspeedSettings,
    companyId: string,
    siteId?: string,
    subsiteId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{ created: number; updated: number; errors: number }> {
    const result = { created: 0, updated: 0, errors: 0 }

    try {
      const lightspeedSales = await this.apiClient.getSales(settings, startDate, endDate)
      const posBasePath = getPOSBasePath(companyId, siteId, subsiteId)

      // Fetch existing bills once (avoid N× refetch inside loop)
      const existingBills = await POSDB.fetchBills(posBasePath)
      const existingById = new Set(existingBills.map((b) => b.id))

      for (const posSale of lightspeedSales) {
        try {
          // Summary-only bill import (Financial APIs may not include line items).
          const raw: any = (posSale as any)?.metadata?.raw
          const tableName =
            raw?.table?.name ||
            raw?.table?.tableName ||
            raw?.table?.displayName ||
            posSale.metadata?.tableName ||
            'TAKEAWAY'
          const staffName =
            raw?.staff?.name ||
            raw?.ownerName ||
            raw?.staffName ||
            posSale.customerName ||
            'System'

          const when = Date.parse(String(posSale.date || ""))
          const createdAt = Number.isFinite(when) ? when : Date.now()

          // Deterministic ID so re-sync is idempotent (avoid createBill push IDs)
          const billId = `lightspeed_${settings.businessLocationId || 'loc'}_${posSale.id}`

          const bill: Bill = {
            id: billId,
            tableName: String(tableName),
            tableNumber: String(tableName),
            server: String(staffName),
            staffName: String(staffName),
            items: [], // summary-only in MVP
            status: posSale.paymentStatus === 'completed' ? 'paid' : 'open',
            paymentStatus: posSale.paymentStatus === 'completed' ? 'completed' : 'pending',
            total: posSale.total,
            subtotal: posSale.subtotal,
            tax: posSale.tax,
            serviceCharge: 0,
            discount: 0,
            createdAt,
            updatedAt: Date.now(),
            paymentMethod: posSale.paymentMethod,
            locationId: settings.businessLocationId ? String(settings.businessLocationId) : undefined,
            locationName: settings.businessLocationName,
          }

          // Upsert: RTDB update will create path if missing.
          const existed = existingById.has(billId)
          await POSDB.updateBill(posBasePath, billId, bill)
          if (existed) {
            result.updated++
          } else {
            existingById.add(billId)
            result.created++
          }
        } catch (error: any) {
          console.error(`Error syncing sale ${posSale.id}:`, error)
          result.errors++
        }
      }
    } catch (error) {
      console.error('Error syncing sales:', error)
      throw error
    }

    return result
  }

  /**
   * Sync inventory levels from Lightspeed to local Stock system
   */
  async syncInventoryToStock(
    settings: LightspeedSettings,
    companyId: string,
    siteId?: string,
    subsiteId?: string
  ): Promise<{ updated: number; errors: number }> {
    const result = { updated: 0, errors: 0 }

    try {
      const lightspeedInventory = await this.apiClient.getInventory(settings)
      const basePath = getBasePath(companyId, siteId, subsiteId)
      const localProducts = await StockDB.fetchProducts(basePath)

      for (const inventory of lightspeedInventory) {
        try {
          // Find matching product
          const product = localProducts.find(
            p => p.id === inventory.productId || p.sku === inventory.metadata?.lightspeedProductId
          )

          if (product) {
            // MVP: store availability as quantity field (keeps it visible in analytics/UI).
            await StockDB.updateProduct(basePath, product.id, {
              quantity: inventory.quantity,
            } as any)
            result.updated++
          }
        } catch (error: any) {
          console.error(`Error syncing inventory for product ${inventory.productId}:`, error)
          result.errors++
        }
      }
    } catch (error) {
      console.error('Error syncing inventory:', error)
      throw error
    }

    return result
  }

  /**
   * Full sync - sync all enabled data types
   */
  async fullSync(
    settings: LightspeedSettings,
    companyId: string,
    siteId?: string,
    subsiteId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<POSSyncResult> {
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
          const productResult = await this.syncProductsToStock(settings, companyId, siteId, subsiteId)
          result.products = productResult
        } catch (error: any) {
          result.success = false
          result.errors!.push({
            type: 'product',
            message: error.message || 'Failed to sync products'
          })
        }
      }

      // Sync sales
      if (settings.syncSales) {
        try {
          const salesResult = await this.syncSalesToPOS(settings, companyId, siteId, subsiteId, startDate, endDate)
          result.sales = salesResult
        } catch (error: any) {
          result.success = false
          result.errors!.push({
            type: 'sale',
            message: error.message || 'Failed to sync sales'
          })
        }
      }

      // Sync inventory
      if (settings.syncInventory) {
        try {
          const inventoryResult = await this.syncInventoryToStock(settings, companyId, siteId, subsiteId)
          result.inventory = inventoryResult
        } catch (error: any) {
          result.success = false
          result.errors!.push({
            type: 'inventory',
            message: error.message || 'Failed to sync inventory'
          })
        }
      }

      // Note: Customer syncing can be added similarly if needed
      if (settings.syncCustomers) {
        // TODO: Implement customer syncing if needed
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

