import { AppShell } from "@/components/app-shell";
import { DemoProvider } from "@/components/providers";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <AppShell>{children}</AppShell>
    </DemoProvider>
  );
}
