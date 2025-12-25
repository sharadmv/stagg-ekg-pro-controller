import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  label?: string;
  variant?: 'default' | 'gold' | 'outline';
}

export function Badge({ children, label, variant = 'default' }: BadgeProps) {
  const variants = {
    default: "bg-white/10 text-text-main border border-white/5",
    gold: "bg-coffee-gold/10 text-coffee-gold border border-coffee-gold/20",
    outline: "bg-transparent text-text-muted border border-app-border"
  };

  return (
    <div className={`rounded-xl p-2.5 flex flex-col justify-center ${variants[variant]}`}>
      {label && <span className="text-[9px] font-black uppercase opacity-60 mb-0.5 tracking-wider">{label}</span>}
      <span className="text-xs font-bold">{children}</span>
    </div>
  );
}
