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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
import {
    ArrowRight,
    Check,
    X,
    Globe,
    Sun,
    Moon,
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
    const insets = useSafeAreaInsets();
    const { isDark, toggleTheme } = useAppTheme();
    const { theme } = useUnistyles();
    const { t, locale, setLocale } = useTranslation();
    const { completeOnboarding } = useAuth();

    const isReviewMode = route?.params?.isReviewMode === true;
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<any>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

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
                    <View style={styles.illustrationWrapper}>
                        <IllustrationComponent
                            size={illustrationSize}
                            isDark={isDark}
                        />
                    </View>

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

    // Calculate dynamic safe clearance above the phone navigator/home bar
    const bottomSafePadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 16 : 12) + (Platform.OS === 'ios' ? 12 : 16);

    return (
        <SafeAreaView edges={['top']} {...({ style: [styles.container, { backgroundColor: theme.colors.background }] } as any)}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.colors.background}
            />

            {/* ── Top Utility Bar: Language, Theme & Top Skip ── */}
            <View style={styles.topBar}>
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

                <View style={styles.topRight}>
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

                    {/* Integrated Top Skip Button to avoid layout collisions */}
                    {!isReviewMode && !isLastSlide && (
                        <TouchableOpacity
                            style={[
                                styles.topSkipButton,
                                {
                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                                },
                            ]}
                            onPress={handleSkip}
                            activeOpacity={0.7}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityLabel="Skip Onboarding"
                        >
                            <AppText variant="caption" weight="bold" style={{ color: theme.colors.textSecondary }}>
                                {t('skip')}
                            </AppText>
                        </TouchableOpacity>
                    )}
                </View>
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

            {/* ── Bottom Controls with Proper Safe Inset Padding ──────────────── */}
            <View
                style={[
                    styles.bottomBar,
                    {
                        backgroundColor: theme.colors.background,
                        paddingBottom: bottomSafePadding,
                    },
                ]}
            >
                {/* Pagination Dots Row */}
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
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            {
                                backgroundColor: theme.colors.primary,
                                width: '100%',
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
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
    },
    topLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    topRight: {
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
    topSkipButton: {
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 20,
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
        paddingBottom: 20,
        gap: 20,
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
    bottomBar: {
        paddingHorizontal: 20,
        paddingTop: 12,
        gap: 18,
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
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        paddingHorizontal: 20,
        borderRadius: 16,
        gap: 8,
    },
});