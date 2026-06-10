export interface ThemeTokens {
  background: string;
  surface:    string;
  surfaceAlt: string;
  border:     string;
  ink:        string;
  inkMid:     string;
  muted:      string;
  accent:     string;
  accentDim:  string;
  success:    string;
  warning:    string;
  danger:     string;
  white:      string;
}

// Attenuate — dark-first palette
export const DARK: ThemeTokens = {
  background: '#0E0D16',
  surface:    '#16151F',
  surfaceAlt: '#1E1C2A',
  border:     '#252334',
  ink:        '#E8E6F0',
  inkMid:     '#A8A5C0',
  muted:      '#5A5870',
  accent:     '#00C2A8',
  accentDim:  '#007A6A',
  success:    '#00C2A8',
  warning:    '#F0A040',
  danger:     '#D9381E',
  white:      '#FAFAFA',
};

export const LIGHT: ThemeTokens = {
  background: '#F0F2F5',
  surface:    '#E2E6ED',
  surfaceAlt: '#D4DAE3',
  border:     '#A8B0C0',
  ink:        '#0F0E1A',
  inkMid:     '#2A2838',
  muted:      '#6A6880',
  accent:     '#009488',
  accentDim:  '#00C2A8',
  success:    '#009488',
  warning:    '#D96020',
  danger:     '#C03020',
  white:      '#FAFAFA',
};
