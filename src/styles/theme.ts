export const lightTheme = {
  colors: {
    // 1. Static Application Brand Identity
    brand: '#DF0000',
    brandPressed: '#B80000',
    brandSubtle: '#FFF0F0',
    onBrand: '#FFFFFF',

    primary: '#DF0000',
    primaryPressed: '#B80000',
    primarySubtle: '#FFF0F0',
    onPrimary: '#FFFFFF',

    // 2. Surfaces & Backgrounds
    background: '#F8F9FA',
    surface: '#FFFFFF',
    surfaceSubtle: '#F1F3F5',
    surfaceSecondary: '#F1F3F5',
    border: '#E9ECEF',
    borderStrong: '#CED4DA',
    divider: '#E9ECEF',

    // 3. Neutral Typography
    textPrimary: '#111827',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textDisabled: '#9CA3AF',

    // 4. Fixed Semantic Colors (Decoupled from Brand)
    success: '#10B981',
    warning: '#F59E0B',
    error: '#DC2626',
    info: '#2563EB',
    disabled: '#E2E8F0',

    status: {
      success: '#10B981',
      successSubtle: 'rgba(16, 185, 129, 0.10)',
      successBorder: 'rgba(16, 185, 129, 0.25)',
      warning: '#F59E0B',
      warningSubtle: 'rgba(245, 158, 11, 0.10)',
      warningBorder: 'rgba(245, 158, 11, 0.25)',
      danger: '#DC2626',
      dangerSubtle: 'rgba(220, 38, 38, 0.08)',
      dangerBorder: 'rgba(220, 38, 38, 0.25)',
      info: '#2563EB',
      infoSubtle: 'rgba(37, 99, 235, 0.10)',
    },
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    hero: 32,
  },
  borderRadius: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  shadows: {
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 5,
      elevation: 2,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 10,
      elevation: 4,
    },
  },
  sizes: {
    buttonHeight: 50,
    inputHeight: 48,
    iconButton: 38,
    headerHeight: 52,
    tabBarHeight: 56,
  },
} as const;

export const darkTheme = {
  colors: {
    // 1. Static Application Brand Identity
    brand: '#FF3333',
    brandPressed: '#DF0000',
    brandSubtle: '#330A0A',
    onBrand: '#FFFFFF',

    primary: '#FF3333',
    primaryPressed: '#DF0000',
    primarySubtle: '#330A0A',
    onPrimary: '#FFFFFF',

    // 2. Surfaces & Backgrounds
    background: '#121212',
    surface: '#1E1E1E',
    surfaceSubtle: '#2A2A2A',
    surfaceSecondary: '#2A2A2A',
    border: '#2E2E2E',
    borderStrong: '#404040',
    divider: '#2E2E2E',

    // 3. Neutral Typography
    textPrimary: '#F9FAFB',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    textDisabled: '#6B7280',

    // 4. Fixed Semantic Colors (Decoupled from Brand)
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
    disabled: '#333333',

    status: {
      success: '#34D399',
      successSubtle: 'rgba(52, 211, 153, 0.15)',
      successBorder: 'rgba(52, 211, 153, 0.3)',
      warning: '#FBBF24',
      warningSubtle: 'rgba(251, 191, 36, 0.15)',
      warningBorder: 'rgba(251, 191, 36, 0.3)',
      danger: '#F87171',
      dangerSubtle: 'rgba(248, 113, 113, 0.15)',
      dangerBorder: 'rgba(248, 113, 113, 0.3)',
      info: '#60A5FA',
      infoSubtle: 'rgba(96, 165, 250, 0.15)',
    },
  },
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
  shadows: lightTheme.shadows,
  sizes: lightTheme.sizes,
} as const;

export type AppTheme = typeof lightTheme;
