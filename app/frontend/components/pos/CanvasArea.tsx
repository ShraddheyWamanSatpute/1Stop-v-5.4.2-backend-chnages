"use client"

import { themeConfig } from "../../../theme/AppTheme";
import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useTheme, alpha } from "@mui/material/styles";import {
  Box,
  Paper,
  IconButton,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material"
import {
  Delete,
  Edit,
  ContentCopy,
  FormatColorFill,
  TextFormat,
  Layers,
  ArrowUpward,
  ArrowDownward,
  Lock,
  LockOpen,
  Add,
  Remove,
  Payment,
} from "@mui/icons-material"
import type { Card, BillItem } from "../../../backend/interfaces/POS"
import { SketchPicker } from "react-color"
import FunctionalNumberPad from "./FunctionalNumberPad"

interface CanvasAreaProps {
  cards: Card[]
  onUpdateCards: (cards: Card[]) => void
  scale?: number
  onScaleChange?: (scale: number) => void
  snapToGrid?: boolean
  showGrid?: boolean
  gridSize?: number
  canvasWidth?: number
  canvasHeight?: number
  isScrollable?: boolean
  readOnly?: boolean
  onCardClick?: (card: Card) => void
}

const CanvasArea: React.FC<CanvasAreaProps> = ({
  cards,
  onUpdateCards,
  snapToGrid = true,
  showGrid = true,
  gridSize = 25,
  canvasWidth = 1600,
  canvasHeight = 900,
  isScrollable = false,
  readOnly = false,
  onCardClick,
}) => {
  const theme = useTheme()
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string>("")
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<Card | null>(null)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)
  const [colorPickerType, setColorPickerType] = useState<"background" | "font">("background")
  const [editTabValue, setEditTabValue] = useState(0)
  const [lockAspectRatio, setLockAspectRatio] = useState(false)
  const [originalAspectRatio, setOriginalAspectRatio] = useState(1)

  // Mock bill state for bill window
  const [mockCart, setMockCart] = useState<BillItem[]>([
    { id: "1", productId: "prod1", productName: "Coffee", quantity: 2, unitPrice: 3.5, totalPrice: 7.0, createdAt: Date.now() },
    { id: "2", productId: "prod2", productName: "Sandwich", quantity: 1, unitPrice: 8.95, totalPrice: 8.95, createdAt: Date.now() },
  ])

  const canvasRef = useRef<HTMLDivElement>(null)

  // Snap to grid helper function
  const snapToGridHelper = (value: number) => {
    if (!snapToGrid) return value
    return Math.round(value / (gridSize || 25)) * (gridSize || 25)
  }

  // Handle card selection
  const handleCardClick = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation()
    if (!readOnly) {
      setSelectedCardId(cardId)
      if (onCardClick) {
        const card = cards.find((c) => c.id === cardId)
        if (card) onCardClick(card)
      }
    }
  }

  // Handle canvas click (deselect)
  const handleCanvasClick = () => {
    setSelectedCardId(null)
  }

  // Get mouse position relative to canvas
  const getMousePosition = (e: React.MouseEvent) => {
    const canvas = canvasRef.current?.getBoundingClientRect()
    if (!canvas) return { x: 0, y: 0 }

    const canvasWidthPx = canvas.width
    const canvasHeightPx = canvas.height
    const scaleX = (canvasWidth || 1600) / canvasWidthPx
    const scaleY = (canvasHeight || 900) / canvasHeightPx

    return {
      x: (e.clientX - canvas.left) * scaleX,
      y: (e.clientY - canvas.top) * scaleY,
    }
  }

  // Start dragging a card
  const handleMouseDown = (e: React.MouseEvent, cardId: string) => {
    if (e.button !== 0 || readOnly) return // Only left mouse button and not in read-only mode
    e.stopPropagation()

    const mousePos = getMousePosition(e)
    const card = cards.find((c) => c.id === cardId)
    if (!card) return

    setIsDragging(true)
    setSelectedCardId(cardId)
    setDragStart({
      x: mousePos.x - (card.x || 0),
      y: mousePos.y - (card.y || 0),
    })
  }

  // Start resizing a card
  const handleResizeStart = (e: React.MouseEvent, cardId: string, handle: string) => {
    e.stopPropagation()
    if (readOnly) return

    setIsResizing(true)
    setSelectedCardId(cardId)
    setResizeHandle(handle)

    const mousePos = getMousePosition(e)
    setDragStart(mousePos)
  }

  // Handle mouse move for dragging and resizing
  const handleMouseMove = (e: React.MouseEvent) => {
    // Skip if in read-only mode
    if (readOnly) return

    const mousePos = getMousePosition(e)

    if (isDragging && selectedCardId) {
      const newX = snapToGridHelper(Math.max(0, Math.min(mousePos.x - dragStart.x, (canvasWidth || 1600) - 50)))
      const newY = snapToGridHelper(Math.max(0, Math.min(mousePos.y - dragStart.y, (canvasHeight || 900) - 50)))

      const updatedCards = cards.map((card) => {
        if (card.id === selectedCardId) {
          return {
            ...card,
            x: newX,
            y: newY,
          }
        }
        return card
      })

      onUpdateCards(updatedCards)
    } else if (isResizing && selectedCardId) {
      const card = cards.find((c) => c.id === selectedCardId)
      if (!card) return

      const deltaX = mousePos.x - dragStart.x
      const deltaY = mousePos.y - dragStart.y

      let newWidth = card.width || 100
      let newHeight = card.height || 50
      let newX = card.x || 0
      let newY = card.y || 0

      switch (resizeHandle) {
        case "se": // Southeast (bottom-right)
          newWidth = snapToGridHelper(Math.max(gridSize || 25, (card.width || 100) + deltaX))
          newHeight = snapToGridHelper(Math.max(gridSize || 25, (card.height || 50) + deltaY))
          break
        case "sw": // Southwest (bottom-left)
          newWidth = snapToGridHelper(Math.max(gridSize || 25, (card.width || 100) - deltaX))
          newHeight = snapToGridHelper(Math.max(gridSize || 25, (card.height || 50) + deltaY))
          newX = snapToGridHelper(Math.max(0, (card.x || 0) + deltaX))
          break
        case "ne": // Northeast (top-right)
          newWidth = snapToGridHelper(Math.max(gridSize || 25, (card.width || 100) + deltaX))
          newHeight = snapToGridHelper(Math.max(gridSize || 25, (card.height || 50) - deltaY))
          newY = snapToGridHelper(Math.max(0, (card.y || 0) + deltaY))
          break
        case "nw": // Northwest (top-left)
          newWidth = snapToGridHelper(Math.max(gridSize || 25, (card.width || 100) - deltaX))
          newHeight = snapToGridHelper(Math.max(gridSize || 25, (card.height || 50) - deltaY))
          newX = snapToGridHelper(Math.max(0, (card.x || 0) + deltaX))
          newY = snapToGridHelper(Math.max(0, (card.y || 0) + deltaY))
          break
        case "n": // North (top)
          newHeight = snapToGridHelper(Math.max(gridSize || 25, (card.height || 50) - deltaY))
          newY = snapToGridHelper(Math.max(0, (card.y || 0) + deltaY))
          break
        case "s": // South (bottom)
          newHeight = snapToGridHelper(Math.max(gridSize || 25, (card.height || 50) + deltaY))
          break
        case "e": // East (right)
          newWidth = snapToGridHelper(Math.max(gridSize || 25, (card.width || 100) + deltaX))
          break
        case "w": // West (left)
          newWidth = snapToGridHelper(Math.max(gridSize || 25, (card.width || 100) - deltaX))
          newX = snapToGridHelper(Math.max(0, (card.x || 0) + deltaX))
          break
      }

      // Ensure card stays within canvas bounds
      if (newX + newWidth > (canvasWidth || 1600)) {
        newWidth = (canvasWidth || 1600) - newX
      }
      if (newY + newHeight > (canvasHeight || 900)) {
        newHeight = (canvasHeight || 900) - newY
      }

      const updatedCards = cards.map((card) => {
        if (card.id === selectedCardId) {
          return {
            ...card,
            x: newX,
            y: newY,
            width: newWidth,
            height: newHeight,
          }
        }
        return card
      })

      onUpdateCards(updatedCards)
      setDragStart(mousePos)
    }
  }

  // End dragging or resizing
  const handleMouseUp = () => {
    setIsDragging(false)
    setIsResizing(false)
    setResizeHandle("")
  }

  // Handle keyboard events for selected card
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in read-only mode or no card is selected
      if (!selectedCardId || readOnly) return

      const step = snapToGrid ? gridSize || 25 : e.shiftKey ? 10 : 1
      let deltaX = 0
      let deltaY = 0

      switch (e.key) {
        case "ArrowUp":
          deltaY = -step
          break
        case "ArrowDown":
          deltaY = step
          break
        case "ArrowLeft":
          deltaX = -step
          break
        case "ArrowRight":
          deltaX = step
          break
        case "Delete":
          onUpdateCards(cards.filter((card) => card.id !== selectedCardId))
          setSelectedCardId(null)
          return
        case "Escape":
          setSelectedCardId(null)
          return
        default:
          return
      }

      if (deltaX !== 0 || deltaY !== 0) {
        e.preventDefault()
        const updatedCards = cards.map((card) => {
          if (card.id === selectedCardId) {
            return {
              ...card,
              x: Math.max(0, Math.min((card.x || 0) + deltaX, (canvasWidth || 1600) - (card.width || 100))),
              y: Math.max(0, Math.min((card.y || 0) + deltaY, (canvasHeight || 900) - (card.height || 50))),
            }
          }
          return card
        })
        onUpdateCards(updatedCards)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedCardId, cards, onUpdateCards, snapToGrid, gridSize, canvasWidth, canvasHeight, readOnly])

  // Handle double click to edit
  const handleDoubleClick = (e: React.MouseEvent, card: Card) => {
    e.stopPropagation()
    setEditingCard({ ...card })
    setLockAspectRatio(false)
    setOriginalAspectRatio((card.width || 100) / (card.height || 50))
    setEditDialogOpen(true)
  }

  // Save edited card
  const handleSaveEdit = () => {
    if (!editingCard) return

    const updatedCards = cards.map((card) => (card.id === editingCard.id ? editingCard : card))

    onUpdateCards(updatedCards)
    setEditDialogOpen(false)
    setEditingCard(null)
  }

  // Delete selected card
  const handleDeleteCard = () => {
    if (!selectedCardId) return
    onUpdateCards(cards.filter((card) => card.id !== selectedCardId))
    setSelectedCardId(null)
  }

  // Duplicate selected card
  const handleDuplicateCard = () => {
    if (!selectedCardId) return

    const cardToDuplicate = cards.find((card) => card.id === selectedCardId)
    if (!cardToDuplicate) return

    const offsetX = snapToGrid ? gridSize || 25 : 20
    const offsetY = snapToGrid ? gridSize || 25 : 20

    const newCard = {
      ...cardToDuplicate,
      id: `${cardToDuplicate.id}-copy-${Date.now()}`,
      x: Math.min((cardToDuplicate.x || 0) + offsetX, (canvasWidth || 1600) - (cardToDuplicate.width || 100)),
      y: Math.min((cardToDuplicate.y || 0) + offsetY, (canvasHeight || 900) - (cardToDuplicate.height || 50)),
      zIndex: Math.max(...cards.map((c) => c.zIndex || 1)) + 1,
    }

    onUpdateCards([...cards, newCard])
    setSelectedCardId(newCard.id)
  }

  // Handle width change with aspect ratio lock
  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingCard) return

    let newWidth = Math.max(gridSize || 25, Number.parseInt(e.target.value) || 0)
    if (snapToGrid) {
      newWidth = snapToGridHelper(newWidth)
    }

    if (lockAspectRatio) {
      const newHeight = Math.round(newWidth / originalAspectRatio)
      setEditingCard({
        ...editingCard,
        width: newWidth,
        height: snapToGrid ? snapToGridHelper(newHeight) : newHeight,
      })
    } else {
      setEditingCard({
        ...editingCard,
        width: newWidth,
      })
    }
  }

  // Handle height change with aspect ratio lock
  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingCard) return

    let newHeight = Math.max(gridSize || 25, Number.parseInt(e.target.value) || 0)
    if (snapToGrid) {
      newHeight = snapToGridHelper(newHeight)
    }

    if (lockAspectRatio) {
      const newWidth = Math.round(newHeight * originalAspectRatio)
      setEditingCard({
        ...editingCard,
        width: snapToGrid ? snapToGridHelper(newWidth) : newWidth,
        height: newHeight,
      })
    } else {
      setEditingCard({
        ...editingCard,
        height: newHeight,
      })
    }
  }

  // Open color picker
  const handleOpenColorPicker = (type: "background" | "font") => {
    setColorPickerType(type)
    setColorPickerOpen(true)
  }

  // Handle color change
  const handleColorChange = (color: any) => {
    if (!editingCard) return

    if (colorPickerType === "background") {
      setEditingCard({
        ...editingCard,
        cardColor: color.hex,
      })
    } else {
      setEditingCard({
        ...editingCard,
        fontColor: color.hex,
      })
    }
  }

  // Move card up in z-index
  const handleMoveUp = () => {
    if (!selectedCardId) return

    const selectedCard = cards.find((card) => card.id === selectedCardId)
    if (!selectedCard) return

    const highestZIndex = Math.max(...cards.map((c) => c.zIndex || 1))
    if ((selectedCard.zIndex || 1) >= highestZIndex) return

    const updatedCards = cards.map((card) => {
      if (card.id === selectedCardId) {
        return { ...card, zIndex: (card.zIndex || 1) + 1 }
      }
      return card
    })

    onUpdateCards(updatedCards)
  }

  // Move card down in z-index
  const handleMoveDown = () => {
    if (!selectedCardId) return

    const selectedCard = cards.find((card) => card.id === selectedCardId)
    if (!selectedCard) return

    const lowestZIndex = Math.min(...cards.map((c) => c.zIndex || 1))
    if ((selectedCard.zIndex || 1) <= lowestZIndex) return

    const updatedCards = cards.map((card) => {
      if (card.id === selectedCardId) {
        return { ...card, zIndex: (card.zIndex || 1) - 1 }
      }
      return card
    })

    onUpdateCards(updatedCards)
  }

  // Handle edit tab change
  const handleEditTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setEditTabValue(newValue)
  }

  // Number pad click handler
  const handleNumberPadClick = (number: string) => {
    console.log("Number pad clicked:", number)
  }

  // Mock bill functions
  const addItemToMockCart = (product: any) => {
    const existingItem = mockCart.find((item) => item.id === product.id)

    if (existingItem) {
      const updatedCart = mockCart.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
      )
      setMockCart(updatedCart)
    } else {
      const newItem: BillItem = {
        id: product.id,
        productId: product.id,
        productName: product.name || "Unknown Product",
        quantity: 1,
        unitPrice: product.price || 0,
        totalPrice: product.price || 0,
        createdAt: Date.now(),
      }
      setMockCart([...mockCart, newItem])
    }
  }

  const removeItemFromMockCart = (itemId: string) => {
    const existingItem = mockCart.find((item) => item.id === itemId)

    if (existingItem && existingItem.quantity > 1) {
      const updatedCart = mockCart.map((item) => (item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item))
      setMockCart(updatedCart)
    } else {
      setMockCart(mockCart.filter((item) => item.id !== itemId))
    }
  }

  const deleteItemFromMockCart = (itemId: string) => {
    setMockCart(mockCart.filter((item) => item.id !== itemId))
  }

  const calculateSubtotal = () => {
    return mockCart.reduce((total, item) => total + item.unitPrice * item.quantity, 0)
  }

  const calculateTax = () => {
    return calculateSubtotal() * 0.2 // 20% VAT
  }

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax()
  }

  // Render grid overlay
  const renderGridOverlay = () => {
    if (!showGrid) return null

    const lines = []
    const opacity = 0.1

    // Vertical lines
    for (let x = 0; x <= (canvasWidth || 1600); x += gridSize || 25) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={`${(x / (canvasWidth || 1600)) * 100}%`}
          y1="0%"
          x2={`${(x / (canvasWidth || 1600)) * 100}%`}
          y2="100%"
          stroke={theme.palette.divider}
          strokeWidth="1"
          opacity={opacity}
        />,
      )
    }

    // Horizontal lines
    for (let y = 0; y <= (canvasHeight || 900); y += gridSize || 25) {
      lines.push(
        <line
          key={`h-${y}`}
          x1="0%"
          y1={`${(y / (canvasHeight || 900)) * 100}%`}
          x2="100%"
          y2={`${(y / (canvasHeight || 900)) * 100}%`}
          stroke={theme.palette.divider}
          strokeWidth="1"
          opacity={opacity}
        />,
      )
    }

    return (
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {lines}
      </svg>
    )
  }

  // Render resize handles
  const renderResizeHandles = (cardId: string) => {
    // Don't render resize handles in read-only mode or if card is not selected
    if (readOnly || selectedCardId !== cardId) return null

    const handleStyle = {
      position: "absolute" as const,
      backgroundColor: theme.palette.primary.main,
      border: "1px solid",
      borderColor: theme.palette.common.white,
      width: "8px",
      height: "8px",
      zIndex: 1000,
    }

    return (
      <>
        {/* Corner handles */}
        <Box
          sx={{ ...handleStyle, top: -4, left: -4, cursor: "nw-resize" }}
          onMouseDown={(e) => handleResizeStart(e, cardId, "nw")}
        />
        <Box
          sx={{ ...handleStyle, top: -4, right: -4, cursor: "ne-resize" }}
          onMouseDown={(e) => handleResizeStart(e, cardId, "ne")}
        />
        <Box
          sx={{ ...handleStyle, bottom: -4, left: -4, cursor: "sw-resize" }}
          onMouseDown={(e) => handleResizeStart(e, cardId, "sw")}
        />
        <Box
          sx={{ ...handleStyle, bottom: -4, right: -4, cursor: "se-resize" }}
          onMouseDown={(e) => handleResizeStart(e, cardId, "se")}
        />

        {/* Edge handles */}
        <Box
          sx={{ ...handleStyle, top: -4, left: "50%", transform: "translateX(-50%)", cursor: "n-resize" }}
          onMouseDown={(e) => handleResizeStart(e, cardId, "n")}
        />
        <Box
          sx={{ ...handleStyle, bottom: -4, left: "50%", transform: "translateX(-50%)", cursor: "s-resize" }}
          onMouseDown={(e) => handleResizeStart(e, cardId, "s")}
        />
        <Box
          sx={{ ...handleStyle, left: -4, top: "50%", transform: "translateY(-50%)", cursor: "w-resize" }}
          onMouseDown={(e) => handleResizeStart(e, cardId, "w")}
        />
        <Box
          sx={{ ...handleStyle, right: -4, top: "50%", transform: "translateY(-50%)", cursor: "e-resize" }}
          onMouseDown={(e) => handleResizeStart(e, cardId, "e")}
        />
      </>
    )
  }

  // Render card content based on type
  const renderCardContent = (card: Card) => {
    if (card.productId) {
      const productName = card.productName || "Product"
      const cardHeight = card.height || 60
      const cardWidth = card.width || 100
      
      // Calculate optimal font size based on card dimensions and text length
      const baseFontSize = Math.min(cardHeight / 4, cardWidth / 8, 14)
      const textLength = productName.length
      const adjustedFontSize = textLength > 15 ? baseFontSize * 0.8 : baseFontSize
      
      return (
        <Box
          sx={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            padding: "2px",
            overflow: "hidden",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontSize: `${Math.max(adjustedFontSize, 8)}px`,
              color: card.fontColor || theme.palette.text.primary,
              textAlign: "center",
              wordBreak: "break-word",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.2,
              maxHeight: "100%",
              display: "-webkit-box",
              WebkitLineClamp: Math.floor(cardHeight / (adjustedFontSize * 1.2)),
              WebkitBoxOrient: "vertical",
            }}
          >
            {productName}
          </Typography>
          {card.price && (
            <Typography
              variant="caption"
              sx={{
                fontSize: `${Math.max(adjustedFontSize * 0.8, 6)}px`,
                color: card.fontColor || theme.palette.text.secondary,
                fontWeight: "bold",
                mt: 0.5,
              }}
            >
              £{card.price.toFixed(2)}
            </Typography>
          )}
        </Box>
      )
    }

    if (card.type === "function" && card.name === "numpad") {
      return <FunctionalNumberPad onNumberClick={handleNumberPadClick} />
    }

    if (card.type === "function" && card.name === "billWindow") {
      const billStyle = card.content || "Standard"

      if (billStyle === "Compact") {
        return (
          <Paper
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 0.5, borderBottom: 1, borderColor: "divider", bgcolor: themeConfig.brandColors.navy, color: themeConfig.brandColors.offWhite }}>
              <Typography variant="caption" fontWeight="bold">
                Table 5 • #12345
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1, overflow: "auto", p: 0.5, minHeight: 0 }}>
              {mockCart.length > 0 ? (
                <Box>
                  {mockCart.map((item) => (
                    <Box key={item.id} sx={{ display: "flex", justifyContent: "space-between", mb: 0.25, alignItems: "center" }}>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontSize: "0.65rem",
                          lineHeight: 1.2,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: "60%"
                        }}
                      >
                        {item.quantity}x {item.productName.length > 20 ? item.productName.substring(0, 20) + "..." : item.productName}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          fontSize: "0.65rem",
                          fontWeight: "bold",
                          minWidth: "35%",
                          textAlign: "right"
                        }}
                      >
                        £{(item.unitPrice * item.quantity).toFixed(2)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  align="center" 
                  sx={{ 
                    fontSize: "0.6rem",
                    display: "block",
                    mt: 1
                  }}
                >
                  No items
                </Typography>
              )}
            </Box>

            <Box sx={{ p: 0.5, borderTop: 1, borderColor: "divider", bgcolor: "background.default" }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
                <Typography variant="caption" fontWeight="bold" sx={{ fontSize: "0.7rem" }}>
                  Total:
                </Typography>
                <Typography variant="caption" fontWeight="bold" sx={{ fontSize: "0.7rem" }}>
                  £{calculateTotal().toFixed(2)}
                </Typography>
              </Box>
              <Button 
                variant="contained" 
                size="small" 
                fullWidth 
                sx={{ 
                  fontSize: "0.6rem",
                  py: 0.25,
                  minHeight: "auto",
                  lineHeight: 1.2
                }}
              >
                Pay
              </Button>
            </Box>
          </Paper>
        )
      } else if (billStyle === "Detailed") {
        return (
          <Paper
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 0.5, borderBottom: 1, borderColor: "divider", bgcolor: themeConfig.brandColors.navy, color: themeConfig.brandColors.offWhite }}>
              <Typography variant="caption" fontWeight="bold" sx={{ fontSize: "0.7rem" }}>
                Table 5 - Main Floor
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "0.6rem", display: "block" }}>
                #12345 • John Smith
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "0.6rem", display: "block" }}>
                {new Date().toLocaleTimeString()}
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1, overflow: "auto", p: 0.5, minHeight: 0 }}>
              {mockCart.length > 0 ? (
                <List dense sx={{ py: 0 }}>
                  {mockCart.map((item) => (
                    <ListItem
                      key={item.id}
                      sx={{ px: 0, py: 0.25, minHeight: "auto" }}
                      secondaryAction={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                          <IconButton size="small" onClick={() => removeItemFromMockCart(item.id)} sx={{ p: 0.25 }}>
                            <Remove sx={{ fontSize: "0.7rem" }} />
                          </IconButton>
                          <Typography variant="caption" sx={{ minWidth: 15, textAlign: "center", fontSize: "0.6rem" }}>
                            {item.quantity}
                          </Typography>
                          <IconButton size="small" onClick={() => addItemToMockCart(item)} sx={{ p: 0.25 }}>
                            <Add sx={{ fontSize: "0.7rem" }} />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => deleteItemFromMockCart(item.id)} sx={{ p: 0.25 }}>
                            <Delete sx={{ fontSize: "0.7rem" }} />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={
                          <Typography variant="caption" sx={{ fontSize: "0.65rem", fontWeight: "bold" }}>
                            {item.productName.length > 25 ? item.productName.substring(0, 25) + "..." : item.productName}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.6rem" }}>
                              £{item.unitPrice.toFixed(2)} each
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: "0.6rem", fontWeight: "bold" }}>
                              £{(item.unitPrice * item.quantity).toFixed(2)}
                            </Typography>
                          </Box>
                        }
                        sx={{ my: 0 }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <Typography variant="body2" color="text.secondary">
                    No items added to bill
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider />

            <Box sx={{ p: 0.5 }}>
              <Grid container spacing={0.25}>
                <Grid item xs={8}>
                  <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>Subtotal:</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" align="right" sx={{ fontSize: "0.65rem" }}>
                    £{calculateSubtotal().toFixed(2)}
                  </Typography>
                </Grid>

                <Grid item xs={8}>
                  <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>Service (12.5%):</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" align="right" sx={{ fontSize: "0.65rem" }}>
                    £{(calculateSubtotal() * 0.125).toFixed(2)}
                  </Typography>
                </Grid>

                <Grid item xs={8}>
                  <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>VAT (20%):</Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" align="right" sx={{ fontSize: "0.65rem" }}>
                    £{calculateTax().toFixed(2)}
                  </Typography>
                </Grid>

                <Grid item xs={8}>
                  <Typography variant="caption" fontWeight="bold" sx={{ fontSize: "0.7rem" }}>
                    Total:
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" fontWeight="bold" align="right" sx={{ fontSize: "0.7rem" }}>
                    £{(calculateTotal() + calculateSubtotal() * 0.125).toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>

              <Button 
                variant="contained" 
                size="small" 
                fullWidth 
                startIcon={<Payment sx={{ fontSize: "0.7rem" }} />} 
                sx={{ 
                  mt: 0.5, 
                  fontSize: "0.6rem",
                  py: 0.25,
                  minHeight: "auto"
                }}
              >
                Process Payment
              </Button>
            </Box>
          </Paper>
        )
      } else {
        // Standard bill window (existing code)
        return (
          <Paper
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <Box sx={{ p: 1, borderBottom: 1, borderColor: "divider" }}>
              <Typography variant="subtitle2">Table 5</Typography>
              <Typography variant="caption" color="text.secondary">
                Bill #12345 • Server: John
              </Typography>
            </Box>

            <Box sx={{ flexGrow: 1, overflow: "auto", p: 1 }}>
              {mockCart.length > 0 ? (
                <List dense>
                  {mockCart.map((item) => (
                    <ListItem
                      key={item.id}
                      secondaryAction={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <IconButton size="small" onClick={() => removeItemFromMockCart(item.id)}>
                            <Remove fontSize="small" />
                          </IconButton>
                          <Typography variant="caption" sx={{ minWidth: 20, textAlign: "center" }}>
                            {item.quantity}
                          </Typography>
                          <IconButton size="small" onClick={() => addItemToMockCart(item)}>
                            <Add fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => deleteItemFromMockCart(item.id)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      }
                    >
                      <ListItemText
                        primary={<Typography variant="caption">{item.productName}</Typography>}
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            £{item.unitPrice.toFixed(2)} × {item.quantity}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <Typography variant="caption" color="text.secondary">
                    No items
                  </Typography>
                </Box>
              )}
            </Box>

            <Divider />

            <Box sx={{ p: 1 }}>
              <Grid container spacing={0.5}>
                <Grid item xs={6}>
                  <Typography variant="caption">Subtotal:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" align="right">
                    £{calculateSubtotal().toFixed(2)}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption">VAT (20%):</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" align="right">
                    £{calculateTax().toFixed(2)}
                  </Typography>
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="caption" fontWeight="bold">
                    Total:
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" fontWeight="bold" align="right">
                    £{calculateTotal().toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>

              <Button
                variant="contained"
                size="small"
                fullWidth
                startIcon={<Payment />}
                sx={{ mt: 1, fontSize: "0.7rem" }}
              >
                Pay
              </Button>
            </Box>
          </Paper>
        )
      }
    }

    return (
      <Typography
        variant="body2"
        sx={{
          fontSize: `${card.fontSize || 12}px`,
          color: card.fontColor || "#000000",
          textAlign: "center",
          padding: "4px",
          wordBreak: "break-word",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {card.content || card.name || "Button"}
      </Typography>
    )
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Toolbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          p: 1,
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Typography variant="h6" color="text.secondary">
          Canvas ({canvasWidth} × {canvasHeight})
        </Typography>

        <Box>
          {selectedCardId && (
            <>
              <Tooltip title="Delete">
                <IconButton onClick={handleDeleteCard} color="error" size="small">
                  <Delete />
                </IconButton>
              </Tooltip>
              <Tooltip title="Edit">
                <IconButton
                  onClick={() => {
                    const card = cards.find((c) => c.id === selectedCardId)
                    if (card) {
                      setEditingCard({ ...card })
                      setLockAspectRatio(false)
                      setOriginalAspectRatio((card.width || 100) / (card.height || 50))
                      setEditDialogOpen(true)
                    }
                  }}
                  size="small"
                >
                  <Edit />
                </IconButton>
              </Tooltip>
              <Tooltip title="Duplicate">
                <IconButton onClick={handleDuplicateCard} size="small">
                  <ContentCopy />
                </IconButton>
              </Tooltip>
              <Tooltip title="Move Up">
                <IconButton onClick={handleMoveUp} size="small">
                  <ArrowUpward />
                </IconButton>
              </Tooltip>
              <Tooltip title="Move Down">
                <IconButton onClick={handleMoveDown} size="small">
                  <ArrowDownward />
                </IconButton>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>

      {/* Canvas */}
      <Box sx={{ flexGrow: 1, p: 1, minHeight: isScrollable ? canvasHeight : "auto" }}>
        <Paper
          ref={canvasRef}
          sx={{
            width: "100%",
            height: isScrollable ? `${canvasHeight}px` : "100%",
            minHeight: isScrollable ? `${canvasHeight}px` : "100%",
            position: "relative",
            bgcolor: alpha(themeConfig.brandColors.navy, 0.04),
            border: 1,
            borderColor: "divider",
            cursor: isDragging ? "grabbing" : "default",
            overflow: "hidden",
          }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              bgcolor: "background.paper",
            }}
          >
            {/* Grid Overlay */}
            {renderGridOverlay()}

            {/* Cards */}
            {cards.map((card) => (
              <Paper
                key={card.id}
                sx={{
                  position: "absolute",
                  left: `${((card.x || 0) / (canvasWidth || 1600)) * 100}%`,
                  top: `${((card.y || 0) / (canvasHeight || 900)) * 100}%`,
                  width: `${((card.width || 100) / (canvasWidth || 1600)) * 100}%`,
                  height: `${((card.height || 50) / (canvasHeight || 900)) * 100}%`,
                  bgcolor: card.cardColor || "background.paper",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isDragging && selectedCardId === card.id ? "grabbing" : "grab",
                  zIndex: (card.zIndex || 1) + 10, // Ensure cards are above grid
                  border: selectedCardId === card.id ? `2px solid ${theme.palette.primary.main}` : "1px solid",
                  borderColor: selectedCardId === card.id ? theme.palette.primary.main : "divider",
                  boxShadow: selectedCardId === card.id ? theme.shadows[4] : "none",
                  transition: "box-shadow 0.2s",
                  userSelect: "none",
                  overflow: "hidden",
                }}
                onClick={(e) => handleCardClick(e, card.id)}
                onMouseDown={(e) => handleMouseDown(e, card.id)}
                onDoubleClick={(e) => handleDoubleClick(e, card)}
              >
                {renderCardContent(card)}
                {renderResizeHandles(card.id)}
              </Paper>
            ))}
          </Box>
        </Paper>
      </Box>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Element</DialogTitle>
        <DialogContent>
          {editingCard && (
            <Box sx={{ mt: 2 }}>
              <Tabs
                value={editTabValue}
                onChange={handleEditTabChange}
                sx={(theme) => ({
                  mb: 2,
                  borderBottom: 1,
                  borderColor: 'divider',
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 500,
                    color: theme.palette.text.secondary,
                    minHeight: 44
                  },
                  '& .MuiTab-root.Mui-selected': {
                    color: theme.palette.primary.main,
                    fontWeight: 600
                  }
                })}
              >
                <Tab label="General" />
                <Tab label="Appearance" />
                <Tab label="Advanced" />
              </Tabs>

              {/* General Tab */}
              {editTabValue === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Button Text"
                      fullWidth
                      value={editingCard.content || editingCard.name || ""}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          content: e.target.value,
                        })
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <TextField
                        label="Width"
                        type="number"
                        fullWidth
                        value={editingCard.width || 100}
                        onChange={handleWidthChange}
                        InputProps={{ inputProps: { min: gridSize || 25, step: snapToGrid ? gridSize || 25 : 1 } }}
                      />
                      <Tooltip title={lockAspectRatio ? "Unlock aspect ratio" : "Lock aspect ratio"}>
                        <IconButton onClick={() => setLockAspectRatio(!lockAspectRatio)} sx={{ ml: 1 }}>
                          {lockAspectRatio ? <Lock /> : <LockOpen />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Height"
                      type="number"
                      fullWidth
                      value={editingCard.height || 50}
                      onChange={handleHeightChange}
                      InputProps={{ inputProps: { min: gridSize || 25, step: snapToGrid ? gridSize || 25 : 1 } }}
                    />
                  </Grid>
                  {editingCard.type && (
                    <Grid item xs={12}>
                      {editingCard.type === "function" && editingCard.name === "numpad" ? (
                        <Typography>Number Pad</Typography>
                      ) : editingCard.type === "function" && editingCard.name === "billWindow" ? (
                        <FormControl fullWidth>
                          <InputLabel>Bill Window Style</InputLabel>
                          <Select
                            value={editingCard.content || "Standard"}
                            label="Bill Window Style"
                            onChange={(e) =>
                              setEditingCard({
                                ...editingCard,
                                content: e.target.value,
                              })
                            }
                          >
                            <MenuItem value="Standard">Standard</MenuItem>
                            <MenuItem value="Compact">Compact</MenuItem>
                            <MenuItem value="Detailed">Detailed</MenuItem>
                            <MenuItem value="Kitchen View">Kitchen View</MenuItem>
                          </Select>
                        </FormControl>
                      ) : (
                        <FormControl fullWidth>
                          <InputLabel>Feature Type</InputLabel>
                          <Select
                            value={editingCard.type}
                            label="Feature Type"
                            onChange={(e) =>
                              setEditingCard({
                                ...editingCard,
                                type: e.target.value as "product" | "category" | "function" | "modifier",
                                cardColor:
                                  e.target.value === "payment"
                                    ? "#4caf50"
                                    : e.target.value === "billWindow"
                                      ? "#2196f3"
                                      : e.target.value === "discount"
                                        ? "#ff9800"
                                        : e.target.value === "promotion"
                                          ? "#e91e63"
                                          : e.target.value === "numpad"
                                            ? themeConfig.colors.primary.light
                                            : "#e0e0e0",
                              })
                            }
                          >
                            <MenuItem value="payment">Payment</MenuItem>
                            <MenuItem value="discount">Discount</MenuItem>
                            <MenuItem value="promotion">Promotion</MenuItem>
                            <MenuItem value="sidebar">Sidebar</MenuItem>
                            <MenuItem value="group">Group</MenuItem>
                            <MenuItem value="systemFunction">System Function</MenuItem>
                            <MenuItem value="tillFunction">Till Function</MenuItem>
                            <MenuItem value="serviceCharge">Service Charge</MenuItem>
                            <MenuItem value="tax">Tax</MenuItem>
                            <MenuItem value="tablePlan">Table Plan</MenuItem>
                            <MenuItem value="custom">Custom Button</MenuItem>
                          </Select>
                        </FormControl>
                      )}
                    </Grid>
                  )}
                </Grid>
              )}

              {/* Appearance Tab */}
              {editTabValue === 1 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Background Color
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: editingCard.cardColor || "#ffffff",
                            border: "1px solid #ddd",
                            borderRadius: 1,
                            mr: 2,
                            cursor: "pointer",
                          }}
                          onClick={() => handleOpenColorPicker("background")}
                        />
                        <TextField
                          value={editingCard.cardColor || "#ffffff"}
                          size="small"
                          onChange={(e) =>
                            setEditingCard({
                              ...editingCard,
                              cardColor: e.target.value,
                            })
                          }
                          sx={{ width: 120 }}
                        />
                        <IconButton onClick={() => handleOpenColorPicker("background")}>
                          <FormatColorFill />
                        </IconButton>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Text Color
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            bgcolor: editingCard.fontColor || "#000000",
                            border: "1px solid #ddd",
                            borderRadius: 1,
                            mr: 2,
                            cursor: "pointer",
                          }}
                          onClick={() => handleOpenColorPicker("font")}
                        />
                        <TextField
                          value={editingCard.fontColor || "#000000"}
                          size="small"
                          onChange={(e) =>
                            setEditingCard({
                              ...editingCard,
                              fontColor: e.target.value,
                            })
                          }
                          sx={{ width: 120 }}
                        />
                        <IconButton onClick={() => handleOpenColorPicker("font")}>
                          <TextFormat />
                        </IconButton>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" gutterBottom>
                      Font Size
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <TextField
                        type="number"
                        value={editingCard.fontSize || 12}
                        onChange={(e) =>
                          setEditingCard({
                            ...editingCard,
                            fontSize: Number.parseInt(e.target.value) || 12,
                          })
                        }
                        InputProps={{ inputProps: { min: 8, max: 36 } }}
                        sx={{ width: 80, mr: 2 }}
                      />
                      <Typography>{editingCard.fontSize || 12}px</Typography>
                    </Box>
                  </Grid>
                </Grid>
              )}

              {/* Advanced Tab */}
              {editTabValue === 2 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="X Position"
                      type="number"
                      fullWidth
                      value={editingCard.x || 0}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          x: Math.max(
                            0,
                            Math.min(
                              Number.parseInt(e.target.value) || 0,
                              (canvasWidth || 1600) - (editingCard.width || 100),
                            ),
                          ),
                        })
                      }
                      InputProps={{ inputProps: { step: snapToGrid ? gridSize || 25 : 1 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Y Position"
                      type="number"
                      fullWidth
                      value={editingCard.y || 0}
                      onChange={(e) =>
                        setEditingCard({
                          ...editingCard,
                          y: Math.max(
                            0,
                            Math.min(
                              Number.parseInt(e.target.value) || 0,
                              (canvasHeight || 900) - (editingCard.height || 50),
                            ),
                          ),
                        })
                      }
                      InputProps={{ inputProps: { step: snapToGrid ? gridSize || 25 : 1 } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                      <Typography variant="subtitle2" sx={{ mr: 2 }}>
                        Z-Index:
                      </Typography>
                      <TextField
                        type="number"
                        value={editingCard.zIndex || 1}
                        onChange={(e) =>
                          setEditingCard({
                            ...editingCard,
                            zIndex: Number.parseInt(e.target.value) || 1,
                          })
                        }
                        InputProps={{ inputProps: { min: 1, max: Math.max(10, ...cards.map((c) => c.zIndex || 1)) } }}
                        sx={{ width: 80, mr: 2 }}
                      />
                      <Typography>{editingCard.zIndex || 1}</Typography>
                      <Tooltip title="Layer Order">
                        <IconButton size="small" sx={{ ml: 1 }}>
                          <Layers />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Grid>
                </Grid>
              )}

              {/* Color Picker Dialog */}
              {colorPickerOpen && (
                <Dialog open={colorPickerOpen} onClose={() => setColorPickerOpen(false)} maxWidth="xs" fullWidth>
                  <DialogTitle>{colorPickerType === "background" ? "Background Color" : "Text Color"}</DialogTitle>
                  <DialogContent>
                    <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
                      <SketchPicker
                        color={
                          colorPickerType === "background"
                            ? editingCard.cardColor || "#ffffff"
                            : editingCard.fontColor || "#000000"
                        }
                        onChange={handleColorChange}
                        disableAlpha
                      />
                    </Box>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={() => setColorPickerOpen(false)}>Done</Button>
                  </DialogActions>
                </Dialog>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEdit} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default CanvasArea
