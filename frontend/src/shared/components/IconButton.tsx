import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

export type IconButtonVariant = 'secondary' | 'primary' | 'danger' | 'success' | 'info' | 'ghost';
export type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title' | 'aria-label' | 'children'> {
  /** Icon shown inside the button. */
  icon: IconName;
  /** Tooltip text (native `title`) and, unless `ariaLabel` is set, the accessible name. */
  label: string;
  /** More specific accessible name, e.g. "Edit job Site Engineer". Defaults to `label`. */
  ariaLabel?: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Highlights toggle-style buttons that are currently on. */
  active?: boolean;
}

const variantClasses: Record<IconButtonVariant, string> = {
  secondary: 'border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900',
  primary: 'border border-slate-950 bg-slate-950 text-white shadow-sm hover:bg-slate-800',
  danger: 'border border-rose-200 bg-white text-rose-600 shadow-sm hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700',
  success: 'border border-emerald-200 bg-white text-emerald-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50',
  info: 'border border-cyan-100 bg-white text-cyan-700 shadow-sm hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800',
  ghost: 'border border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-900',
};

const activeClasses = 'border border-slate-950 bg-slate-950 text-white shadow-sm hover:bg-slate-800';

const disabledClasses = 'disabled:cursor-not-allowed disabled:border-slate-100 disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none disabled:hover:bg-slate-50 disabled:hover:text-slate-300';

// Touch screens get a 44px hit area; pointer devices keep the compact size.
const sizeClasses: Record<IconButtonSize, { box: string; icon: number }> = {
  sm: { box: 'size-8 pointer-coarse:size-11', icon: 15 },
  md: { box: 'size-9 pointer-coarse:size-11', icon: 16 },
  lg: { box: 'size-10 pointer-coarse:size-11', icon: 18 },
};

/**
 * Icon-only action button for table rows, card footers and toolbars.
 * The visible label is replaced by a native tooltip (`title`) and an `aria-label`.
 */
export const IconButton = ({
  icon,
  label,
  ariaLabel,
  variant = 'secondary',
  size = 'md',
  active = false,
  type = 'button',
  className = '',
  ...props
}: IconButtonProps) => {
  const sizing = sizeClasses[size];
  return (
    <button
      type={type}
      title={label}
      aria-label={ariaLabel ?? label}
      className={`inline-flex shrink-0 items-center justify-center rounded-xl touch-manipulation transition ${sizing.box} ${active ? activeClasses : variantClasses[variant]} ${disabledClasses} ${className}`}
      {...props}
    >
      <Icon name={icon} size={sizing.icon} />
    </button>
  );
};
