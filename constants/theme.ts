// constants/theme.ts
export const COLORS = {
  primary: '#2F49D8',   // Azul protagonista
  primaryDark: '#2A42C8',
  bg: '#2F49D8',
  white: '#FFFFFF',
  text: '#111827',
  muted: '#6B7280',
  line: 'rgba(17,24,39,0.08)',
};

export const RADIUS = {
  card: 28,
  button: 16,
};

export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  } as const,
};
