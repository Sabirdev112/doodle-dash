"use client";

import { useEffect, useState } from "react";

interface RoundTimerProps {
  endTime: number | null;
  label?: string;
}

export default function RoundTimer({ endTime, label = "Time left" }: RoundTimerProps) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!endTime) return;
    const tick = () => {
      setRemaining(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [endTime]);

  const urgent = remaining <= 10 && remaining > 0;

  return (
    <div
      className={`rounded-lg border-2 border-doodle-ink px-4 py-2 text-center shadow-sketch-sm ${
        urgent ? "animate-pulse bg-doodle-coral/20" : "bg-doodle-yellow/50"
      }`}
    >
      <p className="font-sketch text-xs uppercase text-doodle-muted">{label}</p>
      <p
        className={`font-sketch text-2xl tabular-nums ${
          urgent ? "text-doodle-coral" : "text-doodle-ink"
        }`}
      >
        {endTime ? `${remaining}s` : "—"}
      </p>
    </div>
  );
}
