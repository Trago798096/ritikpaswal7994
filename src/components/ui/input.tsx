import * as React from "react"
import { useId } from "react";

import { cn } from "@/lib/utils"

// Helper function to infer autocomplete value
function inferAutocomplete(name?: string, type?: string): string {
  const lowerName = name?.toLowerCase() || '';
  if (lowerName.includes('email')) return 'email';
  if (lowerName.includes('password')) {
    if (lowerName.includes('new')) return 'new-password';
    if (lowerName.includes('confirm')) return 'new-password'; // Confirmation usually paired with new
    return 'current-password';
  }
  if (lowerName.includes('first') && lowerName.includes('name')) return 'given-name';
  if (lowerName.includes('last') && lowerName.includes('name')) return 'family-name';
  if (lowerName.includes('full') && lowerName.includes('name')) return 'name';
  if (lowerName.includes('name')) return 'name'; // Generic name fallback
  if (lowerName.includes('phone') || lowerName.includes('tel')) return 'tel';
  if (lowerName.includes('street') || lowerName.includes('address')) return 'street-address';
  if (lowerName.includes('city')) return 'address-level2';
  if (lowerName.includes('state') || lowerName.includes('province')) return 'address-level1';
  if (lowerName.includes('zip') || lowerName.includes('postal')) return 'postal-code';
  if (lowerName.includes('country')) return 'country-name';
  if (lowerName.includes('card') && lowerName.includes('number')) return 'cc-number';
  if (lowerName.includes('expiry') || lowerName.includes('exp')) return 'cc-exp';
  if (lowerName.includes('cvc') || lowerName.includes('cvv')) return 'cc-csc';
  if (lowerName.includes('card') && lowerName.includes('name')) return 'cc-name';
  if (lowerName.includes('utr')) return 'off'; // Often sensitive, turn off autocomplete

  // Based on type
  if (type === 'email') return 'email';
  if (type === 'password') return 'current-password'; // Default password type
  if (type === 'tel') return 'tel';
  if (type === 'search') return 'off';
  // Generally disable for numbers unless specific context is known
  if (type === 'number') return 'off';

  // Default based on type or turn off
  return type === 'text' ? 'on' : 'off'; 
}


export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, id: providedId, name: providedName, autoComplete: providedAutoComplete, ...props }, ref) => {
    const fallbackId = useId();
    const id = providedId ?? fallbackId;
    const name = providedName ?? id; // Use ID as fallback name if none provided
    const autoComplete = providedAutoComplete ?? inferAutocomplete(name, type);

    return (
      <input
        type={type}
        id={id}
        name={name}
        autoComplete={autoComplete}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
