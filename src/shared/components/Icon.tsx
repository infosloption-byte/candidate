import type { SVGProps } from 'react';

export type IconName =
  | 'home' | 'users' | 'calendar' | 'briefcase' | 'layers' | 'chart' | 'settings' | 'bell'
  | 'search' | 'plus' | 'chevron-down' | 'chevron-right' | 'arrow-left' | 'filter' | 'map-pin'
  | 'phone' | 'mail' | 'file' | 'clock' | 'check' | 'x' | 'more' | 'sparkles' | 'shield'
  | 'globe' | 'car' | 'briefcase-business' | 'menu' | 'user-plus';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const paths: Record<IconName, string[]> = {
  home: ['M3 10.5 12 3l9 7.5', 'M5.5 9.5V21h13V9.5', 'M9.5 21v-6h5v6'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2', 'M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M18 8a4 4 0 0 1 0 7.75', 'M21 21v-2a4 4 0 0 0-3-3.87'],
  calendar: ['M7 3v4', 'M17 3v4', 'M3.5 9.5h17', 'M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z'],
  briefcase: ['M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7', 'M4 7h16a2 2 0 0 1 2 2v8.5a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5V9a2 2 0 0 1 2-2Z', 'M2 12h20', 'M9.5 12v2h5v-2'],
  layers: ['m12 3 9 4.5-9 4.5-9-4.5L12 3Z', 'm3 12 9 4.5 9-4.5', 'm3 16.5 9 4.5 9-4.5'],
  chart: ['M4 19V5', 'M4 19h17', 'm7 15 3-4 3 2 5-7'],
  settings: ['M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z', 'M19.4 15a1.75 1.75 0 0 0 .35 1.93l.06.06-1.8 1.8-.06-.06a1.75 1.75 0 0 0-1.93-.35 1.75 1.75 0 0 0-1.06 1.6V20H11v-.02a1.75 1.75 0 0 0-1.06-1.6 1.75 1.75 0 0 0-1.93.35l-.06.06-1.8-1.8.06-.06A1.75 1.75 0 0 0 6.56 15 1.75 1.75 0 0 0 5 13.94H5v-2.88h.02A1.75 1.75 0 0 0 6.56 10a1.75 1.75 0 0 0-.35-1.93l-.06-.06 1.8-1.8.06.06a1.75 1.75 0 0 0 1.93.35A1.75 1.75 0 0 0 11 5.02V5h2.96v.02A1.75 1.75 0 0 0 15 6.62a1.75 1.75 0 0 0 1.93-.35l.06-.06 1.8 1.8-.06.06A1.75 1.75 0 0 0 18.4 10a1.75 1.75 0 0 0 1.6 1.06H20v2.88h-.02A1.75 1.75 0 0 0 19.4 15Z'],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M10 21h4'],
  search: ['m21 21-4.35-4.35', 'M10.75 18a7.25 7.25 0 1 0 0-14.5 7.25 7.25 0 0 0 0 14.5Z'],
  plus: ['M12 5v14', 'M5 12h14'],
  'chevron-down': ['m6 9 6 6 6-6'],
  'chevron-right': ['m9 18 6-6-6-6'],
  'arrow-left': ['M19 12H5', 'm12 19-7-7 7-7'],
  filter: ['M4 6h16', 'M7 12h10', 'M10 18h4'],
  'map-pin': ['M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z', 'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'],
  phone: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z'],
  mail: ['M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'm22 6-10 7L2 6'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', 'M14 2v6h6', 'M8 13h8', 'M8 17h5'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 6v6l4 2'],
  check: ['m5 12 4 4L19 6'],
  x: ['M6 6l12 12', 'M18 6 6 18'],
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
  sparkles: ['m12 3-1.2 4.2L7 8.5l3.8 1.3L12 14l1.2-4.2L17 8.5l-3.8-1.3L12 3Z', 'm19 14-.7 2.3L16 17l2.3.7L19 20l.7-2.3L22 17l-2.3-.7L19 14Z', 'm5 14-.6 1.9L2.5 17l1.9.6L5 19.5l.6-1.9 1.9-.6-1.9-.6L5 14Z'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z', 'm9 12 2 2 4-4'],
  globe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M3 12h18', 'M12 3a14 14 0 0 1 0 18', 'M12 3a14 14 0 0 0 0 18'],
  car: ['M5 17h14', 'M6 17 4 11l2-5h12l2 5-2 6', 'M8 17a1 1 0 1 1-2 0', 'M18 17a1 1 0 1 1-2 0', 'M6 11h12'],
  'briefcase-business': ['M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7', 'M4 7h16a2 2 0 0 1 2 2v8.5a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5V9a2 2 0 0 1 2-2Z', 'M8 12h8'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  'user-plus': ['M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M19 8v6', 'M16 11h6'],
};

export const Icon = ({ name, size = 20, strokeWidth = 1.8, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
    {paths[name].map((path, index) => <path key={`${name}-${index}`} d={path} />)}
  </svg>
);
