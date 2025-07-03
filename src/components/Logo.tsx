import React from 'react';

interface LogoProps {
  className?: string;
}

export function Logo({ className = "w-12 h-12" }: LogoProps) {
  return (
    <div className={`${className} bg-gradient-to-br from-orange-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg`}>
      <div className="text-white font-bold text-xl">🎯</div>
    </div>
  );
}