/**
 * Context Selector Hook
 * 
 * Allows components to subscribe to only specific parts of context,
 * preventing unnecessary re-renders when unrelated data changes.
 * 
 * Usage:
 *   const employees = useContextSelector(useHR(), state => state.employees);
 *   const loading = useContextSelector(useHR(), state => state.loading);
 */

import { useRef, useMemo } from 'react';

interface ContextValue {
  state: any;
  [key: string]: any;
}

/**
 * Create a selector hook for a context
 * Only re-renders when the selected value actually changes
 */
export function useContextSelector<TContext extends ContextValue, TSelected>(
  contextValue: TContext,
  selector: (value: TContext) => TSelected,
  equalityFn: (a: TSelected, b: TSelected) => boolean = (a, b) => a === b
): TSelected {
  const selectorRef = useRef(selector);
  const equalityFnRef = useRef(equalityFn);
  const lastSelectedRef = useRef<TSelected | undefined>(undefined);
  const lastContextRef = useRef<TContext | undefined>(undefined);

  // Update refs if they change
  selectorRef.current = selector;
  equalityFnRef.current = equalityFn;

  // Memoize the selected value
  const selectedValue = useMemo(() => {
    const newSelected = selectorRef.current(contextValue);
    
    // Only update if value actually changed
    if (
      lastSelectedRef.current === undefined ||
      lastContextRef.current !== contextValue ||
      !equalityFnRef.current(lastSelectedRef.current, newSelected)
    ) {
      lastSelectedRef.current = newSelected;
      lastContextRef.current = contextValue;
    }
    
    return lastSelectedRef.current;
  }, [contextValue]);

  return selectedValue;
}

/**
 * Create multiple selectors at once (optimized)
 */
export function useContextSelectors<TContext extends ContextValue>(
  contextValue: TContext,
  selectors: Record<string, (value: TContext) => any>
): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, selector] of Object.entries(selectors)) {
    result[key] = useContextSelector(contextValue, selector);
  }
  
  return result;
}

/**
 * Memoized selector factory
 */
export function createSelector<TContext extends ContextValue, TSelected>(
  selector: (value: TContext) => TSelected
) {
  let lastContext: TContext | null = null;
  let lastSelected: TSelected | null = null;

  return (context: TContext): TSelected => {
    if (context === lastContext && lastSelected !== null) {
      return lastSelected;
    }

    const selected = selector(context);
    lastContext = context;
    lastSelected = selected;
    return selected;
  };
}

