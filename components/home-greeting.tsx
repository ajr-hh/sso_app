"use client";

import { useEffect, useState } from "react";
import { ScreenTitle } from "@/components/ui";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeGreeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return <ScreenTitle>{greeting}, {name}</ScreenTitle>;
}
