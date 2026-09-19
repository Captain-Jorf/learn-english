import React from 'react';

const iconPaths = {
  home: (
    <>
      <path d="M3.5 10.5 12 3l8.5 7.5v8.25a2.25 2.25 0 0 1-2.25 2.25H5.75A2.25 2.25 0 0 1 3.5 18.75V10.5Z" />
      <path d="M8.5 21v-6.25h7V21" />
    </>
  ),
  learn: (
    <>
      <path d="M5 4.5h11.75A2.25 2.25 0 0 1 19 6.75V19.5H7.25A2.25 2.25 0 0 1 5 17.25V4.5Z" />
      <path d="M5 17.25A2.25 2.25 0 0 1 7.25 15H19" />
      <path d="M9 8h6.5M9 11h5" />
    </>
  ),
  review: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="m16.7 7.3 3-3M4.3 19.7l3-3M19.7 19.7l-3-3M4.3 4.3l3 3" />
    </>
  ),
  coach: (
    <>
      <path d="M5.25 5.25h13.5A2.25 2.25 0 0 1 21 7.5v8.25A2.25 2.25 0 0 1 18.75 18H11l-4.75 3v-3H5.25A2.25 2.25 0 0 1 3 15.75V7.5a2.25 2.25 0 0 1 2.25-2.25Z" />
      <path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" strokeLinecap="round" strokeWidth="2.7" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20.5c.75-4.1 3.3-6.15 7.5-6.15s6.75 2.05 7.5 6.15" />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />,
  arrowLeft: <path d="M19 12H5m6 6-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />,
  chevronRight: <path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />,
  chevronDown: <path d="m5 9 7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />,
  plus: <path d="M12 5v14M5 12h14" strokeLinecap="round" />,
  close: <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />,
  search: (
    <>
      <circle cx="10.7" cy="10.7" r="5.7" />
      <path d="m15.2 15.2 4.3 4.3" strokeLinecap="round" />
    </>
  ),
  bookmark: <path d="M6.5 4.25h11v16l-5.5-3.7-5.5 3.7v-16Z" strokeLinejoin="round" />,
  bookmarkFilled: <path d="M6.5 4.25h11v16l-5.5-3.7-5.5 3.7v-16Z" fill="currentColor" strokeLinejoin="round" />,
  play: <path d="m9 6 9 6-9 6V6Z" fill="currentColor" strokeLinejoin="round" />,
  sound: (
    <>
      <path d="M5 9.5h3.25L12.5 6v12l-4.25-3.5H5v-5Z" strokeLinejoin="round" />
      <path d="M16 9.25c.85.7 1.3 1.62 1.3 2.75S16.85 14.05 16 14.75M18.5 6.8c1.6 1.4 2.4 3.13 2.4 5.2s-.8 3.8-2.4 5.2" strokeLinecap="round" />
    </>
  ),
  check: <path d="m5 12.5 4.35 4.35L19 7.2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.2 12.15 2.45 2.45 5.15-5.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  bolt: <path d="m13.2 2.8-7 10h5.3l-.85 8.4 7.2-10.45h-5.4l.75-7.95Z" strokeLinejoin="round" />,
  trend: (
    <>
      <path d="M4 17.25 9.2 12l3.4 3.4L20 8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.75 8H20v4.25" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  calendar: (
    <>
      <rect x="4.25" y="5.5" width="15.5" height="14.25" rx="2" />
      <path d="M7.5 3.5v4M16.5 3.5v4M4.25 9.5h15.5M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01" strokeLinecap="round" strokeWidth="2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5.2l3.4 2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3.5 8 4.25L12 12 4 7.75 12 3.5Z" strokeLinejoin="round" />
      <path d="m4 12 8 4.25L20 12M4 16.25 12 20.5l8-4.25" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  spark: (
    <>
      <path d="m12 3 1.35 5.65L19 10l-5.65 1.35L12 17l-1.35-5.65L5 10l5.65-1.35L12 3Z" strokeLinejoin="round" />
      <path d="m19 16 .55 2.45L22 19l-2.45.55L19 22l-.55-2.45L16 19l2.45-.55L19 16Z" strokeLinejoin="round" />
    </>
  ),
  moon: <path d="M19.25 15.25A7.5 7.5 0 0 1 8.75 4.75 8.2 8.2 0 1 0 19.25 15.25Z" strokeLinejoin="round" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.72 5.28l-1.42 1.42M6.7 17.3l-1.42 1.42M18.72 18.72 17.3 17.3M6.7 6.7 5.28 5.28" strokeLinecap="round" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.3 13.5a1.6 1.6 0 0 0 .32 1.77l.06.06-2.2 2.2-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47v.13h-3.12v-.13a1.6 1.6 0 0 0-.97-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06-2.2-2.2.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97h-.13v-3.12h.13a1.6 1.6 0 0 0 1.47-.97 1.6 1.6 0 0 0-.32-1.77l-.06-.06 2.2-2.2.06.06a1.6 1.6 0 0 0 1.77.32 1.6 1.6 0 0 0 .97-1.47v-.13h3.12v.13a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06 2.2 2.2-.06.06a1.6 1.6 0 0 0-.32 1.77 1.6 1.6 0 0 0 1.47.97h.13v3.12h-.13a1.6 1.6 0 0 0-1.47.97Z" strokeLinejoin="round" />
    </>
  ),
  cloud: (
    <>
      <path d="M7.25 18.5h10a3.75 3.75 0 0 0 .7-7.43 6 6 0 0 0-11.68 1.2A3.2 3.2 0 0 0 7.25 18.5Z" />
      <path d="M12 10v5M9.8 12.2 12 10l2.2 2.2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" strokeLinecap="round" strokeWidth="2.2" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4.5h8v4.2a4 4 0 0 1-8 0V4.5ZM8 6H4.75v1.5A3.25 3.25 0 0 0 8 10.75M16 6h3.25v1.5A3.25 3.25 0 0 1 16 10.75M12 12.7v3.55M8.5 20h7M9.5 16.25h5l1 3.75h-7l1-3.75Z" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  refresh: <path d="M19 9.5A7.5 7.5 0 0 0 5.2 7.3L3.5 9m1.5-4.5V9h4.5M5 14.5a7.5 7.5 0 0 0 13.8 2.2l1.7-1.7M19 19.5V15h-4.5" strokeLinecap="round" strokeLinejoin="round" />,
  lock: (
    <>
      <rect x="5.5" y="10" width="13" height="10" rx="2" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" />
    </>
  ),
};

export function Icon({ name, size = 20, strokeWidth = 1.7, className = '', label }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {iconPaths[name] || iconPaths.spark}
    </svg>
  );
}

export function BrandMark({ size = 40, className = '' }) {
  return (
    <svg className={`brand-mark ${className}`} width={size} height={size} viewBox="0 0 44 44" fill="none" aria-label="Lexora" role="img">
      <path d="M7.25 11.5c5.5-2.8 10.45-2.55 14.75.75v20.5c-4.3-3.3-9.25-3.55-14.75-.75V11.5Z" fill="currentColor" fillOpacity=".15" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M36.75 11.5c-5.5-2.8-10.45-2.55-14.75.75v20.5c4.3-3.3 9.25-3.55 14.75-.75V11.5Z" fill="currentColor" fillOpacity=".8" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" />
      <path d="M22 12.25v20.5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M12.25 17.25c2.25-.62 4.1-.38 5.5.7M31.75 17.25c-2.25-.62-4.1-.38-5.5.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
