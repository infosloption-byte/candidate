import type { SVGProps } from 'react';

export type IconName = 'menu' | 'chevron-left' | 'chevron-right' | 'grid' | 'users' | 'calendar' | 'briefcase' | 'target' | 'chart' | 'settings' | 'search' | 'plus' | 'bell' | 'x' | 'arrow-left' | 'arrow-right' | 'check' | 'clock' | 'alert' | 'more' | 'phone' | 'map-pin' | 'car' | 'file' | 'sparkles' | 'download' | 'sliders';

const paths: Record<IconName, JSX.Element> = {
  menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  'chevron-left': <path d="m15 18-6-6 6-6" />,
  'chevron-right': <path d="m9 18 6-6-6-6" />,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/></>,
  target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></>,
  chart: <><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 5-6"/></>,
  settings: <><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="m19.4 15 .1.1-1.6 2.8-.2-.1a6.8 6.8 0 0 1-1.6.9l-.1.2h-3.2l-.1-.2a6.8 6.8 0 0 1-1.6-.9l-.2.1-1.6-2.8.1-.1a6.8 6.8 0 0 1 0-1.9l-.1-.1 1.6-2.8.2.1c.5-.4 1-.7 1.6-.9l.1-.2h3.2l.1.2c.6.2 1.1.5 1.6.9l.2-.1 1.6 2.8-.1.1c.1.6.1 1.3 0 1.9Z"/></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  x: <><path d="m6 6 12 12M18 6 6 18"/></>,
  'arrow-left': <><path d="m19 12H5M12 19l-7-7 7-7"/></>,
  'arrow-right': <><path d="M5 12h14M12 5l7 7-7 7"/></>,
  check: <path d="m5 12 4 4L19 6" />,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  alert: <><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4M12 16h.01"/></>,
  more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  phone: <path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 3.1 5.2 2 2 0 0 1 5.1 3h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.7 2.6a2 2 0 0 1-.4 2.1L9.1 10.7a16 16 0 0 0 6.2 6.2l1.3-1.3a2 2 0 0 1 2.1-.4c.8.4 1.7.6 2.6.7a2 2 0 0 1 1.7 2Z" />,
  'map-pin': <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  car: <><path d="m5 16-1-5 2-5h12l2 5-1 5"/><path d="M5 16v3M19 16v3M4 11h16M7 16h10"/><circle cx="7" cy="16" r="1.5"/><circle cx="17" cy="16" r="1.5"/></>,
  file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
  sparkles: <><path d="m12 3-1.2 4.8L6 9l4.8 1.2L12 15l1.2-4.8L18 9l-4.8-1.2L12 3Z"/><path d="m19 15-.7 2.3L16 18l2.3.7L19 21l.7-2.3L22 18l-2.3-.7L19 15ZM5 13l-.6 1.9L2.5 15.5l1.9.6L5 18l.6-1.9 1.9-.6-1.9-.6L5 13Z"/></>,
  download: <><path d="M12 3v11M8 10l4 4 4-4M4 20h16"/></>,
  sliders: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="11" cy="18" r="2"/></>,
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> { name: IconName; size?: number; }

export const Icon = ({ name, size = 20, strokeWidth = 1.8, ...props }: IconProps) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {paths[name]}
  </svg>
);
