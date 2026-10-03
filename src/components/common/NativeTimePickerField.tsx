import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';
import { AppText as Text } from '../AppText';
import { AppBottomSheet, BottomSheetContext } from './AppBottomSheet';
import * as Haptics from 'expo-haptics';
import { Clock, ChevronUp, ChevronDown, Check } from 'lucide-react-native';
import { useUnistyles } from 'react-native-unistyles';
import { formatTimeDisplay } from '../../utils/dateTime';

export interface NativeTimePickerFieldProps {
    label?: string;
    value: string; // HH:mm (24-hour format)
    onChange: (timeStr: string) => void;
    containerStyle?: any;
    error?: string;
    inline?: boolean;
}

const COMMON_PRESETS = ['08:00', '08:30', '09:00', '12:00', '13:00', '17:00', '17:30', '18:00'];
const MINUTE_PRESETS = [0, 15, 30, 45];

interface Time12State {
    hour12: number; // 1 to 12
    minute: number; // 0 to 59
    period: 'AM' | 'PM';
}

function parse24To12(time24?: string | null): Time12State {
    if (!time24) return { hour12: 8, minute: 0, period: 'AM' };
    const parts = time24.split(':');
    let h = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    if (isNaN(h)) h = 8;
    if (isNaN(m)) m = 0;
    h = Math.min(23, Math.max(0, h));
    m = Math.min(59, Math.max(0, m));

    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return { hour12, minute: m, period };
}

function format12To24(hour12: number, minute: number, period: 'AM' | 'PM'): string {
    let h24 = hour12 % 12;
    if (period === 'PM') h24 += 12;
    const hh = h24 < 10 ? `0${h24}` : `${h24}`;
    const mm = minute < 10 ? `0${minute}` : `${minute}`;
    return `${hh}:${mm}`;
}

function format12Display(hour12: number, minute: number, period: 'AM' | 'PM'): string {
    const hh = hour12 < 10 ? `0${hour12}` : `${hour12}`;
    const mm = minute < 10 ? `0${minute}` : `${minute}`;
    return `${hh}:${mm} ${period}`;
}

