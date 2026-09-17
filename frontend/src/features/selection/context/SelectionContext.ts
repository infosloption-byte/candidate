import type { Dispatch } from 'react';
import type { SelectionAction, SelectionState } from '../types/selection';

export interface SelectionContextValue {
  state: SelectionState;
  dispatch: Dispatch<SelectionAction>;
}
