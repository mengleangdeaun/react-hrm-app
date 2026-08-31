import React from 'react';
import Svg, {
    Path,
    Rect,
    Circle,
    Ellipse,
    Line,
    G,
} from 'react-native-svg';

interface IllustrationProps {
    size?: number;
    accentColor?: string;
    isDark?: boolean;
}

/**
 * 1. Attendance Illustration (assets/svg/attendance.svg)
 */
export const AttendanceIllustration: React.FC<IllustrationProps> = ({
    size = 240,
    isDark = false,
}) => {
    return (
        <Svg viewBox="0 0 320 320" width={size} height={size} fill="none">
            <G id="backdrop">
                <Rect x="44" y="42" width="232" height="232" rx="66" fill="#E8F1FF" transform="rotate(-8 160 158)" />
                <Circle cx="256" cy="68" r="9" fill="#FFE7B8" />
                <Circle cx="60" cy="232" r="6" fill="#C9F2E3" />
                <Rect x="52" y="92" width="16" height="5" rx="2.5" fill="#C9DDFF" />
                <Rect x="248" y="228" width="12" height="5" rx="2.5" fill="#C9DDFF" />
            </G>

            <G id="geofence">
                <Ellipse cx="160" cy="248" rx="88" ry="26" fill="#C9F2E3" opacity={0.55} />
                <Ellipse cx="160" cy="248" rx="88" ry="26" fill="none" stroke="#12B886" strokeWidth={4} strokeLinecap="round" strokeDasharray="2 14" />
                <Ellipse cx="160" cy="248" rx="56" ry="16" fill="none" stroke="#12B886" strokeWidth={3} opacity={0.45} />
            </G>

            <G id="phone">
                <Rect x="114" y="78" width="100" height="164" rx="24" fill="#0F2A47" opacity={0.08} />
                <Rect x="110" y="72" width="100" height="164" rx="24" fill="#0F2A47" />
                <Path d="M110 96a24 24 0 0 1 24-24h20a24 24 0 0 0-24 24v88l-20 28V96z" fill="#FFFFFF" opacity={0.05} />
                <Rect x="120" y="84" width="80" height="140" rx="16" fill="#FFFFFF" />
                <Rect x="148" y="76" width="24" height="4" rx="2" fill="#7FA9FF" opacity={0.5} />

                <G id="qr" transform="translate(132 98)">
                    <Rect x="0" y="0" width="18" height="18" rx="4" fill="#0F2A47" />
                    <Rect x="3.5" y="3.5" width="11" height="11" rx="2" fill="#FFFFFF" />
                    <Rect x="6.5" y="6.5" width="5" height="5" rx="1" fill="#DF0000" />
                    <Rect x="38" y="0" width="18" height="18" rx="4" fill="#0F2A47" />
                    <Rect x="41.5" y="3.5" width="11" height="11" rx="2" fill="#FFFFFF" />
                    <Rect x="44.5" y="6.5" width="5" height="5" rx="1" fill="#DF0000" />
                    <Rect x="0" y="38" width="18" height="18" rx="4" fill="#0F2A47" />
                    <Rect x="3.5" y="41.5" width="11" height="11" rx="2" fill="#FFFFFF" />
                    <Rect x="6.5" y="44.5" width="5" height="5" rx="1" fill="#DF0000" />

                    <Rect x="24" y="0" width="7" height="7" rx="2" fill="#0F2A47" />
                    <Rect x="24" y="11" width="7" height="7" rx="2" fill="#7FA9FF" />
                    <Rect x="0" y="24" width="7" height="7" rx="2" fill="#0F2A47" />
                    <Rect x="11" y="24" width="7" height="7" rx="2" fill="#7FA9FF" />
                    <Rect x="24" y="24" width="14" height="14" rx="3" fill="#DF0000" />
                    <Rect x="42" y="24" width="7" height="7" rx="2" fill="#0F2A47" />
                    <Rect x="49" y="35" width="7" height="7" rx="2" fill="#0F2A47" />
                    <Rect x="24" y="42" width="7" height="14" rx="3" fill="#0F2A47" />
                    <Rect x="35" y="49" width="14" height="7" rx="3" fill="#7FA9FF" />
                    <Rect x="49" y="49" width="7" height="7" rx="2" fill="#0F2A47" />
                </G>

                <Rect x="132" y="170" width="56" height="8" rx="4" fill="#E8F1FF" />
                <Rect x="132" y="184" width="36" height="8" rx="4" fill="#E8F1FF" />
                <Rect x="132" y="202" width="56" height="14" rx="7" fill="#DF0000" />
            </G>

            <G id="pin" transform="translate(196 44)">
                <Circle cx="38" cy="38" r="38" fill="#FFFFFF" />
                <Circle cx="38" cy="38" r="26" fill="#FFE2E2" />
                <Path d="M38 20c-9 0-16 7-16 16 0 12 16 26 16 26s16-14 16-26c0-9-7-16-16-16z" fill="#FF6B6B" />
                <Path d="M38 20c-9 0-16 7-16 16 0 12 16 26 16 26V20z" fill="#FFFFFF" opacity={0.16} />
                <Circle cx="38" cy="35" r="6" fill="#FFFFFF" />
            </G>

            <G id="badge" transform="translate(50 196)">
                <Circle cx="24" cy="24" r="24" fill="#FFFFFF" />
                <Circle cx="24" cy="24" r="17" fill="#12B886" />
                <Path d="M17 24l5 5 9-10" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </G>
        </Svg>
    );
};

