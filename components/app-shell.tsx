"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";

const TABS = [
  { href: "/home", label: "Home", icon: "home" },
  { href: "/journal", label: "Activity", icon: "edit_note" },
  { href: "/community", label: "Community", icon: "groups" },
  { href: "/profile", label: "Profile", icon: "person" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname === "/sos/call/active";

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col bg-canvas">
      <main className={`flex-1 px-5 pt-6 ${hideChrome ? "pb-8" : "pb-32"}`}>
        {children}
      </main>
      {!hideChrome && (
        <>
          <nav className="fixed bottom-0 left-1/2 z-20 flex h-[82px] w-full max-w-md -translate-x-1/2 items-center justify-around border-t border-[#E3E3E1] bg-white/92 pb-3.5 backdrop-blur-md">
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition-transform active:scale-[0.97] ${
                    active ? "text-ink" : "text-ink-70"
                  }`}
                >
                  <Icon name={tab.icon} className="text-[22px]" />
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          <Link
            href="/sos"
            className="fixed bottom-11 left-1/2 z-30 flex h-16 w-16 -translate-x-1/2 flex-col items-center justify-center rounded-full border-4 border-canvas bg-ember text-white shadow-[0_10px_24px_rgba(255,115,72,0.45)] transition-transform active:scale-[0.97]"
          >
            <Icon name="emergency" className="mb-px text-[15px]" />
            <span className="text-[15px] font-extrabold tracking-wide">SOS</span>
          </Link>
        </>
      )}
    </div>
  );
}
