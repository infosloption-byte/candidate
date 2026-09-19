import type { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export const Card = ({ padded = true, className = '', children, ...props }: CardProps) => (
  <div
    className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${padded ? 'p-5 sm:p-6' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);
