import Link from "next/link";
import { Icon } from "@/components/icon";
import { Avatar, Screen } from "@/components/ui";

export default async function CallActivePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; initials?: string }>;
}) {
  const params = await searchParams;
  const name = params.name?.trim() || "Coach Maya K.";
  const initials = params.initials?.trim() || "MK";

  return (
    <Screen>
      <div className="pt-[60px] text-center">
        <Avatar initials={initials.slice(0, 2).toUpperCase()} className="mx-auto mb-[18px] h-24 w-24 text-[30px]" />
        <p className="text-[19px] font-bold">{name}</p>
        <p className="mt-0.5 text-[13px] text-ink-70">Calling…</p>
      </div>
      <div className="mt-24 flex justify-center gap-6">
        <Link
          href="/followup"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#E4453C] text-white"
        >
          <Icon name="call_end" className="text-[26px]" />
        </Link>
        <Link
          href="/sos/call"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#3DBE6B] text-white"
        >
          <Icon name="call" className="text-[26px]" />
        </Link>
      </div>
    </Screen>
  );
}