export const NativeTimePickerField: React.FC<NativeTimePickerFieldProps> = ({
    label,
    value,
    onChange,
    containerStyle,
    error,
    inline,
}) => {
    const { theme } = useUnistyles();
    const isInSheet = useContext(BottomSheetContext);
    const isInline = inline ?? isInSheet;

    const [modalVisible, setModalVisible] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // 12-hour decomposed state
    const initialParsed = useMemo(() => parse24To12(value), [value]);
    const [hour12, setHour12] = useState<number>(initialParsed.hour12);
    const [minute, setMinute] = useState<number>(initialParsed.minute);
    const [period, setPeriod] = useState<'AM' | 'PM'>(initialParsed.period);

    useEffect(() => {
        setHour12(initialParsed.hour12);
        setMinute(initialParsed.minute);
        setPeriod(initialParsed.period);
    }, [initialParsed]);

    const formattedDisplay = value ? formatTimeDisplay(value) : 'Select Time';

    const handlePress = () => {
        const parsed = parse24To12(value);
        setHour12(parsed.hour12);
        setMinute(parsed.minute);
        setPeriod(parsed.period);

        if (isInline) {
            setIsExpanded((prev) => !prev);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        } else {
            setModalVisible(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
    };

    const handleConfirm = () => {
        const time24 = format12To24(hour12, minute, period);
        onChange(time24);
        setModalVisible(false);
        setIsExpanded(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    };

    const handlePreset = (preset24: string) => {
        const parsed = parse24To12(preset24);
        setHour12(parsed.hour12);
        setMinute(parsed.minute);
        setPeriod(parsed.period);
        if (isInline) {
            onChange(preset24);
            setIsExpanded(false);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const stepHour = useCallback((delta: number) => {
        setHour12((prev) => {
            let next = prev + delta;
            if (next > 12) next = 1;
            if (next < 1) next = 12;
            return next;
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, []);

    const stepMinute = useCallback((delta: number) => {
        setMinute((prev) => {
            let next = (prev + delta) % 60;
            if (next < 0) next += 60;
            return next;
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, []);

    const handleSetPeriod = (p: 'AM' | 'PM') => {
        setPeriod(p);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const modalDisplayTime = useMemo(() => {
        return format12Display(hour12, minute, period);
    }, [hour12, minute, period]);

    const currentTime24 = useMemo(() => {
        return format12To24(hour12, minute, period);
    }, [hour12, minute, period]);

    const renderPickerControls = () => (
        <>
            {/* Workday Quick Presets */}
            <View style={styles.presetsWrapper}>
                {COMMON_PRESETS.map((p) => {
                    const isCurrent = currentTime24 === p;
                    return (
                        <TouchableOpacity
                            key={p}
                            onPress={() => handlePreset(p)}
                            style={[
                                styles.presetChip,
                                {
                                    backgroundColor: isCurrent ? theme.colors.brand : theme.colors.surfaceSubtle,
                                    borderColor: isCurrent ? theme.colors.brand : theme.colors.border,
                                },
                            ]}
                            activeOpacity={0.75}
                        >
                            <Text
                                style={[
                                    styles.presetText,
                                    { color: isCurrent ? '#FFFFFF' : theme.colors.textPrimary },
                                ]}
                            >
                                {formatTimeDisplay(p)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Interactive Time Selector Body */}
            <View style={styles.stepperContainer}>
                {/* Hours Column */}
                <View style={styles.stepperCol}>
                    <TouchableOpacity
                        onPress={() => stepHour(1)}
                        style={[styles.stepperArrowBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                        accessibilityRole="button"
                        accessibilityLabel="Increment hour"
                        activeOpacity={0.7}
                    >
                        <ChevronUp color={theme.colors.textPrimary} size={22} />
                    </TouchableOpacity>

                    <View style={[styles.stepperValueBox, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}>
                        <Text style={[styles.stepperValueText, { color: theme.colors.textPrimary }]}>
                            {hour12 < 10 ? `0${hour12}` : `${hour12}`}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => stepHour(-1)}
                        style={[styles.stepperArrowBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                        accessibilityRole="button"
                        accessibilityLabel="Decrement hour"
                        activeOpacity={0.7}
                    >
                        <ChevronDown color={theme.colors.textPrimary} size={22} />
                    </TouchableOpacity>

                    <Text style={[styles.stepperUnitLabel, { color: theme.colors.textSecondary }]}>
                        HOUR
                    </Text>
                </View>

                <Text style={[styles.stepperColon, { color: theme.colors.textPrimary }]}>:</Text>

                {/* Minutes Column */}
                <View style={styles.stepperCol}>
                    <TouchableOpacity
                        onPress={() => stepMinute(5)}
                        style={[styles.stepperArrowBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                        accessibilityRole="button"
                        accessibilityLabel="Increment minutes by 5"
                        activeOpacity={0.7}
                    >
                        <ChevronUp color={theme.colors.textPrimary} size={22} />
                    </TouchableOpacity>

                    <View style={[styles.stepperValueBox, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}>
                        <Text style={[styles.stepperValueText, { color: theme.colors.textPrimary }]}>
                            {minute < 10 ? `0${minute}` : `${minute}`}
                        </Text>
                    </View>

                    <TouchableOpacity
                        onPress={() => stepMinute(-5)}
                        style={[styles.stepperArrowBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                        accessibilityRole="button"
                        accessibilityLabel="Decrement minutes by 5"
                        activeOpacity={0.7}
                    >
                        <ChevronDown color={theme.colors.textPrimary} size={22} />
                    </TouchableOpacity>

                    <Text style={[styles.stepperUnitLabel, { color: theme.colors.textSecondary }]}>
                        MIN
                    </Text>
                </View>

                {/* AM / PM Segmented Control */}
                <View style={styles.periodCol}>
                    <View style={[styles.periodSegmentContainer, { backgroundColor: theme.colors.surfaceSubtle, borderColor: theme.colors.border }]}>
                        <TouchableOpacity
                            onPress={() => handleSetPeriod('AM')}
                            style={[
                                styles.periodSegmentBtn,
                                period === 'AM' && [styles.periodSegmentBtnActive, { backgroundColor: theme.colors.brand }],
                            ]}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityState={{ selected: period === 'AM' }}
                        >
                            <Text
                                style={[
                                    styles.periodSegmentText,
                                    { color: period === 'AM' ? '#FFFFFF' : theme.colors.textSecondary },
                                ]}
                            >
                                AM
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleSetPeriod('PM')}
                            style={[
                                styles.periodSegmentBtn,
                                period === 'PM' && [styles.periodSegmentBtnActive, { backgroundColor: theme.colors.brand }],
                            ]}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityState={{ selected: period === 'PM' }}
                        >
                            <Text
                                style={[
                                    styles.periodSegmentText,
                                    { color: period === 'PM' ? '#FFFFFF' : theme.colors.textSecondary },
                                ]}
                            >
                                PM
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.stepperUnitLabel, { color: theme.colors.textSecondary }]}>
                        PERIOD
                    </Text>
                </View>
            </View>

            {/* Minute Quick Chips */}
            <View style={styles.minuteChipsRow}>
                {MINUTE_PRESETS.map((m) => {
                    const isMatch = minute === m;
                    return (
                        <TouchableOpacity
                            key={m}
                            onPress={() => {
                                setMinute(m);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                            }}
                            style={[
                                styles.minuteChip,
                                {
                                    backgroundColor: isMatch ? theme.colors.brandSubtle : theme.colors.surfaceSubtle,
                                    borderColor: isMatch ? theme.colors.brand : theme.colors.border,
                                },
                            ]}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[
                                    styles.minuteChipText,
                                    { color: isMatch ? theme.colors.brand : theme.colors.textSecondary },
                                ]}
                            >
                                :{m < 10 ? `0${m}` : m}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </>
    );

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
                    {label}
                </Text>
            )}

            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={`${label || 'Select Time'}: ${formattedDisplay}`}
                style={[
                    styles.fieldWrapper,
                    {
                        backgroundColor: theme.colors.surface,
                        borderColor: error
                            ? theme.colors.status.danger
                            : (isInline && isExpanded)
                            ? theme.colors.brand
                            : theme.colors.border,
                    },
                ]}
            >
                <View style={styles.fieldContent}>
                    <View style={styles.iconContainer}>
                        <Clock color={theme.colors.brand} size={18} />
                    </View>
                    <Text
                        style={[
                            styles.fieldText,
                            {
                                color: value ? theme.colors.textPrimary : theme.colors.textDisabled,
                            },
                        ]}
                    >
                        {formattedDisplay}
                    </Text>
                </View>

                {isInline && (
                    <View style={[styles.chevronWrapper, isExpanded && styles.chevronExpanded]}>
                        <ChevronDown size={17} color={theme.colors.textSecondary} />
                    </View>
                )}
            </TouchableOpacity>

            {error && (
                <Text style={[styles.errorText, { color: theme.colors.status.danger }]}>
                    {error}
                </Text>
            )}

            {/* Inline Accordion Time Picker Mode (Prevents nested modal collisions) */}
            {isInline && isExpanded && (
                <View
                    style={[
                        styles.inlineTimeContainer,
                        {
                            backgroundColor: theme.colors.surfaceSubtle,
                            borderColor: theme.colors.border,
                        },
                    ]}
                >
                    {renderPickerControls()}

                    <TouchableOpacity
                        onPress={handleConfirm}
                        style={[styles.confirmBtn, { backgroundColor: theme.colors.brand, marginTop: 12 }]}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.confirmBtnText}>
                            Set {modalDisplayTime}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Native Time Picker Bottom Sheet Modal (Used when not nested in a sheet) */}
            {!isInline && (
                <AppBottomSheet
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    title={label || 'Select Time'}
                    footer={
                        <TouchableOpacity
                            onPress={handleConfirm}
                            style={[styles.confirmBtn, { backgroundColor: theme.colors.brand }]}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.confirmBtnText}>
                                Select {modalDisplayTime}
                            </Text>
                        </TouchableOpacity>
                    }
                >
                    {renderPickerControls()}
                </AppBottomSheet>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 14,
        width: '100%',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    fieldWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 12,
    },
    fieldContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    chevronWrapper: {
        padding: 2,
    },
    chevronExpanded: {
        transform: [{ rotate: '180deg' }],
    },
    iconContainer: {
        marginRight: 10,
    },
    fieldText: {
        fontSize: 14,
        fontWeight: '600',
    },
    errorText: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
        marginLeft: 2,
    },
    inlineTimeContainer: {
        marginTop: 8,
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
    },
    presetsWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
        justifyContent: 'center',
    },
    presetChip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
    },
    presetText: {
        fontSize: 12,
        fontWeight: '700',
    },
    stepperContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 14,
        marginBottom: 16,
    },
    stepperCol: {
        alignItems: 'center',
        gap: 6,
    },
    stepperArrowBtn: {
        width: 48,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperValueBox: {
        width: 68,
        height: 60,
        borderRadius: 14,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperValueText: {
        fontSize: 28,
        fontWeight: '800',
        lineHeight: 32,
    },
    stepperUnitLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    stepperColon: {
        fontSize: 32,
        fontWeight: '800',
        marginBottom: 20,
    },
    periodCol: {
        alignItems: 'center',
        gap: 6,
    },
    periodSegmentContainer: {
        width: 60,
        height: 106,
        borderRadius: 14,
        borderWidth: 1,
        padding: 4,
        justifyContent: 'space-between',
    },
    periodSegmentBtn: {
        flex: 1,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    periodSegmentBtnActive: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 2,
    },
    periodSegmentText: {
        fontSize: 13,
        fontWeight: '800',
    },
    minuteChipsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 10,
    },
    minuteChip: {
        paddingHorizontal: 16,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
    },
    minuteChipText: {
        fontSize: 13,
        fontWeight: '700',
    },
    confirmBtn: {
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
});
