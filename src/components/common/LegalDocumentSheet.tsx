import React from 'react';
import {
    View,
    StyleSheet,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
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
    onAccept?: () => void;
    acceptButtonText?: string;
}

export const DEFAULT_PRIVACY_POLICY_EN = `
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

export const DEFAULT_PRIVACY_POLICY_KH = `
### ១. ព័ត៌មានដែលយើងប្រមូល
យើងប្រមូលព័ត៌មានចាំបាច់នានា ដើម្បីបម្រើដល់ការគ្រប់គ្រងបុគ្គលិក និងប្រតិបត្តិការធនធានមនុស្ស៖
• អត្តសញ្ញាណផ្ទាល់ខ្លួន៖ គោត្តនាម និងនាមពេញ អត្តលេខបុគ្គលិក សាខា ដេប៉ាតឺម៉ង់ មុខតំណែង អ៊ីមែល និងលេខទូរស័ព្ទទំនាក់ទំនង។
• វត្តមាន និងការកត់ត្រាម៉ោងការងារ៖ កាលបរិច្ឆេទ និងម៉ោងពេលស្កេនចូល/ចេញពីការងារ តារាងវេនការងារ កំណត់សម្គាល់មកយឺត/ចេញមុន និងទិន្នន័យនៃការស្កេន QR កូដនៅតាមសាខា។
• ទិន្នន័យទីតាំងភូមិសាស្ត្រ (GPS)៖ កូអរដោនេ GPS ជាក់លាក់ត្រូវបានទាញយកតែនៅខណៈពេលស្កេនចូល/ចេញ និងកត់ត្រាសកម្មភាពការងារប៉ុណ្ណោះ ដើម្បីផ្ទៀងផ្ទាត់ការអនុវត្តស្របតាមបរិវេណកំណត់នៃសាខា (Geofence Perimeter)។ ប្រព័ន្ធមិនធ្វើការតាមដានទីតាំងជាប្រចាំនោះឡើយ។
• ទិន្នន័យឧបករណ៍ និងប្រព័ន្ធវិភាគ៖ ម៉ូឌែលទូរស័ព្ទ កំណែប្រព័ន្ធប្រតិបត្តិការ (OS) ទំហំកម្រិតបង្ហាញអេក្រង់ និងលេខសម្គាល់ឧបករណ៍ (Device ID) សម្រាប់សុវត្ថិភាពនៃការចូលប្រើប្រាស់ និងការដោះស្រាយបញ្ហាបច្ចេកទេស។
• ការអនុញ្ញាតប្រើប្រាស់កាមេរ៉ា៖ កាមេរ៉ាត្រូវបានប្រើប្រាស់សម្រាប់តែការស្កេន QR កូដជាក់ស្តែងនៅតាមសាខា និងថតរូបភាពជាភស្តុតាងនៃសកម្មភាពការងារតែប៉ុណ្ណោះ។

### ២. របៀបដែលយើងប្រើប្រាស់ព័ត៌មានរបស់អ្នក
• ការផ្ទៀងផ្ទាត់វត្តមាន៖ កត់ត្រាវត្តមានចូល និងចេញពីការងារជាក់ស្តែងនៅកន្លែងធ្វើការ ស្របតាមវេនការងារដែលបានកំណត់។
• ការគ្រប់គ្រងការឈប់សម្រាក និងវេនការងារ៖ ដំណើរការសំណើច្បាប់ឈប់សម្រាក យន្តការអនុម័ត ការប្តូរថ្ងៃឈប់សម្រាក និងការជូនដំណឹងពីការបំពេញការងាររបស់បុគ្គលិកក្រោមឱវាទ។
• ការទំនាក់ទំនង និងការជូនដំណឹង៖ ផ្ញើសេចក្តីជូនដំណឹងផ្លូវការ សារជូនពរក្នុងឱកាសផ្សេងៗ កម្រងសំណួរវាយតម្លៃ និងការរំលឹកវេនការងារ។
• សវនកម្ម និងការអនុលោមភាព៖ គណនាប្រាក់បៀវត្សរ៍ កត់ត្រាម៉ោងថែម (OT) និងបង្កើតកំណត់ត្រាសវនកម្មផ្ទៃក្នុងឲ្យបានត្រឹមត្រូវ។

