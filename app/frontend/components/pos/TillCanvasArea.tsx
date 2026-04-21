"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import type { Card } from "../../../backend/context/POSContext"
import { alpha } from "@mui/material/styles"
import { themeConfig } from "../../../theme/AppTheme"

export interface TillCanvasAreaProps {
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
  onCardMouseDown?: (card: Card) => void
  onCardMouseUp?: () => void
}

const TillCanvasArea: React.FC<TillCanvasAreaProps> = ({
  cards,
  onUpdateCards,
  scale = 1,
  snapToGrid = false,
  showGrid = false,
  gridSize = 20,
  canvasWidth = 800,
  canvasHeight = 600,
  isScrollable = false,
  readOnly = false,
  onCardClick,
  onCardMouseDown,
  onCardMouseUp,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isResizing, setIsResizing] = useState(false)
  const [resizedCardId, setResizedCardId] = useState<string | null>(null)
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement>(null)

  const handleCardClick = (card: Card) => {
    if (onCardClick) {
      onCardClick(card)
    }
  }

  const handleMouseDown = (e: React.MouseEvent, card: Card) => {
    if (readOnly) return;

    // Call the long press handler if provided
    if (onCardMouseDown) {
      onCardMouseDown(card);
    }

    e.stopPropagation();

    setIsDragging(true);
    setDraggedCardId(card.id);
    setDragOffset({
      x: e.clientX - (card.x ?? 0),
      y: e.clientY - (card.y ?? 0),
    });
  };

  const handleMouseUp = () => {
    // Call the mouse up handler if provided
    if (onCardMouseUp) {
      onCardMouseUp()
    }

    setIsDragging(false)
    setDraggedCardId(null)
    setIsResizing(false)
    setResizedCardId(null)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && draggedCardId) {
      const x = e.clientX - dragOffset.x
      const y = e.clientY - dragOffset.y

      const newX = snapToGrid ? Math.round(x / gridSize!) * gridSize! : x
      const newY = snapToGrid ? Math.round(y / gridSize!) * gridSize! : y

      const updatedCards = cards.map((card) => (card.id === draggedCardId ? { ...card, x: newX, y: newY } : card))
      onUpdateCards(updatedCards)
    }

    if (isResizing && resizedCardId) {
      const width = e.clientX - resizeStart.x
      const height = e.clientY - resizeStart.y

      const newWidth = snapToGrid ? Math.round(width / gridSize!) * gridSize! : width
      const newHeight = snapToGrid ? Math.round(height / gridSize!) * gridSize! : height

      const updatedCards = cards.map((card) =>
        card.id === resizedCardId ? { ...card, width: newWidth, height: newHeight } : card,
      )
      onUpdateCards(updatedCards)
    }
  }

  const handleResizeMouseDown = (e: React.MouseEvent, card: Card) => {
    e.stopPropagation()
    setIsResizing(true)
    setResizedCardId(card.id)
    setResizeStart({ x: e.clientX, y: e.clientY })
  }

  const getGridLines = () => {
    const horizontalLines = []
    for (let i = 0; i <= canvasHeight! / gridSize!; i++) {
      horizontalLines.push(
        <line
          key={`h-${i}`}
          x1="0"
          y1={i * gridSize!}
          x2={canvasWidth}
          y2={i * gridSize!}
          stroke={themeConfig.colors.divider}
          strokeWidth="1"
        />,
      )
    }

    const verticalLines = []
    for (let i = 0; i <= canvasWidth! / gridSize!; i++) {
      verticalLines.push(
        <line
          key={`v-${i}`}
          x1={i * gridSize!}
          y1="0"
          x2={i * gridSize!}
          y2={canvasHeight}
          stroke={themeConfig.colors.divider}
          strokeWidth="1"
        />,
      )
    }

    return (
      <svg width={canvasWidth} height={canvasHeight} style={{ position: "absolute", top: 0, left: 0 }}>
        {horizontalLines}
        {verticalLines}
      </svg>
    )
  }

  useEffect(() => {
    const handleGlobalMouseUp = () => handleMouseUp()
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const reactEvent = {
        clientX: e.clientX,
        clientY: e.clientY,
      } as React.MouseEvent
      handleMouseMove(reactEvent)
    }

    document.addEventListener("mouseup", handleGlobalMouseUp)
    document.addEventListener("mousemove", handleGlobalMouseMove)

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp)
      document.removeEventListener("mousemove", handleGlobalMouseMove)
    }
  }, [
    isDragging,
    draggedCardId,
    isResizing,
    resizedCardId,
    cards,
    onUpdateCards,
    dragOffset,
    snapToGrid,
    gridSize,
    resizeStart,
  ])

  return (
    <div
      ref={canvasRef}
      style={{
        width: canvasWidth,
        height: canvasHeight,
        border: `1px solid ${themeConfig.colors.divider}`,
        position: "relative",
        overflow: isScrollable ? "auto" : "hidden",
        cursor: isDragging ? "grabbing" : "default",
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
    >
      {showGrid && getGridLines()}
      {cards.map((card) => (
        <div
          key={card.id}
          style={{
            position: "absolute",
            left: card.x ?? 0,
            top: card.y ?? 0,
            width: card.width,
            height: card.height,
            border: `1px dashed ${alpha(themeConfig.brandColors.navy, 0.4)}`,
            cursor: readOnly ? "default" : "move",
            overflow: "hidden",
            userSelect: "none",
            backgroundColor: card.cardColor || themeConfig.brandColors.offWhite,
            borderColor: card.borderColor || themeConfig.colors.divider,
            borderWidth: card.borderWidth || 1,
            borderRadius: card.borderRadius || 0,
            zIndex: card.zIndex || 1,
          }}
          onMouseDown={(e) => handleMouseDown(e, card)}
          onClick={() => handleCardClick(card)}
        >
          {/* Render card content */}
          {card.content || (
            <div
              style={{
                fontSize: `${card.fontSize || 12}px`,
                color: card.fontColor || themeConfig.brandColors.navy,
                textAlign: "center",
                padding: "4px",
                wordBreak: "break-word",
                overflow: "hidden",
                textOverflow: "ellipsis",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {card.content || card.productName || card.name || "Button"}
            </div>
          )}
          {!readOnly && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "20px",
                height: "20px",
                backgroundColor: alpha(themeConfig.brandColors.navy, 0.2),
                cursor: "nwse-resize",
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, card)}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default TillCanvasArea
