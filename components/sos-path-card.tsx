"use client";

import { logSosEvent } from "@/app/actions";
import { Card } from "@/components/ui";

export function SosPathCard({
  href,
  path,
  className,
  children,
}: {
  href: string;
  path: "off_the_rails" | "planned_event";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card href={href} className={className} onNavigate={() => logSosEvent(path)}>
      {children}
    </Card>
  );
}
