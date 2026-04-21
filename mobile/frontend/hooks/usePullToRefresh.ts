/**
 * Pull to Refresh Hook
 * 
 * Provides pull-to-refresh functionality for ESS pages
 */

import { useEffect, useRef, useState, useCallback } from "react"

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void
  threshold?: number // Distance in pixels to trigger refresh
  disabled?: boolean
  elementRef?: React.RefObject<HTMLElement>
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  disabled = false,
  elementRef,
}: UsePullToRefreshOptions) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef<number | null>(null)
  const isPullingRef = useRef(false)

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
      setPullDistance(0)
    }
  }, [onRefresh])

  useEffect(() => {
    if (disabled) return

    const element = elementRef?.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if at the top of the scrollable area
      if (element.scrollTop === 0) {
        startY.current = e.touches[0].clientY
        isPullingRef.current = true
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || !startY.current) return

      const currentY = e.touches[0].clientY
      const distance = currentY - startY.current

      if (distance > 0) {
        // Prevent default scrolling while pulling
        e.preventDefault()
        setPullDistance(Math.min(distance, threshold * 1.5))
      } else {
        setPullDistance(0)
      }
    }

    const handleTouchEnd = () => {
      if (!isPullingRef.current) return

      if (pullDistance >= threshold && !isRefreshing) {
        handleRefresh()
      } else {
        setPullDistance(0)
      }

      isPullingRef.current = false
      startY.current = null
    }

    element.addEventListener("touchstart", handleTouchStart, { passive: false })
    element.addEventListener("touchmove", handleTouchMove, { passive: false })
    element.addEventListener("touchend", handleTouchEnd)

    return () => {
      element.removeEventListener("touchstart", handleTouchStart)
      element.removeEventListener("touchmove", handleTouchMove)
      element.removeEventListener("touchend", handleTouchEnd)
    }
  }, [onRefresh, threshold, disabled, pullDistance, isRefreshing, elementRef, handleRefresh])

  return {
    isRefreshing,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1),
  }
}

