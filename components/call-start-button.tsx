"use client";

import { logSosEvent } from "@/app/actions";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui";

export function CallStartButton({
  href,
  variant = "primary",
  icon = "call",
}: {
  href: string;
  variant?: "primary" | "ghost";
  icon?: string;
}) {
  return (
    <Button
      href={href}
      size="sm"
      variant={variant}
      onClick={() => {
        void logSosEvent("off_the_rails", "live_call");
      }}
    >
      <Icon name={icon} className="text-[16px]" />
    </Button>
  );
}
