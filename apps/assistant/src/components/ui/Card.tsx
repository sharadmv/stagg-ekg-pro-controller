import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-app-card border border-app-border rounded-3xl p-5 relative overflow-hidden transition-colors ${onClick ? 'cursor-pointer active:bg-app-card-hover active:scale-[0.98] transition-transform duration-200' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
