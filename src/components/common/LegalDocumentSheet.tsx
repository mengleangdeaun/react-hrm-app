import React from 'react';
import {
    View,
    StyleSheet,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { lightTheme, darkTheme } from '../../styles/theme';
import { AppButton } from './AppButton';
import { AppBottomSheet } from './AppBottomSheet';
import { AppMarkdown } from './AppMarkdown';

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
• Geolocation Integrity: Tampering with GPS location, using location mocking tools, or attempting to spoof branch QR codes is a direct violation of company employment policy.
• Punctuality & Shifts: Attendance punches are recorded with server-verified timestamps. Any discrepancies should be reported immediately through the Attendance Reason flow.
• Activity Logging: All logged field visits, photos, and progress notes must represent authentic workplace activities.

### 4. Privacy & Monitoring
The organization respects your digital privacy. Application monitoring is strictly confined to workplace functions (attendance punches, official leave requests, and assigned activities). Personal device files and non-work activities are never accessed.

### 5. Termination & Modifications
Access to this mobile portal may be suspended or revoked upon termination of employment or disciplinary proceedings. Terms may be updated periodically to reflect evolving company operational policies.
`;

export const LegalDocumentSheet: React.FC<LegalDocumentSheetProps> = ({
    visible,
    onClose,
    type,
    customTitle,
    customContent,
}) => {
    const { isDark } = useAppTheme();
    const theme = isDark ? darkTheme : lightTheme;

    const isPrivacy = type === 'privacy';
    const title = customTitle || (isPrivacy ? 'Privacy Policy' : 'Terms of Service');
    const subtitle = isPrivacy
        ? 'Data protection, GPS, and employee privacy standards'
        : 'Enterprise usage terms and employee conduct policies';

    const rawContent = customContent && customContent.trim().length > 0
        ? customContent
        : (isPrivacy ? DEFAULT_PRIVACY_POLICY : DEFAULT_TERMS_OF_SERVICE);

    return (
        <AppBottomSheet
            visible={visible}
            onClose={onClose}
            title={title}
            subtitle={subtitle}
            footer={
                <AppButton
                    title="I Understand & Acknowledge"
                    onPress={onClose}
                    icon={<Check color="#FFFFFF" size={18} />}
                    size="md"
                />
            }
        >
            <View style={styles.contentBody}>
                <AppMarkdown content={rawContent} />
            </View>
        </AppBottomSheet>
    );
};

const styles = StyleSheet.create({
    contentBody: {
        paddingBottom: 16,
    },
});
