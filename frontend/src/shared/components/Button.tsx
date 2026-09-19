import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400',
  secondary: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300',
  danger: 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 disabled:bg-slate-50 disabled:text-slate-300',
  ghost: 'text-slate-600 hover:bg-slate-100 disabled:text-slate-300',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-[10px]',
  md: 'px-4 py-2.5 text-xs',
};

export const Button = ({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  ...props
}: ButtonProps) => (
  <button
    type={type}
    className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    {...props}
  />
);