/**
 * 2. Activity Log Illustration (assets/svg/activity-log.svg)
 */
export const ActivityIllustration: React.FC<IllustrationProps> = ({
    size = 240,
    isDark = false,
}) => {
    return (
        <Svg viewBox="0 0 320 320" width={size} height={size} fill="none">
            <G id="backdrop">
                <Rect x="44" y="42" width="232" height="232" rx="66" fill="#E8F1FF" transform="rotate(-8 160 158)" />
                <Circle cx="256" cy="68" r="9" fill="#FFE7B8" />
                <Circle cx="60" cy="232" r="6" fill="#C9F2E3" />
                <Rect x="52" y="92" width="16" height="5" rx="2.5" fill="#C9DDFF" />
                <Rect x="248" y="228" width="12" height="5" rx="2.5" fill="#C9DDFF" />
            </G>

            <G id="map-card">
                <Rect x="92" y="74" width="132" height="156" rx="18" fill="#0F2A47" opacity={0.08} />
                <Rect x="88" y="68" width="132" height="156" rx="18" fill="#FFFFFF" />
                <Path d="M88 86a18 18 0 0 1 18-18h96a18 18 0 0 1 18 18v10H88V86z" fill="#DF0000" />
                <Rect x="102" y="76" width="44" height="8" rx="4" fill="#FFFFFF" opacity={0.85} />
                <Circle cx="204" cy="80" r="5" fill="#C9F2E3" />

                <G opacity={0.9}>
                    <Rect x="102" y="108" width="34" height="26" rx="6" fill="#E2E8F0" />
                    <Rect x="144" y="108" width="62" height="26" rx="6" fill="#E2E8F0" />
                    <Rect x="102" y="142" width="52" height="30" rx="6" fill="#E2E8F0" />
                    <Rect x="162" y="142" width="44" height="30" rx="6" fill="#E2E8F0" />
                    <Rect x="102" y="180" width="104" height="28" rx="6" fill="#E2E8F0" />
                </G>

                <Path d="M116 196c0-30 40-14 40-40s34-16 34-38" stroke="#FBD9D9" strokeWidth={12} strokeLinecap="round" />
                <Path d="M116 196c0-30 40-14 40-40s34-16 34-38" stroke="#DF0000" strokeWidth={4} strokeLinecap="round" strokeDasharray="1 12" />
                <Circle cx="116" cy="196" r="9" fill="#10B981" />
                <Circle cx="116" cy="196" r="3.5" fill="#FFFFFF" />
                <Circle cx="190" cy="118" r="9" fill="#2563EB" />
                <Circle cx="190" cy="118" r="3.5" fill="#FFFFFF" />
            </G>

            <G id="gps" transform="translate(56 60)">
                <Circle cx="20" cy="20" r="26" fill="#FFFFFF" opacity={0.9} />
                <Path d="M20 2C10.6 2 3 9.6 3 19c0 12 17 27 17 27s17-15 17-27C37 9.6 29.4 2 20 2z" fill="#DF0000" />
                <Path d="M20 2C10.6 2 3 9.6 3 19c0 12 17 27 17 27V2z" fill="#FFFFFF" opacity={0.16} />
                <Circle cx="20" cy="18" r="6" fill="#FFFFFF" />
            </G>

            <G id="photo" transform="translate(180 172) rotate(7)">
                <Rect x="4" y="4" width="86" height="86" rx="14" fill="#0F2A47" opacity={0.08} />
                <Rect x="0" y="0" width="86" height="86" rx="14" fill="#FFFFFF" />
                <Rect x="9" y="9" width="68" height="48" rx="9" fill="#FFE7B8" />
                <Path d="M9 46l17-18 15 13 11-9 25 25H9v-11z" fill="#F59E0B" />
                <Circle cx="60" cy="24" r="6" fill="#DF0000" />
                <Rect x="9" y="65" width="34" height="7" rx="3.5" fill="#0F2A47" opacity={0.85} />
                <Rect x="9" y="76" width="20" height="5" rx="2.5" fill="#C9DDFF" />
                <Circle cx="68" cy="73" r="11" fill="#10B981" />
                <Path d="M64 73.5l3 3 5.5-6" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            </G>
        </Svg>
    );
};

