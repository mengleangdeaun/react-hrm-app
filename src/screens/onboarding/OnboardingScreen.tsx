import React, { useRef, useState, useCallback } from 'react';
import {
    View,
    TouchableOpacity,
    StatusBar,
    StyleSheet,
    Animated,
    useWindowDimensions,
    Platform,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
import {
    ArrowRight,
    ArrowLeft,
    Check,
    X,
    Globe,
    Sun,
    Moon,
    ChevronRight,
} from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { AppText } from '../../components/AppText';
import { HeaderIconButton } from '../../components/common/AppHeader';
import {
    AttendanceIllustration,
    ActivityIllustration,
    LeaveIllustration,
    QuizIllustration,
    ProgressIllustration,
    CalendarIllustration,
    AnnouncementIllustration,
} from './components/OnboardingIllustrations';

interface SlideItem {
    id: string;
    featureKey: string;
    titleKey: string;
    descKey: string;
    illustration: React.ComponentType<{ size?: number; accentColor?: string; isDark?: boolean }>;
}

export const OnboardingScreen: React.FC<{ navigation: any; route?: any }> = ({
    navigation,
    route,
}) => {
    const { width } = useWindowDimensions();
    const { isDark, toggleTheme } = useAppTheme();
    const { theme } = useUnistyles();
    const { t, locale, setLocale } = useTranslation();
    const { completeOnboarding } = useAuth();

    const isReviewMode = route?.params?.isReviewMode === true;
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<any>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    // ── 7 Core Application Features Slides ──────────────────────────────────
    const slides: SlideItem[] = [
        {
            id: '1',
            featureKey: 'attendance',
            titleKey: 'onboarding_1_title',
            descKey: 'onboarding_1_desc',
            illustration: AttendanceIllustration,
        },
        {
            id: '2',
            featureKey: 'activity',
            titleKey: 'onboarding_2_title',
            descKey: 'onboarding_2_desc',
            illustration: ActivityIllustration,
        },
        {
            id: '3',
            featureKey: 'leave',
            titleKey: 'onboarding_3_title',
            descKey: 'onboarding_3_desc',
            illustration: LeaveIllustration,
        },
        {
            id: '4',
            featureKey: 'quizzes',
            titleKey: 'onboarding_4_title',
            descKey: 'onboarding_4_desc',
            illustration: QuizIllustration,
        },
        {
            id: '5',
            featureKey: 'progress',
            titleKey: 'onboarding_5_title',
            descKey: 'onboarding_5_desc',
            illustration: ProgressIllustration,
        },
        {
            id: '6',
            featureKey: 'schedule',
            titleKey: 'onboarding_6_title',
            descKey: 'onboarding_6_desc',
            illustration: CalendarIllustration,
        },
        {
            id: '7',
            featureKey: 'notices',
            titleKey: 'onboarding_7_title',
            descKey: 'onboarding_7_desc',
            illustration: AnnouncementIllustration,
        },
    ];

    const isLastSlide = activeIndex === slides.length - 1;

    // ── Reliable Slide Visibility & Sync Tracking ───────────────────────────
    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
        waitForInteraction: false,
    }).current;

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            const firstVisible = viewableItems[0];
            if (
                firstVisible.index !== null &&
                firstVisible.index !== undefined &&
                typeof firstVisible.index === 'number'
            ) {
                setActiveIndex(firstVisible.index);
            }
        }
    }).current;

    const updateIndexFromOffset = useCallback(
        (offsetX: number) => {
            const idx = Math.round(offsetX / width);
            if (idx >= 0 && idx < slides.length && idx !== activeIndex) {
                setActiveIndex(idx);
            }
        },
        [width, slides.length, activeIndex]
    );

    const scrollToIndex = useCallback(
        (index: number) => {
            if (index < 0 || index >= slides.length) return;
            setActiveIndex(index);
            try {
                flatListRef.current?.scrollToOffset({
                    offset: index * width,
                    animated: true,
                });
            } catch (e) {
                try {
                    flatListRef.current?.scrollToIndex({
                        index,
                        animated: true,
                    });
                } catch (err) {
                    // Ignore
                }
            }
            Haptics.selectionAsync();
        },
        [slides.length, width]
    );

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (activeIndex >= slides.length - 1) {
            handleFinish();
        } else {
            scrollToIndex(activeIndex + 1);
        }
    };

    const handlePrevious = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (activeIndex > 0) {
            scrollToIndex(activeIndex - 1);
        }
    };

    const handleSkip = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await handleFinish();
    };

    const handleFinish = async () => {
        if (isReviewMode) {
            navigation.goBack();
            return;
        }
        await completeOnboarding();
        navigation.replace('Login');
    };

    const toggleLanguage = () => {
        Haptics.selectionAsync();
        setLocale(locale === 'en' ? 'kh' : 'en');
    };

    const renderSlide = ({ item }: { item: SlideItem }) => {
        const IllustrationComponent = item.illustration;
        const illustrationSize = Math.min(width * 0.72, 260);

        return (
            <View style={[styles.slideWrapper, { width }]}>
                <ScrollView
                    contentContainerStyle={styles.slideScrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* SVG Vector Illustration (Centered) */}
                    <View style={styles.illustrationWrapper}>
                        <IllustrationComponent
                            size={illustrationSize}
                            isDark={isDark}
                        />
                    </View>

                    {/* Text Details: Title & Description (Centered) */}
                    <View style={styles.textContent}>
                        <AppText
                            variant="h1"
                            weight="bold"
                            style={[styles.slideTitle, { color: theme.colors.textPrimary }]}
                        >
                            {t(item.titleKey)}
                        </AppText>

                        <AppText
                            variant="body"
                            style={[styles.slideDesc, { color: theme.colors.textSecondary }]}
                        >
                            {t(item.descKey)}
                        </AppText>
                    </View>
                </ScrollView>
            </View>
        );
    };

    return (
        <SafeAreaView {...({ style: [styles.container, { backgroundColor: theme.colors.background }] } as any)}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.colors.background}
            />

            {/* ── Top Utility Bar: Clean Header with only Language & Theme ── */}
            <View style={styles.topBar}>
                {/* Left Side: Language Switcher (plus Close button if in review mode) */}
                <View style={styles.topLeft}>
                    {isReviewMode && (
                        <HeaderIconButton
                            icon={<X size={18} color={theme.colors.textPrimary} />}
                            onPress={() => navigation.goBack()}
                            accessibilityLabel="Close tour"
                        />
                    )}
                    <TouchableOpacity
                        style={[
                            styles.utilityButton,
                            {
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.border,
                            },
                        ]}
                        onPress={toggleLanguage}
                        activeOpacity={0.7}
                        accessibilityLabel="Change Language"
                    >
                        <Globe size={16} color={theme.colors.textPrimary} />
                        <AppText style={[styles.utilityButtonText, { color: theme.colors.textPrimary }]}>
                            {locale === 'en' ? 'ភាសាខ្មែរ' : 'English'}
                        </AppText>
                    </TouchableOpacity>
                </View>

                {/* Right Side: Theme Mode Switcher */}
                <TouchableOpacity
                    style={[
                        styles.iconButton,
                        {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                        },
                    ]}
                    onPress={() => {
                        Haptics.selectionAsync();
                        toggleTheme();
                    }}
                    activeOpacity={0.7}
                    accessibilityLabel="Toggle Theme"
                >
                    {isDark ? (
                        <Sun size={18} color="#FBBF24" />
                    ) : (
                        <Moon size={18} color="#6366F1" />
                    )}
                </TouchableOpacity>
            </View>

            {/* ── Main Feature Carousel ───────────────────────────────────────── */}
            <Animated.FlatList
                ref={flatListRef}
                data={slides}
                keyExtractor={(item: SlideItem) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                scrollEventThrottle={16}
                decelerationRate="fast"
                snapToInterval={width}
                snapToAlignment="center"
                disableIntervalMomentum={Platform.OS !== 'web'}
                initialNumToRender={slides.length}
                maxToRenderPerBatch={slides.length}
                windowSize={slides.length}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                onMomentumScrollEnd={(e: any) => {
                    updateIndexFromOffset(e.nativeEvent.contentOffset.x);
                }}
                onScrollEndDrag={(e: any) => {
                    updateIndexFromOffset(e.nativeEvent.contentOffset.x);
                }}
                getItemLayout={(_data: any, index: number) => ({
                    length: width,
                    offset: width * index,
                    index,
                })}
                onScrollToIndexFailed={(info: { index: number }) => {
                    flatListRef.current?.scrollToOffset({
                        offset: info.index * width,
                        animated: true,
                    });
                }}
                renderItem={renderSlide}
                style={styles.carousel}
            />

            {/* ── Floating Skip Button at Bottom Right (before last slide) ──── */}
            {!isReviewMode && !isLastSlide && (
                <View style={styles.floatingSkipContainer} pointerEvents="box-none">
                    <TouchableOpacity
                        style={[
                            styles.floatingSkipButton,
                            {
                                backgroundColor: isDark ? 'rgba(35, 41, 54, 0.92)' : 'rgba(255, 255, 255, 0.95)',
                                borderColor: isDark ? '#333C4F' : '#E2E8F0',
                            },
                        ]}
                        onPress={handleSkip}
                        activeOpacity={0.75}
                        accessibilityLabel="Skip Onboarding"
                    >
                        <AppText variant="caption" weight="bold" style={{ color: theme.colors.textSecondary }}>
                            {t('skip')}
                        </AppText>
                        <ChevronRight size={13} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            )}

            {/* ── Bottom Controls ────────────────────────────────────────────── */}
            <View
                style={[
                    styles.bottomBar,
                    {
                        backgroundColor: theme.colors.background,
                    },
                ]}
            >
                {/* Pagination Dots Row: Smooth Real-Time Interpolation */}
                <View style={styles.paginationRow}>
                    {slides.map((_, idx) => {
                        const inputRange = [
                            (idx - 1) * width,
                            idx * width,
                            (idx + 1) * width,
                        ];

                        const dotWidth = scrollX.interpolate({
                            inputRange,
                            outputRange: [6, 24, 6],
                            extrapolate: 'clamp',
                        });

                        const dotOpacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.3, 1, 0.3],
                            extrapolate: 'clamp',
                        });

                        return (
                            <TouchableOpacity
                                key={idx}
                                onPress={() => scrollToIndex(idx)}
                                hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
                                activeOpacity={0.7}
                            >
                                <Animated.View
                                    style={[
                                        styles.dot,
                                        {
                                            width: dotWidth,
                                            opacity: dotOpacity,
                                            backgroundColor: theme.colors.primary,
                                        },
                                    ]}
                                />
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Navigation Buttons Row */}
                <View style={styles.navButtonsRow}>
                    {/* Previous Button (if past slide 0) */}
                    {activeIndex > 0 && (
                        <TouchableOpacity
                            style={[
                                styles.secondaryButton,
                                {
                                    backgroundColor: isDark ? '#232936' : '#F1F5F9',
                                    borderColor: isDark ? '#333C4F' : '#E2E8F0',
                                },
                            ]}
                            onPress={handlePrevious}
                            activeOpacity={0.75}
                        >
                            <ArrowLeft size={16} color={theme.colors.textPrimary} />
                            <AppText variant="button" weight="bold" style={{ color: theme.colors.textPrimary }}>
                                {t('onboarding_previous', 'Back')}
                            </AppText>
                        </TouchableOpacity>
                    )}

                    {/* Primary Action Button (Next / Get Started) - Unified Brand Color */}
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            {
                                backgroundColor: theme.colors.primary,
                                flex: 1,
                            },
                        ]}
                        onPress={handleNext}
                        activeOpacity={0.85}
                    >
                        <AppText variant="button" weight="bold" style={{ color: '#FFFFFF' }}>
                            {isLastSlide
                                ? isReviewMode
                                    ? t('onboarding_finish_tour', 'Done Exploring')
                                    : t('onboarding_finish_btn', 'Start Using')
                                : t('next', 'Next')}
                        </AppText>
                        {isLastSlide ? (
                            <Check size={18} color="#FFFFFF" />
                        ) : (
                            <ArrowRight size={18} color="#FFFFFF" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 8,
    },
    topLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    utilityButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    utilityButtonText: {
        fontSize: 13,
        fontWeight: '600',
    },
    iconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    carousel: {
        flex: 1,
    },
    slideWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    slideScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingTop: 10,
        paddingBottom: 30,
        gap: 24,
    },
    illustrationWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginVertical: 10,
    },
    textContent: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: 12,
        gap: 12,
    },
    slideTitle: {
        textAlign: 'center',
        fontSize: 23,
        lineHeight: 30,
        letterSpacing: -0.2,
    },
    slideDesc: {
        textAlign: 'center',
        paddingHorizontal: 8,
        fontSize: 15,
        lineHeight: 23,
    },
    floatingSkipContainer: {
        position: 'absolute',
        right: 20,
        bottom: 86,
        zIndex: 10,
    },
    floatingSkipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        gap: 3,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    bottomBar: {
        paddingHorizontal: 20,
        paddingBottom: Platform.OS === 'ios' ? 12 : 18,
        paddingTop: 10,
        gap: 12,
    },
    paginationRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        height: 10,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    navButtonsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        gap: 6,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        paddingHorizontal: 20,
        borderRadius: 14,
        gap: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
            },
            android: {
                elevation: 3,
            },
        }),
    },
});
