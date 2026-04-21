"use client"

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Grid,
  useTheme,
  useMediaQuery,
  Collapse,
  Chip,
  IconButton,
  Fade,
  Zoom,
  Tooltip,
} from '@mui/material';
import { alpha } from "@mui/material/styles"
import { themeConfig } from "../../../theme/AppTheme"
import {
  History as HistoryIcon,
  Delete as DeleteIcon,
  Functions as FunctionsIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

interface ImprovedCalculatorProps {
  onClose: () => void;
}

const ImprovedCalculator: React.FC<ImprovedCalculatorProps> = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const hoverBg = alpha(themeConfig.brandColors.navy, 0.04)
  const borderCol = alpha(themeConfig.brandColors.navy, 0.12)

  // Calculator state
  const [display, setDisplay] = useState('0');
  const [pendingOperator, setPendingOperator] = useState<string | null>(null);
  const [pendingValue, setPendingValue] = useState<number | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [history, setHistory] = useState<Array<{ expression: string; result: string }>>([]);
  const [historyCollapsed, setHistoryCollapsed] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      
      // Add to history
      const expression = `${pendingValue} ${pendingOperator} ${inputValue}`;
      setHistory(prev => [...prev.slice(-9), { expression, result: String(newValue) }]);
      
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
      case '^': return Math.pow(firstValue, secondValue);
      default: return secondValue;
    }
  };

  const performScientificOperation = useCallback((operation: string) => {
    const value = parseFloat(display);
    let result: number;

    switch (operation) {
      case 'sqrt': result = Math.sqrt(value); break;
      case 'square': result = value * value; break;
      case '1/x': result = value !== 0 ? 1 / value : 0; break;
      case 'sin': result = Math.sin(value * Math.PI / 180); break;
      case 'cos': result = Math.cos(value * Math.PI / 180); break;
      case 'tan': result = Math.tan(value * Math.PI / 180); break;
      case 'log': result = Math.log10(value); break;
      case 'ln': result = Math.log(value); break;
      case 'abs': result = Math.abs(value); break;
      case 'floor': result = Math.floor(value); break;
      case 'ceil': result = Math.ceil(value); break;
      case 'round': result = Math.round(value); break;
      default: result = value;
    }

    setDisplay(String(result));
    setWaitingForOperand(true);
  }, [display]);

  const toggleSign = useCallback(() => {
    if (display !== '0') {
      setDisplay(display.startsWith('-') ? display.slice(1) : '-' + display);
    }
  }, [display]);


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
  }, [display, pendingOperator, pendingValue, waitingForOperand]);

  // Memoize button styles to prevent unnecessary re-renders
  const buttonStyles = useMemo(() => {
    const getButtonSize = () => {
      if (isMobile) return { minHeight: 24, maxHeight: 28, fontSize: '0.7rem' };
      if (isTablet) return { minHeight: 26, maxHeight: 32, fontSize: '0.75rem' };
      return { minHeight: 28, maxHeight: 36, fontSize: '0.8rem' };
    };

    const getFunctionButtonSize = () => {
      if (isMobile) return { minHeight: 20, maxHeight: 24, fontSize: '0.6rem' };
      if (isTablet) return { minHeight: 22, maxHeight: 26, fontSize: '0.65rem' };
      return { minHeight: 24, maxHeight: 28, fontSize: '0.7rem' };
    };

    const buttonSize = getButtonSize();
    const functionButtonSize = getFunctionButtonSize();
    
    const baseStyle = {
      height: '100%',
      minHeight: buttonSize.minHeight,
      maxHeight: buttonSize.maxHeight,
      fontSize: buttonSize.fontSize,
      fontWeight: 600,
      borderRadius: 8,
      boxShadow: theme.shadows[2],
      textTransform: 'none' as const,
      transition: 'all 0.2s ease-in-out',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: theme.shadows[4],
      },
      '&:active': {
        transform: 'translateY(0px)',
        boxShadow: theme.shadows[1],
      },
    };

    return {
      number: {
        ...baseStyle,
        backgroundColor: themeConfig.brandColors.offWhite,
        color: themeConfig.brandColors.navy,
        border: `1px solid ${borderCol}`,
        '&:hover': {
          ...baseStyle['&:hover'],
          backgroundColor: hoverBg,
          borderColor: themeConfig.brandColors.navy,
        },
      },
      operator: {
        ...baseStyle,
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        border: `1px solid ${theme.palette.primary.dark}`,
        '&:hover': {
          ...baseStyle['&:hover'],
          backgroundColor: theme.palette.primary.dark,
        },
      },
      function: {
        ...baseStyle,
        minHeight: functionButtonSize.minHeight,
        maxHeight: functionButtonSize.maxHeight,
        fontSize: functionButtonSize.fontSize,
        backgroundColor: themeConfig.colors.primary.light,
        color: themeConfig.brandColors.offWhite,
        border: `1px solid ${themeConfig.colors.primary.dark}`,
        '&:hover': {
          ...baseStyle['&:hover'],
          backgroundColor: themeConfig.colors.primary.dark,
        },
      },
      special: {
        ...baseStyle,
        backgroundColor: theme.palette.warning.main,
        color: theme.palette.warning.contrastText,
        border: `1px solid ${theme.palette.warning.dark}`,
        '&:hover': {
          ...baseStyle['&:hover'],
          backgroundColor: theme.palette.warning.dark,
        },
      },
      equals: {
        ...baseStyle,
        backgroundColor: theme.palette.success.main,
        color: theme.palette.success.contrastText,
        border: `1px solid ${theme.palette.success.dark}`,
        '&:hover': {
          ...baseStyle['&:hover'],
          backgroundColor: theme.palette.success.dark,
        },
      },
    };
  }, [theme, isMobile, isTablet]);

  return (
    <Box sx={{ 
      height: '100%', 
      width: '100%',
      display: 'flex', 
      flexDirection: 'row',
      p: { xs: 0.25, sm: 0.5, md: 0.75 }, 
      gap: { xs: 0.25, sm: 0.5, md: 0.75 },
      overflow: 'hidden',
      minHeight: 0,
      maxHeight: '100%',
      backgroundColor: themeConfig.brandColors.offWhite,
      boxSizing: 'border-box',
      position: 'relative',
    }}>
      {/* Main Content Area */}
      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: { xs: 0.25, sm: 0.5, md: 0.75 },
        overflow: 'hidden',
        minHeight: 0,
        maxHeight: '100%',
        minWidth: 0,
      }}>
        {/* Display Section */}
        <Box sx={{ 
          flexShrink: 0,
          minHeight: { xs: 60, sm: 70, md: 80 },
          maxHeight: { xs: 80, sm: 90, md: 100 },
        }}>
          <TextField
            fullWidth
            variant="outlined"
            value={display}
            InputProps={{
              readOnly: true,
              style: {
                textAlign: 'right',
                fontSize: isMobile ? '1.2rem' : isTablet ? '1.5rem' : '1.8rem',
                fontWeight: 'bold',
                backgroundColor: theme.palette.grey[50],
                border: `2px solid ${themeConfig.brandColors.navy}`,
                borderRadius: 8,
                padding: isMobile ? '8px 12px' : isTablet ? '10px 14px' : '12px 16px',
                fontFamily: 'monospace',
                color: theme.palette.text.primary,
                // keep text legible under global theme text mapping
                // and match app branding
                // (text.primary in themeConfig is navy, but enforce it here)
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                color: themeConfig.brandColors.navy,
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                minHeight: isMobile ? 40 : isTablet ? 50 : 60,
                maxHeight: isMobile ? 60 : isTablet ? 70 : 80,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.primary.dark,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: theme.palette.primary.main,
                  borderWidth: 2,
                },
              },
            }}
          />
          
          {/* Status Display with Backspace */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, minHeight: { xs: 20, sm: 24 } }}>
            <Box sx={{ display: 'flex', gap: { xs: 0.25, sm: 0.5 }, flexWrap: 'wrap' }}>
              {pendingOperator && (
                <Tooltip title={`Pending: ${pendingOperator}`}>
                  <Chip 
                    label={`${pendingOperator}`} 
                    size="small" 
                    variant="filled"
                    color="secondary"
                    sx={{ 
                      fontWeight: 600,
                      fontSize: { xs: '0.55rem', sm: '0.6rem' },
                      height: { xs: 16, sm: 18 }
                    }}
                  />
                </Tooltip>
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Tooltip title="Backspace">
                <IconButton 
                  size="small" 
                  onClick={backspace}
                  sx={{ 
                    backgroundColor: theme.palette.grey[100],
                    width: { xs: 24, sm: 28 },
                    height: { xs: 24, sm: 28 },
                    '&:hover': { backgroundColor: theme.palette.grey[200] }
                  }}
                >
                  <DeleteIcon sx={{ fontSize: { xs: 12, sm: 14 } }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={historyCollapsed ? "Show History" : "Hide History"}>
                <IconButton 
                  size="small" 
                  onClick={() => setHistoryCollapsed(!historyCollapsed)}
                  sx={{ 
                    backgroundColor: theme.palette.grey[100],
                    width: { xs: 24, sm: 28 },
                    height: { xs: 24, sm: 28 },
                    '&:hover': { backgroundColor: theme.palette.grey[200] }
                  }}
                >
                  <HistoryIcon sx={{ fontSize: { xs: 12, sm: 14 } }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Advanced Functions Toggle - Compact */}
        <Box sx={{ flexShrink: 0, mb: { xs: 0.25, sm: 0.5 } }}>
          <Tooltip title={showAdvanced ? "Hide Advanced Functions" : "Show Advanced Functions"}>
            <Button
              fullWidth
              variant="outlined"
              color="secondary"
              onClick={() => setShowAdvanced(!showAdvanced)}
              startIcon={showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              sx={{
                ...buttonStyles.function,
                fontSize: { xs: '0.6rem', sm: '0.7rem', md: '0.8rem' },
                minHeight: { xs: 24, sm: 28, md: 32 },
                backgroundColor: 'transparent',
                border: `1px solid ${theme.palette.secondary.main}`,
              }}
            >
              <FunctionsIcon sx={{ mr: { xs: 0.25, sm: 0.5 }, fontSize: { xs: 10, sm: 12, md: 14 } }} />
              {showAdvanced ? 'Hide' : 'Advanced'}
            </Button>
          </Tooltip>
        </Box>

        {/* Advanced Functions */}
        <Fade in={showAdvanced}>
          <Collapse in={showAdvanced}>
            <Box sx={{ mb: { xs: 0.25, sm: 0.5 }, flexShrink: 0 }}>
              <Typography variant="caption" sx={{ 
                color: theme.palette.text.secondary, 
                fontWeight: 600,
                display: 'block',
                mb: { xs: 0.25, sm: 0.5 },
                fontSize: { xs: '0.55rem', sm: '0.6rem', md: '0.65rem' },
              }}>
                <FunctionsIcon sx={{ fontSize: { xs: 8, sm: 9, md: 10 }, mr: 0.25, verticalAlign: 'middle' }} />
                Scientific Functions
              </Typography>
              <Grid container spacing={{ xs: 0.5, sm: 1 }}>
                {[
                  { label: '√', action: () => performScientificOperation('sqrt'), tooltip: 'Square Root' },
                  { label: 'x²', action: () => performScientificOperation('square'), tooltip: 'Square' },
                  { label: 'x^y', action: () => performOperation('^'), tooltip: 'Power' },
                  { label: '1/x', action: () => performScientificOperation('1/x'), tooltip: 'Reciprocal' },
                  { label: 'sin', action: () => performScientificOperation('sin'), tooltip: 'Sine' },
                  { label: 'cos', action: () => performScientificOperation('cos'), tooltip: 'Cosine' },
                  { label: 'tan', action: () => performScientificOperation('tan'), tooltip: 'Tangent' },
                  { label: 'log', action: () => performScientificOperation('log'), tooltip: 'Logarithm' },
                  { label: 'ln', action: () => performScientificOperation('ln'), tooltip: 'Natural Log' },
                  { label: 'abs', action: () => performScientificOperation('abs'), tooltip: 'Absolute Value' },
                  { label: '⌊x⌋', action: () => performScientificOperation('floor'), tooltip: 'Floor' },
                  { label: '⌈x⌉', action: () => performScientificOperation('ceil'), tooltip: 'Ceiling' },
                ].map((button, index) => (
                  <Grid item xs={3} sm={2} key={index}>
                    <Tooltip title={button.tooltip}>
                      <Button
                        fullWidth
                        onClick={button.action}
                        sx={buttonStyles.function}
                      >
                        {button.label}
                      </Button>
                    </Tooltip>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Collapse>
        </Fade>


        {/* Main Calculator - Number Pad and Operations */}
        <Box sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          gap: { xs: 0.5, sm: 1 },
          overflow: 'hidden',
          minHeight: 0,
          flexDirection: { xs: 'column', sm: 'row' },
          backgroundColor: theme.palette.background.paper,
          borderRadius: 2,
          p: { xs: 0.5, sm: 0.75, md: 1 },
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.shadows[2],
        }}>
        {/* Number Pad - Primary Focus */}
        <Box sx={{ 
          flexGrow: 1, 
          minHeight: { xs: 200, sm: 'auto' },
          display: 'flex',
          flexDirection: 'column',
        }}>
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Grid container spacing={{ xs: 0.5, sm: 0.75, md: 1 }} sx={{ flexGrow: 1 }}>
            {[7, 8, 9, 4, 5, 6, 1, 2, 3, 0].map((num) => (
              <Grid item xs={num === 0 ? 6 : 4} key={num}>
                <Tooltip title={`Number ${num}`}>
                  <Button
                    fullWidth
                    onClick={() => inputNumber(String(num))}
                    sx={{
                      ...buttonStyles.number,
                      minHeight: { xs: 32, sm: 36, md: 40 },
                      fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                      fontWeight: 700,
                      backgroundColor: theme.palette.grey[50],
                      border: `2px solid ${theme.palette.grey[300]}`,
                      '&:hover': {
                        backgroundColor: theme.palette.grey[100],
                        borderColor: theme.palette.primary.main,
                        transform: 'translateY(-1px)',
                        boxShadow: theme.shadows[3],
                      },
                    }}
                  >
                    {num}
                  </Button>
                </Tooltip>
              </Grid>
            ))}
            <Grid item xs={3}>
              <Tooltip title="Decimal Point">
                <Button
                  fullWidth
                  onClick={inputDecimal}
                  sx={{
                    ...buttonStyles.number,
                    minHeight: { xs: 32, sm: 36, md: 40 },
                    fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                    fontWeight: 700,
                    backgroundColor: theme.palette.grey[50],
                    border: `2px solid ${theme.palette.grey[300]}`,
                    '&:hover': {
                      backgroundColor: theme.palette.grey[100],
                      borderColor: theme.palette.primary.main,
                      transform: 'translateY(-1px)',
                      boxShadow: theme.shadows[3],
                    },
                  }}
                >
                  .
                </Button>
              </Tooltip>
            </Grid>
            <Grid item xs={6}>
              <Tooltip title="Toggle Sign">
                <Button
                  fullWidth
                  onClick={toggleSign}
                  sx={{
                    ...buttonStyles.special,
                    minHeight: { xs: 32, sm: 36, md: 40 },
                    fontSize: { xs: '0.7rem', sm: '0.8rem', md: '0.9rem' },
                  }}
                >
                  +/-
                </Button>
              </Tooltip>
            </Grid>
            </Grid>
          </Box>
        </Box>

        {/* Operations - Primary Focus */}
        <Box sx={{ 
          width: { xs: '100%', sm: isMobile ? 80 : isTablet ? 90 : 100 },
          minHeight: { xs: 100, sm: 'auto' },
          display: 'flex',
          flexDirection: 'column',
        }}>
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Grid container spacing={{ xs: 0.5, sm: 0.75, md: 1 }} sx={{ flexGrow: 1 }}>
            {[
              { label: '÷', action: () => performOperation('÷'), tooltip: 'Divide' },
              { label: '×', action: () => performOperation('×'), tooltip: 'Multiply' },
              { label: '-', action: () => performOperation('-'), tooltip: 'Subtract' },
              { label: '+', action: () => performOperation('+'), tooltip: 'Add' },
              { label: '=', action: performEquals, tooltip: 'Equals', style: buttonStyles.equals },
            ].map((button, index) => (
              <Grid item xs={12} key={index}>
                <Tooltip title={button.tooltip}>
                  <Button
                    fullWidth
                    onClick={button.action}
                    sx={{
                      ...(button.style || buttonStyles.operator),
                      minHeight: { xs: 32, sm: 36, md: 40 },
                      fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
                      fontWeight: 700,
                      ...(button.label === '=' ? {
                        backgroundColor: theme.palette.success.main,
                        color: theme.palette.success.contrastText,
                        border: `2px solid ${theme.palette.success.dark}`,
                        '&:hover': {
                          backgroundColor: theme.palette.success.dark,
                          transform: 'translateY(-1px)',
                          boxShadow: theme.shadows[4],
                        },
                      } : {
                        backgroundColor: theme.palette.primary.main,
                        color: theme.palette.primary.contrastText,
                        border: `2px solid ${theme.palette.primary.dark}`,
                        '&:hover': {
                          backgroundColor: theme.palette.primary.dark,
                          transform: 'translateY(-1px)',
                          boxShadow: theme.shadows[3],
                        },
                      }),
                    }}
                  >
                    {button.label}
                  </Button>
                </Tooltip>
              </Grid>
            ))}
            </Grid>
          </Box>
        </Box>
        </Box>
      </Box>

      {/* History Sidebar */}
      <Fade in={!historyCollapsed}>
        <Collapse in={!historyCollapsed} orientation="horizontal">
          <Box sx={{ 
            width: { xs: 200, sm: 250, md: 300 },
            minWidth: { xs: 200, sm: 250, md: 300 },
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            boxShadow: theme.shadows[2],
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            <Box sx={{ 
              p: { xs: 1, sm: 1.5 }, 
              borderBottom: `1px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.grey[50],
            }}>
              <Typography variant="subtitle2" sx={{ 
                color: theme.palette.text.primary, 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}>
                <HistoryIcon sx={{ fontSize: 18 }} />
                Calculation History
              </Typography>
            </Box>
            <Box sx={{ 
              flexGrow: 1, 
              overflowY: 'auto',
              p: { xs: 1, sm: 1.5 },
            }}>
              {history.length === 0 ? (
                <Typography variant="body2" sx={{ 
                  color: theme.palette.text.secondary,
                  textAlign: 'center',
                  fontStyle: 'italic',
                  mt: 2,
                }}>
                  No calculations yet
                </Typography>
              ) : (
                history.map((entry, index) => (
                  <Zoom in={true} key={index} style={{ transitionDelay: `${index * 50}ms` }}>
                    <Box sx={{ 
                      mb: 1, 
                      p: 1, 
                      border: `1px solid ${theme.palette.divider}`,
                      borderRadius: 1,
                      backgroundColor: theme.palette.background.default,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: theme.palette.grey[50],
                        borderColor: theme.palette.primary.main,
                        transform: 'translateX(2px)',
                      }
                    }}>
                      <Typography variant="body2" sx={{ 
                        color: theme.palette.text.secondary,
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        mb: 0.5,
                      }}>
                        {entry.expression} =
                      </Typography>
                      <Typography variant="h6" sx={{ 
                        color: theme.palette.text.primary,
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        fontSize: '1rem',
                      }}>
                        {entry.result}
                      </Typography>
                    </Box>
                  </Zoom>
                ))
              )}
            </Box>
          </Box>
        </Collapse>
      </Fade>
    </Box>
  );
};

export default ImprovedCalculator;