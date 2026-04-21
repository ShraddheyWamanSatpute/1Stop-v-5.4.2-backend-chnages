"use client"
import { useState, useEffect } from "react"
import { ref, get, set } from "../services/Firebase"
import { useCompany } from "../context/CompanyContext"
// SiteContext has been merged into CompanyContext
import { db } from "../services/Firebase" // Declare db variable

// Interface for a measure
export interface Measure {
  id: string
  name: string
  quantity: string | number
  unit: string
}

// Interface for measure option used in dropdowns
export interface MeasureOption {
  id: string
  name: string
  price: number
  amount: number
  supplierId: string
}

const getUnitMeasureId = (unit: any): string => {
  const m = unit?.measure
  if (m && typeof m === 'object') {
    return String(m?.id || m?.measureId || m?.measureID || m?.name || '')
  }
  return String(unit?.measure || unit?.measureId || unit?.measureID || unit?.unitId || unit?.name || "")
}

const getUnitAmount = (unit: any): number => {
  const m = unit?.measure
  const v =
    unit?.amount ??
    unit?.quantity ??
    unit?.qty ??
    unit?.unitQty ??
    unit?.unitQuantity ??
    (m && typeof m === 'object' ? (m?.amount ?? m?.quantity ?? m?.qty) : undefined)
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 1
}

