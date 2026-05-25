type IconProps = { className?: string };

const svgBase = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function DashboardIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <rect x="3.5" y="3.5" width="7" height="9" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="6" rx="1.6" />
      <rect x="13.5" y="12.5" width="7" height="8" rx="1.6" />
      <rect x="3.5" y="15.5" width="7" height="5" rx="1.6" />
    </svg>
  );
}

export function ChevronLeftIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} strokeWidth={2.2} className={className}>
      <path d="m14.5 5-7 7 7 7" />
    </svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} strokeWidth={2.2} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function HistoryIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function EditIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

export function CameraIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <path d="M4 7h3l2-2h6l2 2h3v11H4V7Z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </svg>
  );
}

export function ScanIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3M7 8v8M12 8v8M17 8v8" />
    </svg>
  );
}

export function ChatIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <path d="M5 18.5V6.8A2.8 2.8 0 0 1 7.8 4h8.4A2.8 2.8 0 0 1 19 6.8v5.4A2.8 2.8 0 0 1 16.2 15H9l-4 3.5Z" />
    </svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.04.04a2 2 0 1 1-2.83 2.83l-.04-.04a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.06a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.04.04a2 2 0 1 1-2.83-2.83l.04-.04A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.06a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.04-.04a2 2 0 1 1 2.83-2.83l.04.04A1.65 1.65 0 0 0 8.9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.06a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.04-.04a2 2 0 1 1 2.83 2.83l-.04.04A1.65 1.65 0 0 0 19.4 9c.13.39.45.7.83.9.24.13.5.2.77.2h.06a2 2 0 1 1 0 4H21a1.65 1.65 0 0 0-1.6 1Z" />
    </svg>
  );
}

export function PillIcon({ className }: IconProps) {
  return (
    <svg {...svgBase} className={className}>
      <path d="M10.5 20.5 3.5 13.5a4.95 4.95 0 0 1 7-7l7 7a4.95 4.95 0 0 1-7 7Z" />
      <path d="m8 8 8 8" />
    </svg>
  );
}
