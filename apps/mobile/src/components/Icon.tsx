import React from 'react';
import * as Lucide from 'lucide-react';

type IconProps = {
  name: string;
  size?: number;
  color?: string;
  style?: any;
};

const NAME_MAP: Record<string, string> = {
  // ── existing mappings ──────────────────────────────────────────────────────
  'map-marker-radius': 'MapPin',
  'map-marker-off-outline': 'MapPinOff',
  'map-marker-off': 'MapPinOff',
  'map-marker': 'MapPin',
  'gesture-tap': 'MousePointerClick',
  'close-circle': 'XCircle',
  'close-circle-outline': 'XCircle',
  'alert-circle': 'AlertCircle',
  'alert-circle-outline': 'AlertCircle',
  'format-list-bulleted': 'List',
  'calendar-month': 'Calendar',
  'login-variant': 'LogIn',
  'logout-variant': 'LogOut',
  'check-circle-outline': 'CheckCircle',
  'check-circle': 'CheckCircle',
  'clock-alert': 'Clock',
  'information-outline': 'Info',
  'alert-outline': 'AlertTriangle',
  'bell-off-outline': 'BellOff',
  'bell-outline': 'Bell',

  // ── NEW: AppHeader — theme toggle ──────────────────────────────────────────
  'weather-night': 'Moon',
  'white-balance-sunny': 'Sun',
  'moon-waning-crescent': 'Moon',

  // ── NEW: LoginScreen ──────────────────────────────────────────────────────
  'fingerprint': 'Fingerprint',
  'email-outline': 'Mail',
  'lock-outline': 'Lock',
  'eye-outline': 'Eye',
  'eye-off-outline': 'EyeOff',
  'arrow-right': 'ArrowRight',

  // ── NEW: MainLayout bottom tabs ───────────────────────────────────────────
  'home': 'Home',
  'calendar-check': 'CalendarCheck',
  'bell': 'Bell',
  'account-circle': 'CircleUser',

  // ── NEW: AttendanceScreen ─────────────────────────────────────────────────
  'calendar-blank': 'CalendarDays',

  // ── NEW: ProfileScreen ────────────────────────────────────────────────────
  'logout': 'LogOut',
  'toggle-switch': 'ToggleRight',
  'toggle-switch-off': 'ToggleLeft',
  'help-circle-outline': 'HelpCircle',
};

function toPascal(name: string) {
  return name
    .split(/[-_ ]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

const Icon: React.FC<IconProps> = ({ name, size = 24, color = '#000', style, ...rest }) => {
  const mapped = NAME_MAP[name] || toPascal(name.replace(/^(mdi-|md-)/, ''));
  const Comp = (Lucide as any)[mapped] as React.ComponentType<any> | undefined;

  if (Comp) {
    return <Comp size={size} color={color} style={style} {...rest} />;
  }

  // Fallback: render a simple circle if icon not found
  const Fallback = (Lucide as any)['Circle'] || (() => null);
  return <Fallback size={size} color={color} style={style} {...rest} />;
};

export default Icon;