/**
 * 3. Leave & Day-Off Illustration (assets/svg/leave-day-off.svg)
 */
export const LeaveIllustration: React.FC<IllustrationProps> = ({
    size = 240,
    isDark = false,
}) => {
    return (
        <Svg viewBox="0 0 320 320" width={size} height={size} fill="none">
            <G id="backdrop">
                <Rect x="44" y="42" width="232" height="232" rx="66" fill="#E8F1FF" transform="rotate(-8 160 158)" />
                <Circle cx="256" cy="68" r="9" fill="#FFE7B8" />
                <Circle cx="60" cy="232" r="6" fill="#C9F2E3" />
                <Rect x="52" y="92" width="16" height="5" rx="2.5" fill="#C9DDFF" />
                <Rect x="248" y="228" width="12" height="5" rx="2.5" fill="#C9DDFF" />
            </G>

            <G id="roster">
                <Rect x="66" y="82" width="176" height="150" rx="18" fill="#0F2A47" opacity={0.08} />
                <Rect x="62" y="76" width="176" height="150" rx="18" fill="#FFFFFF" />
                <Path d="M62 94a18 18 0 0 1 18-18h140a18 18 0 0 1 18 18v20H62V94z" fill="#DF0000" />
                <Rect x="78" y="90" width="46" height="8" rx="4" fill="#FFFFFF" opacity={0.9} />
                <Circle cx="216" cy="94" r="6" fill="#C9F2E3" />

                <G transform="translate(78 128)">
                    <Rect x="0" y="0" width="144" height="30" rx="10" fill="#D1FAE5" />
                    <Path d="M0 10a10 10 0 0 1 10-10h2v30h-2A10 10 0 0 1 0 20V10z" fill="#10B981" />
                    <Circle cx="30" cy="15" r="9" fill="#FFFFFF" />
                    <Circle cx="30" cy="12.5" r="3.6" fill="#10B981" />
                    <Path d="M24.5 19.5c1.2-2.6 3.2-3.6 5.5-3.6s4.3 1 5.5 3.6h-11z" fill="#10B981" />
                    <Rect x="46" y="11" width="44" height="8" rx="4" fill="#0F2A47" opacity={0.75} />
                    <Rect x="100" y="7" width="36" height="16" rx="8" fill="#FFFFFF" />
                    <Rect x="108" y="13" width="20" height="4" rx="2" fill="#10B981" />
                </G>

                <G transform="translate(78 166)">
                    <Rect x="0" y="0" width="144" height="30" rx="10" fill="#FEF3C7" />
                    <Path d="M0 10a10 10 0 0 1 10-10h2v30h-2A10 10 0 0 1 0 20V10z" fill="#F59E0B" />
                    <Circle cx="30" cy="15" r="9" fill="#FFFFFF" />
                    <Circle cx="30" cy="12.5" r="3.6" fill="#F59E0B" />
                    <Path d="M24.5 19.5c1.2-2.6 3.2-3.6 5.5-3.6s4.3 1 5.5 3.6h-11z" fill="#F59E0B" />
                    <Rect x="46" y="11" width="34" height="8" rx="4" fill="#0F2A47" opacity={0.75} />
                    <Rect x="100" y="7" width="36" height="16" rx="8" fill="#FFFFFF" />
                    <Rect x="108" y="13" width="20" height="4" rx="2" fill="#F59E0B" />
                </G>

                <Rect x="78" y="204" width="98" height="8" rx="4" fill="#E2E8F0" />
            </G>

            <G id="clock" transform="translate(196 172)">
                <Circle cx="40" cy="40" r="40" fill="#FFFFFF" />
                <Circle cx="40" cy="40" r="31" fill="#E8F1FF" />
                <Path d="M40 40V22" stroke="#0F2A47" strokeWidth={5} strokeLinecap="round" />
                <Path d="M40 40h13" stroke="#DF0000" strokeWidth={5} strokeLinecap="round" />
                <Circle cx="40" cy="40" r="4" fill="#0F2A47" />
                <Rect x="38" y="13" width="4" height="6" rx="2" fill="#F3A6A6" />
                <Rect x="61" y="38" width="6" height="4" rx="2" fill="#F3A6A6" />
                <Rect x="38" y="61" width="4" height="6" rx="2" fill="#F3A6A6" />
                <Rect x="13" y="38" width="6" height="4" rx="2" fill="#F3A6A6" />
            </G>
        </Svg>
    );
};