### ៣. ការការពារ និងសុវត្ថិភាពទិន្នន័យ
• ការអ៊ិនគ្រីប (Encryption)៖ រាល់ទិន្នន័យដែលបញ្ជូនរវាងកម្មវិធីទូរស័ព្ទ និងម៉ាស៊ីនមេ (Server) ត្រូវបានការពារដោយបច្ចេកវិទ្យាអ៊ិនគ្រីបតាមប្រព័ន្ធ TLS/HTTPS។
• ការគ្រប់គ្រងសិទ្ធិចូលប្រើប្រាស់៖ ការកំណត់សិទ្ធិតាមតួនាទីធានាថា ទិន្នន័យត្រូវបានបង្ហាញជូនយ៉ាងតឹងរ៉ឹងចំពោះតែបុគ្គលិក និងថ្នាក់ដឹកនាំដែលមានសិទ្ធិស្របច្បាប់ប៉ុណ្ណោះ។
• សុវត្ថិភាពនៃការរក្សាទុក៖ ព័ត៌មានសម្ងាត់គណនីបុគ្គលិក និងការកំណត់ខ្ចៅដៃ (Biometric) ត្រូវបានរក្សាទុកដោយសុវត្ថិភាពនៅក្នុងអង្គចងចាំដែលមានការអ៊ិនគ្រីបលើឧបករណ៍ផ្ទាល់ខ្លួន។

### ៤. ការរក្សាទុកទិន្នន័យ និងសិទ្ធិរបស់បុគ្គលិក
កំណត់ត្រាទិន្នន័យបុគ្គលិកត្រូវបានរក្សាទុកស្របតាមស្តង់ដារអនុលោមភាពធនធានមនុស្សរបស់ស្ថាប័ន និងច្បាប់ស្តីពីការងារជាធរមាន។ ចំពោះចម្ងល់នានាពាក់ព័ន្ធនឹងកំណត់ត្រាផ្ទាល់ខ្លួន សូមទាក់ទងមកកាន់តំណាងផ្នែកធនធានមនុស្សនៃក្រុមហ៊ុនរបស់អ្នក។
`;

export const DEFAULT_PRIVACY_POLICY = DEFAULT_PRIVACY_POLICY_EN;

export const DEFAULT_TERMS_OF_SERVICE_EN = `
### 1. Acceptance of Terms
By accessing or using this SCCG Enterprise Mobile Application, you agree to comply with and be bound by these Terms of Service and your company's employee handbook.

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

export const DEFAULT_TERMS_OF_SERVICE_KH = `
### ១. ការទទួលយកលក្ខខណ្ឌ
តាមរយៈការចូលប្រើប្រាស់ ឬប្រើប្រាស់កម្មវិធីទូរស័ព្ទ SCCG APP មួយនេះ អ្នកយល់ព្រមអនុវត្ត និងគោរពតាមលក្ខខណ្ឌនៃការប្រើប្រាស់ទាំងនេះ ព្រមទាំងបទបញ្ជាផ្ទៃក្នុងរបស់ក្រុមហ៊ុន។

### ២. ការប្រើប្រាស់ដែលមានការអនុញ្ញាត និងសុវត្ថិភាពគណនី
• សម្រាប់តែការប្រើប្រាស់ក្នុងស្ថាប័ន៖ កម្មវិធីនេះត្រូវបានផ្តល់ជូនផ្តាច់មុខសម្រាប់តែបុគ្គលិកដែលមានសិទ្ធិស្របច្បាប់របស់ស្ថាប័នប៉ុណ្ណោះ។
• ការរក្សាការសម្ងាត់នៃគណនី៖ អ្នកមានទំនួលខុសត្រូវក្នុងការរក្សាសុវត្ថិភាពព័ត៌មានសម្ងាត់ចូលប្រើប្រាស់ និង QR កូដផ្ទាល់ខ្លួន។ ការចែករំលែកគណនី ឬការស្កេនវត្តមានជំនួសសហសេវិក ត្រូវបានហាមឃាត់ជាដាច់ខាត ហើយត្រូវប្រឈមនឹងវិធានការវិន័យ។
• សុវត្ថិភាពឧបករណ៍៖ អ្នកត្រូវធានាថា ឧបករណ៍ទូរស័ព្ទរបស់អ្នកត្រូវបានការពារដោយវិធានការសុវត្ថិភាពសមស្រប (ដូចជាការកំណត់លេខកូដសម្ងាត់ ឬការស្កេនខ្ចៅដៃ)។

### ៣. បទប្បញ្ញត្តិស្តីពីវត្តមាន និងប្រតិបត្តិការ
• ភាពត្រឹមត្រូវនៃទីតាំងភូមិសាស្ត្រ៖ ការកែបន្លំទីតាំង GPS ការប្រើប្រាស់កម្មវិធីក្លែងបន្លំទីតាំង (Mock Location) ឬការប៉ុនប៉ងក្លែងបន្លំ QR កូដរបស់សាខា គឺជាការបំពានដោយផ្ទាល់ទៅលើគោលការណ៍ការងាររបស់ក្រុមហ៊ុន។
• ការគោរពពេលវេលា និងវេនការងារ៖ ការកត់ត្រាវត្តមានត្រូវបានផ្ទៀងផ្ទាត់ពេលវេលាយ៉ាងត្រឹមត្រូវពីម៉ាស៊ីនមេ (Server)។ រាល់ភាពមិនប្រក្រតីត្រូវរាយការណ៍ជាបន្ទាន់តាមរយៈមុខងារ "បញ្ជាក់មូលហេតុវត្តមាន" (Attendance Reason)។
• ការកត់ត្រាសកម្មភាពការងារ៖ រាល់ការចុះបំពេញការងារខាងក្រៅ រូបថត និងកំណត់ត្រាវឌ្ឍនភាពដែលបានបញ្ចូល ត្រូវតែឆ្លុះបញ្ចាំងពីសកម្មភាពការងារពិតប្រាកដជាក់ស្តែង។

### ៤. ភាពឯកជន និងការត្រួតពិនិត្យ
ស្ថាប័នគោរពសិទ្ធិឯកជនភាពឌីជីថលរបស់អ្នក។ ការត្រួតពិនិត្យលើកម្មវិធីត្រូវបានកំណត់យ៉ាងតឹងរ៉ឹងចំពោះមុខងារការងារប៉ុណ្ណោះ (ការកត់ត្រាវត្តមាន ពាក្យស្នើសុំច្បាប់ផ្លូវការ និងសកម្មភាពការងារដែលបានចាត់តាំង)។ ឯកសារផ្ទាល់ខ្លួនក្នុងទូរស័ព្ទ និងសកម្មភាពក្រៅម៉ោងការងារ មិនត្រូវបានចូលប្រើប្រាស់ជាដាច់ខាត។

### ៥. ការបញ្ចប់ការប្រើប្រាស់ និងការកែប្រែលក្ខខណ្ឌ
សិទ្ធិចូលប្រើប្រាស់កម្មវិធីទូរស័ព្ទនេះ អាចនឹងត្រូវព្យួរ ឬដកហូតវិញ នៅពេលមានការបញ្ចប់កិច្ចសន្យាការងារ ឬក្នុងអំឡុងពេលដំណើរការនីតិវិធីវិន័យ។ លក្ខខណ្ឌទាំងនេះអាចត្រូវបានធ្វើបច្ចុប្បន្នភាពជាប្រចាំ ដើម្បីឆ្លើយតបទៅនឹងការវិវត្តនៃគោលនយោបាយប្រតិបត្តិការរបស់ក្រុមហ៊ុន។
`;

