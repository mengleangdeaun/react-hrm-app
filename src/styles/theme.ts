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
    surfaceSecondary: '#E9ECEF',
    border: 'rgba(0, 0, 0, 0.07)',
    borderSubtle: 'rgba(0, 0, 0, 0.04)',
    borderStrong: 'rgba(0, 0, 0, 0.14)',
    divider: 'rgba(0, 0, 0, 0.06)',

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

    // 5. Fixed fills & foregrounds
    // `solid.*` are filled backgrounds that always carry `onSolid` (white) content - badges, banners,
    // the scan button. They are identical in both themes on purpose: the lighter dark-mode status
    // colours above are tuned for text on dark surfaces and fail contrast behind white text.
    onSolid: '#FFFFFF',
    solid: {
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#2563EB',
      neutral: '#4B5563',
    },
    // Text on the matching `status.*Subtle` tint (AA contrast in both themes)
    statusText: {
      success: '#047857',
      warning: '#B45309',
      danger: '#B91C1C',
      info: '#1D4ED8',
    },
    neutralSubtle: 'rgba(100, 116, 139, 0.12)',
    skeleton: '#E2E8F0',
    scrim: 'rgba(0, 0, 0, 0.55)',
    shadow: '#000000',

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
      infoBorder: 'rgba(37, 99, 235, 0.25)',
      purple: '#8B5CF6',
      purpleSubtle: 'rgba(139, 92, 246, 0.10)',
      purpleBorder: 'rgba(139, 92, 246, 0.25)',
      cyan: '#06B6D4',
      cyanSubtle: 'rgba(6, 182, 212, 0.10)',
      cyanBorder: 'rgba(6, 182, 212, 0.25)',
      pink: '#EC4899',
      pinkSubtle: 'rgba(236, 72, 153, 0.10)',
      pinkBorder: 'rgba(236, 72, 153, 0.25)',
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
    screenGutter: 16,
    authGutter: 24,
    cardPadding: 16,
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
    xs: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0.5 },
    shadowOpacity: 0.02,
    shadowRadius: 1,
    elevation: 0.5,
    },
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
    buttonHeightSm: 36,
    buttonHeightMd: 44,
    buttonHeightLg: 50,
    buttonHeight: 50,
    inputHeight: 48,
    iconButton: 38,
    // Minimum tappable area (Apple HIG 44pt / Material 48dp). Smaller visuals extend it with hitSlop.
    touchTargetMin: 44,
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
    surfaceSubtle: '#262626',
    surfaceSecondary: '#2E2E2E',
    border: 'rgba(255, 255, 255, 0.08)',
    borderSubtle: 'rgba(255, 255, 255, 0.04)',
    borderStrong: 'rgba(255, 255, 255, 0.16)',
    divider: 'rgba(255, 255, 255, 0.06)',

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

    // 5. Fixed fills & foregrounds (see lightTheme)
    onSolid: '#FFFFFF',
    solid: {
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#2563EB',
      neutral: '#374151',
    },
    statusText: {
      success: '#34D399',
      warning: '#FBBF24',
      danger: '#F87171',
      info: '#60A5FA',
    },
    neutralSubtle: 'rgba(255, 255, 255, 0.08)',
    skeleton: '#2E2E2E',
    scrim: 'rgba(0, 0, 0, 0.72)',
    shadow: '#000000',

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
      infoBorder: 'rgba(96, 165, 250, 0.3)',
      purple: '#A78BFA',
      purpleSubtle: 'rgba(167, 139, 250, 0.15)',
      purpleBorder: 'rgba(167, 139, 250, 0.3)',
      cyan: '#22D3EE',
      cyanSubtle: 'rgba(34, 211, 238, 0.15)',
      cyanBorder: 'rgba(34, 211, 238, 0.3)',
      pink: '#F472B6',
      pinkSubtle: 'rgba(244, 114, 182, 0.15)',
      pinkBorder: 'rgba(244, 114, 182, 0.3)',
    },
  },
  spacing: lightTheme.spacing,
  borderRadius: lightTheme.borderRadius,
  shadows: lightTheme.shadows,
  sizes: lightTheme.sizes,
} as const;

export type AppTheme = typeof lightTheme;