/**
 * 4. Assessment & Quiz Illustration (assets/svg/assessment-quiz.svg)
 */
export const QuizIllustration: React.FC<IllustrationProps> = ({
    size = 240,
    isDark = false,
}) => {
    return (
        <Svg viewBox="0 0 320 320" width={size} height={size} fill="none">
            <G id="backdrop">
                <Rect x="44" y="42" width="232" height="232" rx="66" fill="#E8F1FF" transform="rotate(-8 160 158)" />
                <Circle cx="256" cy="68" r="9" fill="#FFE7B8" />
                <Circle cx="60" cy="232" r="6" fill="#C9F2E3" />
                <Rect x="52" y="92" width="16" height="5" rx="2.5" fill="#C9DDFF" />
                <Rect x="248" y="228" width="12" height="5" rx="2.5" fill="#C9DDFF" />
            </G>

            <G id="quiz-card" transform="translate(54 108) rotate(-8)">
                <Rect x="4" y="4" width="94" height="120" rx="16" fill="#0F2A47" opacity={0.08} />
                <Rect x="0" y="0" width="94" height="120" rx="16" fill="#FFFFFF" />
                <Rect x="14" y="16" width="38" height="8" rx="4" fill="#DF0000" />
                <Rect x="14" y="30" width="62" height="6" rx="3" fill="#E2E8F0" />
                <Circle cx="21" cy="56" r="8" fill="#D1FAE5" />
                <Path d="M17.5 56l2.6 2.6 5-5.4" stroke="#10B981" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                <Rect x="36" y="52" width="44" height="8" rx="4" fill="#0F2A47" opacity={0.8} />
                <Circle cx="21" cy="80" r="8" fill="#D1FAE5" />
                <Path d="M17.5 80l2.6 2.6 5-5.4" stroke="#10B981" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                <Rect x="36" y="76" width="34" height="8" rx="4" fill="#0F2A47" opacity={0.8} />
                <Circle cx="21" cy="102" r="8" fill="#E2E8F0" />
                <Rect x="36" y="98" width="44" height="8" rx="4" fill="#E2E8F0" />
            </G>

            <G id="certificate" transform="translate(176 138) rotate(9)">
                <Rect x="4" y="4" width="90" height="70" rx="14" fill="#0F2A47" opacity={0.08} />
                <Rect x="0" y="0" width="90" height="70" rx="14" fill="#FFFFFF" />
                <Rect x="12" y="16" width="40" height="7" rx="3.5" fill="#0F2A47" opacity={0.8} />
                <Rect x="12" y="29" width="28" height="5" rx="2.5" fill="#C9DDFF" />
                <Rect x="12" y="46" width="34" height="5" rx="2.5" fill="#E2E8F0" />
                <Path d="M64 50l-6 20 9-6 9 6-6-20h-6z" fill="#DF0000" />
                <Circle cx="67" cy="42" r="13" fill="#F59E0B" />
                <Circle cx="67" cy="42" r="6" fill="#FFE7B8" />
            </G>

            <G id="trophy" transform="translate(112 62)">
                <Ellipse cx="48" cy="150" rx="52" ry="10" fill="#0F2A47" opacity={0.08} />
                <Path d="M18 40C2 40 2 70 20 72" stroke="#F3A6A6" strokeWidth={9} strokeLinecap="round" />
                <Path d="M78 40c16 0 16 30-2 32" stroke="#F3A6A6" strokeWidth={9} strokeLinecap="round" />
                <Path d="M14 22h68v36c0 20-15 34-34 34S14 78 14 58V22z" fill="#F59E0B" />
                <Path d="M14 22h34v70c-19 0-34-14-34-34V22z" fill="#FFFFFF" opacity={0.16} />
                <Ellipse cx="48" cy="22" rx="34" ry="9" fill="#FFE7B8" />
                <Path d="M48 40l4.6 9.6L63 51l-7.5 7.4 1.8 10.4L48 64l-9.3 4.8 1.8-10.4L33 51l10.4-1.4L48 40z" fill="#FFFFFF" opacity={0.9} />
                <Rect x="40" y="92" width="16" height="26" rx="4" fill="#F59E0B" />
                <Path d="M22 118h52l8 22H14l8-22z" fill="#DF0000" />
                <Path d="M22 118h26v22H14l8-22z" fill="#FFFFFF" opacity={0.14} />
                <Rect x="6" y="140" width="84" height="12" rx="6" fill="#0F2A47" />
            </G>
        </Svg>
    );
};

