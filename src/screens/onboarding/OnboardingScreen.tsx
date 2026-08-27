import React, { useRef, useState } from 'react';
import {
    View,
    TouchableOpacity,
    StatusBar,
    StyleSheet,
    FlatList as RNFlatList,
    useWindowDimensions,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUnistyles } from 'react-native-unistyles';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import {
    MapPin,
    CalendarCheck,
    Megaphone,
    ArrowRight,
    Check,
    X,
    Shield,
    Clock,
    Award,
} from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { AppText } from '../../components/AppText';
import { HeaderIconButton } from '../../components/common/AppHeader';

interface SlideItem {
    id: string;
    titleKey: string;
    descKey: string;
    badge: string;
    icon: React.ComponentType<{ size: number; color: string }>;
    accentColor: string;
    highlights: Array<{ icon: React.ComponentType<{ size: number; color: string }>; label: string }>;
}

export const OnboardingScreen: React.FC<{ navigation: any; route?: any }> = ({
    navigation,
    route,
}) => {
    const { width } = useWindowDimensions();
    const { isDark } = useAppTheme();
    const { theme } = useUnistyles();
    const { t } = useTranslation();
    const { completeOnboarding } = useAuth();

    const isReviewMode = route?.params?.isReviewMode === true;
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<any>(null);

    const slides: SlideItem[] = [
        {
            id: '1',
            titleKey: 'onboarding_1_title',
            descKey: 'onboarding_1_desc',
            badge: 'GPS & Geofencing',
            icon: MapPin,
            accentColor: '#3B82F6',
            highlights: [
                { icon: Clock, label: 'One-Tap Clock In/Out' },
                { icon: Shield, label: 'Anti-Spoofing GPS' },
            ],
        },
        {
            id: '2',
            titleKey: 'onboarding_2_title',
            descKey: 'onboarding_2_desc',
            badge: 'Fast Approvals',
            icon: CalendarCheck,
            accentColor: '#10B981',
            highlights: [
                { icon: CalendarCheck, label: 'Real-time Balance' },
                { icon: Award, label: 'Manager Notifications' },
            ],
        },
        {
            id: '3',
            titleKey: 'onboarding_3_title',
            descKey: 'onboarding_3_desc',
            badge: 'Stay Connected',
            icon: Megaphone,
            accentColor: '#F59E0B',
            highlights: [
                { icon: Megaphone, label: 'Instant Announcements' },
                { icon: Award, label: 'Interactive Quizzes' },
            ],
        },
    ];

    const isLastSlide = activeIndex === slides.length - 1;

    const handleNext = () => {
        if (isLastSlide) {
            handleFinish();
        } else {
            flatListRef.current?.scrollToIndex({
                index: activeIndex + 1,
                animated: true,
            });
        }
    };

    const handleSkip = async () => {
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

    const onMomentumScrollEnd = (e: any) => {
        const slideIndex = Math.round(e.nativeEvent.contentOffset.x / width);
        setActiveIndex(slideIndex);
    };

    const renderSlide = ({ item }: { item: SlideItem }) => {
        const IconComponent = item.icon;

        return (
            <View style={[styles.slideContainer, { width }]}>
                {/* Visual Illustration Card */}
                <View
                    style={[
                        styles.illustrationCard,
                        {
                            backgroundColor: isDark ? '#1A1D24' : '#F1F5F9',
                            borderColor: isDark ? '#2D333F' : '#E2E8F0',
                        },
                    ]}
                >
                    {/* Glow backdrop circle */}
                    <View
                        style={[
                            styles.glowCircle,
                            {
                                backgroundColor: item.accentColor,
                                opacity: isDark ? 0.15 : 0.1,
                            },
                        ]}
                    />

                    {/* Central Icon */}
                    <View
                        style={[
                            styles.iconWrapper,
                            {
                                backgroundColor: isDark ? '#232936' : '#FFFFFF',
                                borderColor: isDark ? '#333B4E' : '#E2E8F0',
                            },
                        ]}
                    >
                        <IconComponent size={44} color={item.accentColor} />
                    </View>

                    {/* Badge */}
                    <View
                        style={[
                            styles.slideBadge,
                            {
                                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                                borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
                            },
                        ]}
                    >
                        <AppText style={[styles.slideBadgeText, { color: item.accentColor }]}>
                            {item.badge}
                        </AppText>
                    </View>

                    {/* Highlights chips */}
                    <View style={styles.highlightsContainer}>
                        {item.highlights.map((h, i) => {
                            const HIcon = h.icon;
                            return (
                                <View
                                    key={i}
                                    style={[
                                        styles.highlightChip,
                                        {
                                            backgroundColor: isDark ? '#252C3A' : '#FFFFFF',
                                            borderColor: isDark ? '#374151' : '#E5E7EB',
                                        },
                                    ]}
                                >
                                    <HIcon size={14} color={item.accentColor} />
                                    <AppText style={[styles.highlightChipText, { color: theme.colors.textSecondary }]}>
                                        {h.label}
                                    </AppText>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Text Content */}
                <View style={styles.textWrapper}>
                    <AppText style={[styles.slideTitle, { color: theme.colors.textPrimary }]}>
                        {t(item.titleKey)}
                    </AppText>
                    <AppText style={[styles.slideDesc, { color: theme.colors.textSecondary }]}>
                        {t(item.descKey)}
                    </AppText>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView {...({ style: [styles.container, { backgroundColor: theme.colors.background }] } as any)}>
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={theme.colors.background}
            />

            {/* Top Navigation Bar */}
            <View style={styles.topBar}>
                {isReviewMode ? (
                    <HeaderIconButton
                        icon={<X size={18} color={theme.colors.textPrimary} />}
                        onPress={() => navigation.goBack()}
                        accessibilityLabel="Close tour"
                    />
                ) : (
                    <View style={styles.stepIndicator}>
                        <AppText style={[styles.stepText, { color: theme.colors.textSecondary }]}>
                            {activeIndex + 1} / {slides.length}
                        </AppText>
                    </View>
                )}

                {!isReviewMode && (
                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={handleSkip}
                        activeOpacity={0.7}
                    >
                        <AppText style={[styles.skipText, { color: theme.colors.textSecondary }]}>
                            {t('skip')}
                        </AppText>
                    </TouchableOpacity>
                )}
            </View>

            {/* Slide Carousel */}
            <RNFlatList
                ref={flatListRef}
                data={slides}
                keyExtractor={(item: SlideItem) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                onMomentumScrollEnd={onMomentumScrollEnd}
                renderItem={({ item }: { item: SlideItem }) => renderSlide({ item })}
                style={styles.carousel}
            />

            {/* Bottom Controls */}
            <View style={styles.bottomControls}>
                {/* Pagination Dots */}
                <View style={styles.paginationRow}>
                    {slides.map((_, idx) => {
                        const isActive = idx === activeIndex;
                        return (
                            <View
                                key={idx}
                                style={[
                                    styles.dot,
                                    isActive
                                        ? [
                                              styles.activeDot,
                                              { backgroundColor: theme.colors.primary },
                                          ]
                                        : [
                                              styles.inactiveDot,
                                              {
                                                  backgroundColor: isDark
                                                      ? '#374151'
                                                      : '#CBD5E1',
                                              },
                                          ],
                                ]}
                            />
                        );
                    })}
                </View>

                {/* Primary Button */}
                <TouchableOpacity
                    style={[
                        styles.primaryButton,
                        { backgroundColor: theme.colors.primary },
                    ]}
                    onPress={handleNext}
                    activeOpacity={0.85}
                >
                    <AppText style={[styles.primaryButtonText, { color: theme.colors.onPrimary }]}>
                        {isLastSlide ? t('onboarding_finish_btn') : t('next')}
                    </AppText>
                    {isLastSlide ? (
                        <Check size={18} color={theme.colors.onPrimary} />
                    ) : (
                        <ArrowRight size={18} color={theme.colors.onPrimary} />
                    )}
                </TouchableOpacity>
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
        paddingBottom: 4,
        minHeight: 44,
    },
    stepIndicator: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    stepText: {
        fontSize: 13,
        fontWeight: '600',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    skipButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    skipText: {
        fontSize: 14,
        fontWeight: '600',
    },
    carousel: {
        flex: 1,
    },
    slideContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
    },
    illustrationCard: {
        width: '100%',
        height: 250,
        borderRadius: 24,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 28,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    glowCircle: {
        position: 'absolute',
        width: 180,
        height: 180,
        borderRadius: 90,
    },
    iconWrapper: {
        width: 84,
        height: 84,
        borderRadius: 28,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    slideBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 14,
    },
    slideBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    highlightsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    highlightChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
    },
    highlightChipText: {
        fontSize: 11,
        fontWeight: '600',
    },
    textWrapper: {
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    slideTitle: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        lineHeight: 28,
        marginBottom: 10,
    },
    slideDesc: {
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        paddingHorizontal: 12,
    },
    bottomControls: {
        paddingHorizontal: 24,
        paddingBottom: 24,
        paddingTop: 12,
        gap: 20,
    },
    paginationRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        height: 7,
        borderRadius: 4,
    },
    activeDot: {
        width: 24,
    },
    inactiveDot: {
        width: 7,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        borderRadius: 14,
        gap: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#DF0000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
