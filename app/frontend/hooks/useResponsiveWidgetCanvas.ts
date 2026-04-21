import { useEffect, useMemo, useRef, useState } from "react"
import type { WidgetSettings } from "../types/WidgetTypes"

interface UseResponsiveWidgetCanvasOptions {
  widgets: WidgetSettings[]
  containerHeight: number
  minCanvasWidth?: number
  canvasPadding?: number
}

const DEFAULT_MIN_CANVAS_WIDTH = 640
const DEFAULT_CANVAS_PADDING = 32

export function useResponsiveWidgetCanvas({
  widgets,
  containerHeight,
  minCanvasWidth = DEFAULT_MIN_CANVAS_WIDTH,
  canvasPadding = DEFAULT_CANVAS_PADDING,
}: UseResponsiveWidgetCanvasOptions) {
  const canvasViewportRef = useRef<HTMLDivElement | null>(null)
  const [viewportWidth, setViewportWidth] = useState(0)

  useEffect(() => {
    const node = canvasViewportRef.current
    if (!node) return

    const updateWidth = () => {
      setViewportWidth(node.getBoundingClientRect().width)
    }

    updateWidth()

    const observer = new ResizeObserver(() => updateWidth())
    observer.observe(node)
    window.addEventListener("resize", updateWidth)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updateWidth)
    }
  }, [])

  const canvasWidth = useMemo(() => {
    const widestWidgetEdge = widgets.reduce((maxWidth, widget) => {
      const widgetRightEdge = Number(widget.x || 0) + Number(widget.width || 0)
      return Math.max(maxWidth, widgetRightEdge)
    }, 0)

    return Math.max(minCanvasWidth, Math.ceil(widestWidgetEdge + canvasPadding))
  }, [canvasPadding, minCanvasWidth, widgets])

  const canvasScale = useMemo(() => {
    if (!viewportWidth || viewportWidth <= 0) return 1
    return Math.min(1, viewportWidth / canvasWidth)
  }, [canvasWidth, viewportWidth])

  return {
    canvasViewportRef,
    canvasWidth,
    canvasScale,
    scaledHeight: Math.max(Math.ceil(containerHeight * canvasScale), 0),
  }
}

export default useResponsiveWidgetCanvas
