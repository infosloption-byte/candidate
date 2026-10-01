import { Children, cloneElement, isValidElement, useId, type ReactNode, type ReactElement } from 'react';

interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

export const FormField = ({ label, hint, error, required = false, children }: FormFieldProps) => {
  const generatedId = useId();
  const fieldId = `form-field-${generatedId.replace(/:/g, '')}`;
  const child = Children.only(children);
  const enhancedChild = isValidElement(child)
    ? cloneElement(child as ReactElement<Record<string, unknown>>, {
        id: (child.props as { id?: string }).id ?? fieldId,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined,
        required: required || undefined,
      })
    : child;

  return (
    <div>
      <label htmlFor={(child.props as { id?: string }).id ?? fieldId} className="field-label">
        {label}
        {required && <span className="ml-1 text-rose-600" aria-hidden="true">*</span>}
      </label>
      {enhancedChild}
      {error ? (
        <p id={`${fieldId}-error`} className="mt-1.5 text-[11px] font-semibold text-rose-600" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-[11px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
};
