"use client"

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  TextField,
} from '@mui/material';
import { alpha } from "@mui/material/styles"
import { themeConfig } from "../../../theme/AppTheme"

interface SimpleCalculatorWidgetProps {
  onClose?: () => void;
}

const SimpleCalculatorWidget: React.FC<SimpleCalculatorWidgetProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonSize, setButtonSize] = useState(56);
  const [displayFontSize, setDisplayFontSize] = useState(1.8);
  const [displayPadding, setDisplayPadding] = useState(16);
  const hoverBg = alpha(themeConfig.brandColors.navy, 0.04)

  // Calculator state
  const [display, setDisplay] = useState('0');
  const [pendingOperator, setPendingOperator] = useState<string | null>(null);
  const [pendingValue, setPendingValue] = useState<number | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  // Input handling
  const inputNumber = useCallback((num: string) => {
    if (waitingForOperand) {
      setDisplay(num);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  }, [display, waitingForOperand]);

  const inputDecimal = useCallback(() => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  }, [display, waitingForOperand]);

  const clearAll = useCallback(() => {
    setDisplay('0');
    setPendingOperator(null);
    setPendingValue(null);
    setWaitingForOperand(false);
  }, []);

  const backspace = useCallback(() => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  }, [display]);

  const performOperation = useCallback((nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (pendingValue === null) {
      setPendingValue(inputValue);
    } else if (pendingOperator) {
      const currentValue = pendingValue || 0;
      const newValue = calculate(currentValue, inputValue, pendingOperator);

      setDisplay(String(newValue));
      setPendingValue(newValue);
    }

    setWaitingForOperand(true);
    setPendingOperator(nextOperator);
  }, [display, pendingValue, pendingOperator]);

  const performEquals = useCallback(() => {
    const inputValue = parseFloat(display);

    if (pendingValue !== null && pendingOperator) {
      const newValue = calculate(pendingValue, inputValue, pendingOperator);
      
      setDisplay(String(newValue));
      setPendingValue(null);
      setPendingOperator(null);
      setWaitingForOperand(true);
    }
  }, [display, pendingValue, pendingOperator]);

  const calculate = (firstValue: number, secondValue: number, operator: string): number => {
    switch (operator) {
      case '+': return firstValue + secondValue;
      case '-': return firstValue - secondValue;
      case '×': return firstValue * secondValue;
      case '÷': return secondValue !== 0 ? firstValue / secondValue : 0;
      default: return secondValue;
    }
  };

  const toggleSign = useCallback(() => {
    if (display !== '0') {
      setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display);
    }
  }, [display]);

  // Calculate button size and display sizing based on container width and height
  useEffect(() => {
    const calculateSizes = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const containerHeight = containerRef.current.offsetHeight;
        
        // Calculate responsive display sizing
        const baseWidth = 280; // Minimum modal width
        const baseFontSize = 1.8; // Base font size in rem
        const basePadding = 16; // Base padding in px
        
        // Scale font size based on container width (between 1.2rem and 2.4rem)
        const widthRatio = containerWidth / baseWidth;
        const calculatedFontSize = Math.max(1.2, Math.min(2.4, baseFontSize * widthRatio));
        setDisplayFontSize(calculatedFontSize);
        
        // Scale padding based on container width (between 12px and 24px)
        const calculatedPadding = Math.max(12, Math.min(24, basePadding * widthRatio));
        setDisplayPadding(calculatedPadding);
        
        // Calculate actual display height more accurately
        // Font size in pixels (1rem = 16px typically) + padding + TextField internal padding + margin
        const fontSizePx = calculatedFontSize * 16;
        const textFieldInternalPadding = 8; // MUI TextField internal padding
        const displayMargin = 8; // Margin around display
        const displayHeight = fontSizePx + (calculatedPadding * 2) + (textFieldInternalPadding * 2) + displayMargin;
        
        // Calculate available space more accurately
        // Container padding: 8px (p: 1 = 8px) on all sides
        const containerPadding = 8 * 2; // Left + right
        const gapSize = 6; // 0.75 spacing = 6px (theme spacing * 0.75)
        const gapsBetweenButtons = gapSize * 3; // 3 gaps between 4 buttons per row
        
        // Available width: container width - padding - gaps between buttons
        const availableWidth = containerWidth - containerPadding - gapsBetweenButtons;
        
        // Available height: container height - display height - container padding - gaps between rows
        const containerPaddingVertical = 8 * 2; // Top + bottom
        const gapsBetweenRows = gapSize * 4; // 4 gaps between 5 rows
        const availableHeight = containerHeight - displayHeight - containerPaddingVertical - gapsBetweenRows;
        
        // Calculate button size based on available space
        // 4 buttons per row, 5 rows
        const widthBasedSize = availableWidth / 4;
        const heightBasedSize = availableHeight / 5;
        
        // Use the smaller of the two to ensure everything fits, with a safety margin
        const safetyMargin = 0.95; // 5% safety margin to prevent cutoff
        const calculatedSize = Math.min(widthBasedSize, heightBasedSize) * safetyMargin;
        
        // Clamp size to reasonable bounds
        const clampedSize = Math.max(35, Math.min(85, calculatedSize));
        setButtonSize(clampedSize);
      }
    };

    calculateSizes();
    const resizeObserver = new ResizeObserver(calculateSizes);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key >= '0' && event.key <= '9') {
        inputNumber(event.key);
      } else if (event.key === '.') {
        inputDecimal();
      } else if (event.key === 'Enter' || event.key === '=') {
        performEquals();
      } else if (event.key === 'Escape') {
        clearAll();
      } else if (event.key === 'Backspace') {
        backspace();
      } else if (['+', '-', '*', '/'].includes(event.key)) {
        const operator = event.key === '*' ? '×' : event.key === '/' ? '÷' : event.key;
        performOperation(operator);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [display, pendingOperator, pendingValue, waitingForOperand, inputNumber, inputDecimal, performEquals, clearAll, backspace, performOperation]);

  // Memoize button styles
  const buttonStyles = useMemo(() => {
    const fontSize = Math.max(0.9, Math.min(1.3, buttonSize / 50));
    const baseStyle = {
      height: `${buttonSize}px`,
      width: `${buttonSize}px`,
      minWidth: `${buttonSize}px`,
      maxWidth: `${buttonSize}px`,
      minHeight: `${buttonSize}px`,
      maxHeight: `${buttonSize}px`,
      fontSize: `${fontSize}rem`,
      fontWeight: 600,
      borderRadius: '50%',
      textTransform: 'none' as const,
      transition: 'all 0.15s ease-in-out',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      padding: 0,
      margin: 0,
      flexShrink: 0,
      boxSizing: 'border-box' as const,
      overflow: 'hidden',
      '&:hover': {
        transform: 'translateY(-1px)',
        boxShadow: '0 3px 6px rgba(0,0,0,0.1)',
      },
      '&:active': {
        transform: 'translateY(0px)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      },
    };

    return {
      number: {
        ...baseStyle,
        backgroundColor: themeConfig.brandColors.offWhite,
        color: themeConfig.brandColors.navy,
        border: `1px solid ${alpha(themeConfig.brandColors.navy, 0.12)}`,
        '&:hover': {
          ...baseStyle['&:hover'],
          backgroundColor: hoverBg,
        },
      },
      operator: {
        ...baseStyle,
        backgroundColor: themeConfig.brandColors.navy,
        color: themeConfig.brandColors.offWhite,
        '&:hover': {
          ...baseStyle['&:hover'],
          backgroundColor: themeConfig.colors.primary.light,
        },
      },
      special: {
        ...baseStyle,
        backgroundColor: themeConfig.colors.error.main,
        color: themeConfig.colors.error.contrastText,
        '&:hover': {
          ...baseStyle['&:hover'],
          backgroundColor: themeConfig.colors.error.dark,
        },
      },
      equals: {
        ...baseStyle,
        backgroundColor: themeConfig.colors.success.main,
        color: themeConfig.colors.success.contrastText,
        '&:hover': {
          ...baseStyle['&:hover'],
          backgroundColor: themeConfig.colors.success.dark,
        },
      },
    };
  }, [buttonSize, hoverBg]);

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        height: '100%', 
        width: '100%',
        maxHeight: '100%',
        maxWidth: '100%',
        display: 'flex', 
        flexDirection: 'column',
        p: 1, 
        gap: 0.75,
        overflow: 'hidden',
        boxSizing: 'border-box',
        backgroundColor: themeConfig.brandColors.offWhite,
        alignItems: 'center',
        justifyContent: 'flex-start',
      }}
    >
      {/* Display */}
      <Box sx={{ width: '100%', flexShrink: 0 }}>
        <TextField
          fullWidth
          variant="outlined"
          value={display}
          InputProps={{
            readOnly: true,
            style: {
              textAlign: 'right',
              fontSize: `${displayFontSize}rem`,
              fontWeight: 'bold',
              backgroundColor: themeConfig.brandColors.navy,
              color: themeConfig.brandColors.offWhite,
              borderRadius: 2,
              padding: `${displayPadding}px`,
              fontFamily: 'monospace',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
              transition: 'font-size 0.2s ease, padding 0.2s ease',
            },
          }}
          sx={{
            maxWidth: '100%',
            width: '100%',
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                border: 'none',
              },
            },
          }}
        />
      </Box>
      
      {/* Button Grid */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 0.75,
        minHeight: 0,
        maxHeight: '100%',
        width: '100%',
        overflow: 'hidden',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 1,
        paddingBottom: 1,
        boxSizing: 'border-box',
      }}>
        {/* Row 1: C, ⌫, ÷ */}
        <Box sx={{ 
          display: 'flex', 
          gap: 0.75, 
          flex: '0 0 auto', 
          justifyContent: 'center', 
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}>
          <Button onClick={clearAll} sx={buttonStyles.special}>C</Button>
          <Button onClick={backspace} sx={buttonStyles.special}>⌫</Button>
          <Button onClick={() => performOperation('÷')} sx={buttonStyles.operator}>÷</Button>
        </Box>

        {/* Row 2: 7, 8, 9, × */}
        <Box sx={{ 
          display: 'flex', 
          gap: 0.75, 
          flex: '0 0 auto', 
          justifyContent: 'center', 
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}>
          <Button onClick={() => inputNumber('7')} sx={buttonStyles.number}>7</Button>
          <Button onClick={() => inputNumber('8')} sx={buttonStyles.number}>8</Button>
          <Button onClick={() => inputNumber('9')} sx={buttonStyles.number}>9</Button>
          <Button onClick={() => performOperation('×')} sx={buttonStyles.operator}>×</Button>
        </Box>

        {/* Row 3: 4, 5, 6, - */}
        <Box sx={{ 
          display: 'flex', 
          gap: 0.75, 
          flex: '0 0 auto', 
          justifyContent: 'center', 
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}>
          <Button onClick={() => inputNumber('4')} sx={buttonStyles.number}>4</Button>
          <Button onClick={() => inputNumber('5')} sx={buttonStyles.number}>5</Button>
          <Button onClick={() => inputNumber('6')} sx={buttonStyles.number}>6</Button>
          <Button onClick={() => performOperation('-')} sx={buttonStyles.operator}>-</Button>
        </Box>

        {/* Row 4: 1, 2, 3, + */}
        <Box sx={{ 
          display: 'flex', 
          gap: 0.75, 
          flex: '0 0 auto', 
          justifyContent: 'center', 
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}>
          <Button onClick={() => inputNumber('1')} sx={buttonStyles.number}>1</Button>
          <Button onClick={() => inputNumber('2')} sx={buttonStyles.number}>2</Button>
          <Button onClick={() => inputNumber('3')} sx={buttonStyles.number}>3</Button>
          <Button onClick={() => performOperation('+')} sx={buttonStyles.operator}>+</Button>
        </Box>

        {/* Row 5: 0, ., +/-, = */}
        <Box sx={{ 
          display: 'flex', 
          gap: 0.75, 
          flex: '0 0 auto', 
          justifyContent: 'center', 
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}>
          <Button onClick={() => inputNumber('0')} sx={buttonStyles.number}>0</Button>
          <Button onClick={inputDecimal} sx={buttonStyles.number}>.</Button>
          <Button onClick={toggleSign} sx={{ ...buttonStyles.number, fontSize: `${Math.max(0.75, Math.min(1.1, buttonSize / 60))}rem` }}>+/-</Button>
          <Button onClick={performEquals} sx={buttonStyles.equals}>=</Button>
        </Box>
      </Box>
    </Box>
  );
};

export default SimpleCalculatorWidget;