export const DEFAULT_TERMS_OF_SERVICE = DEFAULT_TERMS_OF_SERVICE_EN;

export const LegalDocumentSheet: React.FC<LegalDocumentSheetProps> = ({
    visible,
    onClose,
    type,
    customTitle,
    customContent,
    onAccept,
    acceptButtonText,
}) => {
    const { isDark } = useAppTheme();
    const { t, locale } = useTranslation();
    const theme = isDark ? darkTheme : lightTheme;

    const isKhmer = locale === 'kh';
    const isPrivacy = type === 'privacy';

    const title = customTitle || (isPrivacy ? t('privacy_policy', 'Privacy Policy') : t('terms_of_service', 'Terms of Service'));
    const subtitle = isPrivacy
        ? (isKhmer ? 'ស្តង់ដារការពារទិន្នន័យ GPS និងភាពឯកជនរបស់បុគ្គលិក' : 'Data protection, GPS, and employee privacy standards')
        : (isKhmer ? 'លក្ខខណ្ឌប្រើប្រាស់ក្នុងស្ថាប័ន និងគោលការណ៍វិន័យបុគ្គលិក' : 'Enterprise usage terms and employee conduct policies');

    const defaultContent = isPrivacy
        ? (isKhmer ? DEFAULT_PRIVACY_POLICY_KH : DEFAULT_PRIVACY_POLICY_EN)
        : (isKhmer ? DEFAULT_TERMS_OF_SERVICE_KH : DEFAULT_TERMS_OF_SERVICE_EN);

    const rawContent = customContent && customContent.trim().length > 0
        ? customContent
        : defaultContent;

    const defaultAcceptText = isKhmer ? 'ខ្ញុំយល់ព្រម និងទទួលស្គាល់' : 'I Understand & Acknowledge';
    const resolvedAcceptText = acceptButtonText || defaultAcceptText;

    const handleAcknowledge = () => {
        if (onAccept) {
            onAccept();
        }
        onClose();
    };

    return (
        <AppBottomSheet
            visible={visible}
            onClose={onClose}
            title={title}
            subtitle={subtitle}
            footer={
                <AppButton
                    title={resolvedAcceptText}
                    onPress={handleAcknowledge}
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
