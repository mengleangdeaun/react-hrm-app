import React, { useEffect, useRef } from 'react';
import {
    View,
    Modal,
    TouchableOpacity,
    ScrollView,
    Animated,
    Easing,
    StyleSheet,
    Platform,
} from 'react-native';
import { AppText as Text } from '../AppText';
import * as Haptics from 'expo-haptics';
import { ShieldCheck, FileText, X, Check } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppButton } from './AppButton';

export interface LegalDocumentSheetProps {
    visible: boolean;
    onClose: () => void;
    type: 'privacy' | 'terms';
    customTitle?: string;
    customContent?: string;
}

const DEFAULT_PRIVACY_POLICY = `
### 1. Information We Collect
We collect information required for employee management and human resources operations:
• Personal Identity: Full name, employee ID number, branch, department, position, email, and contact number.
• Attendance & Time Tracking: Clock-in/out timestamps, shift schedules, late/early flags, and branch QR scan logs.
• Geolocation Data: Exact GPS coordinates are acquired strictly at the moment of clock-in/out and activity logging to verify branch geofence perimeter compliance. Continuous background location tracking is never performed.
• Device & Diagnostics: Device model, operating system version, screen resolution, and unique device identifier for secure session management and bug debugging.
• Camera Access: Camera is used exclusively for scanning physical branch QR codes and capturing activity proof photos.

### 2. How We Use Your Information
• Attendance Verification: Recording valid on-site clock-ins and clock-outs according to assigned work shifts.
• Leave & Shift Management: Processing leave requests, approval workflows, rest-day swaps, and subordinate performance notices.
• Communications & Alerts: Delivering official announcements, celebration wishes, quiz assessments, and shift reminders.
• Auditing & Compliance: Generating accurate payroll calculations, overtime records, and organizational audit logs.

### 3. Data Protection & Security
• Encryption: All data transmitted between the mobile application and server is encrypted using TLS/HTTPS protocols.
• Access Controls: Role-based permissions restrict data visibility strictly to authorized personnel and supervisors.
• Storage Security: Employee credentials and biometric preferences are secured locally in encrypted device storage.

### 4. Data Retention & Employee Rights
Employee records are maintained in accordance with enterprise HR compliance standards and applicable labor laws. For questions regarding your personal records, please contact your company Human Resources representative.
`;

const DEFAULT_TERMS_OF_SERVICE = `
### 1. Acceptance of Terms
By accessing or using this HRMS Enterprise Mobile Application, you agree to comply with and be bound by these Terms of Service and your company's employee handbook.

### 2. Authorized Use & Account Security
• Enterprise Access Only: This application is intended exclusively for authorized employees of the organization.
• Credential Confidentiality: You are responsible for safeguarding your login credentials and QR code access. Sharing account credentials or clocking in on behalf of colleagues (buddy punching) is strictly prohibited and subject to disciplinary review.
• Device Integrity: You must ensure your mobile device maintains reasonable security measures (passcode/biometrics enabled).

### 3. Attendance & Operational Rules
• Accurate Reporting: You agree that all attendance clock-ins, leave applications, activity reports, and notice records reflect accurate, genuine events.
• Geolocation Integrity: Tampering with GPS location, using mock location tools, or attempting to spoof branch QR codes is a direct violation of company employment policy.
• Working Hours: Overtime and irregular shift hours must be approved by designated department managers through the system.

### 4. System Availability & Updates
The company strives to ensure continuous availability of the application. Periodic maintenance, version updates, and feature improvements may be deployed to enhance system performance and security.

### 5. Modifications to Terms
Company management reserves the right to amend these terms in accordance with evolving internal HR policies and statutory regulations. Continued use of the application constitutes acceptance of any updated terms.
`;

