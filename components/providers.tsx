"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Icon } from "@/components/icon";

type ConfettiPiece = {
  id: number;
  left: number;
  top: number;
  color: string;
  duration: number;
  rotate: number;
};

type DemoContextValue = {
  showToast: (text: string) => void;
  burstConfetti: (origin: DOMRect) => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

const CONFETTI_COLORS = ["#FF7348", "#FFB65C", "#3DBE6B", "#141B1D", "#FFDCD1"];

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoProvider");
  return ctx;
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<string | null>(null);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  const showToast = useCallback((text: string) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const burstConfetti = useCallback((origin: DOMRect) => {
    const pieces = Array.from({ length: 14 }, (_, i) => ({
      id: Date.now() + i,
      left: origin.left + origin.width / 2 + (Math.random() * 40 - 20),
      top: origin.top,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      duration: 700 + Math.random() * 400,
      rotate: Math.random() * 360,
    }));
    setConfetti(pieces);
    window.setTimeout(() => setConfetti([]), 1300);
  }, []);

  const value = useMemo(
    () => ({ showToast, burstConfetti }),
    [showToast, burstConfetti],
  );

  return (
    <DemoContext.Provider value={value}>
      {children}
      <div
        className={`pointer-events-none fixed left-1/2 top-14 z-50 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-4 py-2 text-[12.5px] font-bold text-white shadow-lg transition-all duration-200 ${
          toast ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
        }`}
      >
        <Icon name="local_fire_department" className="text-[16px] text-[#FFB65C]" />
        <span>{toast}</span>
      </div>
      {confetti.map((piece) => (
        <span
          key={piece.id}
          className="confetti-piece"
          style={{
            left: piece.left,
            top: piece.top,
            background: piece.color,
            animationDuration: `${piece.duration}ms`,
            transform: `rotate(${piece.rotate}deg)`,
          }}
        />
      ))}
    </DemoContext.Provider>
  );
}
