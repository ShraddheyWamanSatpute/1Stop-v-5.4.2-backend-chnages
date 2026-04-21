import React, { useState, useEffect } from 'react';
import { type AnimatedCounterProps } from '../../types/WidgetTypes';
import { formatCurrency } from '../../utils/currencyUtils';

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  decimals = 0,
  suffix = '',
  prefix = '',
  isCurrency = false
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const totalDuration = duration;
    const incrementTime = 20;
    const totalIncrements = totalDuration / incrementTime;
    const incrementValue = (end - start) / totalIncrements;
    
    if (start === end) return;

    let timer = setInterval(() => {
      start += incrementValue;
      setCount(start);
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      }
    }, incrementTime);

    return () => {
      clearInterval(timer);
    };
  }, [value, duration]);

  const formatValue = () => {
    let formattedValue = count.toFixed(decimals);
    
    if (isCurrency) {
      // Use proper GBP formatting
      formattedValue = formatCurrency(count);
      return formattedValue;
    }
    
    return `${prefix}${formattedValue}${suffix}`;
  };

  return <span>{formatValue()}</span>;
};

export default AnimatedCounter;
