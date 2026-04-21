"use client"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  Grid,
  InputAdornment,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Breadcrumbs,
  Link,
  Alert,
  Snackbar,
  Autocomplete,
  IconButton,
  Paper,
  Tabs,
  Tab,
  CircularProgress,
  Switch,
  Chip,
} from "@mui/material"
import {
  ArrowBack as ArrowBackIcon,
  CloudUpload as CloudUploadIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from "@mui/icons-material"
// All company state is now handled through StockContext
import type { Product, TabPanelProps } from "../../../backend/interfaces/Stock"
import { useStock } from "../../../backend/context/StockContext"
import { usePermission } from "../../hooks/usePermission"

// TabPanelProps interface moved to backend


function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`product-tabpanel-${index}`}
      aria-labelledby={`product-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const StockItemForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { canView, canEdit, canDelete } = usePermission()
  const canViewPage = canView("stock", "items")
  const canMutate = canEdit("stock", "items")
  const canRemove = canDelete("stock", "items")
  const { 
    state: stockState, 
    saveProduct: contextSaveProduct,
    fetchMeasureData: contextFetchMeasureData,
    fetchCourses: contextFetchCourses,
  } = useStock()
  const { products, suppliers, measures, salesDivisions, categories, subcategories } = stockState

  const [tabValue, setTabValue] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [, setImageFile] = useState<File | null>(null)
  const [finalQuantity, setFinalQuantity] = useState<number>(0)
  const [, setFinalMeasureUnit] = useState<string>("")
  const [courseOptions, setCourseOptions] = useState<any[]>([])

  // Add tax percentage field
  const [taxPercent, setTaxPercent] = useState<number>(0)

  // Add validation state
  const [validationErrors, setValidationErrors] = useState<{
    name?: string
    purchasePrice?: string
    salesPrice?: string
    duplicatePurchaseUnits?: string
    duplicateSalesUnits?: string
  }>({})

  // Add new state variables
  const [recipeMeasureTab, setRecipeMeasureTab] = useState<number>(0)
  const [salesTaxPercent, setSalesTaxPercent] = useState<number>(0)
  const [hasDuplicatePurchaseUnits, setHasDuplicatePurchaseUnits] = useState<boolean>(false)
  const [hasDuplicateSalesUnits, setHasDuplicateSalesUnits] = useState<boolean>(false)
  const [calculatedCostPerBaseUnit, setCalculatedCostPerBaseUnit] = useState<number>(0)
  const [calculatedGrossProfit, setCalculatedGrossProfit] = useState<number>(0)
  const [calculatedProfitMargin, setCalculatedProfitMargin] = useState<number>(0)

  // Add these helper functions after the state declarations:
  // Helper function to get conversion group (weight, volume, or count)
  const getConversionGroup = (unit: string): string => {
    const u = unit.toLowerCase()
    if (u === "kg" || u === "g") return "g"
    if (u === "l" || u === "ml" || u === "litre" || u === "liter") return "ml"
    return u // for counts like "single", "unit", etc.
  }

  // Helper function to get compatible measures for purchase units
  const getCompatiblePurchaseMeasures = (currentUnitIndex?: number): any[] => {
    if (!measures || measures.length === 0) return []
    
    // If no units exist yet, or this is the first unit, show all measures
    if (!product.purchase?.units || product.purchase.units.length === 0) {
      return measures
    }
    
    // For the first unit (index 0), always show all measures to let user pick the type
    if (currentUnitIndex === 0) {
      return measures
    }
    
    // For additional units, get the first unit's measure to determine the conversion group
    const firstUnitMeasureId = product.purchase.units[0]?.measure
    if (!firstUnitMeasureId) return measures // If first unit has no measure selected, show all
    
    const firstMeasure = measures.find((m) => m.id === firstUnitMeasureId)
    if (!firstMeasure) return measures // If measure not found, show all
    
    const conversionGroup = getConversionGroup(firstMeasure.unit)
    const compatibleMeasures = measures.filter((m) => getConversionGroup(m.unit) === conversionGroup)
    
    // Always return at least the current unit's measure if it exists
    return compatibleMeasures.length > 0 ? compatibleMeasures : measures
  }

  // Helper function to get compatible measures for sale units
  const getCompatibleSaleMeasures = (currentUnitIndex?: number): any[] => {
    if (!measures || measures.length === 0) return []
    
    // If no units exist yet, or this is the first unit, show all measures
    if (!product.sale?.units || product.sale.units.length === 0) {
      return measures
    }
    
    // For the first unit (index 0), always show all measures to let user pick the type
    if (currentUnitIndex === 0) {
      return measures
    }
    
    // For additional units, get the first unit's measure to determine the conversion group
    const firstUnitMeasureId = product.sale.units[0]?.measure
    if (!firstUnitMeasureId) return measures // If first unit has no measure selected, show all
    
    const firstMeasure = measures.find((m) => m.id === firstUnitMeasureId)
    if (!firstMeasure) return measures // If measure not found, show all
    
    const conversionGroup = getConversionGroup(firstMeasure.unit)
    const compatibleMeasures = measures.filter((m) => getConversionGroup(m.unit) === conversionGroup)
    
    // Always return at least the current unit's measure if it exists
    return compatibleMeasures.length > 0 ? compatibleMeasures : measures
  }

  const getMeasureBaseUnit = (measureId: string): string => {
    const measure = measures.find((m) => m.id === measureId)
    if (!measure) return ""

    // Normalize units to base units
    const unit = measure.unit.toLowerCase()
    if (unit === "kg") return "g"
    if (unit === "l") return "ml"
    return unit
  }

  const checkDuplicatePurchaseUnits = (): boolean => {
    if (!product.purchase?.units) return false

    const combinations = new Set<string>()
    let hasDuplicates = false

    product.purchase.units.forEach((unit) => {
      const key = `${unit.supplierId}-${unit.measure}`
      if (combinations.has(key)) {
        hasDuplicates = true
      } else {
        combinations.add(key)
      }
    })

    return hasDuplicates
  }

  const checkDuplicateSalesUnits = (): boolean => {
    if (!product.sale?.units) return false

    const measures = new Set<string>()
    let hasDuplicates = false

    product.sale.units.forEach((unit) => {
      if (measures.has(unit.measure)) {
        hasDuplicates = true
      } else {
        measures.add(unit.measure)
      }
    })

    return hasDuplicates
  }

  // Initialize product state
  const [product, setProduct] = useState<Product>({
    id: "",
    name: "",
    image: "",
    description: "",
    salesDivisionId: "",
    categoryId: "",
    subcategoryId: "",
    measureId: "",
    type: "purchase-only",
    course: "",
    purchase: {
      price: 0,
      measure: "",
      quantity: 1,
      supplierId: "",
      units: [],
      defaultSupplier: "",
      defaultMeasure: "",
    },
    sale: {
      price: 0,
      measure: "",
      quantity: 1,
      supplierId: "",
      units: [],
      defaultSupplier: "",
      defaultMeasure: "",
    },
    finalMeasure: "",
    yield: 0,
    ingredients: [],
    // Required properties from Product interface
    salesPrice: 0,
    purchasePrice: 0,
    predictedStock: 0,
    // Optional properties
    useDefaultRecipe: true,
    recipeFactor: 1,
  })

  // Update validation on form changes
  useEffect(() => {
    const errors: {
      name?: string
      purchasePrice?: string
      salesPrice?: string
      duplicatePurchaseUnits?: string
      duplicateSalesUnits?: string
    } = {}

    if (!product.name) {
      errors.name = "Product name is required"
    }

    if (product.type !== "purchase-only" && product.sale?.units.some((unit) => !unit.price || unit.price <= 0)) {
      errors.salesPrice = "All sales prices must be greater than zero"
    }

    // Check for duplicate purchase units
    const hasDuplicatePurchase = checkDuplicatePurchaseUnits()
    setHasDuplicatePurchaseUnits(hasDuplicatePurchase)
    if (hasDuplicatePurchase) {
      errors.duplicatePurchaseUnits = "Duplicate supplier and measure combinations are not allowed"
    }

    // Check for duplicate sales units
    const hasDuplicateSales = checkDuplicateSalesUnits()
    setHasDuplicateSalesUnits(hasDuplicateSales)
    if (hasDuplicateSales) {
      errors.duplicateSalesUnits = "Duplicate sales measures are not allowed"
    }

    setValidationErrors(errors)
  }, [product])

  // Add duplicate name check
  useEffect(() => {
    if (product.name && !id) {
      const isDuplicate = products.some((p) => p.name.toLowerCase() === product.name.toLowerCase() && p.id !== id)

      if (isDuplicate) {
        setValidationErrors((prev) => ({
          ...prev,
          name: "A product with this name already exists",
        }))
      }
    }
  }, [product.name, products, id])

  // Load product data if editing
  useEffect(() => {
    if (id) {
      setLoading(true)
      const productToEdit = products.find((p) => p.id === id)
      if (productToEdit) {
        setProduct(productToEdit)
        if (productToEdit.finalMeasure) {
          setFinalQuantity(productToEdit.yield || 0)
        }
        setTaxPercent(productToEdit.taxPercent || 0)
        setSalesTaxPercent(productToEdit.salesTaxPercent || 0)
      }
      setLoading(false)
    } else {
      // Set defaults for new product
      setProduct((prev) => ({
        ...prev,
        measureId: measures[0]?.id || "",
        supplierId: suppliers[0]?.id || "",
        purchase: {
          ...prev.purchase,
          price: prev.purchase?.price || 0,
          quantity: prev.purchase?.quantity || 1,
          measure: measures[0]?.id || "",
          supplierId: suppliers[0]?.id || "",
          defaultMeasure: measures[0]?.id || "",
          defaultSupplier: suppliers[0]?.id || "",
          units: [
            {
              price: 0,
              measure: measures[0]?.id || "",
              supplierId: suppliers[0]?.id || "",
              quantity: 1,
            },
          ],
        },
        sale: {
          ...prev.sale,
          price: prev.sale?.price || 0,
          quantity: prev.sale?.quantity || 1,
          measure: measures[0]?.id || "",
          supplierId: suppliers[0]?.id || "",
          defaultMeasure: measures[0]?.id || "",
          defaultSupplier: suppliers[0]?.id || "",
          units: [
            {
              price: 0,
              measure: measures[0]?.id || "",
              supplierId: suppliers[0]?.id || "",
              quantity: 1,
            },
          ],
        },
      }))
    }
  }, [id, products, measures, suppliers])

  // Update final measure base unit
  useEffect(() => {
    if (product.finalMeasure) {
      contextFetchMeasureData(product.finalMeasure)
        .then((conv) => setFinalMeasureUnit(conv.unit))
        .catch((error) => console.error("Final measure fetch error:", error))
    }
  }, [product.finalMeasure])

  // Recalculate yield using conversion logic
  useEffect(() => {
    if (
      product.finalMeasure &&
      product.ingredients &&
      product.ingredients.length > 0
    ) {
      ;(async () => {
        try {
          const finalConv = await contextFetchMeasureData(product.finalMeasure!)
          const finalBase = finalQuantity * finalConv.totalQuantity
          let totalIngredientsBase = 0
          for (const ing of product.ingredients!) {
            if (ing.measure) {
              const conv = await contextFetchMeasureData(ing.measure!)
              totalIngredientsBase += conv.totalQuantity * Number(ing.quantity)
            }
          }
          const newYield = totalIngredientsBase ? finalBase / totalIngredientsBase : 0
          setProduct((prev) => ({ ...prev, yield: newYield }))
        } catch (error) {
          console.error("Yield calculation error:", error)
        }
      })()
    }
  }, [product.ingredients, product.finalMeasure, finalQuantity])

  // Load courses from context
  useEffect(() => {
    const loadCourses = async () => {
      try {
        const courses = await contextFetchCourses()
        setCourseOptions(courses)
      } catch (error) {
        console.error("Error loading courses:", error)
      }
    }
    loadCourses()
  }, [contextFetchCourses])

  // Calculate financial metrics when purchase/sales units change
  useEffect(() => {
    const calculateFinancials = async () => {
      if (product.type === "purchase-sell" && getDefaultPurchaseUnit() && getDefaultSalesUnit()) {
        try {
          const costPerUnit = await calculateCostPerBaseUnit()
          const grossProfit = await calculateGrossProfit()
          const profitMargin = await calculateProfitMargin()

          setCalculatedCostPerBaseUnit(costPerUnit)
          setCalculatedGrossProfit(grossProfit)
          setCalculatedProfitMargin(profitMargin)
        } catch (error) {
          console.error("Error calculating financials:", error)
        }
      } else {
        setCalculatedCostPerBaseUnit(0)
        setCalculatedGrossProfit(0)
        setCalculatedProfitMargin(0)
      }
    }

    calculateFinancials()
  }, [
    product.purchase?.units,
    product.sale?.units,
    product.purchase?.defaultMeasure,
    product.sale?.defaultMeasure,
    // All data operations are now handled through StockContext
  ])

  // Filtered categories based on selected sales division
  const getCategorySalesDivisionId = (c: any): string =>
    c?.salesDivisionId || c?.parentDivisionId || c?.parentSalesDivisionId || ""
  const getSubcategoryParentCategoryId = (s: any): string =>
    s?.parentCategoryId || s?.categoryId || ""

  const filteredCategories = categories
    .filter((cat: any) => !cat?.kind || cat.kind === "Category")
    .filter((cat: any) => (product.salesDivisionId ? getCategorySalesDivisionId(cat) === product.salesDivisionId : true))

  // Filtered subcategories based on selected category (preferred) or sales division
  const filteredSubcategories = subcategories
    .filter((sc: any) => !sc?.kind || sc.kind === "Subcategory")
    .filter((sc: any) => {
    if (product.categoryId) return getSubcategoryParentCategoryId(sc) === product.categoryId
    if (product.salesDivisionId) {
      const parentCategory = categories.find((c: any) => c.id === getSubcategoryParentCategoryId(sc))
      return getCategorySalesDivisionId(parentCategory) === product.salesDivisionId
    }
    return true
  })

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0])
      const reader = new FileReader()
      reader.onload = () => {
        setProduct((prev) => ({ ...prev, image: reader.result as string }))
      }
      reader.readAsDataURL(e.target.files[0])
    }
  }

  // Add a new purchase unit
  const addPurchaseUnit = () => {
    setProduct((prev) => ({
      ...prev,
      purchase: {
        ...prev.purchase!,
        units: [
          ...prev.purchase!.units,
          {
            price: 0,
            measure: measures[0]?.id || "",
            supplierId: suppliers[0]?.id || "",
            quantity: 1,
          },
        ],
      },
    }))
  }

  // Add a new sales unit
  const addSalesUnit = () => {
    setProduct((prev) => ({
      ...prev,
      sale: {
        ...prev.sale!,
        units: [
          ...prev.sale!.units,
          {
            price: 0,
            measure: measures[0]?.id || "",
            supplierId: suppliers[0]?.id || "",
            quantity: 1,
          },
        ],
      },
    }))
  }

  // Add a new ingredient to a specific sale unit's recipe
  const addIngredient = (unitIndex: number) => {
    setProduct((prev) => {
      const updatedUnits = [...(prev.sale?.units || [])]
      const unit = updatedUnits[unitIndex]
      
      updatedUnits[unitIndex] = {
        ...unit,
        recipe: {
          ...(unit.recipe || {}),
          ingredients: [
            ...(unit.recipe?.ingredients || []),
            { type: "", itemId: "", measure: "", quantity: 0 }
          ]
        }
      }
      
      return {
        ...prev,
        sale: {
          ...prev.sale!,
          units: updatedUnits
        }
      }
    })
  }

  // Update an ingredient in a specific sale unit's recipe
  const updateIngredient = (unitIndex: number, ingredientIndex: number, field: string, value: any) => {
    setProduct((prev) => {
      const updatedUnits = [...(prev.sale?.units || [])]
      const unit = updatedUnits[unitIndex]
      const updatedIngredients = [...(unit.recipe?.ingredients || [])]
      
      updatedIngredients[ingredientIndex] = {
        ...updatedIngredients[ingredientIndex],
        [field]: value,
      }

      // Auto-fill measure if product is selected
      if (field === "itemId" && typeof value === "string") {
        const selectedProduct = products.find(p => p.id === value)
        if (selectedProduct?.purchase?.defaultMeasure) {
          updatedIngredients[ingredientIndex].measure = selectedProduct.purchase.defaultMeasure
        }
      }

      updatedUnits[unitIndex] = {
        ...unit,
        recipe: {
          ...(unit.recipe || {}),
          ingredients: updatedIngredients
        }
      }

      return {
        ...prev,
        sale: {
          ...prev.sale!,
          units: updatedUnits
        }
      }
    })
  }

  // Remove an ingredient from a specific sale unit's recipe
  const removeIngredient = (unitIndex: number, ingredientIndex: number) => {
    setProduct((prev) => {
      const updatedUnits = [...(prev.sale?.units || [])]
      const unit = updatedUnits[unitIndex]
      const updatedIngredients = [...(unit.recipe?.ingredients || [])]
      updatedIngredients.splice(ingredientIndex, 1)
      
      updatedUnits[unitIndex] = {
        ...unit,
        recipe: {
          ...(unit.recipe || {}),
          ingredients: updatedIngredients
        }
      }
      
      return {
        ...prev,
        sale: {
          ...prev.sale!,
          units: updatedUnits
        }
      }
    })
  }

  // Updated calculation functions to use default units
  const getDefaultPurchaseUnit = () => {
    if (!product.purchase?.units || !product.purchase?.defaultMeasure) return null
    return product.purchase.units.find((unit) => unit.measure === product.purchase?.defaultMeasure)
  }

  const getDefaultSalesUnit = () => {
    if (!product.sale?.units || !product.sale?.defaultMeasure) return null
    return product.sale.units.find((unit) => unit.measure === product.sale?.defaultMeasure)
  }

  const calculateGrossProfit = async () => {
    if (product.type !== "purchase-sell") return 0

    const defaultPurchaseUnit = getDefaultPurchaseUnit()
    const defaultSalesUnit = getDefaultSalesUnit()

    if (!defaultPurchaseUnit || !defaultSalesUnit) return 0

    try {
      // Get base quantities for both units
      const purchaseMeasureData = await contextFetchMeasureData(
        defaultPurchaseUnit.measure
      )
      const salesMeasureData = await contextFetchMeasureData(
        defaultSalesUnit.measure
      )

      // Calculate cost per base unit for purchase
      const purchaseCostPerBaseUnit = defaultPurchaseUnit.price / purchaseMeasureData.totalQuantity

      // Calculate price per base unit for sales
      const salesPricePerBaseUnit = defaultSalesUnit.price / salesMeasureData.totalQuantity

      // Return profit per base unit
      return salesPricePerBaseUnit - purchaseCostPerBaseUnit
    } catch (error) {
      console.error("Error calculating gross profit:", error)
      return 0
    }
  }

  const calculateProfitMargin = async () => {
    if (product.type !== "purchase-sell") return 0

    const defaultPurchaseUnit = getDefaultPurchaseUnit()
    const defaultSalesUnit = getDefaultSalesUnit()

    if (!defaultPurchaseUnit || !defaultSalesUnit) return 0

    try {
      // Get base quantities for both units
      const purchaseMeasureData = await contextFetchMeasureData(
        defaultPurchaseUnit.measure
      )
      const salesMeasureData = await contextFetchMeasureData(
        defaultSalesUnit.measure
      )

      // Calculate cost per base unit for purchase
      const purchaseCostPerBaseUnit = defaultPurchaseUnit.price / purchaseMeasureData.totalQuantity

      // Calculate price per base unit for sales
      const salesPricePerBaseUnit = defaultSalesUnit.price / salesMeasureData.totalQuantity

      if (salesPricePerBaseUnit === 0) return 0

      return ((salesPricePerBaseUnit - purchaseCostPerBaseUnit) / salesPricePerBaseUnit) * 100
    } catch (error) {
      console.error("Error calculating profit margin:", error)
      return 0
    }
  }

  const calculateCostPerBaseUnit = async () => {
    const defaultPurchaseUnit = getDefaultPurchaseUnit()
    if (!defaultPurchaseUnit) return 0

    try {
      const measureData = await contextFetchMeasureData(defaultPurchaseUnit.measure)
      return defaultPurchaseUnit.price / measureData.totalQuantity
    } catch (error) {
      console.error("Error calculating cost per base unit:", error)
      return 0
    }
  }

  // Update the form submission to include validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Check for validation errors
    if (Object.keys(validationErrors).length > 0) {
      setErrorMessage("Please fix the validation errors before saving")
      return
    }

    if (!product.name) {
      setErrorMessage("Product name is required")
      return
    }

    // Check for duplicate purchase units
    if (hasDuplicatePurchaseUnits) {
      setErrorMessage("Please remove duplicate supplier and measure combinations")
      return
    }

    // Check for duplicate sales units
    if (hasDuplicateSalesUnits) {
      setErrorMessage("Please remove duplicate sales measures")
      return
    }

    setSaving(true)

    try {
      // Include tax percentages in the product
      const productWithTax = {
        ...product,
        taxPercent: taxPercent,
        salesTaxPercent: salesTaxPercent,
      }

      await contextSaveProduct(productWithTax, Boolean(id))
      setSuccessMessage(true)
      setTimeout(() => {
        navigate("/Stock")
      }, 2000)
    } catch (error) {
      console.error("Error saving product:", error)
      setErrorMessage("Failed to save product. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleCloseSnackbar = () => {
    setSuccessMessage(false)
    setErrorMessage(null)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setProduct((prev) => ({ ...prev, [name]: value }))
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading product data...
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3, maxWidth: "1200px", mx: "auto" }}>
      <Snackbar
        open={successMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: "100%" }}>
          {id ? "Product updated successfully!" : "Product added successfully!"}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: "100%" }}>
          {errorMessage}
        </Alert>
      </Snackbar>

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: "bold", mb: 1 }}>
            {id ? "Edit Product" : "Add New Product"}
          </Typography>
          <Breadcrumbs aria-label="breadcrumb">
            <Link color="inherit" href="/" onClick={() => navigate("/")}>
              Dashboard
            </Link>
            <Link color="inherit" href="/Stock" onClick={() => navigate("/Stock")}>
              Stock
            </Link>
            <Typography color="text.primary">{id ? "Edit Product" : "Add New Product"}</Typography>
          </Breadcrumbs>
        </Box>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/Stock")}
          sx={{ borderRadius: 2 }}
        >
          Back to Stock
        </Button>
      </Box>

      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="product tabs"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Basic Information" />
          <Tab label="Purchase Details" />
          <Tab label="Sales Details" />
          {["prepped-item", "choice", "recipe"].includes(product.type) && <Tab label="Recipe Details" />}
          {product.type !== "prepped-item" && <Tab label="Financial Details" />}
        </Tabs>

        <form onSubmit={handleSubmit}>
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid
                item
                xs={12}
                md={4}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {product.image ? (
                  <Box sx={{ mb: 2, position: "relative" }}>
                    <img
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      style={{
                        width: "100%",
                        maxWidth: 300,
                        height: "auto",
                        borderRadius: 8,
                        objectFit: "cover",
                      }}
                    />
                  </Box>
                ) : (
                  <Box
                    sx={{
                      border: "2px dashed",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 3,
                      textAlign: "center",
                      width: "100%",
                      maxWidth: 300,
                      height: 200,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <CloudUploadIcon sx={{ fontSize: 48, color: themeConfig.brandColors.navy, mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No image uploaded
                    </Typography>
                  </Box>
                )}
                <Button variant="contained" component="label" startIcon={<CloudUploadIcon />} sx={{ mb: 3 }}>
                  {product.image ? "Change Image" : "Upload Image"}
                  <input type="file" accept="image/*" hidden onChange={handleImageChange} />
                </Button>
              </Grid>

              <Grid item xs={12} md={8}>
                <TextField
                  required
                  fullWidth
                  label="Product Name"
                  name="name"
                  value={product.name}
                  onChange={handleInputChange}
                  margin="normal"
                  error={!!validationErrors.name}
                  helperText={validationErrors.name}
                />
                <Autocomplete
                  options={courseOptions}
                  getOptionLabel={(option) => option.name}
                  value={courseOptions.find((c) => c.id === product.course) || null}
                  onChange={(_, newValue) => {
                    setProduct({ ...product, course: newValue?.id || "" })
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Course"
                      fullWidth
                      margin="normal"
                      helperText="Select a menu course for this product"
                    />
                  )}
                />

                <TextField
                  fullWidth
                  label="Description"
                  name="description"
                  value={product.description}
                  onChange={handleInputChange}
                  margin="normal"
                  multiline
                  rows={3}
                />

                <Box sx={{ mt: 2 }}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">Product Type</FormLabel>
                    <RadioGroup
                      row
                      value={product.type}
                      onChange={(e) => setProduct({ ...product, type: e.target.value as any })}
                    >
                      <FormControlLabel value="purchase-only" control={<Radio />} label="Purchase Only" />
                      <FormControlLabel value="purchase-sell" control={<Radio />} label="Purchase & Sell" />
                      <FormControlLabel value="prepped-item" control={<Radio />} label="Prepped Item" />
                      <FormControlLabel value="choice" control={<Radio />} label="Choice" />
                      <FormControlLabel value="recipe" control={<Radio />} label="Recipe" />
                    </RadioGroup>
                  </FormControl>
                </Box>

                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} md={4}>
                    <Autocomplete
                      options={salesDivisions}
                      getOptionLabel={(option: any) => option.name || ""}
                      value={salesDivisions.find((sd) => sd.id === product.salesDivisionId) || null}
                      onChange={(_, newValue) => {
                        setProduct({
                          ...product,
                          salesDivisionId: newValue?.id || "",
                          // Clear category and subcategory if sales division changes
                          categoryId: "",
                          subcategoryId: "",
                        })
                      }}
                      renderInput={(params) => <TextField {...params} label="Sales Division" fullWidth />}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Autocomplete
                      options={filteredCategories}
                      getOptionLabel={(option: any) => option.name || ""}
                      value={categories.find((c) => c.id === product.categoryId) || null}
                      onChange={(_, newValue) => {
                        setProduct({
                          ...product,
                          categoryId: newValue?.id || "",
                          // Clear subcategory if category changes
                          subcategoryId: "",
                          // Auto-fill sales division if available
                          salesDivisionId: getCategorySalesDivisionId(newValue) || product.salesDivisionId,
                        })
                      }}
                      renderInput={(params) => <TextField {...params} label="Category" fullWidth />}
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Autocomplete
                      options={filteredSubcategories}
                      getOptionLabel={(option: any) => option.name || ""}
                      value={subcategories.find((sc) => sc.id === product.subcategoryId) || null}
                      onChange={(_, newValue) => {
                        // Find the parent category
                        const parentCategory = categories.find((c) => c.id === getSubcategoryParentCategoryId(newValue))

                        setProduct({
                          ...product,
                          subcategoryId: newValue?.id || "",
                          // Auto-fill category if available
                          categoryId: getSubcategoryParentCategoryId(newValue) || product.categoryId,
                          // Auto-fill sales division if available
                          salesDivisionId: getCategorySalesDivisionId(parentCategory) || product.salesDivisionId,
                        })
                      }}
                      renderInput={(params) => <TextField {...params} label="Subcategory" fullWidth />}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Purchase Units
            </Typography>

            {product.purchase?.units.map((unit, index) => {
              // Check if this unit has a different base unit from the default
              const defaultMeasureId = product.purchase?.defaultMeasure
              const defaultBaseUnit = defaultMeasureId ? getMeasureBaseUnit(defaultMeasureId) : ""
              const currentBaseUnit = getMeasureBaseUnit(unit.measure)
              const hasDifferentBaseUnit = defaultBaseUnit && currentBaseUnit && defaultBaseUnit !== currentBaseUnit

              // Check if this is a duplicate supplier/measure combination
              const isDuplicate = product.purchase?.units.some(
                (u, i) => i !== index && u.supplierId === unit.supplierId && u.measure === unit.measure,
              )

              return (
                <Card
                  key={index}
                  sx={{
                    mb: 2,
                    p: 2,
                    border: "1px solid",
                    borderColor: isDuplicate ? "error.main" : hasDifferentBaseUnit ? "warning.main" : "divider",
                  }}
                >
                  {/* Original card content */}
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={3}>
                      <Autocomplete
                        options={suppliers}
                        getOptionLabel={(option: any) => option.name || ""}
                        value={suppliers.find((s) => s.id === unit.supplierId) || null}
                        onChange={(_, newValue) => {
                          const updatedUnits = [...product.purchase!.units]
                          updatedUnits[index] = {
                            ...updatedUnits[index],
                            supplierId: newValue?.id || "",
                          }
                          setProduct({
                            ...product,
                            purchase: {
                              ...product.purchase!,
                              units: updatedUnits,
                            },
                          })
                        }}
                        renderInput={(params) => <TextField {...params} label="Supplier" fullWidth />}
                      />
                    </Grid>

                    <Grid item xs={12} md={3}>
                      <Autocomplete
                        options={getCompatiblePurchaseMeasures(index)}
                        getOptionLabel={(option: any) => option.name || ""}
                        value={measures.find((m) => m.id === unit.measure) || null}
                        onChange={(_, newValue) => {
                          const updatedUnits = [...product.purchase!.units]
                          updatedUnits[index] = {
                            ...updatedUnits[index],
                            measure: newValue?.id || "",
                          }
                          setProduct({
                            ...product,
                            purchase: {
                              ...product.purchase!,
                              units: updatedUnits,
                            },
                          })
                        }}
                        renderInput={(params) => <TextField {...params} label="Measure" fullWidth />}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        disableClearable={getCompatiblePurchaseMeasures(index).length === 1}
                      />
                    </Grid>

                    <Grid item xs={6} md={2}>
                      <TextField
                        label="Quantity"
                        type="number"
                        fullWidth
                        value={unit.quantity}
                        onChange={(e) => {
                          const updatedUnits = [...product.purchase!.units]
                          updatedUnits[index] = {
                            ...updatedUnits[index],
                            quantity: Number(e.target.value) || 0,
                          }
                          setProduct({
                            ...product,
                            purchase: {
                              ...product.purchase!,
                              units: updatedUnits,
                            },
                          })
                        }}
                        InputProps={{
                          inputProps: { min: 0, step: 0.01 },
                        }}
                      />
                    </Grid>

                    <Grid item xs={6} md={2}>
                      <TextField
                        label="Price"
                        type="number"
                        fullWidth
                        value={unit.price}
                        onChange={(e) => {
                          const updatedUnits = [...product.purchase!.units]
                          updatedUnits[index] = {
                            ...updatedUnits[index],
                            price: Number(e.target.value) || 0,
                          }
                          setProduct({
                            ...product,
                            purchase: {
                              ...product.purchase!,
                              units: updatedUnits,
                            },
                          })
                        }}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">£</InputAdornment>,
                          inputProps: { min: 0, step: 0.01 },
                        }}
                      />
                    </Grid>

                    <Grid item xs={6} md={1}>
                      <FormControlLabel
                        control={
                          <Radio
                            checked={
                              product.purchase?.defaultMeasure === unit.measure &&
                              product.purchase?.defaultSupplier === unit.supplierId
                            }
                            onChange={() => {
                              setProduct({
                                ...product,
                                purchase: {
                                  ...product.purchase!,
                                  defaultMeasure: unit.measure,
                                  defaultSupplier: unit.supplierId,
                                },
                              })
                            }}
                          />
                        }
                        label="Default"
                      />
                    </Grid>

                    <Grid item xs={6} md={1}>
                      <IconButton
                        color="error"
                        onClick={() => {
                          const updatedUnits = [...product.purchase!.units]
                          updatedUnits.splice(index, 1)
                          setProduct({
                            ...product,
                            purchase: {
                              ...product.purchase!,
                              units: updatedUnits,
                            },
                          })
                        }}
                        disabled={product.purchase!.units.length <= 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Grid>
                    {(hasDifferentBaseUnit || isDuplicate) && (
                      <Grid item xs={12}>
                        {hasDifferentBaseUnit && (
                          <Alert severity="warning" sx={{ mt: 1 }}>
                            This measure uses a different base unit ({currentBaseUnit}) than the default measure (
                            {defaultBaseUnit}).
                          </Alert>
                        )}
                        {isDuplicate && (
                          <Alert severity="error" sx={{ mt: 1 }}>
                            This supplier and measure combination is used multiple times. Please use unique
                            combinations.
                          </Alert>
                        )}
                      </Grid>
                    )}
                  </Grid>
                </Card>
              )
            })}

            <Button startIcon={<AddIcon />} variant="outlined" onClick={addPurchaseUnit} sx={{ mt: 2 }}>
              Add Purchase Unit
            </Button>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {product.type !== "purchase-only" ? (
              <>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6">Sales Units</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!product.sale?.defaultMeasure}
                        onChange={(e) => {
                          setProduct({
                            ...product,
                            sale: {
                              ...product.sale!,
                              defaultMeasure: e.target.checked ? "" : product.sale?.units[0]?.measure || "",
                            },
                          })
                        }}
                      />
                    }
                    label="No default sales measure"
                  />
                </Box>
                {product.sale?.units.map((unit, index) => {
                  // Check if this is a duplicate measure
                  const isDuplicate = product.sale?.units.some((u, i) => i !== index && u.measure === unit.measure)

                  return (
                    <Card
                      key={index}
                      sx={{
                        mb: 2,
                        p: 2,
                        border: "1px solid",
                        borderColor: isDuplicate ? "error.main" : "divider",
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={4}>
                          <Autocomplete
                            options={getCompatibleSaleMeasures(index)}
                            getOptionLabel={(option: any) => option.name || ""}
                            value={measures.find((m) => m.id === unit.measure) || null}
                            onChange={(_, newValue) => {
                              const updatedUnits = [...product.sale!.units]
                              updatedUnits[index] = {
                                ...updatedUnits[index],
                                measure: newValue?.id || "",
                              }
                              setProduct({
                                ...product,
                                sale: {
                                  ...product.sale!,
                                  units: updatedUnits,
                                },
                              })
                            }}
                            renderInput={(params) => <TextField {...params} label="Measure" fullWidth />}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            disableClearable={getCompatibleSaleMeasures(index).length === 1}
                          />
                        </Grid>

                        <Grid item xs={6} md={2}>
                          <TextField
                            label="Quantity"
                            type="number"
                            fullWidth
                            value={unit.quantity}
                            onChange={(e) => {
                              const updatedUnits = [...product.sale!.units]
                              updatedUnits[index] = {
                                ...updatedUnits[index],
                                quantity: Number(e.target.value) || 0,
                              }
                              setProduct({
                                ...product,
                                sale: {
                                  ...product.sale!,
                                  units: updatedUnits,
                                },
                              })
                            }}
                            InputProps={{
                              inputProps: { min: 0, step: 0.01 },
                            }}
                          />
                        </Grid>

                        <Grid item xs={6} md={3}>
                          <TextField
                            label="Price"
                            type="number"
                            fullWidth
                            value={unit.price}
                            onChange={(e) => {
                              const updatedUnits = [...product.sale!.units]
                              updatedUnits[index] = {
                                ...updatedUnits[index],
                                price: Number(e.target.value) || 0,
                              }
                              setProduct({
                                ...product,
                                sale: {
                                  ...product.sale!,
                                  units: updatedUnits,
                                },
                              })
                            }}
                            InputProps={{
                              startAdornment: <InputAdornment position="start">£</InputAdornment>,
                              inputProps: { min: 0, step: 0.01 },
                            }}
                          />
                        </Grid>

                        <Grid item xs={6} md={2}>
                          <FormControlLabel
                            control={
                              <Radio
                                checked={product.sale?.defaultMeasure === unit.measure}
                                onChange={() => {
                                  setProduct({
                                    ...product,
                                    sale: {
                                      ...product.sale!,
                                      defaultMeasure: unit.measure,
                                    },
                                  })
                                }}
                              />
                            }
                            label="Default"
                          />
                        </Grid>

                        <Grid item xs={6} md={1}>
                          <IconButton
                            color="error"
                            onClick={() => {
                              const updatedUnits = [...product.sale!.units]
                              updatedUnits.splice(index, 1)
                              setProduct({
                                ...product,
                                sale: {
                                  ...product.sale!,
                                  units: updatedUnits,
                                },
                              })
                            }}
                            disabled={product.sale!.units.length <= 1}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Grid>

                        {isDuplicate && (
                          <Grid item xs={12}>
                            <Alert severity="error" sx={{ mt: 1 }}>
                              This measure is used multiple times. Please use unique measures.
                            </Alert>
                          </Grid>
                        )}
                      </Grid>
                    </Card>
                  )
                })}

                <Button startIcon={<AddIcon />} variant="outlined" onClick={addSalesUnit} sx={{ mt: 2 }}>
                  Add Sales Unit
                </Button>
              </>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "200px",
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  Sales details are only available for products that can be sold.
                </Typography>
              </Box>
            )}
          </TabPanel>

          {["prepped-item", "choice", "recipe"].includes(product.type) && (
            <TabPanel value={tabValue} index={3}>
              <Typography variant="h6" gutterBottom>
                Recipe Details - Create recipes for each sales unit
              </Typography>

              {product.type !== "prepped-item" && product.sale?.units && product.sale.units.length > 0 ? (
                <Box sx={{ width: "100%" }}>
                  <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                    <Tabs
                      value={recipeMeasureTab}
                      onChange={(_e, newValue) => setRecipeMeasureTab(newValue)}
                      aria-label="recipe measure tabs"
                    >
                      {product.sale.units.map((unit, index) => {
                        const measure = measures.find((m) => m.id === unit.measure)
                        const isDefault = unit.measure === product.sale?.defaultMeasure
                        return (
                          <Tab
                            key={index}
                            label={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {measure?.name || `Unit ${index + 1}`}
                                {isDefault && <Chip label="Default" size="small" color="primary" sx={{ ml: 0.5 }} />}
                              </Box>
                            }
                            id={`recipe-tab-${index}`}
                            aria-controls={`recipe-tabpanel-${index}`}
                          />
                        )
                      })}
                    </Tabs>
                  </Box>

                  {product.sale.units.map((unit, unitIndex) => (
                    <div
                      key={unitIndex}
                      role="tabpanel"
                      hidden={recipeMeasureTab !== unitIndex}
                      id={`recipe-tabpanel-${unitIndex}`}
                      aria-labelledby={`recipe-tab-${unitIndex}`}
                    >
                      {recipeMeasureTab === unitIndex && (
                        <Box>
                          <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
                            Ingredients for {measures.find((m) => m.id === unit.measure)?.name || 'this unit'}
                          </Typography>

                          {/* Ingredients for this specific unit */}
                          {unit.recipe?.ingredients && unit.recipe.ingredients.length > 0 ? (
                            unit.recipe.ingredients.map((ingredient, ingredientIndex) => (
                              <Card
                                key={ingredientIndex}
                                sx={{
                                  mb: 2,
                                  p: 2,
                                  border: "1px solid",
                                  borderColor: "divider",
                                }}
                              >
                                <Grid container spacing={2} alignItems="center">
                                  <Grid item xs={12} md={5}>
                                    <Autocomplete
                                      options={products.filter((p) => p.id !== product.id)}
                                      getOptionLabel={(option: any) => option.name || ""}
                                      value={products.find((p) => p.id === ingredient.itemId) || null}
                                      onChange={(_, newValue) => {
                                        updateIngredient(unitIndex, ingredientIndex, "itemId", newValue?.id || "")
                                      }}
                                      renderInput={(params) => <TextField {...params} label="Ingredient" fullWidth />}
                                    />
                                  </Grid>

                                  <Grid item xs={6} md={3}>
                                    <Autocomplete
                                      options={measures}
                                      getOptionLabel={(option: any) => option.name || ""}
                                      value={measures.find((m) => m.id === ingredient.measure) || null}
                                      onChange={(_, newValue) => {
                                        updateIngredient(unitIndex, ingredientIndex, "measure", newValue?.id || "")
                                      }}
                                      renderInput={(params) => <TextField {...params} label="Measure" fullWidth />}
                                      isOptionEqualToValue={(option, value) => option.id === value.id}
                                    />
                                  </Grid>

                                  <Grid item xs={6} md={3}>
                                    <TextField
                                      label="Quantity"
                                      type="number"
                                      fullWidth
                                      value={ingredient.quantity}
                                      onChange={(e) => {
                                        updateIngredient(unitIndex, ingredientIndex, "quantity", Number(e.target.value) || 0)
                                      }}
                                      InputProps={{
                                        inputProps: { min: 0, step: 0.01 },
                                      }}
                                    />
                                  </Grid>

                                  <Grid item xs={12} md={1}>
                                    <IconButton color="error" onClick={() => removeIngredient(unitIndex, ingredientIndex)}>
                                      <DeleteIcon />
                                    </IconButton>
                                  </Grid>
                                </Grid>
                              </Card>
                            ))
                          ) : (
                            <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                              <Typography variant="body2" color="text.secondary">
                                No ingredients added yet for this unit
                              </Typography>
                            </Box>
                          )}

                          <Button 
                            startIcon={<AddIcon />} 
                            variant="outlined" 
                            onClick={() => addIngredient(unitIndex)} 
                            sx={{ mt: 2, mb: 3 }}
                          >
                            Add Ingredient
                          </Button>
                        </Box>
                      )}
                    </div>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {product.type === "prepped-item"
                    ? "Prepped items don't require sales measures."
                    : "Please add sales units in the Sales Details tab first."}
                </Typography>
              )}

            </TabPanel>
          )}

          <TabPanel value={tabValue} index={["prepped-item", "choice", "recipe"].includes(product.type) ? 4 : 3}>
            <Typography variant="h6" gutterBottom>
              Financial Details
            </Typography>

            {/* Financial Summary Section */}
            <Card sx={{ mb: 3, p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Financial Summary
              </Typography>
              <Grid container spacing={3}>
                {/* Purchase Information */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom color="primary">
                    Purchase Information
                  </Typography>
                  {getDefaultPurchaseUnit() ? (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        Default Purchase Price
                      </Typography>
                      <Typography variant="h6" gutterBottom>
                        £{getDefaultPurchaseUnit()?.price.toFixed(2)}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        Default Purchase Measure
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {measures.find((m) => m.id === getDefaultPurchaseUnit()?.measure)?.name || "N/A"}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        Cost per Base Unit
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        £{calculatedCostPerBaseUnit.toFixed(4)}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No purchase units configured
                    </Typography>
                  )}
                </Grid>

                {/* Sales Information */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom color="secondary">
                    Sales Information
                  </Typography>
                  {product.type !== "purchase-only" && getDefaultSalesUnit() ? (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        Default Sales Price
                      </Typography>
                      <Typography variant="h6" gutterBottom>
                        £{getDefaultSalesUnit()?.price.toFixed(2)}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        Default Sales Measure
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {measures.find((m) => m.id === getDefaultSalesUnit()?.measure)?.name || "N/A"}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      {product.type === "purchase-only" ? "Purchase-only product" : "No sales units configured"}
                    </Typography>
                  )}
                </Grid>

                {/* Profit Analysis */}
                {product.type === "purchase-sell" && getDefaultPurchaseUnit() && getDefaultSalesUnit() && (
                  <>
                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" color="text.secondary">
                        Gross Profit (per base unit)
                      </Typography>
                      <Typography variant="h6" color={calculatedGrossProfit >= 0 ? "success.main" : "error.main"}>
                        £{calculatedGrossProfit.toFixed(4)}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" color="text.secondary">
                        Profit Margin
                      </Typography>
                      <Typography variant="h6" color={calculatedProfitMargin >= 0 ? "success.main" : "error.main"}>
                        {calculatedProfitMargin.toFixed(2)}%
                      </Typography>
                    </Grid>

                    <Grid item xs={12} md={4}>
                      <Typography variant="body2" color="text.secondary">
                        Base Unit Comparison
                      </Typography>
                      <Typography variant="body1">
                        {getMeasureBaseUnit(getDefaultPurchaseUnit()?.measure || "")} vs{" "}
                        {getMeasureBaseUnit(getDefaultSalesUnit()?.measure || "")}
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </Card>

            {/* Tax Configuration */}
            <Grid container spacing={3}>
              {product.type !== "recipe" && product.type !== "choice" && (
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Purchase Tax Percentage"
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      inputProps: { min: 0, max: 100, step: 0.1 },
                    }}
                    fullWidth
                    margin="normal"
                    helperText="Tax percentage applied to purchases"
                  />
                </Grid>
              )}

              {product.type !== "purchase-only" && (
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Sales Tax Percentage"
                    type="number"
                    value={salesTaxPercent}
                    onChange={(e) => setSalesTaxPercent(Number(e.target.value))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                      inputProps: { min: 0, max: 100, step: 0.1 },
                    }}
                    fullWidth
                    margin="normal"
                    helperText="Tax percentage applied to sales"
                  />
                </Grid>
              )}
            </Grid>
          </TabPanel>

          {!canViewPage && (
            <Alert severity="error" sx={{ mt: 2 }}>
              You don't have permission to view Stock Items.
            </Alert>
          )}
          {!canMutate && canViewPage && (
            <Alert severity="info" sx={{ mt: 2 }}>
              You have view-only access to Stock Items.
            </Alert>
          )}

          <Box sx={{ p: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => navigate("/Stock")}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<SaveIcon />}
              disabled={saving || !canMutate || !canViewPage}
            >
              {saving ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Saving...
                </>
              ) : id ? (
                "Update Product"
              ) : (
                "Save Product"
              )}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  )
}

export default StockItemForm
