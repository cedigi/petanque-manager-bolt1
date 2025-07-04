import React from 'react';

interface LogoProps {
  className?: string;
}

export function Logo({ className = "w-12 h-12" }: LogoProps) {
  return (
    <img src="/logo1.png" alt="Logo" className={className} />
  );
}