export interface TimelineNode {
    key: string;
    label: string;
    time: string | null;
    active: boolean;
    isCurrent: boolean;
}

export interface QuickActionItem {
    id: string;
    title: string;
    subtitle: string;
    icon: any;
    iconColor: string;
    bgColor: string;
    route: string;
}

export interface AnnouncementItem {
    id: string | number;
    title?: string;
    pwa_title?: string;
    summary?: string;
    content?: string;
    description?: string;
    created_at?: string;
    pwa_display_type?: string;
    is_pinned?: boolean;
    is_urgent?: boolean;
}

export interface CelebrationItem {
    message?: string;
    title?: string;
    milestone?: string;
}