export const LegalDocumentSheet: React.FC<LegalDocumentSheetProps> = ({
    visible,
    onClose,
    type,
    customTitle,
    customContent,
}) => {
    const { isDark, primaryColor } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const backdropAnim = useRef(new Animated.Value(0)).current;
    const sheetAnim = useRef(new Animated.Value(600)).current;

    const isPrivacy = type === 'privacy';
    const title = customTitle || (isPrivacy ? 'Privacy Policy' : 'Terms of Service');
    const subtitle = isPrivacy
        ? 'Data protection, permissions & privacy terms'
        : 'Enterprise service agreement & usage rules';

    const IconComponent = isPrivacy ? ShieldCheck : FileText;
    const iconColor = isPrivacy ? '#10B981' : primaryColor;
    const iconBg = isPrivacy ? 'rgba(16, 185, 129, 0.12)' : `${primaryColor}18`;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(backdropAnim, {
                    toValue: 1,
                    duration: 220,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.spring(sheetAnim, {
                    toValue: 0,
                    tension: 70,
                    friction: 11,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const handleDismiss = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        Animated.parallel([
            Animated.timing(backdropAnim, {
                toValue: 0,
                duration: 180,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }),
            Animated.timing(sheetAnim, {
                toValue: 600,
                duration: 200,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    // Format raw text or clean HTML
    const renderFormattedContent = () => {
        let text = customContent?.trim();
        if (!text || text === 'Formal documentation is on the way!') {
            text = isPrivacy ? DEFAULT_PRIVACY_POLICY : DEFAULT_TERMS_OF_SERVICE;
        } else {
            // Clean HTML tags if backend sends HTML
            text = text
                .replace(/<h3>/gi, '\n### ')
                .replace(/<\/h3>/gi, '\n')
                .replace(/<p>/gi, '\n')
                .replace(/<\/p>/gi, '\n')
                .replace(/<li>/gi, '\n• ')
                .replace(/<\/li>/gi, '')
                .replace(/<br\s*[\/]?>/gi, '\n')
                .replace(/<[^>]*>?/gm, '')
                .trim();
        }

        const lines = text.split('\n');

        return lines.map((line, idx) => {
            const trimmed = line.trim();
            if (!trimmed) {
                return <View key={idx} style={{ height: 6 }} />;
            }

            if (trimmed.startsWith('###')) {
                const headerText = trimmed.replace(/^###\s*/, '');
                return (
                    <Text
                        key={idx}
                        style={[
                            styles.sectionHeader,
                            { color: theme.colors.textPrimary },
                        ]}
                    >
                        {headerText}
                    </Text>
                );
            }

            if (trimmed.startsWith('•')) {
                const bulletText = trimmed.substring(1).trim();
                return (
                    <View key={idx} style={styles.bulletRow}>
                        <Text style={[styles.bulletDot, { color: primaryColor }]}>•</Text>
                        <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>
                            {bulletText}
                        </Text>
                    </View>
                );
            }

            return (
                <Text key={idx} style={[styles.paragraphText, { color: theme.colors.textSecondary }]}>
                    {trimmed}
                </Text>
            );
        });
    };

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            transparent
            statusBarTranslucent
            animationType="none"
            onRequestClose={handleDismiss}
        >
            <View style={styles.modalOverlay}>
                {/* Backdrop */}
                <Animated.View
                    style={[
                        styles.backdrop,
                        {
                            opacity: backdropAnim,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={handleDismiss}
                    />
                </Animated.View>

                {/* Bottom Sheet Container */}
                <Animated.View
                    style={[
                        styles.sheetContainer,
                        {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                            transform: [{ translateY: sheetAnim }],
                        },
                    ]}
                >
                    {/* Drag Handle Bar */}
                    <View style={styles.dragHandleArea}>
                        <View
                            style={[
                                styles.dragHandleBar,
                                {
                                    backgroundColor: isDark
                                        ? 'rgba(255, 255, 255, 0.25)'
                                        : 'rgba(0, 0, 0, 0.18)',
                                },
                            ]}
                        />
                    </View>

                    {/* Sheet Header */}
                    <View style={styles.sheetHeader}>
                        <View style={styles.headerLeft}>
                            <View style={[styles.iconBadge, { backgroundColor: iconBg }]}>
                                <IconComponent color={iconColor} size={20} />
                            </View>
                            <View style={styles.headerTitles}>
                                <Text style={[styles.sheetTitle, { color: theme.colors.textPrimary }]}>
                                    {title}
                                </Text>
                                <Text style={[styles.sheetSub, { color: theme.colors.textSecondary }]}>
                                    {subtitle}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity
                            onPress={handleDismiss}
                            style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceSubtle }]}
                            activeOpacity={0.7}
                        >
                            <X color={theme.colors.textPrimary} size={18} />
                        </TouchableOpacity>
                    </View>

                    {/* Document Body Content */}
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        bounces={true}
                    >
                        {renderFormattedContent()}
                    </ScrollView>

                    {/* Bottom Action Button */}
                    <View style={styles.footerActionWrapper}>
                        <AppButton
                            title="I Understand"
                            onPress={handleDismiss}
                            variant="primary"
                            icon={<Check color="#FFFFFF" size={18} />}
                        />
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    sheetContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        maxHeight: '86%',
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 16,
        paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    },
    dragHandleArea: {
        alignItems: 'center',
        paddingVertical: 10,
        width: '100%',
    },
    dragHandleBar: {
        width: 44,
        height: 5,
        borderRadius: 3,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150, 150, 150, 0.15)',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        marginRight: 8,
    },
    iconBadge: {
        width: 40,
        height: 40,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitles: {
        flex: 1,
    },
    sheetTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    sheetSub: {
        fontSize: 11,
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingVertical: 6,
        paddingBottom: 16,
    },
    sectionHeader: {
        fontSize: 14,
        fontWeight: '700',
        marginTop: 12,
        marginBottom: 6,
        letterSpacing: 0.2,
    },
    paragraphText: {
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 6,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 6,
        paddingLeft: 4,
    },
    bulletDot: {
        fontSize: 16,
        marginRight: 8,
        lineHeight: 19,
    },
    bulletText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 19,
    },
    footerActionWrapper: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(150, 150, 150, 0.15)',
    },
});
