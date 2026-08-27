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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText as Text } from '../../components/AppText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { noticeApi, Subordinate, SubordinateNotice } from '../../api/notice';
import { useAppTheme } from '../../context/ThemeContext';
import { NativeDatePickerField } from '../../components/common/NativeDatePickerField';
import { AppHeader } from '../../components/common/AppHeader';
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
import { format } from 'date-fns';

const CATEGORY_FILTERS = [
    { id: 'all', label: 'All Notices' },
    { id: 'positive', label: 'Positive' },
    { id: 'negative', label: 'Warnings' },
    { id: 'progress', label: 'Progress' },
];

export const SubordinateNoticesScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const { isDark } = useAppTheme();
    const { theme } = useUnistyles();
    const styles = stylesheet;

    const [subordinates, setSubordinates] = useState<Subordinate[]>([]);
    const [selectedSubordinateId, setSelectedSubordinateId] = useState<number | null>(null);

    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [notices, setNotices] = useState<SubordinateNotice[]>([]);

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    // Create Notice Modal State
    const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
    const [formSubordinateId, setFormSubordinateId] = useState<number | null>(null);
    const [formType, setFormType] = useState<'positive' | 'negative' | 'progress'>('positive');
    const [formDate, setFormDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [formComment, setFormComment] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    useEffect(() => {
        loadWorkspaceData();
    }, [selectedSubordinateId, selectedCategory]);

    const loadWorkspaceData = async () => {
        try {
            setIsLoading(true);

            // Fetch Subordinates
            const subsRes = await noticeApi.getSubordinates().catch(() => []);
            if (Array.isArray(subsRes)) setSubordinates(subsRes);

            // Fetch Notices
            const params: any = {};
            if (selectedSubordinateId) params.employee_id = selectedSubordinateId;
            if (selectedCategory !== 'all') params.type = selectedCategory;

            const noticeRes = await noticeApi.getNotices(params).catch(() => null);
            const list = Array.isArray(noticeRes?.data) ? noticeRes.data : Array.isArray(noticeRes) ? noticeRes : [];

            setNotices(list);
        } catch (error) {
            console.warn('Failed to load subordinate notices:', error);
            // Fallback demo data
            setSubordinates([
                { id: 18, full_name: 'David Miller', employee_id: 'EMP-0045' },
                { id: 22, full_name: 'Sarah Connor', employee_id: 'EMP-0089' },
            ]);

            setNotices([
                {
                    id: 34,
                    employee_id: 18,
                    type: 'positive',
                    notice_date: '2026-07-22',
                    comment: 'Exceeded monthly sales target by 25% and received outstanding customer review.',
                    employee: { id: 18, full_name: 'David Miller', employee_id: 'EMP-0045' },
                    creator: { id: 5, full_name: 'Jane Manager' },
                },
                {
                    id: 35,
                    employee_id: 22,
                    type: 'negative',
                    notice_date: '2026-07-20',
                    comment: 'Late arrival by 45 minutes for shift without prior supervisor notice.',
                    employee: { id: 22, full_name: 'Sarah Connor', employee_id: 'EMP-0089' },
                    creator: { id: 5, full_name: 'Jane Manager' },
                },
            ]);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadWorkspaceData();
    };

    const handleCreateNotice = async () => {
        if (!formSubordinateId) {
            Alert.alert('Required', 'Please select a subordinate team member.');
            return;
        }
        if (!formComment.trim()) {
            Alert.alert('Required', 'Please provide detailed notice comments.');
            return;
        }

        setIsSubmitting(true);
        try {
            await noticeApi.createNotice({
                employee_id: formSubordinateId,
                type: formType,
                notice_date: formDate,
                comment: formComment,
            });

            Alert.alert('Notice Recorded', 'Subordinate notice logged successfully.');
            setCreateModalVisible(false);
            setFormComment('');
            loadWorkspaceData();
        } catch (err: any) {
            Alert.alert('Error', err?.message || 'Failed to record notice.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getTypeStyle = (type: string) => {
        switch (type) {
            case 'positive':
                return {
                    bg: 'rgba(16, 185, 129, 0.1)',
                    border: 'rgba(16, 185, 129, 0.2)',
                    color: theme.colors.status.success,
                    label: 'POSITIVE CONDUCT',
                    Icon: Award,
                };
            case 'negative':
                return {
                    bg: 'rgba(239, 68, 68, 0.1)',
                    border: 'rgba(239, 68, 68, 0.2)',
                    color: theme.colors.status.danger,
                    label: 'WARNING / NOTICE',
                    Icon: AlertCircle,
                };
            default:
                return {
                    bg: 'rgba(37, 99, 235, 0.1)',
                    border: 'rgba(37, 99, 235, 0.2)',
                    color: theme.colors.primary,
                    label: 'PROGRESS / MILESTONE',
                    Icon: TrendingUp,
                };
        }
    };

    return (
        <View style={[styles.safeArea, { paddingTop: insets.top }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Standard Native Header Bar */}
            <AppHeader
                title="Team Subordinate Notices"
                onBack={() => navigation.goBack()}
                rightActions={[
                    {
                        icon: <Plus color={theme.colors.brand} size={20} />,
                        onPress: () => {
                            if (subordinates.length > 0 && !formSubordinateId) {
                                setFormSubordinateId(subordinates[0].id);
                            }
                            setCreateModalVisible(true);
                        },
                        accessibilityLabel: 'Create notice',
                    },
                ]}
            />

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
                }
            >
                {/* Horizontal Subordinates Selector */}
                {subordinates.length > 0 && (
                    <View style={styles.subordinateSection}>
                        <Text style={styles.sectionLabel}>Team Members ({subordinates.length})</Text>
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
                                    All Subordinates
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
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                ) : notices.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <FileText color={theme.colors.textSecondary} size={44} />
                        <Text style={styles.emptyTitle}>No Team Notices Recorded</Text>
                        <Text style={styles.emptySub}>No behavioral or progress notices found for this selection.</Text>
                    </View>
                ) : (
                    notices.map((item) => {
                        const typeObj = getTypeStyle(item.type);
                        const TypeIcon = typeObj.Icon;

                        const employeeName = item.employee?.full_name || 'Subordinate';
                        const creatorName = item.creator?.full_name || 'Manager';

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
                                    <Text style={styles.creatorText}>Logged by {creatorName}</Text>
                                    <View style={styles.dateGroup}>
                                        <Calendar color={theme.colors.textSecondary} size={12} />
                                        <Text style={styles.dateText}>{item.notice_date || item.created_at || 'Recent'}</Text>
                                    </View>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>

            {/* Log New Notice Modal */}
            <Modal visible={createModalVisible} transparent animationType="fade">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setCreateModalVisible(false)}
                >
                    <View style={styles.modalSheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Log Subordinate Notice</Text>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                                <X color={theme.colors.textPrimary} size={20} />
                            </TouchableOpacity>
                        </View>

                        {/* Select Subordinate */}
                        <Text style={styles.inputLabel}>Target Team Member</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subPickerRow}>
                            {subordinates.map((sub) => {
                                const isSelected = formSubordinateId === sub.id;
                                return (
                                    <TouchableOpacity
                                        key={sub.id}
                                        style={[styles.subPickerChip, isSelected && styles.subPickerChipSelected]}
                                        onPress={() => setFormSubordinateId(sub.id)}
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
                        <Text style={styles.inputLabel}>Notice Type</Text>
                        <View style={styles.typeSelectorRow}>
                            {(['positive', 'negative', 'progress'] as const).map((t) => {
                                const isSelected = formType === t;
                                return (
                                    <TouchableOpacity
                                        key={t}
                                        style={[styles.typeOption, isSelected && styles.typeOptionSelected]}
                                        onPress={() => setFormType(t)}
                                    >
                                        <Text
                                            style={[
                                                styles.typeOptionText,
                                                isSelected && styles.typeOptionTextSelected,
                                            ]}
                                        >
                                            {t.toUpperCase()}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Incident / Notice Date */}
                        <NativeDatePickerField
                            label="Notice / Incident Date"
                            value={formDate}
                            onChange={setFormDate}
                        />

                        {/* Notice Comment */}
                        <Text style={styles.inputLabel}>Notice Details / Comments</Text>
                        <TextInput
                            style={styles.textArea}
                            value={formComment}
                            onChangeText={setFormComment}
                            placeholder="Describe employee feedback, praise, or warning details..."
                            placeholderTextColor={theme.colors.textSecondary}
                            multiline
                            numberOfLines={4}
                        />

                        <TouchableOpacity
                            style={styles.submitBtn}
                            onPress={handleCreateNotice}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFFFFF" />
                            ) : (
                                <Text style={styles.submitBtnText}>Record Subordinate Notice</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
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
        paddingBottom: theme.spacing.xl + 40,
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
        height: 50,
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
