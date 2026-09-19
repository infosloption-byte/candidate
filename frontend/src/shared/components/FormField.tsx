import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

export const FormField = ({ label, hint, error, children }: FormFieldProps) => (
  <div>
    <label className="field-label">{label}</label>
    {children}
    {error ? (
      <p className="mt-1.5 text-[11px] font-semibold text-rose-600" role="alert">{error}</p>
    ) : hint ? (
      <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>
    ) : null}
  </div>
);
