import { useCallback, useState, useRef } from 'react';

interface TouchInteractionsProps {
  longPressDelay?: number;
  moveThreshold?: number;
  onTouchMove?: (e: TouchEvent) => void;
  onTouchEnd?: () => void;
}

export const useTouchInteractions = (props?: TouchInteractionsProps) => {
  const [isLongPress, setIsLongPress] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const moveThreshold = props?.moveThreshold || 10;
  const longPressDelay = props?.longPressDelay || 800;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    startPosRef.current = { x: touch.clientX, y: touch.clientY };
    setIsLongPress(false);

    timeoutRef.current = setTimeout(() => {
      setIsLongPress(true);
    }, longPressDelay);
  }, [longPressDelay]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (timeoutRef.current) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - startPosRef.current.x);
      const deltaY = Math.abs(touch.clientY - startPosRef.current.y);

      if (deltaX > moveThreshold || deltaY > moveThreshold) {
        clearTimeout(timeoutRef.current);
        setIsLongPress(false);
      }
    }

    if (props?.onTouchMove) {
      props.onTouchMove(e);
    }
  }, [moveThreshold, props]);

  const onTouchEnd = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (props?.onTouchEnd) {
      props.onTouchEnd();
    }
  }, [props]);

  return {
    handleTouchStart,
    onTouchMove,
    onTouchEnd,
    isLongPress,
  };
};