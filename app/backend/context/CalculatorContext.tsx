import React, { createContext, useContext, useState, ReactNode } from 'react';
import ScientificCalculator from '../../frontend/components/tools/ScientificCalculator';

interface CalculatorContextType {
  openCalculator: () => void;
  closeCalculator: () => void;
  isCalculatorOpen: boolean;
}

const CalculatorContext = createContext<CalculatorContextType | undefined>(undefined);

export const useCalculator = (): CalculatorContextType => {
  const context = useContext(CalculatorContext);
  if (context === undefined) {
    throw new Error('useCalculator must be used within a CalculatorProvider');
  }
  return context;
};

interface CalculatorProviderProps {
  children: ReactNode;
}

export const CalculatorProvider: React.FC<CalculatorProviderProps> = ({ children }) => {
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const openCalculator = () => {
    setIsCalculatorOpen(true);
  };

  const closeCalculator = () => {
    setIsCalculatorOpen(false);
  };

  return (
    <CalculatorContext.Provider
      value={{
        openCalculator,
        closeCalculator,
        isCalculatorOpen,
      }}
    >
      {children}
      <ScientificCalculator 
        open={isCalculatorOpen} 
        onClose={closeCalculator} 
      />
    </CalculatorContext.Provider>
  );
};

export default CalculatorProvider;
