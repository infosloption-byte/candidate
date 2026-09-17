import { useCallback, useRef } from 'react';

interface UseComparisonResizeProps {
  height: number;
  onHeightChange: (height: number) => void;
}

const MIN_HEIGHT = 180;
const MAX_HEIGHT = 720;

const clamp = (value: number): number => Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(value)));

export const useComparisonResize = ({ height, onHeightChange }: UseComparisonResizeProps) => {
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const startResize = useCallback((clientY: number) => {
    dragRef.current = { startY: clientY, startHeight: height };
  }, [height]);

  const moveResize = useCallback((clientY: number) => {
    if (!dragRef.current) return;
    const nextHeight = clamp(dragRef.current.startHeight + dragRef.current.startY - clientY);
    onHeightChange(nextHeight);
  }, [onHeightChange]);

  const endResize = useCallback(() => {
    dragRef.current = null;
  }, []);

  const decrease = useCallback(() => onHeightChange(clamp(height - 60)), [height, onHeightChange]);
  const increase = useCallback(() => onHeightChange(clamp(height + 60)), [height, onHeightChange]);

  return { startResize, moveResize, endResize, decrease, increase };
};
