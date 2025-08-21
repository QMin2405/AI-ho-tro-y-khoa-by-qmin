

import { Folder, UserData } from '../types';
import { LEVEL_THRESHOLDS, LEVEL_NAMES } from '../constants';

export const getLevelInfo = (xp: number) => {
    let level = 0;
    while (level < LEVEL_THRESHOLDS.length - 1 && xp >= LEVEL_THRESHOLDS[level + 1]) {
        level++;
    }
    const currentLevelXP = LEVEL_THRESHOLDS[level];
    const nextLevelXP = LEVEL_THRESHOLDS[level + 1] || xp;
    const progress = nextLevelXP > currentLevelXP ? ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100 : 100;
    const levelName = LEVEL_NAMES[level] || 'Huyền thoại Y khoa';
    return { level: level + 1, name: levelName, progress, currentLevelXP, nextLevelXP };
};

export const exportUserData = (userData: UserData) => {
    const dataStr = JSON.stringify(userData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedName = userData.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    link.download = `smartmedtutor_backup_${sanitizedName || 'user'}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

export const getBreadcrumbs = (folders: Folder[], folderId: string | null): Folder[] => {
    if (!folderId) return [];
    const breadcrumbs: Folder[] = [];
    let currentId: string | null | undefined = folderId;
    while (currentId) {
        const currentFolder = folders.find(f => f.id === currentId);
        if (currentFolder) {
            breadcrumbs.unshift(currentFolder);
            currentId = currentFolder.parentId;
        } else {
            currentId = null;
        }
    }
    return breadcrumbs;
};