const getUnitPrice = (unit: any): number => {
  const v =
    unit?.price ??
    unit?.salePrice ??
    unit?.salesPrice ??
    unit?.sellingPrice ??
    unit?.sellPrice ??
    unit?.unitPrice
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const normalizeMeasures = (allMeasures: any): any[] => {
  if (Array.isArray(allMeasures)) return allMeasures
  if (allMeasures && typeof allMeasures === 'object') return Object.values(allMeasures)
  return []
}

const findMeasure = (allMeasures: any, key: string) => {
  const measures = normalizeMeasures(allMeasures)
  const k = String(key || '')
  if (!k) return null
  return (
    measures.find((m: any) => String(m?.id || '') === k) ||
    measures.find((m: any) => String(m?.measureID || '') === k) ||
    measures.find((m: any) => String(m?.measureId || '') === k) ||
    measures.find((m: any) => String(m?.name || '').toLowerCase() === k.toLowerCase()) ||
    null
  )
}

// Hook to fetch measures with better error handling and loading states
export const useMeasures = () => {
  const [measures, setMeasures] = useState<Measure[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { state: companyState } = useCompany()
  // Using CompanyContext for site state (after SiteContext merge)

  useEffect(() => {
    const fetchMeasures = async () => {
      if (!companyState.companyID || !companyState.selectedSiteID) {
        console.log("useMeasures - Missing company or site ID")
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        console.log("useMeasures - Fetching measures...")
        const measuresRef = ref(db, `companies/${companyState.companyID}/sites/${companyState.selectedSiteID}/data/stock/measures`)
        const snapshot = await get(measuresRef)

        if (snapshot.exists()) {
          const data = snapshot.val()
          console.log("useMeasures - Raw measures data:", data)

          const fetchedMeasures: Measure[] = Object.entries(data).map(([id, measureData]: [string, any]) => ({
            id,
            name: measureData.name || `Measure ${id}`,
            quantity: measureData.quantity || "1",
            unit: measureData.unit || "unit",
          }))

          console.log("useMeasures - Processed measures:", fetchedMeasures)
          setMeasures(fetchedMeasures)
        } else {
          console.warn("useMeasures - No measures found in database")
          setMeasures([])
        }
      } catch (err) {
        console.error("useMeasures - Error fetching measures:", err)
        setError(err instanceof Error ? err.message : "Failed to fetch measures")
        setMeasures([])
      } finally {
        setLoading(false)
      }
    }

    fetchMeasures()
  }, [companyState.companyID, companyState.selectedSiteID])

  return { measures, loading, error }
}

// Function to get purchase measure options for a specific product
export const getPurchaseMeasureOptions = (product: any, allMeasures: Measure[]): MeasureOption[] => {
  console.log("getPurchaseMeasureOptions - Starting for product:", product?.name)
  console.log("getPurchaseMeasureOptions - Available measures:", allMeasures.length)

  if (!product?.purchase) {
    console.log("getPurchaseMeasureOptions - No purchase data found")
    return []
  }

  const options: MeasureOption[] = []
  const addedMeasureIds = new Set<string>()

  const units = Array.isArray(product?.purchase?.units) ? product.purchase.units : []
  const defaultMeasureId = String(product?.purchase?.defaultMeasure || '')
  const unitForDefault = units.find((u: any) => getUnitMeasureId(u) === defaultMeasureId) || null
  const defaultPrice = product?.purchase?.price ?? (unitForDefault ? getUnitPrice(unitForDefault) : undefined)
  const defaultAmount = product?.purchase?.amount ?? product?.purchase?.quantity ?? (unitForDefault ? getUnitAmount(unitForDefault) : undefined)

  // Add default measure if it exists
  if (defaultMeasureId) {
    const measure = findMeasure(allMeasures, defaultMeasureId)
    if (measure) {
      const canonicalId = String((measure as any)?.id || defaultMeasureId)
      options.push({
        id: canonicalId,
        name: measure.name,
        price: Number(defaultPrice) || 0,
        amount: Number(defaultAmount) || 1,
        supplierId: product.purchase.defaultSupplier || "",
      })
      addedMeasureIds.add(canonicalId)
      console.log("getPurchaseMeasureOptions - Added default measure:", measure.name)
    }
  }

  // Add units if they exist
  if (units.length > 0) {
    console.log("getPurchaseMeasureOptions - Processing units:", units.length)

    units.forEach((unit: any, index: number) => {
      const unitMeasureId = getUnitMeasureId(unit)
      const resolved = findMeasure(allMeasures, unitMeasureId)
      const canonicalId = resolved ? String((resolved as any)?.id || unitMeasureId) : unitMeasureId
      const canonicalName = resolved ? String((resolved as any)?.name || unitMeasureId) : unitMeasureId
      if (canonicalId && !addedMeasureIds.has(canonicalId)) {
        if (resolved) {
          options.push({
            id: canonicalId,
            name: canonicalName,
            price: getUnitPrice(unit),
            amount: getUnitAmount(unit),
            supplierId: unit.supplierId || "",
          })
          addedMeasureIds.add(canonicalId)
          console.log(`getPurchaseMeasureOptions - Added unit ${index}:`, canonicalName)
        } else {
          options.push({
            id: canonicalId,
            name: canonicalName,
            price: getUnitPrice(unit),
            amount: getUnitAmount(unit),
            supplierId: unit.supplierId || "",
          })
          addedMeasureIds.add(canonicalId)
          console.warn(`getPurchaseMeasureOptions - Measure not found for unit ${index}:`, unitMeasureId)
        }
      }
    })
  }

  console.log("getPurchaseMeasureOptions - Final options:", options.length)
  return options
}

// Function to get sales measure options for a specific product
export const getSalesMeasureOptions = (product: any, allMeasures: Measure[]): MeasureOption[] => {
  console.log("getSalesMeasureOptions - Starting for product:", product?.name)
  console.log("getSalesMeasureOptions - Available measures:", allMeasures.length)

  if (!product?.sale) {
    console.log("getSalesMeasureOptions - No sale data found")
    return []
  }

  const units = Array.isArray(product?.sale?.units) ? product.sale.units : []
  const rawDefault = String(product?.sale?.defaultMeasure || product?.sale?.measure || '')

  const options: MeasureOption[] = []
  const addedMeasureIds = new Set<string>()

  if (units.length > 0) {
    console.log("getSalesMeasureOptions - Processing units:", units.length)
    units.forEach((unit: any, index: number) => {
      const unitMeasureKey = getUnitMeasureId(unit)
      const resolved = findMeasure(allMeasures, unitMeasureKey)
      const canonicalId = resolved ? String((resolved as any)?.id || unitMeasureKey) : unitMeasureKey
      const canonicalName = resolved ? String((resolved as any)?.name || unitMeasureKey) : unitMeasureKey
      if (canonicalId && !addedMeasureIds.has(canonicalId)) {
        options.push({
          id: canonicalId,
          name: canonicalName,
          price: getUnitPrice(unit),
          amount: getUnitAmount(unit),
          supplierId: "",
        })
        addedMeasureIds.add(canonicalId)
        console.log(`getSalesMeasureOptions - Added unit ${index}:`, canonicalName)
      }
    })
  }

  // Ensure default is present (and first)
  const resolvedDefault = rawDefault ? findMeasure(allMeasures, rawDefault) : null
  const defaultId = String((resolvedDefault as any)?.id || rawDefault || '')
  const defaultName = String((resolvedDefault as any)?.name || rawDefault || '')
  const existingDefault =
    (defaultId ? options.find((o) => String(o.id) === defaultId) : undefined) ||
    (defaultName ? options.find((o) => String(o.name).toLowerCase() === defaultName.toLowerCase()) : undefined)

  if (!existingDefault && (defaultId || defaultName)) {
    const defaultAmount = product?.sale?.amount ?? product?.sale?.quantity
    options.unshift({
      id: defaultId || defaultName,
      name: defaultName || defaultId,
      price: Number(product?.sale?.price ?? 0) || 0,
      amount: Number(defaultAmount) || 1,
      supplierId: "",
    })
  } else if (existingDefault) {
    const rest = options.filter((o) => o !== existingDefault)
    options.splice(0, options.length, existingDefault, ...rest)
  }

  console.log("getSalesMeasureOptions - Final options:", options.length)
  return options
}

// Helper function to validate and fix quantity
const validateQuantity = (quantity: string | number): string => {
  const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity
  return (numQuantity <= 0 ? 1 : numQuantity).toString()
}

// Function to create sample measures if none exist
export const createSampleMeasures = async (companyID: string, siteID: string): Promise<void> => {
  console.log("createSampleMeasures - Creating sample measures...")
  const measuresRef = ref(db, `companies/${companyID}/sites/${siteID}/data/stock/measures`)

  const sampleMeasures = {
    measure1: {
      name: "Kilogram",
      quantity: validateQuantity("1"),
      unit: "kg",
    },
    measure2: {
      name: "Gram",
      quantity: validateQuantity("1"),
      unit: "g",
    },
    measure3: {
      name: "Litre",
      quantity: validateQuantity("1"),
      unit: "l",
    },
    measure4: {
      name: "Millilitre",
      quantity: validateQuantity("1"),
      unit: "ml",
    },
    measure5: {
      name: "Single Item",
      quantity: validateQuantity("1"),
      unit: "single",
    },
    measure6: {
      name: "Bottle",
      quantity: validateQuantity("1"),
      unit: "single",
    },
    measure7: {
      name: "Shot",
      quantity: validateQuantity("25"),
      unit: "ml",
    },
    measure8: {
      name: "Pack",
      quantity: validateQuantity("1"),
      unit: "single",
    },
    measure9: {
      name: "Piece",
      quantity: validateQuantity("1"),
      unit: "single",
    },
    measure10: {
      name: "Portion",
      quantity: validateQuantity("1"),
      unit: "single",
    },
  }

  try {
    await set(measuresRef, sampleMeasures)
    console.log("createSampleMeasures - Sample measures created successfully!")
  } catch (error) {
    console.error("createSampleMeasures - Error creating sample measures:", error)
    throw error
  }
}

// Function to get all measures for a company/site
export const fetchAllMeasures = async (companyID: string, siteID: string): Promise<Measure[]> => {
  if (!companyID || !siteID) {
    console.warn("fetchAllMeasures - Missing companyID or siteID")
    return []
  }

  try {
    const measuresRef = ref(db, `companies/${companyID}/sites/${siteID}/data/stock/measures`)
    const snapshot = await get(measuresRef)

    if (snapshot.exists()) {
      const data = snapshot.val()
      const measures: Measure[] = Object.entries(data).map(([id, measureData]: [string, any]) => ({
        id,
        name: measureData.name || `Measure ${id}`,
        quantity: validateQuantity(measureData.quantity || "1"),
        unit: measureData.unit || "unit",
      }))

      console.log("fetchAllMeasures - Fetched measures:", measures.length)
      return measures
    } else {
      console.warn("fetchAllMeasures - No measures found, creating sample data...")
      await createSampleMeasures(companyID, siteID)

      // Fetch again after creating sample data
      const newSnapshot = await get(measuresRef)
      if (newSnapshot.exists()) {
        const data = newSnapshot.val()
        const measures: Measure[] = Object.entries(data).map(([id, measureData]: [string, any]) => ({
          id,
          name: measureData.name || `Measure ${id}`,
          quantity: validateQuantity(measureData.quantity || "1"),
          unit: measureData.unit || "unit",
        }))

        console.log("fetchAllMeasures - Created and fetched measures:", measures.length)
        return measures
      }
    }
  } catch (error) {
    console.error("fetchAllMeasures - Error fetching measures:", error)
  }

  return []
}
