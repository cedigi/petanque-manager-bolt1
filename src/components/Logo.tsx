import React from 'react';
import logoUrl from '../../logo1.png';

interface LogoProps {
  className?: string;
}

export function Logo({ className = "w-12 h-12" }: LogoProps) {
  return (
    <img src={logoUrl} alt="Logo" className={className} />
  );
}