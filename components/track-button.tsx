"use client";

import { logSosEvent } from "@/app/actions";
import { useDemo } from "@/components/providers";
import { Button } from "@/components/ui";

export function TrackButton({
  href,
  path,
  reinforcement,
  toast,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  path: string;
  reinforcement?: string;
  toast: string;
  variant?: "primary" | "ghost" | "dark";
  className?: string;
  children: React.ReactNode;
}) {
  const { showToast } = useDemo();

  return (
    <Button
      href={href}
      variant={variant}
      className={className}
      onClick={() => {
        showToast(toast);
        void logSosEvent(path, reinforcement);
      }}
    >
      {children}
    </Button>
  );
}