/**
 * 5. Progress Log Illustration (assets/svg/progress-log.svg)
 */
export const ProgressIllustration: React.FC<IllustrationProps> = ({
    size = 240,
    isDark = false,
}) => {
    return (
        <Svg viewBox="0 0 320 320" width={size} height={size} fill="none">
            <G id="backdrop">
                <Rect x="44" y="42" width="232" height="232" rx="66" fill="#E8F1FF" transform="rotate(-8 160 158)" />
                <Circle cx="256" cy="68" r="9" fill="#FFE7B8" />
                <Circle cx="60" cy="232" r="6" fill="#C9F2E3" />
                <Rect x="52" y="92" width="16" height="5" rx="2.5" fill="#C9DDFF" />
                <Rect x="248" y="228" width="12" height="5" rx="2.5" fill="#C9DDFF" />
            </G>

            <G id="chart-card">
                <Rect x="78" y="104" width="164" height="130" rx="18" fill="#0F2A47" opacity={0.08} />
                <Rect x="74" y="98" width="164" height="130" rx="18" fill="#FFFFFF" />
                <Rect x="92" y="114" width="46" height="8" rx="4" fill="#0F2A47" opacity={0.8} />
                <Rect x="92" y="128" width="28" height="6" rx="3" fill="#C9DDFF" />
                <Rect x="92" y="204" width="132" height="4" rx="2" fill="#E2E8F0" />

                <Rect x="98" y="168" width="24" height="36" rx="8" fill="#FBD9D9" />
                <Rect x="134" y="150" width="24" height="54" rx="8" fill="#F3A6A6" />
                <Rect x="170" y="164" width="24" height="40" rx="8" fill="#DF0000" />
                <Rect x="206" y="132" width="24" height="72" rx="8" fill="#10B981" />

                <Path d="M110 158l36-24 36 16 36-38" stroke="#2563EB" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M206 112h12v12" stroke="#2563EB" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
                <Circle cx="146" cy="134" r="5" fill="#FFFFFF" stroke="#2563EB" strokeWidth={3} />
            </G>

            <G id="merit" transform="translate(198 46)">
                <Circle cx="32" cy="32" r="32" fill="#FFFFFF" />
                <Circle cx="32" cy="32" r="23" fill="#FFE7B8" />
                <Path d="M32 19l4 8.6 9.4 1.3-6.8 6.6 1.6 9.5L32 40.6 23.8 45l1.6-9.5-6.8-6.6 9.4-1.3L32 19z" fill="#F59E0B" />
            </G>

            <G id="feedback" transform="translate(46 60)">
                <Rect x="4" y="4" width="92" height="60" rx="18" fill="#0F2A47" opacity={0.08} />
                <Rect x="0" y="0" width="92" height="60" rx="18" fill="#FFFFFF" />
                <Path d="M50 58l6 14 8-14H50z" fill="#FFFFFF" />
                <Circle cx="26" cy="30" r="13" fill="#DF0000" />
                <Circle cx="26" cy="26" r="5" fill="#FFFFFF" />
                <Path d="M18 37c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5H18z" fill="#FFFFFF" />
                <Rect x="47" y="22" width="32" height="7" rx="3.5" fill="#0F2A47" opacity={0.8} />
                <Rect x="47" y="34" width="20" height="6" rx="3" fill="#C9DDFF" />
            </G>
        </Svg>
    );
};

