import { Platform } from 'react-native';

export const C = {
  BG:        '#F7F8FA',
  SURFACE:   '#FFFFFF',
  SURFACE2:  '#F3F4F6',

  PRIMARY:   '#6366F1',
  PRIMARY_L: '#EEF2FF',
  PRIMARY_D: '#4F46E5',

  TEXT:    '#111827',
  TEXT2:   '#6B7280',
  TEXT3:   '#9CA3AF',

  BORDER:  '#E5E7EB',
  BORDER2: '#F3F4F6',

  TAB_BG:    '#18181B',
  TAB_ACT:   '#818CF8',
  TAB_INACT: '#71717A',

  DANGER:    '#EF4444',
  DANGER_L:  '#FEF2F2',
  SUCCESS:   '#16A34A',
  SUCCESS_L: '#F0FDF4',
  WARNING:   '#D97706',
  WARNING_L: '#FFF7ED',
} as const;

export const STATUS_CONFIG = {
  pending:     { label: 'Pending',     bg: '#FFF7ED', color: '#EA580C', strip: '#FB923C' },
  in_progress: { label: 'In Progress', bg: '#EFF6FF', color: '#2563EB', strip: '#60A5FA' },
  completed:   { label: 'Completed',   bg: '#F0FDF4', color: '#16A34A', strip: '#4ADE80' },
} as const;

const shadowSm =
  Platform.OS === 'web'
    ? { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)' }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 } as const,
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      };

const shadowMd =
  Platform.OS === 'web'
    ? { boxShadow: '0px 4px 16px rgba(0, 0, 0, 0.07)' }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 } as const,
        shadowOpacity: 0.07,
        shadowRadius: 16,
        elevation: 3,
      };

export const shadow = {
  sm: shadowSm,
  md: shadowMd,
} as const;
