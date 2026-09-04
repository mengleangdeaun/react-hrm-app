import React, { useMemo } from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Cake, PartyPopper, ChevronRight } from 'lucide-react-native';
import { AppText as Text } from '../AppText';
import { useTranslation } from '../../context/LanguageContext';
import { CelebrantItem } from '../../api/notification';

interface CelebrationNotificationHeaderProps {
    activeTab: string;
    celebrants: CelebrantItem[];
    loading?: boolean;
    onCelebrantPress: (celebrant: CelebrantItem) => void;
}

export const CelebrationNotificationHeader: React.FC<CelebrationNotificationHeaderProps> = ({
    activeTab,
    celebrants,
    loading = false,
    onCelebrantPress,
}) => {
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const filteredCelebrants = useMemo(() => {
        if (activeTab === 'birthday') return celebrants.filter((c) => c.type === 'birthday');
        if (activeTab === 'anniversary') {
            return celebrants.filter(
                (c) => c.type === 'anniversary' || (c.type as string) === 'work_anniversary'
            );
        }
        if (activeTab === 'all') return celebrants;
        return [];
    }, [celebrants, activeTab]);

    if (loading || filteredCelebrants.length === 0) return null;

    const headerTitle =
        activeTab === 'birthday'
            ? t('birthdays_today', 'Birthdays Today')
            : activeTab === 'anniversary'
            ? t('anniversaries_today', 'Work Anniversaries Today')
            : t('celebrations_today', 'Celebrations Today');

    return (
        <View style={styles.container}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{headerTitle}</Text>
            </View>

            <View style={styles.card}>
                {filteredCelebrants.map((person, index) => {
                    const isBirthday = person.type === 'birthday';
                    const isLast = index === filteredCelebrants.length - 1;
                    const avatarUrl = person.profile_image_url;

                    return (
                        <TouchableOpacity
                            key={`${person.id}-${person.type || 'celeb'}-${index}`}
                            style={[styles.celebrantRow, !isLast && styles.rowDivider]}
                            onPress={() => onCelebrantPress(person)}
                            activeOpacity={0.75}
                        >
                            {/* Avatar with corner milestone badge */}
                            <View style={styles.avatarWrapper}>
                                {avatarUrl ? (
                                    <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                                ) : (
                                    <View
                                        style={[
                                            styles.avatarFallback,
                                            { backgroundColor: isBirthday ? '#FDF2F8' : '#FEF3C7' },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.avatarInitial,
                                                { color: isBirthday ? '#DB2777' : '#D97706' },
                                            ]}
                                        >
                                            {person.name?.charAt(0)?.toUpperCase() || 'C'}
                                        </Text>
                                    </View>
                                )}

                                <View
                                    style={[
                                        styles.badgeCorner,
                                        { backgroundColor: isBirthday ? '#EC4899' : '#F59E0B' },
                                    ]}
                                >
                                    {isBirthday ? (
                                        <Cake color="#FFFFFF" size={10} />
                                    ) : (
                                        <PartyPopper color="#FFFFFF" size={10} />
                                    )}
                                </View>
                            </View>

                            {/* Details */}
                            <View style={styles.detailsCol}>
                                <View style={styles.titleRow}>
                                    <Text style={styles.nameText} numberOfLines={1}>
                                        {person.name}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.tagText,
                                            { color: isBirthday ? '#EC4899' : '#F59E0B' },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {isBirthday
                                            ? t('birthday', 'Birthday')
                                            : person.milestone
                                            ? `${person.milestone} ${t('anniversary', 'Anniversary')}`
                                            : t('anniversary', 'Anniversary')}
                                    </Text>
                                </View>
                                <Text style={styles.subText} numberOfLines={1}>
                                    {person.designation || person.department || t('team_member', 'Team Member')}
                                </Text>
                            </View>

                            <ChevronRight color={theme.colors.textSecondary} size={16} />
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        marginBottom: theme.spacing.md,
    },
    sectionHeader: {
        paddingVertical: theme.spacing.xs + 2,
        marginBottom: theme.spacing.xs,
    },
    sectionHeaderText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        color: theme.colors.textSecondary,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        ...theme.shadows.sm,
    },
    celebrantRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.md,
        gap: theme.spacing.sm + 4,
    },
    rowDivider: {
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    avatarWrapper: {
        position: 'relative',
        width: 44,
        height: 44,
    },
    avatarImage: {
        width: 44,
        height: 44,
        borderRadius: theme.borderRadius.md,
    },
    avatarFallback: {
        width: 44,
        height: 44,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 18,
        fontWeight: '900',
    },
    badgeCorner: {
        position: 'absolute',
        bottom: -3,
        right: -3,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: theme.colors.surface,
    },
    detailsCol: {
        flex: 1,
        minWidth: 0,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.xs,
    },
    nameText: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        flex: 1,
    },
    tagText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    subText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
}));
