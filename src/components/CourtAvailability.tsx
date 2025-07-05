import React from 'react';
import { Match } from '../types/tournament';

interface CourtAvailabilityProps {
  courts: number;
  matches: Match[];
}

export function CourtAvailability({ courts, matches }: CourtAvailabilityProps) {
  const isOccupied = (court: number) =>
    matches.some(m => m.court === court && !m.completed && !m.isBye);

  return (
    <div className="flex space-x-2 overflow-x-auto pb-2">
      {Array.from({ length: courts }, (_, i) => i + 1).map(court => (
        <span
          key={court}
          className={`px-2 py-1 rounded text-sm font-bold ${isOccupied(court) ? 'bg-red-500' : 'bg-green-600'} text-white`}
        >
          {court}
        </span>
      ))}
    </div>
  );
}
