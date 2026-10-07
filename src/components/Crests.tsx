import React from 'react';

export const DragonCrestSvg: React.FC<{ className?: string }> = ({
  className = 'w-10 h-10',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle
      cx="32"
      cy="32"
      r="29"
      stroke="currentColor"
      strokeOpacity="0.28"
      strokeWidth="1.5"
    />
    <circle
      cx="32"
      cy="32"
      r="24"
      stroke="currentColor"
      strokeOpacity="0.15"
      strokeWidth="1"
      strokeDasharray="3 3"
    />
    {/* Original geometric Imperial Dragon crest */}
    <path
      d="M18 22C21 15 29 12 37 14C44 16 49 22 47 30C45 36 38 38 32 37C26 36 21 39 21 44C21 48 27 51 35 50C40 49 44 46 46 43"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Dragon horns & whisker flares */}
    <path
      d="M24 16L19 10M31 14L29 8M42 22L50 19M44 28L52 28"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    {/* Dragon pearl of wisdom */}
    <circle cx="32" cy="26" r="3.5" fill="currentColor" />
  </svg>
);

export const TigerCrestSvg: React.FC<{ className?: string }> = ({
  className = 'w-10 h-10',
}) => (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle
      cx="32"
      cy="32"
      r="29"
      stroke="currentColor"
      strokeOpacity="0.28"
      strokeWidth="1.5"
    />
    <circle
      cx="32"
      cy="32"
      r="24"
      stroke="currentColor"
      strokeOpacity="0.15"
      strokeWidth="1"
      strokeDasharray="3 3"
    />
    {/* Original geometric Royal Tiger crest */}
    <path
      d="M16 20L22 13L27 18H37L42 13L48 20L45 36L32 49L19 36L16 20Z"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinejoin="round"
    />
    {/* Regal brow stripes ("Wang" royal mark) */}
    <path
      d="M27 23H37M29 27H35M32 21V29"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    {/* Fierce eyes & nose */}
    <path
      d="M23 32L27 34M41 32L37 34M29 40L32 43L35 40"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
