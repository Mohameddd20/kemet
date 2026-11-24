import { useState } from 'react';

interface KemetLogoProps {
  className?: string;
  alt?: string;
}

export function KemetLogo({
  className = 'w-16 h-16',
  alt = 'KemetOS 1.0 Cyber-Pharaonic Emblem',
}: KemetLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!imgFailed) {
    return (
      <img
        src="/kemet-logo.png"
        alt={alt}
        loading="eager"
        decoding="async"
        onError={() => setImgFailed(true)}
        className={`object-contain rounded-2xl select-none pointer-events-none ${className}`}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 120 120"
      aria-label={alt}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon
        points="60,8 106,34 106,86 60,112 14,86 14,34"
        fill="#070b14"
        stroke="#22d3ee"
        strokeWidth="3.5"
      />
      <polygon
        points="60,16 99,38 99,82 60,104 21,82 21,38"
        stroke="#f59e0b"
        strokeWidth="3"
      />
      <path
        d="M42 42 C58 30, 80 34, 86 48 C82 52, 74 52, 71 58 C69 63, 72 72, 78 78 L46 78 C40 68, 38 54, 42 42 Z"
        fill="#fbbf24"
      />
      <polygon points="60,64 80,90 40,90" fill="#f59e0b" stroke="#070b14" strokeWidth="2" />
      <circle cx="71" cy="45" r="3.5" fill="#22d3ee" />
    </svg>
  );
}
