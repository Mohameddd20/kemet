import type { FC } from 'react';

interface AppIconProps {
  id: string;
  className?: string;
}

export const AppVectorIcon: FC<AppIconProps> = ({ id, className = 'w-8 h-8' }) => {
  switch (id) {
    case 'vscode':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#0F1E33" />
          <path d="M22.5 5.5L26 7.2V24.8L22.5 26.5L11.8 17.7L7.5 21L5.8 19.8V12.2L7.5 11L11.8 14.3L22.5 5.5Z" fill="#007ACC" />
          <path d="M22.5 5.5L13.5 14.3L22.5 26.5L26 24.8V7.2L22.5 5.5Z" fill="#38BDF8" opacity="0.85" />
          <path d="M22.5 11.2L15.5 16L22.5 20.8V11.2Z" fill="#0F1E33" />
        </svg>
      );
    case 'git':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#2B1410" />
          <path d="M25.2 14.6L17.4 6.8C16.6 6 15.4 6 14.6 6.8L12.7 8.7L15 11C15.6 10.8 16.3 10.9 16.8 11.4C17.3 11.9 17.4 12.6 17.2 13.2L19.4 15.4C20 15.2 20.7 15.3 21.2 15.8C21.9 16.5 21.9 17.7 21.2 18.4C20.5 19.1 19.3 19.1 18.6 18.4C18.1 17.9 18 17.2 18.2 16.5L16.1 14.4V20C16.3 20.1 16.5 20.2 16.7 20.4C17.4 21.1 17.4 22.3 16.7 23C16 23.7 14.8 23.7 14.1 23C13.4 22.3 13.4 21.1 14.1 20.4C14.3 20.2 14.6 20 14.8 19.9V14.2C14.6 14.1 14.3 14 14.1 13.8C13.6 13.3 13.5 12.5 13.7 11.9L11.5 9.7L6.8 14.6C6 15.4 6 16.6 6.8 17.4L14.6 25.2C15.4 26 16.6 26 17.4 25.2L25.2 17.4C26 16.6 26 15.4 25.2 14.6Z" fill="#F05032" />
        </svg>
      );
    case 'python':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#172030" />
          <path d="M15.8 6C11.4 6 11.8 7.9 11.8 7.9V10.1H16V10.9H9.9C9.9 10.9 7 10.5 7 15.2C7 19.9 9.5 19.7 9.5 19.7H11.3V17.4C11.3 17.4 11.2 14.9 13.8 14.9H18.1C18.1 14.9 20.3 14.9 20.3 12.8V8.4C20.3 8.4 20.7 6 15.8 6ZM13.5 7.4C14 7.4 14.4 7.8 14.4 8.3C14.4 8.8 14 9.2 13.5 9.2C13 9.2 12.6 8.8 12.6 8.3C12.6 7.8 13 7.4 13.5 7.4Z" fill="#38BDF8" />
          <path d="M16.2 26C20.6 26 20.2 24.1 20.2 24.1V21.9H16V21.1H22.1C22.1 21.1 25 21.5 25 16.8C25 12.1 22.5 12.3 22.5 12.3H20.7V14.6C20.7 14.6 20.8 17.1 18.2 17.1H13.9C13.9 17.1 11.7 17.1 11.7 19.2V23.6C11.7 23.6 11.3 26 16.2 26ZM18.5 24.6C18 24.6 17.6 24.2 17.6 23.7C17.6 23.2 18 22.8 18.5 22.8C19 22.8 19.4 23.2 19.4 23.7C19.4 24.2 19 24.6 18.5 24.6Z" fill="#FBBF24" />
        </svg>
      );
    case 'nodejs':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#0E241C" />
          <path d="M16 5.5L25 10.7V21.3L16 26.5L7 21.3V10.7L16 5.5Z" fill="#10B981" fillOpacity="0.22" stroke="#10B981" strokeWidth="1.8" />
          <path d="M13 13V19C13 20 12.3 20.6 11.4 20.6C10.7 20.6 10.2 20.2 10 19.6M16.5 14.5C16.5 13.5 17.4 12.8 18.6 12.8C19.8 12.8 20.7 13.5 20.7 14.4C20.7 15.6 19.2 15.8 18.1 16.2C17 16.6 16.3 17.2 16.3 18.4C16.3 19.6 17.3 20.5 18.7 20.5C20 20.5 21 19.8 21.2 18.7" stroke="#34D399" strokeWidth="1.9" strokeLinecap="round" />
        </svg>
      );
    case 'krita':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#1E1630" />
          <circle cx="16" cy="16" r="9.5" fill="url(#kritaGrad)" />
          <path d="M9 10.5L17.5 18.2L20.2 22.5L15.4 19.8L7.8 12.2L9 10.5Z" fill="#F8FAFC" />
          <path d="M18.2 19.2C19.8 18.6 21.6 19.5 22 21.2C22.4 22.7 20.8 24 19.1 23.4C18.5 21.9 18 20.6 18.2 19.2Z" fill="#1E293B" />
          <defs>
            <linearGradient id="kritaGrad" x1="7" y1="7" x2="25" y2="25" gradientUnits="userSpaceOnUse">
              <stop stopColor="#EC4899" />
              <stop offset="0.5" stopColor="#8B5CF6" />
              <stop offset="1" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'libreoffice':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#14232E" />
          <path d="M9 6.5H18.5L23.5 11.5V25.5H9V6.5Z" fill="#F8FAFC" />
          <path d="M18.5 6.5L23.5 11.5H18.5V6.5Z" fill="#94A3B8" />
          <rect x="11.5" y="15" width="9" height="1.8" rx="0.9" fill="#0F172A" />
          <rect x="11.5" y="18.5" width="9" height="1.8" rx="0.9" fill="#10B981" />
          <rect x="11.5" y="22" width="6" height="1.8" rx="0.9" fill="#0F172A" />
        </svg>
      );
    case 'firefox':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#1A1533" />
          <circle cx="16" cy="16" r="8.5" fill="#2563EB" />
          <path d="M23.5 13C22.2 9.4 18.8 7.5 15.2 7.8C11.4 8.2 8.2 11.4 8.2 15.5C8.2 20.1 11.8 23.8 16.4 23.8C20.5 23.8 23.8 20.6 24 16.5C23.1 18.2 21.1 19.2 19 18.8C16.7 18.4 15.4 16.5 15.8 14.5C16.1 13 17.3 12 18.8 11.8C20.6 11.5 22.3 12 23.5 13Z" fill="url(#ffGrad)" />
          <defs>
            <linearGradient id="ffGrad" x1="8" y1="8" x2="24" y2="24" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FBBF24" />
              <stop offset="0.55" stopColor="#F97316" />
              <stop offset="1" stopColor="#E11D48" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'ark':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#261D10" />
          <rect x="7.5" y="7" width="17" height="18" rx="3" fill="#F59E0B" />
          <rect x="14.2" y="7" width="3.6" height="11" fill="#1E293B" />
          <rect x="14.2" y="19.5" width="3.6" height="3" rx="0.8" fill="#F8FAFC" />
          <path d="M14.5 9.5H17.5M14.5 12H17.5M14.5 14.5H17.5" stroke="#FBBF24" strokeWidth="1.2" />
        </svg>
      );
    case 'kate':
    case 'notepad-next':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#11222E" />
          <rect x="8" y="6.5" width="16" height="19" rx="2.5" fill="#1E293B" stroke="#38BDF8" strokeWidth="1.5" />
          <path d="M12.5 13L10.5 15.5L12.5 18M19.5 13L21.5 15.5L19.5 18M17 12L15 19" stroke="#2DD4BF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'taskmgr':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#0E2522" />
          <rect x="6.5" y="8" width="19" height="14" rx="2.5" stroke="#10B981" strokeWidth="1.6" fill="#071312" />
          <path d="M9 16.5H12L14 12L17 19L19.5 14.5L21 16.5H23" stroke="#34D399" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12.5 24.5H19.5" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'chrome':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#161D2B" />
          <circle cx="16" cy="16" r="9" fill="#FBBF24" />
          <path d="M16 7C19.8 7 23.1 9.4 24.4 12.8H16V7Z" fill="#EF4444" />
          <path d="M7.6 12.5C9.2 9.2 12.4 7 16 7V12.8L11.5 18.5L7.6 12.5Z" fill="#EF4444" />
          <path d="M16 25C11.4 25 7.6 21.5 7.1 17C7 15.4 7.2 13.8 7.8 12.4L12.6 20.5L16 25Z" fill="#22C55E" />
          <circle cx="16" cy="16" r="4.5" fill="#F8FAFC" />
          <circle cx="16" cy="16" r="3.2" fill="#3B82F6" />
        </svg>
      );
    case 'steam':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#0F1C33" />
          <circle cx="16" cy="16" r="9.5" fill="#1D4ED8" />
          <circle cx="19.5" cy="13" r="3" stroke="#F8FAFC" strokeWidth="1.8" />
          <circle cx="12" cy="19.5" r="2.5" stroke="#F8FAFC" strokeWidth="1.6" />
          <path d="M13.8 17.8L17.4 14.8" stroke="#F8FAFC" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'wine':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#1C142B" />
          <path d="M11 8H21L20 14.5C19.7 16.5 18 18 16 18C14 18 12.3 16.5 12 14.5L11 8Z" fill="#E11D48" />
          <path d="M16 18V24M12 24H20" stroke="#F8FAFC" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'vlc':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#26170D" />
          <path d="M16 7L21.5 22.5H10.5L16 7Z" fill="#F97316" />
          <path d="M13 15.5H19M11.8 19H20.2" stroke="#F8FAFC" strokeWidth="1.8" />
          <rect x="8.5" y="22.5" width="15" height="2.5" rx="1" fill="#EA580C" />
        </svg>
      );
    case 'obs':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#111827" />
          <circle cx="16" cy="16" r="8.5" stroke="#E2E8F0" strokeWidth="1.8" />
          <circle cx="16" cy="11.5" r="2.8" fill="#38BDF8" />
          <circle cx="12.2" cy="18.2" r="2.8" fill="#38BDF8" />
          <circle cx="19.8" cy="18.2" r="2.8" fill="#38BDF8" />
        </svg>
      );
    case 'mypc':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect x="4" y="5" width="24" height="17" rx="3" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.8" />
          <rect x="6.5" y="7.5" width="19" height="12" rx="1.5" fill="url(#pcGrad)" />
          <path d="M12 22.5L11 26.5H21L20 22.5" fill="#94A3B8" />
          <rect x="9" y="26" width="14" height="2" rx="1" fill="#CBD5E1" />
          <defs>
            <linearGradient id="pcGrad" x1="6.5" y1="7.5" x2="25.5" y2="19.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0EA5E9" />
              <stop offset="1" stopColor="#14B8A6" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'files':
    case 'home-folder':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <path d="M4 9.5C4 7.8 5.3 6.5 7 6.5H12.8L15.2 9H25C26.7 9 28 10.3 28 12V23C28 24.7 26.7 26 25 26H7C5.3 26 4 24.7 4 23V9.5Z" fill="#D97706" />
          <path d="M4 12C4 10.9 4.9 10 6 10H26C27.1 10 28 10.9 28 12V23C28 24.7 26.7 26 25 26H7C5.3 26 4 24.7 4 23V12Z" fill="url(#folderGrad)" />
          <defs>
            <linearGradient id="folderGrad" x1="4" y1="10" x2="28" y2="26" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FBBF24" />
              <stop offset="1" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'store':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#0E292E" />
          <path d="M8.5 11.5H23.5L25 25.5H7L8.5 11.5Z" fill="url(#storeGrad)" />
          <path d="M12.5 11.5V9.5C12.5 7.6 14.1 6 16 6C17.9 6 19.5 7.6 19.5 9.5V11.5" stroke="#2DD4BF" strokeWidth="2" strokeLinecap="round" />
          <path d="M13.5 17.5L15.5 19.5L19 15.5" stroke="#0B1120" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="storeGrad" x1="7" y1="11.5" x2="25" y2="25.5" gradientUnits="userSpaceOnUse">
              <stop stopColor="#2DD4BF" />
              <stop offset="1" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>
      );
    case 'trash':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect x="8.5" y="9.5" width="15" height="17" rx="2.5" fill="#1E293B" stroke="#94A3B8" strokeWidth="1.6" />
          <path d="M6.5 9.5H25.5" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
          <path d="M12.5 9.5V7.5C12.5 6.9 12.9 6.5 13.5 6.5H18.5C19.1 6.5 19.5 6.9 19.5 7.5V9.5" stroke="#E2E8F0" strokeWidth="1.6" />
          <path d="M12.5 13.5V22.5M16 13.5V22.5M19.5 13.5V22.5" stroke="#38BDF8" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'terminal':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#0B1220" stroke="#334155" strokeWidth="1.5" />
          <path d="M9.5 12L14 16L9.5 20" stroke="#2DD4BF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 20H22.5" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case 'settings':
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#131F35" />
          <circle cx="16" cy="16" r="7" stroke="#38BDF8" strokeWidth="2.4" strokeDasharray="3.2 2.4" />
          <circle cx="16" cy="16" r="3.2" fill="#2DD4BF" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 32 32" className={className} fill="none">
          <rect width="32" height="32" rx="8" fill="#1E293B" />
          <rect x="9" y="9" width="14" height="14" rx="4" stroke="#2DD4BF" strokeWidth="1.8" />
        </svg>
      );
  }
};
