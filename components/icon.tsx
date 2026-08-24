type IconProps = {
  name: string;
  className?: string;
};

export function Icon({ name, className }: IconProps) {
  return (
    <span className={`msi ${className ?? ""}`} aria-hidden>
      {name}
    </span>
  );
}
