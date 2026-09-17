import { useContext } from 'react';
import { SelectionContext } from './SelectionContextObject';

export const useSelectionContext = () => {
  const context = useContext(SelectionContext);
  if (!context) throw new Error('useSelectionContext must be used inside SelectionProvider.');
  return context;
};
