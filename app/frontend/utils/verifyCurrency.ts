// Quick verification script for currency formatting
import { 
  formatCurrency, 
  formatWithGBPSymbol, 
  isCurrencyDataType, 
  getCurrencyPrefix, 
  formatValueByDataType 
} from './currencyUtils';

console.log('=== Currency Utils Verification ===');

// Test basic formatting
console.log('formatCurrency(1234.56):', formatCurrency(1234.56));
console.log('formatWithGBPSymbol(1234.56):', formatWithGBPSymbol(1234.56));

// Test data type detection
console.log('isCurrencyDataType("STOCK_VALUE"):', isCurrencyDataType('STOCK_VALUE'));
console.log('isCurrencyDataType("TOTAL_ITEMS"):', isCurrencyDataType('TOTAL_ITEMS'));

// Test prefix
console.log('getCurrencyPrefix("STOCK_VALUE"):', getCurrencyPrefix('STOCK_VALUE'));
console.log('getCurrencyPrefix("TOTAL_ITEMS"):', getCurrencyPrefix('TOTAL_ITEMS'));

// Test value formatting by data type
console.log('formatValueByDataType(1234.56, "STOCK_VALUE"):', formatValueByDataType(1234.56, 'STOCK_VALUE'));
console.log('formatValueByDataType(25.5, "PROFIT_MARGIN"):', formatValueByDataType(25.5, 'PROFIT_MARGIN'));
console.log('formatValueByDataType(100, "TOTAL_ITEMS"):', formatValueByDataType(100, 'TOTAL_ITEMS'));

console.log('=== Verification Complete ===');
