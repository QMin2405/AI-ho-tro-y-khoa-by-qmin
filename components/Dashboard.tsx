import React, { useState, useEffect, useMemo } from 'react';
import { StudyPack, Folder } from '../types';
import { useUserStore } from '../store/useUserStore';
import { getBreadcrumbs } from '../utils/helpers';
import { 
    PlusIcon, BookOpenIcon, FolderIcon, FolderPlusIcon, TrashIcon, PencilIcon, ICON_MAP, XIcon 
} from './icons';
import { PACK_COLORS } from '../constants';

const FOLDER_COLORS = [
  { bg: 'bg-amber-100 dark:bg-amber-800/40', text: 'text-amber-800 dark:text-amber-200', border: 'border-amber-600 dark:border-amber-400' },
  { bg: 'bg-blue-100 dark:bg-blue-800/40', text: 'text-blue-800 dark:text-blue-200', border: 'border-blue-600 dark:border-blue-400' },
  { bg: 'bg-green-100 dark:bg-green-800/40', text: 'text-green-800 dark:text-green-200', border: 'border-green-600 dark:border-green-400' },
  { bg: 'bg-pink-100 dark:bg-pink-800/40', text: 'text-pink-800 dark:text-pink-200', border: 'border-pink-600 dark:border-pink-400' },
  { bg: 'bg-indigo-100 dark:bg-indigo-800/40', text: 'text-indigo-800 dark:text-indigo-200', border: 'border-indigo-600 dark:border-indigo-400' },
  { bg: 'bg-teal-100 dark:bg-teal-800/40', text: 'text-teal-800 dark:text-teal-200', border: 'border-teal-600 dark:border-teal-400' },
  { bg: 'bg-red-100 dark:bg-red-800/40', text: 'text-red-800 dark:text-red-200', border: 'border-red-600 dark:border-red-400' },
  { bg: 'bg-purple-100 dark:bg-purple-800/40', text: 'text-purple-800 dark:text-purple-200', border: 'border-purple-600 dark:border-purple-400' },
];

const FOLDER_ICONS = Object.keys(ICON_MAP).filter(key => key !== 'default');
const DASHBOARD_TIPS_SEEN_KEY = 'dashboardTipsSeen';

