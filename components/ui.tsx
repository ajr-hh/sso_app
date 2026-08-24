"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";

export function Screen({ children }: { children: React.ReactNode }) {
  return <div className="fade-in">{children}</div>;
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ember-dark">
      {children}
    </p>
  );
}

export function ScreenTitle({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-1 text-[30px] leading-[1.05]">{children}</h1>;
}

export function ScreenSub({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`mb-[18px] text-[13.5px] leading-snug text-ink-70 ${className ?? ""}`}>
      {children}
    </p>
  );
}

export function Card({
  children,
  className,
  href,
  onNavigate,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onNavigate?: () => void;
}) {
  const cls = `mb-3 rounded-2xl bg-white p-4 shadow-card ${className ?? ""}`;
  if (href) {
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={`${cls} block transition-transform active:scale-[0.97]`}
      >
        {children}
      </Link>
    );
  }
  return <section className={cls}>{children}</section>;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  className,
  type = "button",
  onClick,
}: {
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "dark";
  size?: "md" | "sm";
  href?: string;
  className?: string;
  type?: "button" | "submit";
  onClick?: (event: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
}) {
  const variants = {
    primary: "bg-ember text-white active:bg-ember-dark",
    ghost: "border border-ink-30 bg-white text-ink",
    dark: "bg-ink text-white",
  };
  const sizes = {
    md: "w-full rounded-[14px] px-4 py-[13px] text-[14.5px]",
    sm: "w-auto rounded-[11px] px-3.5 py-2 text-[13px]",
  };
  const cls = `inline-flex items-center justify-center gap-2 font-bold transition-transform active:scale-[0.97] ${variants[variant]} ${sizes[size]} ${className ?? ""}`;
  if (href) {
    return (
      <Link href={href} className={cls} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function BackBar({ label, href }: { label: string; href: string }) {
  return (
    <div className="mb-3.5 flex items-center gap-2">
      <Link
        href={href}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-card"
      >
        <Icon name="arrow_back" className="text-[18px]" />
      </Link>
      <span className="text-xs font-bold text-ink-70">{label}</span>
    </div>
  );
}

export function IconBadge({
  children,
  tone = "ember",
  className,
}: {
  children: React.ReactNode;
  tone?: "ember" | "dark" | "mute" | "ember-solid";
  className?: string;
}) {
  const tones = {
    ember: "bg-ember-tint text-ember-dark",
    dark: "bg-ink text-white",
    mute: "bg-canvas text-ink-70",
    "ember-solid": "bg-ember text-white",
  };
  return (
    <span
      className={`inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] ${tones[tone]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

export function Tag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-[11.5px] font-bold text-ink-70 ${className ?? ""}`}
    >
      {children}
    </span>
  );
}

export function Pill({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition-transform active:scale-[0.97] ${
        active ? "border border-ink bg-ink text-white" : "border border-[#E7E7E5] bg-white text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function PillRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-0.5 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {children}
    </div>
  );
}

export function ListItem({
  icon,
  tone = "ember",
  children,
}: {
  icon: string;
  tone?: "ember" | "mute" | "dark";
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[#E7E7E5] py-3 last:border-b-0">
      <IconBadge tone={tone}>
        <Icon name={icon} className="text-[18px]" />
      </IconBadge>
      <div className="text-[13.5px]">{children}</div>
    </div>
  );
}

export function PhotoTile({
  add,
  muted,
  className,
  icon = "photo_camera",
  src,
  alt = "",
}: {
  add?: boolean;
  muted?: boolean;
  className?: string;
  icon?: string;
  src?: string | null;
  alt?: string;
}) {
  return (
    <div
      className={`flex aspect-square items-center justify-center overflow-hidden rounded-lg ${
        src
          ? "bg-canvas"
          : add
            ? "border-[1.5px] border-dashed border-ink-30 bg-white text-ink-70"
            : muted
              ? "bg-gradient-to-br from-[#DADDDE] to-[#EDEDEC] text-ink-70"
              : "bg-gradient-to-br from-ember-tint to-[#FFE9E2] text-ember-dark"
      } ${className ?? ""}`}
    >
      {src ? (
        // Signed Supabase URLs include query tokens; a plain img avoids next/image config.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <Icon name={add ? "add" : icon} className={add ? "text-[22px]" : "text-[26px]"} />
      )}
    </div>
  );
}

export function Avatar({
  initials,
  muted,
  className,
}: {
  initials: string;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold ${
        muted ? "bg-canvas text-ink-70" : "bg-ember-tint text-ember-dark"
      } ${className ?? "h-[42px] w-[42px]"}`}
    >
      {initials}
    </span>
  );
}

export function QuoteCard({
  tag,
  children,
}: {
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5 rounded-2xl bg-ink p-5 text-white">
      <Tag className="mb-2.5 bg-white/15 text-white">{tag}</Tag>
      <p className="font-[family-name:var(--font-display)] text-[22px] font-semibold leading-snug">
        {children}
      </p>
    </div>
  );
}

export function Footnote({ children }: { children: React.ReactNode }) {
  return <p className="mt-2.5 text-center text-[11px] leading-normal text-ink-70">{children}</p>;
}

export function Divider({ className }: { className?: string }) {
  return <hr className={`my-3.5 border-0 border-t border-[#E7E7E5] ${className ?? ""}`} />;
}

export function Field({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl bg-canvas px-3 py-2.5 text-[13.5px] text-ink outline-none placeholder:text-ink-70"
    />
  );
}