/**
 * 6. Schedule & Calendar Illustration (assets/svg/schedule-calendar.svg)
 */
export const CalendarIllustration: React.FC<IllustrationProps> = ({
    size = 240,
    isDark = false,
}) => {
    return (
        <Svg viewBox="0 0 320 320" width={size} height={size} fill="none">
            <G id="backdrop">
                <Rect x="44" y="42" width="232" height="232" rx="66" fill="#E8F1FF" transform="rotate(-8 160 158)" />
                <Circle cx="256" cy="68" r="9" fill="#FFE7B8" />
                <Circle cx="60" cy="232" r="6" fill="#C9F2E3" />
                <Rect x="52" y="92" width="16" height="5" rx="2.5" fill="#C9DDFF" />
                <Rect x="248" y="228" width="12" height="5" rx="2.5" fill="#C9DDFF" />
            </G>

            <G id="calendar">
                <Rect x="72" y="84" width="164" height="159" rx="18" fill="#0F2A47" opacity={0.08} />
                <Rect x="68" y="78" width="164" height="160" rx="18" fill="#FFFFFF" />
                <Path d="M68 96a18 18 0 0 1 18-18h128a18 18 0 0 1 18 18v26H68V96z" fill="#DF0000" />
                <Rect x="96" y="62" width="12" height="26" rx="6" fill="#0F2A47" />
                <Rect x="192" y="62" width="12" height="26" rx="6" fill="#0F2A47" />
                <Rect x="88" y="96" width="48" height="8" rx="4" fill="#FFFFFF" opacity={0.9} />
                <Rect x="88" y="108" width="28" height="6" rx="3" fill="#FFFFFF" opacity={0.5} />

                <G id="grid">
                    <Rect x="86" y="136" width="28" height="26" rx="8" fill="#EEF3F9" />
                    <Rect x="122" y="136" width="28" height="26" rx="8" fill="#EEF3F9" />
                    <Rect x="158" y="136" width="28" height="26" rx="8" fill="#EEF3F9" />
                    <Rect x="194" y="136" width="28" height="26" rx="8" fill="#EEF3F9" />

                    <Rect x="86" y="170" width="28" height="26" rx="8" fill="#EEF3F9" />
                    <Rect x="122" y="170" width="28" height="26" rx="8" fill="#C9F2E3" />
                    <Path d="M130 183l4 4 8-9" stroke="#12B886" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
                    <Rect x="158" y="170" width="28" height="26" rx="8" fill="#C9F2E3" />
                    <Path d="M166 183l4 4 8-9" stroke="#12B886" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
                    <Rect x="194" y="170" width="28" height="26" rx="8" fill="#EEF3F9" />

                    <Rect x="86" y="204" width="28" height="26" rx="8" fill="#EEF3F9" />
                    <Rect x="122" y="204" width="28" height="26" rx="8" fill="#EEF3F9" />
                    <Rect x="158" y="204" width="28" height="26" rx="8" fill="#DF0000" />
                    <Rect x="194" y="204" width="28" height="26" rx="8" fill="#EEF3F9" />
                </G>
            </G>

            <G id="allowance" transform="translate(196 44)">
                <Circle cx="38" cy="38" r="38" fill="#FFFFFF" />
                <Circle cx="38" cy="38" r="26" fill="none" stroke="#E8F1FF" strokeWidth={8} />
                <Path d="M38 12a26 26 0 1 1-22 40" fill="none" stroke="#FFB020" strokeWidth={8} strokeLinecap="round" />
                <Circle cx="38" cy="38" r="15" fill="#FFE7B8" />
                <Path d="M38 30l2.6 5.6 6 .8-4.4 4.3 1.1 6.1L38 44l-5.3 2.8 1.1-6.1-4.4-4.3 6-.8L38 30z" fill="#FFB020" />
            </G>

            <G id="badge" transform="translate(50 196)">
                <Circle cx="24" cy="24" r="24" fill="#FFFFFF" />
                <Circle cx="24" cy="24" r="17" fill="#12B886" />
                <Rect x="16" y="22" width="16" height="4" rx="2" fill="#FFFFFF" />
            </G>
        </Svg>
    );
};

