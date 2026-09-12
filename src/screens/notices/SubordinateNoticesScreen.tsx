import React, { useState, useEffect } from 'react';
import {
    View,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Modal,
    TextInput,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet as RNStyleSheet,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '../../components/AppText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { noticeApi, Subordinate, SubordinateNotice } from '../../api/notice';
import { useAppTheme } from '../../context/ThemeContext';
import { NativeDatePickerField } from '../../components/common/NativeDatePickerField';
import { AppHeader } from '../../components/common/AppHeader';
import { ListSkeleton } from '../../components/common/Skeletons';
import { EmptyState } from '../../components/common/EmptyState';
import { AppBottomSheet } from '../../components/common/AppBottomSheet';
import {
    ArrowLeft,
    Plus,
    Award,
    AlertTriangle,
    AlertCircle,
    TrendingUp,
    User,
    Calendar,
    X,
    Check,
    Search,
    FileText,
} from 'lucide-react-native';
import { format, formatDateDisplay } from '../../utils/dateTime';

import { useTranslation } from '../../context/LanguageContext';
import { HeaderIconButton } from '../../components/common/AppHeader';
import { AppShell } from '../../components/common/AppShell';

export const SubordinateNoticesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const { isDark } = useAppTheme();
    const { t } = useTranslation();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const CATEGORY_FILTERS = [
        { id: 'all', label: t('all_notices', 'All Notices') },
        { id: 'positive', label: t('positive', 'Positive') },
        { id: 'negative', label: t('warnings', 'Warnings') },
        { id: 'progress', label: t('progress', 'Progress') },
    ];

    const queryClient = useQueryClient();

    const [selectedSubordinateId, setSelectedSubordinateId] = useState<number | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Create Notice Modal State
    const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
    const [formSubordinateId, setFormSubordinateId] = useState<number | null>(null);
    const [formType, setFormType] = useState<'positive' | 'negative' | 'progress'>('positive');
    const [formDate, setFormDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [formComment, setFormComment] = useState<string>('');

    // 1. Fetch Subordinates
    const { data: subordinates = [] } = useQuery<Subordinate[]>({
        queryKey: ['subordinates'],
        queryFn: async () => {
            const res = await noticeApi.getSubordinates();
            return Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
        },
    });

    // 2. Fetch Notices Feed
    const {
        data: notices = [],
        isLoading,
        isFetching,
        refetch,
    } = useQuery<SubordinateNotice[]>({
        queryKey: ['subordinateNotices', selectedSubordinateId, selectedCategory],
        queryFn: async () => {
            const params: any = {};
            if (selectedSubordinateId) params.employee_id = selectedSubordinateId;
            if (selectedCategory !== 'all') params.type = selectedCategory;

            const res = await noticeApi.getNotices(params);
            return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        },
    });

    // 3. Create Notice Mutation
    const createMutation = useMutation({
        mutationFn: noticeApi.createNotice,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['subordinateNotices'] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
                t('notice_recorded', 'Notice Recorded'),
                t('notice_logged_desc', 'Subordinate notice logged successfully.')
            );
            setCreateModalVisible(false);
            setFormComment('');
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || err?.message || t('fail_record_notice', 'Failed to record notice.');
            Alert.alert(t('error', 'Error'), msg);
        },
    });

    const onRefresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ['subordinateNotices'] });
        await queryClient.invalidateQueries({ queryKey: ['subordinates'] });
        refetch();
    };

    const handleCreateNotice = () => {
        if (!formSubordinateId) {
            Alert.alert(t('required', 'Required'), t('select_subordinate_member', 'Please select a subordinate team member.'));
            return;
        }
        if (!formComment.trim()) {
            Alert.alert(t('required', 'Required'), t('provide_notice_comments', 'Please provide detailed notice comments.'));
            return;
        }

        createMutation.mutate({
            employee_id: formSubordinateId,
            type: formType,
            notice_date: formDate,
            comment: formComment.trim(),
        });
    };

    const getTypeStyle = (type: string) => {
        switch (type) {
            case 'positive':
                return {
                    bg: theme.colors.status.successSubtle,
                    border: theme.colors.status.successBorder,
                    color: theme.colors.status.success,
                    label: t('positive_conduct', 'POSITIVE CONDUCT'),
                    Icon: Award,
                };
            case 'negative':
                return {
                    bg: theme.colors.status.dangerSubtle,
                    border: theme.colors.status.dangerBorder,
                    color: theme.colors.status.danger,
                    label: t('warning_notice', 'WARNING / NOTICE'),
                    Icon: AlertCircle,
                };
            default:
                return {
                    bg: theme.colors.status.infoSubtle,
                    border: theme.colors.status.infoBorder,
                    color: theme.colors.status.info,
                    label: t('progress_milestone', 'PROGRESS / MILESTONE'),
                    Icon: TrendingUp,
                };
        }
    };

    const headerRight = (
        <HeaderIconButton
            icon={<Plus color={theme.colors.brand} size={20} />}
            onPress={() => {
                if (subordinates.length > 0 && !formSubordinateId) {
                    setFormSubordinateId(subordinates[0].id);
                }
                setCreateModalVisible(true);
            }}
            accessibilityLabel="Create notice"
        />
    );

    return (
        <AppShell
            title={t('team_subordinate_notices', 'Team Subordinate Notices')}
            onBack={() => navigation.goBack()}
            headerRight={headerRight}
            refreshing={isFetching && !isLoading}
            onRefresh={onRefresh}
        >
            {/* Horizontal Subordinates Selector */}
            {subordinates.length > 0 && (
                <View style={styles.subordinateSection}>
                    <Text style={styles.sectionLabel}>{t('team_members_count', `Team Members (${subordinates.length})`)}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subordinateCarousel}>
                        <TouchableOpacity
                            style={[
                                styles.subordinateChip,
                                selectedSubordinateId === null && styles.subordinateChipSelected,
                            ]}
                            onPress={() => setSelectedSubordinateId(null)}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.subordinateChipText,
                                    selectedSubordinateId === null && styles.subordinateChipTextSelected,
                                ]}
                            >
                                {t('all_subordinates', 'All Subordinates')}
                            </Text>
                        </TouchableOpacity>

                        {subordinates.map((sub) => {
                            const isSelected = selectedSubordinateId === sub.id;
                            return (
                                <TouchableOpacity
                                    key={sub.id}
                                    style={[styles.subordinateChip, isSelected && styles.subordinateChipSelected]}
                                    onPress={() => setSelectedSubordinateId(sub.id)}
                                    activeOpacity={0.8}
                                >
                                    <Text
                                        style={[
                                            styles.subordinateChipText,
                                            isSelected && styles.subordinateChipTextSelected,
                                        ]}
                                    >
                                        {sub.full_name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Category Filters */}
            <View style={styles.categoryBar}>
                {CATEGORY_FILTERS.map((cat) => (
                    <TouchableOpacity
                        key={cat.id}
                        style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipActive]}
                        onPress={() => setSelectedCategory(cat.id)}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={[
                                styles.categoryChipText,
                                selectedCategory === cat.id && styles.categoryChipTextActive,
                            ]}
                        >
                            {cat.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Notice Timeline List */}
            {isLoading ? (
                <ListSkeleton count={3} />
            ) : notices.length === 0 ? (
                <EmptyState
                    icon={<FileText color={theme.colors.textSecondary} size={36} />}
                    title={t('no_team_notices', 'No Team Notices Recorded')}
                    description={t('no_team_notices_desc', 'No behavioral or progress notices found for this selection.')}
                    actionTitle={t('log_notice', 'Log New Notice')}
                    onAction={() => setCreateModalVisible(true)}
                />
            ) : (
                notices.map((item) => {
                    const typeObj = getTypeStyle(item.type);
                    const TypeIcon = typeObj.Icon;

                    const employeeName = item.employee?.full_name || t('subordinate', 'Subordinate');
                    const creatorName = item.creator?.full_name || t('manager', 'Manager');

                    return (
                        <View key={item.id} style={styles.noticeCard}>
                            <View style={styles.cardHeader}>
                                <View style={styles.userGroup}>
                                    <View style={styles.userAvatar}>
                                        <Text style={styles.userAvatarText}>
                                            {employeeName.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={styles.userTextGroup}>
                                        <Text style={styles.userName}>{employeeName}</Text>
                                        <Text style={styles.userCode}>{item.employee?.employee_id || ''}</Text>
                                    </View>
                                </View>

                                <View
                                    style={[
                                        styles.typeBadge,
                                        { backgroundColor: typeObj.bg, borderColor: typeObj.border },
                                    ]}
                                >
                                    <TypeIcon color={typeObj.color} size={12} />
                                    <Text style={[styles.typeBadgeText, { color: typeObj.color }]}>
                                        {typeObj.label}
                                    </Text>
                                </View>
                            </View>

                            <Text style={styles.commentText}>{item.comment}</Text>

                            <View style={styles.cardFooter}>
                                <Text style={styles.creatorText}>{t('logged_by', 'Logged by')} {creatorName}</Text>
                                <View style={styles.dateGroup}>
                                    <Calendar color={theme.colors.textSecondary} size={12} />
                                    <Text style={styles.dateText}>{formatDateDisplay(item.notice_date || item.created_at, 'standard', 'Recent')}</Text>
                                </View>
                            </View>
                        </View>
                    );
                })
            )}

            {/* Log New Notice Modal */}
            <AppBottomSheet
                visible={createModalVisible}
                onClose={() => setCreateModalVisible(false)}
                title={t('log_subordinate_notice', 'Log Subordinate Notice')}
                footer={
                    <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleCreateNotice}
                        disabled={createMutation.isPending}
                        activeOpacity={0.85}
                    >
                        {createMutation.isPending ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.submitBtnText}>{t('record_subordinate_notice', 'Record Subordinate Notice')}</Text>
                        )}
                    </TouchableOpacity>
                }
            >
                {/* Select Subordinate */}
                <Text style={styles.inputLabel}>{t('target_team_member', 'Target Team Member')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subPickerRow}>
                    {subordinates.map((sub) => {
                        const isSelected = formSubordinateId === sub.id;
                        return (
                            <TouchableOpacity
                                key={sub.id}
                                style={[styles.subPickerChip, isSelected && styles.subPickerChipSelected]}
                                onPress={() => setFormSubordinateId(sub.id)}
                                activeOpacity={0.75}
                            >
                                <Text
                                    style={[
                                        styles.subPickerText,
                                        isSelected && styles.subPickerTextSelected,
                                    ]}
                                >
                                    {sub.full_name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Select Type */}
                <Text style={styles.inputLabel}>{t('notice_type', 'Notice Type')}</Text>
                <View style={styles.typeSelectorRow}>
                    {(['positive', 'negative', 'progress'] as const).map((tType) => {
                        const isSelected = formType === tType;
                        return (
                            <TouchableOpacity
                                key={tType}
                                style={[styles.typeOption, isSelected && styles.typeOptionSelected]}
                                onPress={() => setFormType(tType)}
                                activeOpacity={0.75}
                            >
                                <Text
                                    style={[
                                        styles.typeOptionText,
                                        isSelected && styles.typeOptionTextSelected,
                                    ]}
                                >
                                    {tType.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Incident / Notice Date */}
                <NativeDatePickerField
                    label={t('notice_incident_date', 'Notice / Incident Date')}
                    value={formDate}
                    onChange={setFormDate}
                />

                {/* Notice Comment */}
                <Text style={styles.inputLabel}>{t('notice_details_comments', 'Notice Details / Comments')}</Text>
                <TextInput
                    style={styles.textArea}
                    value={formComment}
                    onChangeText={setFormComment}
                    placeholder={t('describe_notice_placeholder', 'Describe employee feedback, praise, or warning details...')}
                    placeholderTextColor={theme.colors.textSecondary}
                    multiline
                    numberOfLines={4}
                />
            </AppBottomSheet>
        </AppShell>
    );
};

const stylesheet = StyleSheet.create((theme) => ({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md + 4,
        paddingVertical: theme.spacing.md,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    headerTitle: {
        color: theme.colors.textPrimary,
        fontSize: 18,
        fontWeight: '700',
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: theme.spacing.md + 4,
        paddingBottom: theme.spacing.lg,
    },
    subordinateSection: {
        marginBottom: theme.spacing.md,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: theme.spacing.xs,
    },
    subordinateCarousel: {
        flexDirection: 'row',
    },
    subordinateChip: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 4,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.xs + 2,
    },
    subordinateChipSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    subordinateChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    subordinateChipTextSelected: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    categoryBar: {
        flexDirection: 'row',
        gap: theme.spacing.xs + 2,
        marginBottom: theme.spacing.md,
    },
    categoryChip: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    categoryChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    categoryChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    categoryChipTextActive: {
        color: '#FFFFFF',
    },
    loadingContainer: {
        paddingVertical: theme.spacing.xxl,
        alignItems: 'center',
    },
    emptyCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.xl,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.textPrimary,
        marginTop: theme.spacing.md,
    },
    emptySub: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    noticeCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        ...theme.shadows.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    userGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: theme.spacing.xs,
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userAvatarText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    userTextGroup: {
        marginLeft: theme.spacing.sm,
    },
    userName: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    userCode: {
        fontSize: 11,
        color: theme.colors.textSecondary,
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: theme.spacing.xs,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        marginLeft: 4,
    },
    commentText: {
        fontSize: 13,
        color: theme.colors.textPrimary,
        lineHeight: 19,
        marginBottom: theme.spacing.sm + 2,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: theme.spacing.xs + 2,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    creatorText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    dateGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginLeft: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.lg + 4,
        borderTopRightRadius: theme.borderRadius.lg + 4,
        padding: theme.spacing.lg,
        maxHeight: '85%',
    },
    modalScrollContent: {
        paddingBottom: theme.spacing.md,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.textPrimary,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: theme.spacing.xs,
        marginTop: theme.spacing.sm,
    },
    subPickerRow: {
        flexDirection: 'row',
        marginBottom: theme.spacing.xs,
    },
    subPickerChip: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.borderRadius.md,
        backgroundColor: theme.colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginRight: theme.spacing.xs + 2,
    },
    subPickerChipSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    subPickerText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    subPickerTextSelected: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    typeSelectorRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        marginBottom: theme.spacing.xs,
    },
    typeOption: {
        flex: 1,
        paddingVertical: theme.spacing.xs + 4,
        alignItems: 'center',
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    typeOptionSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    typeOptionText: {
        fontSize: 11,
        fontWeight: '700',
        color: theme.colors.textSecondary,
    },
    typeOptionTextSelected: {
        color: '#FFFFFF',
    },
    textArea: {
        backgroundColor: theme.colors.surfaceSubtle,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border,
        color: theme.colors.textPrimary,
        padding: theme.spacing.md,
        height: 100,
        textAlignVertical: 'top',
        marginBottom: theme.spacing.lg,
    },
    submitBtn: {
        backgroundColor: theme.colors.primary,
        minHeight: 48,
        paddingVertical: 12,
        borderRadius: theme.borderRadius.md,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
}));
