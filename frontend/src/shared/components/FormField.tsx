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
  const childNodes = Children.toArray(children);
  const controlIndex = childNodes.findIndex((item) => isValidElement(item));
  const control = controlIndex >= 0 ? childNodes[controlIndex] : null;
  const existingId = isValidElement(control) ? (control.props as { id?: string }).id : undefined;
  const inputId = existingId ?? fieldId;

  const enhancedChildren = childNodes.map((item, index) => {
    if (index !== controlIndex || !isValidElement(item)) return item;

    const props = item.props as Record<string, unknown>;
    const elementType = typeof item.type === 'string' ? item.type : '';
    const inputType = typeof props.type === 'string' ? props.type.toLowerCase() : 'text';
    const placeholderTypes = new Set(['text', 'email', 'password', 'number', 'search', 'tel', 'url']);
    const shouldAddPlaceholder =
      (elementType === 'input' || elementType === 'textarea') &&
      typeof props.placeholder !== 'string' &&
      (elementType === 'textarea' || placeholderTypes.has(inputType));

    return cloneElement(item as ReactElement<Record<string, unknown>>, {
      id: inputId,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined,
      required: required || undefined,
      placeholder: shouldAddPlaceholder ? `Enter ${label.trim().toLowerCase()}` : props.placeholder,
    });
  });

  return (
    <div>
      <label htmlFor={inputId} className="field-label">
        {label}
        {required && <span className="ml-1 text-rose-600" aria-hidden="true">*</span>}
      </label>
      {enhancedChildren}
      {error ? (
        <p id={`${fieldId}-error`} className="mt-1.5 text-[11px] font-semibold text-rose-600" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="mt-1.5 text-[11px] text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
};