export const Dashboard = ({ onSelectPack, onCreateNew, onOpenTrash, currentFolderId, onSetCurrentFolderId }: { 
    onSelectPack: (id: string) => void; 
    onCreateNew: () => void;
    onOpenTrash: () => void;
    currentFolderId: string | null;
    onSetCurrentFolderId: (id: string | null) => void;
}) => {
    // Local UI state
    const [selectedPackIds, setSelectedPackIds] = useState<string[]>([]);
    const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
    const [editingFolderName, setEditingFolderName] = useState('');
    const [editingFolderIcon, setEditingFolderIcon] = useState<string | undefined>(undefined);
    const [editingPackId, setEditingPackId] = useState<string | null>(null);
    const [editingPackState, setEditingPackState] = useState({ title: '', color: '', icon: '' });
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);
    const [isRootDropTarget, setIsRootDropTarget] = useState(false);
    const [showTips, setShowTips] = useState(false);

    // Effect to show tips on first visit
    useEffect(() => {
        const tipsSeen = localStorage.getItem(DASHBOARD_TIPS_SEEN_KEY);
        if (!tipsSeen) {
            setShowTips(true);
        }
    }, []);

    // --- Optimized Selectors ---
    
    // Select actions individually. This is performant and ensures correct types.
    const movePacksToFolder = useUserStore(state => state.movePacksToFolder);
    const createFolder = useUserStore(state => state.createFolder);
    const updateFolder = useUserStore(state => state.updateFolder);
    const updateStudyPack = useUserStore(state => state.updateStudyPack);
    const requestSoftDelete = useUserStore(state => state.requestSoftDelete);
    
    // Select all folders for breadcrumb calculation and finding current folder info.
    const allFolders = useUserStore(state => state.folders);

    // Select all study packs for editing logic (to find the original pack).
    const allStudyPacks = useUserStore(state => state.studyPacks);

    // Derive visible packs and folders from the full lists to avoid the (selector, shallow) pattern.
    const visiblePacks = useMemo(
        () => allStudyPacks.filter(p => !p.isDeleted && (p.folderId || null) === currentFolderId),
        [allStudyPacks, currentFolderId]
    );

    const visibleFolders = useMemo(
        () => allFolders.filter(f => !f.isDeleted && (f.parentId || null) === currentFolderId),
        [allFolders, currentFolderId]
    );

    // --- Handlers ---

    const handleDismissTips = () => {
        setShowTips(false);
        localStorage.setItem(DASHBOARD_TIPS_SEEN_KEY, 'true');
    };

    const handleUpdateFolder = (id: string, newName: string, newIcon: string | undefined) => {
        if (editingFolderId === id) { 
            updateFolder(id, newName.trim() || 'Thư mục không tên', newIcon);
            setEditingFolderId(null);
            setEditingFolderName('');
            setEditingFolderIcon(undefined);
        }
    };
    
    const handleUpdatePack = () => {
        if (!editingPackId) return;
        // Use allStudyPacks to find the original pack
        const originalPack = allStudyPacks.find(p => p.id === editingPackId);
        if (!originalPack) return;

        const trimmedTitle = editingPackState.title.trim() || 'Gói không tên';
        const hasChanged = trimmedTitle !== originalPack.title || editingPackState.color !== originalPack.color || editingPackState.icon !== originalPack.icon;
        
        if (hasChanged) {
            updateStudyPack({ ...originalPack, title: trimmedTitle, color: editingPackState.color, icon: editingPackState.icon });
        }
        setEditingPackId(null);
    };

    const handlePackSelection = (packId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const isSelected = selectedPackIds.includes(packId);
        
        if (e.ctrlKey || e.metaKey) {
            setSelectedPackIds(prev => isSelected ? prev.filter(id => id !== packId) : [...prev, packId]);
        } else {
            if (!isSelected) {
                setSelectedPackIds([packId]);
            } else if (selectedPackIds.length === 1 && isSelected) {
                setSelectedPackIds([]);
            }
        }
    };

    const handleDragStart = (e: React.DragEvent, packId: string) => {
        const isClickedItemInSelection = selectedPackIds.includes(packId);
        const packsToDrag = isClickedItemInSelection ? [...selectedPackIds] : [packId];
        e.dataTransfer.setData("packIds", JSON.stringify(packsToDrag));
        
        const dragImage = document.createElement('div');
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        dragImage.style.padding = '8px 12px';
        dragImage.style.backgroundColor = 'rgba(29, 78, 216, 0.9)';
        dragImage.style.color = 'white';
        dragImage.style.borderRadius = '8px';
        dragImage.style.fontWeight = 'bold';
        dragImage.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        dragImage.textContent = `Di chuyển ${packsToDrag.length} mục`;
        document.body.appendChild(dragImage);
        e.dataTransfer.setDragImage(dragImage, 0, 0);
        setTimeout(() => document.body.removeChild(dragImage), 0);
    };

    const handleDrop = (e: React.DragEvent, folderId: string | null) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const packIdsJSON = e.dataTransfer.getData("packIds");
            if (!packIdsJSON) return;
            const parsedData: unknown = JSON.parse(packIdsJSON);
            
            if (Array.isArray(parsedData) && parsedData.every(item => typeof item === 'string')) {
                const packIds = parsedData as string[];
                if (packIds.length > 0) {
                    movePacksToFolder(packIds, folderId);
                }
            }
        } catch (err) {
            console.error("Failed to parse dragged pack IDs:", err);
        }
        setDropTargetId(null);
        setIsRootDropTarget(false);
    };

    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    
    const handleContainerClick = () => {
        if (editingPackId) {
            handleUpdatePack();
        }
        if (editingFolderId) {
            handleUpdateFolder(editingFolderId, editingFolderName, editingFolderIcon);
        }
        setSelectedPackIds([]);
    };

    // --- Render Functions ---

    const renderTipsBox = () => (
        <div className="bg-tip-yellow-light dark:bg-tip-yellow-dark border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 p-4 mb-6 rounded-r-lg relative animate-fade-in">
            <button 
                onClick={handleDismissTips} 
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-yellow-200/50 dark:hover:bg-yellow-700/50"
                aria-label="Đóng mẹo"
            >
                <XIcon className="w-4 h-4" />
            </button>
            <p className="font-bold">✨ Mẹo Pro:</p>
            <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                <li>Giữ <kbd className="font-sans border rounded px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-gray-900/50 dark:border-gray-600">Ctrl</kbd> hoặc <kbd className="font-sans border rounded px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-gray-900/50 dark:border-gray-600">Cmd</kbd> và nhấp chuột để chọn nhiều mục.</li>
                <li><strong>Nhấp đúp</strong> vào một gói học tập hoặc thư mục để mở nhanh.</li>
            </ul>
        </div>
    );

    const renderStudyPack = (pack: StudyPack) => {
        const isEditing = editingPackId === pack.id;
        const currentColor = isEditing ? editingPackState.color : pack.color;
        const currentIconKey = isEditing ? editingPackState.icon : pack.icon;
        
        const packColor = PACK_COLORS.find(c => c.key === currentColor) || PACK_COLORS[0];
        const PackIcon = ICON_MAP[currentIconKey || ''];
        const isSelected = selectedPackIds.includes(pack.id);
        
        const handlePackClick = (e: React.MouseEvent) => {
            e.stopPropagation();
             if (isEditing) return;
            if (e.detail === 2) {
                onSelectPack(pack.id);
            } else {
                handlePackSelection(pack.id, e);
            }
        };

        return (
            <div 
                key={pack.id} 
                draggable={!isEditing} 
                onDragStart={e => handleDragStart(e, pack.id)}
                onClick={handlePackClick} 
                className={`cursor-pointer bg-foreground rounded-xl shadow-lg overflow-hidden group transition-all relative ${!isEditing ? 'hover:-translate-y-1' : ''} ${isSelected ? 'ring-2 ring-brand-primary ring-offset-2 dark:ring-offset-background' : ''}`}
            >
                <div className="absolute top-2 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setEditingPackId(pack.id);
                            setEditingPackState({ title: pack.title, color: pack.color || 'slate', icon: pack.icon || '' });
                        }}
                        aria-label="Chỉnh sửa gói học tập"
                        className="p-1.5 rounded-full text-text-secondary hover:bg-background/80 bg-foreground/50 backdrop-blur-sm"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); requestSoftDelete(pack.id, 'pack'); }}
                        aria-label="Xóa gói học tập"
                        className="p-1.5 ml-1 rounded-full text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/50 bg-foreground/50 backdrop-blur-sm"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className={`h-32 ${packColor.bg} ${packColor.text} flex items-center justify-center transition-colors`}>
                    {isEditing ? (
                        <div className="grid grid-cols-5 gap-1 p-2">
                            {FOLDER_ICONS.map(iconKey => {
                                const IconComponent = ICON_MAP[iconKey];
                                const isSelectedIcon = editingPackState.icon === iconKey;
                                return (
                                    <button
                                        key={iconKey}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={(e) => { e.stopPropagation(); setEditingPackState(s => ({ ...s, icon: iconKey })) }}
                                        className={`p-1.5 rounded-full transition-all ${isSelectedIcon ? 'ring-2 ring-current bg-black/10 dark:bg-white/10' : 'hover:bg-black/10 dark:hover:bg-white/10'}`}
                                    >
                                        <IconComponent className="w-4 h-4" />
                                    </button>
                                )
                            })}
                        </div>
                    ) : (
                         PackIcon ? <PackIcon className="w-16 h-16" /> : <span className="text-4xl">{pack.imageUrl}</span>
                    )}
                </div>
                <div className="p-4">
                     {isEditing ? (
                         <input 
                            type="text"
                            value={editingPackState.title}
                            onChange={(e) => setEditingPackState(s => ({ ...s, title: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleUpdatePack(); if (e.key === 'Escape') setEditingPackId(null); }}
                            onBlur={handleUpdatePack}
                            className="w-full font-bold bg-transparent border-b-2 border-brand-primary focus:outline-none"
                            autoFocus
                            onClick={e => e.stopPropagation()}
                         />
                     ) : (
                        <h3 className="font-bold truncate">{pack.title}</h3>
                     )}
                    <div className="mt-2 h-7 flex items-center">
                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                {PACK_COLORS.map(color => (
                                    <button 
                                        key={color.key}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={(e) => {e.stopPropagation(); setEditingPackState(s => ({...s, color: color.key}))}}
                                        className={`w-6 h-6 rounded-full ${color.bg} ${editingPackState.color === color.key ? 'ring-2 ring-offset-2 dark:ring-offset-foreground ring-current' : ''}`}
                                    ></button>
                                ))}
                            </div>
                        ) : (
                            <>
                                <div className="w-full bg-border rounded-full h-2.5">
                                    <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${pack.progress || 0}%` }}></div>
                                </div>
                                <span className="text-xs font-mono text-text-secondary w-10 text-right">{Math.round(pack.progress || 0)}%</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderFolder = (folder: Folder, index: number) => {
        const isEditing = editingFolderId === folder.id;
        const color = FOLDER_COLORS[index % FOLDER_COLORS.length];
        const FolderDisplayIcon = ICON_MAP[folder.icon || 'default'] || FolderIcon;
        
        return (
            <div 
                key={folder.id} 
                onClick={(e) => { e.stopPropagation(); if (!isEditing) { if (e.detail === 2) { onSetCurrentFolderId(folder.id); } } }}
                onDoubleClick={() => { if (!isEditing) onSetCurrentFolderId(folder.id); }}
                onDrop={(e) => handleDrop(e, folder.id)}
                onDragOver={handleDragOver}
                onDragEnter={() => setDropTargetId(folder.id)}
                onDragLeave={() => setDropTargetId(null)}
                className={`cursor-pointer rounded-xl shadow-lg group transition-all p-6 flex flex-col items-center justify-center text-center aspect-square relative ${
                    dropTargetId === folder.id 
                    ? 'ring-2 ring-brand-primary -translate-y-1 bg-blue-50 dark:bg-blue-900/30' 
                    : `${color.bg} ${color.text} hover:-translate-y-1`
                }`}>
                {!isEditing && (
                    <div className="absolute top-2 right-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setEditingFolderId(folder.id);
                                setEditingFolderName(folder.name);
                                setEditingFolderIcon(folder.icon);
                            }}
                            className="p-1.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
                        >
                            <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); requestSoftDelete(folder.id, 'folder'); }}
                            className="p-1.5 ml-1 rounded-full text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                )}
                <FolderDisplayIcon className="w-16 h-16 mb-2" />
                <div className="w-full mt-2 min-h-[28px] flex items-center justify-center">
                    {isEditing ? (
                        <input
                            type="text"
                            value={editingFolderName}
                            onChange={(e) => setEditingFolderName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateFolder(folder.id, editingFolderName, editingFolderIcon);
                                if (e.key === 'Escape') setEditingFolderId(null);
                            }}
                            onBlur={() => handleUpdateFolder(folder.id, editingFolderName, editingFolderIcon)}
                            className={`w-full text-center bg-transparent border-b-2 ${color.border} focus:outline-none font-bold text-base`}
                            autoFocus
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <h3 className="font-bold truncate">{folder.name}</h3>
                    )}
                </div>
                 {isEditing && (
                    <div className="flex flex-wrap justify-center items-center gap-2 mt-4">
                        {FOLDER_ICONS.map(iconKey => {
                            const IconComponent = ICON_MAP[iconKey];
                            const isSelected = editingFolderIcon === iconKey;
                            return (
                                <button
                                    key={iconKey}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={(e) => { e.stopPropagation(); setEditingFolderIcon(iconKey); }}
                                    className={`p-2 rounded-full transition-colors ${isSelected ? `ring-2 ring-offset-2 dark:ring-offset-background ${color.border}` : ''} hover:bg-slate-200/50 dark:hover:bg-slate-700/50`}
                                >
                                    <IconComponent className="w-5 h-5" />
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        );
    }
    
    // --- Main Render Logic ---
    const currentFolder = allFolders.find(f => f.id === currentFolderId);
    
    // RENDER FOLDER VIEW
    if (currentFolderId && currentFolder) {
        const breadcrumbs = getBreadcrumbs(allFolders, currentFolderId);
        // We use the already-filtered visibleFolders and visiblePacks
        const packsInFolder = visiblePacks;
        const subfolders = visibleFolders;
        const isEditingCurrentFolder = editingFolderId === currentFolderId;
        const color = FOLDER_COLORS[allFolders.findIndex(f => f.id === currentFolderId) % FOLDER_COLORS.length];
        
        return (
             <div className="container mx-auto p-6 animate-fade-in" onClick={handleContainerClick}>
                <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary mb-6">
                    <button
                        onClick={(e) => { e.stopPropagation(); onSetCurrentFolderId(null); }}
                        onDrop={(e) => handleDrop(e, null)}
                        onDragOver={handleDragOver}
                        onDragEnter={() => setIsRootDropTarget(true)}
                        onDragLeave={() => setIsRootDropTarget(false)}
                        className={`p-1 -m-1 rounded-md transition-colors ${isRootDropTarget ? 'bg-blue-100 dark:bg-blue-900/50 text-brand-primary font-bold ring-2 ring-brand-primary' : 'hover:text-brand-primary'}`}
                    >
                        Trang chủ
                    </button>
                    {breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={crumb.id}>
                            <span className="text-slate-400 dark:text-slate-600">/</span>
                            {index === breadcrumbs.length - 1 ? (
                                <span className="font-bold text-text-primary" onClick={(e) => e.stopPropagation()}>{crumb.name}</span>
                            ) : (
                                <button onClick={(e) => { e.stopPropagation(); onSetCurrentFolderId(crumb.id); }} className="hover:text-brand-primary">{crumb.name}</button>
                            )}
                        </React.Fragment>
                    ))}
                </div>
                
                <div className="flex justify-between items-center mb-8" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-4 text-2xl font-bold text-text-primary group">
                         {isEditingCurrentFolder ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text" value={editingFolderName}
                                    onChange={(e) => setEditingFolderName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleUpdateFolder(currentFolder.id, editingFolderName, editingFolderIcon);
                                        if (e.key === 'Escape') setEditingFolderId(null);
                                    }}
                                    onBlur={() => handleUpdateFolder(currentFolder.id, editingFolderName, editingFolderIcon)}
                                    className={`text-2xl font-bold bg-transparent border-b-2 ${color.border} focus:outline-none`}
                                    autoFocus
                                />
                            </div>
                        ) : (
                            <h2 className="flex items-center gap-3">
                                <FolderIcon className="w-8 h-8 text-amber-500"/>
                                {currentFolder.name}
                            </h2>
                        )}
                        {!isEditingCurrentFolder && (
                            <button
                                onClick={() => {
                                    setEditingFolderId(currentFolder.id);
                                    setEditingFolderName(currentFolder.name);
                                    setEditingFolderIcon(currentFolder.icon);
                                }}
                                className="p-1 rounded-full text-text-secondary/50 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                            >
                                <PencilIcon className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                     <button onClick={(e) => { e.stopPropagation(); createFolder(currentFolderId); }} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors shadow-sm">
                        <FolderPlusIcon className="w-5 h-5" />
                        <span>Tạo Thư mục con</span>
                    </button>
                </div>
                
                {showTips && renderTipsBox()}

                 {subfolders.length > 0 && (
                    <div className="mb-10">
                         <h3 className="text-xl font-bold mb-4 text-text-primary">Thư mục con</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {subfolders.map(renderFolder)}
                        </div>
                    </div>
                 )}

                 <div className="mb-10">
                     <h3 className="text-xl font-bold mb-4 text-text-primary">Gói học tập</h3>
                    {packsInFolder.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {packsInFolder.map(renderStudyPack)}
                        </div>
                    ) : (
                         <div className="text-center py-12 px-6 bg-background rounded-xl border-2 border-dashed border-border">
                            <BookOpenIcon className="w-12 h-12 mx-auto text-text-secondary/50 mb-2" />
                            <p className="text-text-secondary font-semibold">Thư mục này trống.</p>
                             <p className="text-text-secondary/80 text-sm">Thả các gói học tập vào đây hoặc tạo một gói mới.</p>
                        </div>
                    )}
                 </div>
            </div>
        );
    }
    
    // RENDER ROOT VIEW
    // When currentFolderId is null, visiblePacks/Folders contain the root items.
    const rootPacks = visiblePacks;
    const rootFolders = visibleFolders;

    return (
    <div className="container mx-auto p-6" onClick={handleContainerClick}>
        <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                <button onClick={onCreateNew} className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg font-semibold hover:opacity-90 transition-opacity shadow-sm">
                    <PlusIcon className="w-5 h-5" />
                    <span>Tạo Gói Mới</span>
                </button>
                <button onClick={() => createFolder(null)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors shadow-sm">
                    <FolderPlusIcon className="w-5 h-5" />
                    <span>Tạo Thư Mục</span>
                </button>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onOpenTrash(); }} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-foreground font-semibold text-sm text-text-secondary">
                <TrashIcon className="w-5 h-5" />
                <span>Thùng rác</span>
            </button>
        </div>

        {showTips && renderTipsBox()}

        <div className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-text-primary">Gói học tập</h2>
            {rootPacks.length === 0 ? (
                <div className="text-center py-12 px-6 bg-background rounded-xl border-2 border-dashed border-border">
                    <BookOpenIcon className="w-12 h-12 mx-auto text-text-secondary/50 mb-2" />
                    <p className="text-text-secondary font-semibold">Chưa có gói học tập nào.</p>
                    <p className="text-text-secondary/80 text-sm">Nhấn "Tạo Gói Mới" để bắt đầu.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {rootPacks.map(renderStudyPack)}
                </div>
            )}
        </div>

        <div>
            <h2 className="text-2xl font-bold mb-4 text-text-primary">Thư mục</h2>
            {rootFolders.length === 0 ? (
                 <div className="text-center py-12 px-6 bg-background rounded-xl border-2 border-dashed border-border">
                    <FolderIcon className="w-12 h-12 mx-auto text-text-secondary/50 mb-2" />
                    <p className="text-text-secondary font-semibold">Chưa có thư mục nào.</p>
                    <p className="text-text-secondary/80 text-sm">Nhấn "Tạo Thư Mục" để sắp xếp các gói học tập của bạn.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {rootFolders.map(renderFolder)}
                </div>
            )}
        </div>
    </div>
)};