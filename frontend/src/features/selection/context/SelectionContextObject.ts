import { createContext } from 'react';
import type { SelectionContextValue } from './SelectionContext';

export const SelectionContext = createContext<SelectionContextValue | null>(null);
