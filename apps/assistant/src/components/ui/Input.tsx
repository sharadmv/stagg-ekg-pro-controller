import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 px-1">
          {label}
        </label>
      )}
      <input
        className={`w-full bg-app-card border border-app-border rounded-xl px-4 py-3 text-text-main placeholder-text-muted/50 outline-none focus:border-coffee-gold focus:ring-1 focus:ring-coffee-gold/50 transition-all ${className}`}
        {...props}
      />
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    options: { value: string; label: string }[];
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 px-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    className={`w-full bg-app-card border border-app-border rounded-xl px-4 py-3 text-text-main outline-none focus:border-coffee-gold focus:ring-1 focus:ring-coffee-gold/50 appearance-none transition-all ${className}`}
                    {...props}
                >
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
            </div>
        </div>
    );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
}

export function TextArea({ label, className = '', ...props }: TextAreaProps) {
     return (
        <div className="w-full">
            {label && (
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 px-1">
                    {label}
                </label>
            )}
            <textarea
                className={`w-full bg-app-card border border-app-border rounded-xl px-4 py-3 text-text-main placeholder-text-muted/50 outline-none focus:border-coffee-gold focus:ring-1 focus:ring-coffee-gold/50 transition-all min-h-[100px] ${className}`}
                {...props}
            />
        </div>
    );
}
