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
      className={`rounded-xl px-4 py-2 text-center ${
        urgent ? "bg-red-500/20 animate-pulse" : "bg-slate-800/80"
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${urgent ? "text-red-400" : "text-brand-300"}`}>
        {endTime ? `${remaining}s` : "—"}
      </p>
    </div>
  );
}