/**
 * 7. Announcements & Notifications Illustration (assets/svg/bell.svg)
 */
export const AnnouncementIllustration: React.FC<IllustrationProps> = ({
    size = 240,
    isDark = false,
}) => {
    return (
        <Svg viewBox="0 0 320 320" width={size} height={size} fill="none">
            <G id="backdrop">
                <Rect x="44" y="42" width="232" height="232" rx="66" fill="#E8F1FF" transform="rotate(-8 160 158)" />
                <Circle cx="256" cy="68" r="9" fill="#FFE7B8" />
                <Circle cx="60" cy="232" r="6" fill="#C9F2E3" />
                <Rect x="52" y="92" width="16" height="5" rx="2.5" fill="#C9DDFF" />
                <Rect x="248" y="228" width="12" height="5" rx="2.5" fill="#C9DDFF" />
            </G>

            <G id="card">
                <Rect x="72" y="84" width="164" height="154" rx="18" fill="#0F2A47" opacity={0.08} />
                <Rect x="68" y="78" width="164" height="154" rx="18" fill="#FFFFFF" />
            </G>

            <G id="bell">
                <Rect x="142" y="90" width="16" height="14" rx="7" fill="#0F2A47" />
                <Path d="M150 104c-22 0-38 18-38 42v30l-14 20h104l-14-20v-30c0-24-16-42-38-42z" fill="#FFB020" />
                <Path d="M150 104c-22 0-38 18-38 42v30l-14 20h52V104z" fill="#FFFFFF" opacity={0.16} />
                <Path d="M132 200h36a18 18 0 0 1-36 0z" fill="#0F2A47" />
                <Circle cx="196" cy="110" r="16" fill="#FFFFFF" />
                <Circle cx="196" cy="110" r="12" fill="#FF6B6B" />
            </G>

            <G id="announce" transform="translate(196 44)">
                <Circle cx="38" cy="38" r="38" fill="#FFFFFF" />
                <Circle cx="38" cy="38" r="26" fill="#EAF2FF" />
                <Path d="M28 28h8l10-8v36l-10-8h-8a4 4 0 0 1-4-4v-12a4 4 0 0 1 4-4z" fill="#DF0000" />
                <Path d="M50 30a10 10 0 0 1 0 16" stroke="#DF0000" strokeWidth={4} strokeLinecap="round" fill="none" />
                <Path d="M55 24a18 18 0 0 1 0 28" stroke="#ff7676b8" strokeWidth={4} strokeLinecap="round" fill="none" />
            </G>

            <G id="badge" transform="translate(50 196)">
                <Circle cx="24" cy="24" r="24" fill="#FFFFFF" />
                <Circle cx="24" cy="24" r="17" fill="#12B886" />
                <Path d="M17 24l5 5 9-10" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </G>
        </Svg>
    );
};
