import React, { useEffect, useState, useRef } from 'react';
import { User, AttendanceRecord, AttendanceStatus, Notification, ParentStudentLink, UserRole } from '../types';
import { StorageService } from '../services/storageService';
import { Bell, MapPin, PhoneCall, MessageSquare, ShieldAlert, LogIn, LogOut, BatteryCharging, X, Loader2, QrCode, ScanLine, ShieldCheck, Link2, CalendarClock, Phone, FileText, Award, Calculator, FlaskConical, Languages, Siren, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { getDefaultAvatarUrl } from '../utils/avatarUtils';

type CardSkin = 'nebula' | 'sunset' | 'ocean_depths' | 'magma' | 'midnight_city' | 'cyber_grid' | 'royal_gold' | 'dark_matter';

const getFrameKey = (studentId: string) => `safepath_student_frame_${studentId}`;
const getSkinKey = (studentId: string) => `safepath_student_skin_${studentId}`;
const getAppearanceUpdatedKey = (studentId: string) => `safepath_student_appearance_updated_${studentId}`;
const getActiveStudentKey = (parentId: string) => `safepath_parent_active_student_${parentId}`;

const frameStyles: Record<string, string> = {
    classic: 'border-2 border-white/20',
    neon: 'border-2 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]',
    aurora: 'border-2 border-violet-400 shadow-[0_0_15px_rgba(167,139,250,0.5)]',
    cyber: 'border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.6)]',
    royal: 'border-2 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)]',
    glitch: 'border-2 border-pink-500 shadow-[2px_0_0_rgba(0,255,255,0.7),-2px_0_0_rgba(255,0,0,0.7)]',
    cosmic: 'border-2 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.8)]',
    nature: 'border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)]',
    fire: 'border-2 border-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.8)] animate-pulse',
    legend: 'border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse'
};

// New skin styles - now using CSS classes that match StudentDashboard
// The actual gradient styles are defined in the inline <style> tag below
const skinStyles: Record<string, string> = {
    // New skin classes (used by StudentDashboard)
    'skin-nebula': 'skin-nebula',
    'skin-sunset': 'skin-sunset',
    'skin-ocean': 'skin-ocean',
    'skin-midnight': 'skin-midnight',
    // Map old names to new classes for backwards compatibility
    'nebula': 'skin-nebula',
    'sunset': 'skin-sunset',
    'ocean_depths': 'skin-ocean',
    'ocean': 'skin-ocean',
    'midnight_city': 'skin-midnight',
    'midnight': 'skin-midnight',
    // Legacy skins that don't have new equivalents - map to closest new skin
    'magma': 'skin-sunset',
    'cyber_grid': 'skin-ocean',
    'royal_gold': 'skin-sunset',
    'dark_matter': 'skin-midnight',
};

// Helper to get the correct skin style class
const getSkinStyleClass = (skinId: string): string => {
    // Strip 'skin-' prefix if present to normalize
    const key = skinId.startsWith('skin-') ? skinId : skinId;
    return skinStyles[key] || 'skin-nebula';
};

export const ParentDashboard: React.FC<{ user: User }> = ({ user }) => {
    const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.ABSENT);
    const [lastEvent, setLastEvent] = useState<AttendanceRecord | null>(null);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [links, setLinks] = useState<ParentStudentLink[]>([]);
    const [headerShadow, setHeaderShadow] = useState<{ enabled: boolean; alpha: number }>({ enabled: false, alpha: 0 });
    const [linkedStudent, setLinkedStudent] = useState<User | null>(null);
    const [linkedProfiles, setLinkedProfiles] = useState<User[]>([]);
    const [activeFrame, setActiveFrame] = useState<string>('classic');
    const [activeSkin, setActiveSkin] = useState<CardSkin>('nebula');
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [codeInput, setCodeInput] = useState('');
    const [linkError, setLinkError] = useState('');
    const [isLinking, setIsLinking] = useState(false);
    const [linkSource, setLinkSource] = useState<'manual' | 'qr' | 'upload'>('manual');
    const [showUnlinkModal, setShowUnlinkModal] = useState(false);
    const [unlinkStudentId, setUnlinkStudentId] = useState<string | null>(null);
    const [isUnlinking, setIsUnlinking] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);
    const [showInviteScanner, setShowInviteScanner] = useState(false);
    const [scannerStatus, setScannerStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
    const [scannerError, setScannerError] = useState('');
    const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'error'>('idle');
    const [hasHydratedLinks, setHasHydratedLinks] = useState(false);
    const [toast, setToast] = useState<{ tone: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isNotifExpanded, setIsNotifExpanded] = useState(false);
    const [isBellAnimating, setIsBellAnimating] = useState(false);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inviteFileRef = useRef<HTMLInputElement | null>(null);
    const toastTimeoutRef = useRef<number | null>(null);
    const autoLinkRef = useRef(false);
    const lastAttendanceEventRef = useRef<string | null>(null);
    const notifPanelRef = useRef<HTMLDivElement | null>(null);
    const bellButtonRef = useRef<HTMLButtonElement | null>(null);
    const notificationIdsRef = useRef<string[]>([]);
    const scanCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const headerShadowDebounceRef = useRef<number | null>(null);
    const cardContainerRef = useRef<HTMLDivElement>(null);
    const scrollTimeoutRef = useRef<number | null>(null);
    const { resolvedTheme, toggleTheme } = useTheme();
    const navigate = useNavigate();

    useEffect(() => {
        const scrollContainer = document.getElementById('sp-scroll-container');
        const getScrollTop = () => {
            if (scrollContainer && scrollContainer instanceof HTMLElement) return scrollContainer.scrollTop;
            return window.scrollY || document.documentElement.scrollTop || 0;
        };

        const update = () => {
            const y = getScrollTop();
            const enabled = y > 0;
            const progress = enabled ? Math.min(y / 120, 1) : 0;
            const alpha = enabled ? Number((progress * 0.16).toFixed(4)) : 0;
            setHeaderShadow(prev => {
                if (prev.enabled === enabled && prev.alpha === alpha) return prev;
                return { enabled, alpha };
            });
        };

        const onScroll = () => {
            if (!headerShadowDebounceRef.current) {
                update();
            }
            if (headerShadowDebounceRef.current) return;
            headerShadowDebounceRef.current = window.setTimeout(() => {
                headerShadowDebounceRef.current = null;
                update();
            }, 100);
        };

        update();
        const scrollTarget: any = scrollContainer || window;
        scrollTarget.addEventListener('scroll', onScroll, { passive: true });

        const handleOpenScanner = () => {
            setLinkSource('qr');
            setShowLinkModal(false);
            setShowInviteScanner(true);
        };
        window.addEventListener('open-link-student-scanner', handleOpenScanner);

        return () => {
            scrollTarget.removeEventListener('scroll', onScroll);
            window.removeEventListener('open-link-student-scanner', handleOpenScanner);
            if (headerShadowDebounceRef.current) {
                window.clearTimeout(headerShadowDebounceRef.current);
                headerShadowDebounceRef.current = null;
            }
        };
    }, []);

    const normalizeInviteCode = (raw: string) => {
        const input = (raw || '').trim();
        if (!input) return '';
        const inviteRegex = /[A-Z0-9]{8}-[A-Z0-9]{6}/i;
        const directMatch = input.match(inviteRegex);
        if (directMatch) return directMatch[0].toUpperCase();
        if (input.includes('://')) {
            try {
                const url = new URL(input);
                const candidates = [
                    url.searchParams.get('code'),
                    url.searchParams.get('invite'),
                    url.searchParams.get('c'),
                    url.hash ? url.hash.slice(1) : null,
                    url.pathname
                ];
                for (const candidate of candidates) {
                    if (!candidate) continue;
                    const m = String(candidate).match(inviteRegex);
                    if (m) return m[0].toUpperCase();
                }
            } catch (e) {
                // Ignore invalid URLs
            }
        }
        return '';
    };

    // Auto-sync appearance preferences
    useEffect(() => {
        if (!linkedStudent?.id) return;

        const studentId = linkedStudent.id;

        // Try local storage first for instant display
        const localFrame = localStorage.getItem(getFrameKey(studentId));
        const localSkin = localStorage.getItem(getSkinKey(studentId));

        if (localFrame) setActiveFrame(localFrame);
        if (localSkin) setActiveSkin(localSkin as CardSkin);

        // If no local storage, reset to defaults
        if (!localFrame && !localSkin) {
            setActiveFrame('classic');
            setActiveSkin('nebula');
        }

        // Subscribe to realtime updates from Firestore
        const unsubscribe = StorageService.subscribeStudentAppearancePrefs(
            studentId,
            (prefs) => {
                if (prefs.frameId) {
                    setActiveFrame(prefs.frameId);
                    localStorage.setItem(getFrameKey(studentId), prefs.frameId);
                }
                if (prefs.skinId) {
                    setActiveSkin(prefs.skinId as CardSkin);
                    localStorage.setItem(getSkinKey(studentId), prefs.skinId);
                }
            },
            () => {
                // Silently handle subscription errors
            }
        );

        // Also do a one-time fetch as a fallback for the initial load
        // in case the subscription doesn't fire immediately
        StorageService.getStudentAppearancePrefsFromServer(studentId)
            .then((prefs) => {
                if (prefs) {
                    if (prefs.frameId) {
                        setActiveFrame(prefs.frameId);
                        localStorage.setItem(getFrameKey(studentId), prefs.frameId);
                    }
                    if (prefs.skinId) {
                        setActiveSkin(prefs.skinId as CardSkin);
                        localStorage.setItem(getSkinKey(studentId), prefs.skinId);
                    }
                }
            })
            .catch(() => {
                // Silently handle fetch errors
            });

        return () => unsubscribe();
    }, [linkedStudent?.id]);

    const showToast = (tone: 'success' | 'error' | 'info', message: string) => {
        setToast({ tone, message });
        if (toastTimeoutRef.current) {
            window.clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2400);
    };

    const playSuccessSound = () => {
        try {
            const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (!Ctx) return;
            const ctx = new Ctx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = 784;
            gain.gain.value = 0.05;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
            osc.onended = () => {
                ctx.close().catch(() => {
                    return;
                });
            };
        } catch {
            return;
        }
    };

    const handleInviteQrUpload = async (file: File) => {
        try {
            setLinkError('');
            setScannerError('');
            setScannerStatus('scanning');
            showToast('info', 'Reading QR image…');
            const Detector = (window as any).BarcodeDetector;
            if (!Detector) {
                setScannerStatus('error');
                setScannerError('QR detection is not supported on this device. Please enter the code manually.');
                setLinkError('QR detection is not supported on this device. Please enter the code manually.');
                showToast('error', 'QR upload not supported on this device');
                return;
            }
            const detector = new Detector({ formats: ['qr_code'] });
            const bitmap = await createImageBitmap(file);
            const codes = await detector.detect(bitmap);
            bitmap.close();
            const raw = codes && codes.length > 0 ? codes[0].rawValue || '' : '';
            const nextCode = raw ? normalizeInviteCode(String(raw)) : '';
            if (!nextCode) {
                setScannerStatus('error');
                setScannerError('No invite QR detected. Try another photo or enter the code manually.');
                setLinkError('No invite QR detected. Try another photo or enter the code manually.');
                showToast('error', 'No invite QR detected');
                return;
            }
            setCodeInput(nextCode);
            setScannerStatus('success');
            showToast('success', 'QR detected');
        } catch {
            setScannerStatus('error');
            setScannerError('Unable to read QR code from that image. Try another photo or enter the code manually.');
            setLinkError('Unable to read QR code. Try another photo or enter the code manually.');
            showToast('error', 'Could not read QR from that image');
        }
    };

    const openInviteQrUpload = () => {
        setLinkError('');
        setScannerError('');
        setScannerStatus('idle');
        setShowInviteScanner(false);
        setLinkSource('upload');
        inviteFileRef.current?.click();
    };

    const studentPhoto = linkedStudent?.avatarUrl || getDefaultAvatarUrl(linkedStudent?.name || linkedStudent?.id || 'student', UserRole.STUDENT);

    useEffect(() => {
        setHasHydratedLinks(false);
        setLinks([]);
        setLinkedProfiles([]);
        setLinkedStudent(null);
        setNotifications([]);
        setActiveFrame('classic');
        setActiveSkin('nebula');

        if (navigator.onLine) {
            setSyncState('syncing');
            return;
        }

        const l = StorageService.getLinkedStudents(user.id);
        setLinks(l);
        const profiles = l
            .map((link) => StorageService.getUserProfile(link.studentId))
            .filter((p) => p) as User[];
        setLinkedProfiles(profiles);
        let current = linkedStudent || null;
        if (!current && profiles.length > 0) {
            const activeKey = getActiveStudentKey(user.id);
            const storedActiveId = localStorage.getItem(activeKey);
            const fromStorage = storedActiveId ? profiles.find((p) => p.id === storedActiveId) || null : null;
            current = fromStorage || profiles[0] || null;
        }
        if (!linkedStudent && current) {
            setLinkedStudent(current);
        }
        if (current) {
            const frame = localStorage.getItem(getFrameKey(current.id));
            const skin = localStorage.getItem(getSkinKey(current.id));
            setActiveFrame(frame || 'classic');
            setActiveSkin((skin as CardSkin) || 'nebula');
        }
        const allNotifs = StorageService.getNotifications();
        const filtered = current ? allNotifs.filter((n) => !n.studentId || n.studentId === current.id) : allNotifs;
        setNotifications(filtered);
        setHasHydratedLinks(true);
    }, [user.id]);

    useEffect(() => {
        setSyncState('syncing');
        const unsubscribe = StorageService.subscribeLinkedStudents(
            user.id,
            async (serverLinks) => {
                localStorage.setItem(
                    'safepath_parent_links',
                    JSON.stringify(
                        serverLinks.reduce((acc, link) => {
                            acc[link.id] = link;
                            return acc;
                        }, {} as Record<string, ParentStudentLink>)
                    )
                );
                setLinks(serverLinks);
                const profiles = await Promise.all(
                    serverLinks.map(async (link) => {
                        const fromServer = await StorageService.getUserProfileFromServer(link.studentId);
                        if (fromServer) {
                            StorageService.saveUserProfile(fromServer);
                            return fromServer;
                        }
                        return StorageService.getUserProfile(link.studentId);
                    })
                );
                const nextProfiles = profiles.filter((p) => p) as User[];
                setLinkedProfiles(nextProfiles);
                let current = linkedStudent || null;
                if (!current && nextProfiles.length > 0) {
                    const activeKey = getActiveStudentKey(user.id);
                    const storedActiveId = localStorage.getItem(activeKey);
                    const fromStorage = storedActiveId ? nextProfiles.find((p) => p.id === storedActiveId) || null : null;
                    current = fromStorage || nextProfiles[0] || null;
                }
                if (current && (!linkedStudent || linkedStudent.id !== current.id)) {
                    setLinkedStudent(current);
                }
                if (current) {
                    const frame = localStorage.getItem(getFrameKey(current.id));
                    const skin = localStorage.getItem(getSkinKey(current.id));
                    setActiveFrame(frame || 'classic');
                    setActiveSkin((skin as CardSkin) || 'nebula');
                }
                const allNotifs = StorageService.getNotifications();
                const filtered = current ? allNotifs.filter((n) => !n.studentId || n.studentId === current.id) : allNotifs;
                setNotifications(filtered);
                setHasHydratedLinks(true);
                setSyncState('idle');
            },
            () => {
                const l = StorageService.getLinkedStudents(user.id);
                setLinks(l);
                const profiles = l
                    .map((link) => StorageService.getUserProfile(link.studentId))
                    .filter((p) => p) as User[];
                setLinkedProfiles(profiles);
                let current = linkedStudent || null;
                if (!current && profiles.length > 0) {
                    const activeKey = getActiveStudentKey(user.id);
                    const storedActiveId = localStorage.getItem(activeKey);
                    const fromStorage = storedActiveId ? profiles.find((p) => p.id === storedActiveId) || null : null;
                    current = fromStorage || profiles[0] || null;
                }
                if (current && (!linkedStudent || linkedStudent.id !== current.id)) {
                    setLinkedStudent(current);
                }
                if (current) {
                    const frame = localStorage.getItem(getFrameKey(current.id));
                    const skin = localStorage.getItem(getSkinKey(current.id));
                    setActiveFrame(frame || 'classic');
                    setActiveSkin((skin as CardSkin) || 'nebula');
                }
                const allNotifs = StorageService.getNotifications();
                const filtered = current ? allNotifs.filter((n) => !n.studentId || n.studentId === current.id) : allNotifs;
                setNotifications(filtered);
                setHasHydratedLinks(true);
                setSyncState('error');
                showToast('error', 'Unable to sync linked students');
            }
        );
        return () => unsubscribe();
    }, [user.id]);

    useEffect(() => {
        if (!linkedStudent) return;
        const unsubscribe = StorageService.subscribeAttendanceLatest(
            linkedStudent.id,
            (payload) => {
                setLastEvent({
                    id: payload.lastEventId || `latest_${linkedStudent.id}`,
                    studentId: linkedStudent.id,
                    timestamp: payload.timestamp,
                    type: payload.lastType,
                    synced: true
                });
                setStatus(payload.lastType === 'LOGIN' ? AttendanceStatus.PRESENT : AttendanceStatus.DEPARTED);
                if (payload.lastEventId && payload.lastEventId !== lastAttendanceEventRef.current) {
                    lastAttendanceEventRef.current = payload.lastEventId;
                    const title = `Attendance: ${payload.lastType}`;
                    const message = `${linkedStudent.name} has ${payload.lastType === 'LOGIN' ? 'arrived at' : 'left'} Northridge Academy.`;
                    const allNotifs = StorageService.getNotifications();
                    if (!allNotifs.find((n) => n.id === payload.lastEventId)) {
                        StorageService.saveNotification({
                            id: payload.lastEventId,
                            title,
                            message,
                            timestamp: payload.timestamp,
                            type: 'ATTENDANCE',
                            read: false,
                            studentId: linkedStudent.id,
                            parentId: user.id
                        });
                        const filtered = allNotifs
                            .concat([
                                {
                                    id: payload.lastEventId,
                                    title,
                                    message,
                                    timestamp: payload.timestamp,
                                    type: 'ATTENDANCE' as const,
                                    read: false,
                                    studentId: linkedStudent.id,
                                    parentId: user.id
                                }
                            ])
                            .filter((n) => !n.studentId || n.studentId === linkedStudent.id);
                        setNotifications(filtered);
                        playSuccessSound();
                    }
                }
            },
            () => {
                showToast('error', 'Unable to sync attendance updates');
            }
        );
        return () => unsubscribe();
    }, [linkedStudent?.id]);

    useEffect(() => {
        if (!linkedStudent) return;
        const unsubscribe = StorageService.subscribeStudentAppearancePrefs(
            linkedStudent.id,
            (prefs) => {
                const localUpdatedAtMs = Number(localStorage.getItem(getAppearanceUpdatedKey(linkedStudent.id)) || '0') || 0;
                if (prefs.updatedAtMs < localUpdatedAtMs) return;
                localStorage.setItem(getFrameKey(linkedStudent.id), prefs.frameId);
                localStorage.setItem(getSkinKey(linkedStudent.id), prefs.skinId);
                localStorage.setItem(getAppearanceUpdatedKey(linkedStudent.id), String(prefs.updatedAtMs));
                setActiveFrame(prefs.frameId);
                setActiveSkin(prefs.skinId as CardSkin);
            },
            () => {
                return;
            }
        );
        return () => unsubscribe();
    }, [linkedStudent?.id]);

    useEffect(() => {
        if (!isNotifOpen) return;
        const handleClick = (event: MouseEvent) => {
            const target = event.target as Node;
            if (notifPanelRef.current && notifPanelRef.current.contains(target)) return;
            if (bellButtonRef.current && bellButtonRef.current.contains(target)) return;
            setIsNotifOpen(false);
        };
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        window.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            window.removeEventListener('keydown', handleKey);
        };
    }, [isNotifOpen, notifPanelRef, bellButtonRef]);

    useEffect(() => {
        if (!isNotifOpen) {
            setIsNotifExpanded(false);
        }
    }, [isNotifOpen]);

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        const previousIds = notificationIdsRef.current;
        const currentIds = notifications.map(n => n.id);
        const hasUnread = unreadCount > 0;
        const hasNewUnread = notifications.some(n => !n.read && !previousIds.includes(n.id));
        notificationIdsRef.current = currentIds;
        if (!hasUnread) {
            setIsBellAnimating(false);
            return;
        }
        if (!hasNewUnread) return;
        setIsBellAnimating(true);
        const timeout = window.setTimeout(() => {
            setIsBellAnimating(false);
        }, 2500);
        return () => {
            window.clearTimeout(timeout);
        };
    }, [notifications, unreadCount]);

    const handleMarkAllRead = () => {
        if (notifications.length === 0) return;
        StorageService.markAllNotificationsRead({ studentId: linkedStudent ? linkedStudent.id : undefined, parentId: user.id });
        const allNotifs = StorageService.getNotifications();
        const current = linkedStudent;
        const filtered = current
            ? allNotifs.filter(n => !n.studentId || n.studentId === current.id)
            : allNotifs;
        setNotifications(filtered);
    };

    useEffect(() => {
        if (!showInviteScanner) {
            setScannerStatus('idle');
            setScannerError('');
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            return;
        }
        let active = true;
        const startScanner = async () => {
            try {
                setScannerStatus('scanning');
                setScannerError('');
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (!active) {
                    mediaStream.getTracks().forEach(track => track.stop());
                    return;
                }
                streamRef.current = mediaStream;
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    await videoRef.current.play();
                }
                const Detector = (window as any).BarcodeDetector;
                if (!Detector) {
                    setScannerStatus('error');
                    setScannerError('Camera is on but QR detection is not supported on this device. Please enter the code manually.');
                    return;
                }
                const detector = new Detector({ formats: ['qr_code'] });
                const scanLoop = async () => {
                    if (!active || !videoRef.current) return;
                    try {
                        let codes: Array<{ rawValue?: string }> = [];
                        try {
                            codes = await detector.detect(videoRef.current);
                        } catch {
                            codes = [];
                        }
                        if ((!codes || codes.length === 0) && videoRef.current.readyState >= 2) {
                            const video = videoRef.current;
                            const width = Math.max(1, video.videoWidth || 1);
                            const height = Math.max(1, video.videoHeight || 1);
                            let canvas = scanCanvasRef.current;
                            if (!canvas) {
                                canvas = document.createElement('canvas');
                                scanCanvasRef.current = canvas;
                            }
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            if (ctx) {
                                ctx.drawImage(video, 0, 0, width, height);
                                codes = await detector.detect(canvas);
                            }
                        }
                        if (codes && codes.length > 0) {
                            const value = codes[0].rawValue || '';
                            const nextCode = value ? normalizeInviteCode(String(value)) : '';
                            if (nextCode) {
                                setCodeInput(nextCode);
                                setScannerStatus('success');
                                return;
                            }
                            setScannerStatus('error');
                            setScannerError('That QR does not look like a SafePath invite. Ask your child to open their app and show the Parent Link QR.');
                            return;
                        }
                    } catch {
                        setScannerStatus('error');
                        setScannerError('Unable to read QR code. Try again or enter the code manually.');
                        return;
                    }
                    if (!active) return;
                    requestAnimationFrame(() => {
                        void scanLoop();
                    });
                };
                requestAnimationFrame(() => {
                    void scanLoop();
                });
            } catch {
                setScannerStatus('error');
                setScannerError('Camera access was blocked. Please allow camera or enter the code manually.');
            }
        };
        void startScanner();
        return () => {
            active = false;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [showInviteScanner]);

    useEffect(() => {
        if (scannerStatus !== 'success') {
            autoLinkRef.current = false;
            return;
        }
        if (autoLinkRef.current) return;
        autoLinkRef.current = true;
        window.setTimeout(() => {
            handleLinkSubmit();
        }, 140);
    }, [scannerStatus]);

    useEffect(() => {
        if (!linkedStudent) {
            setIsSwitching(false);
            return;
        }
        const timeout = setTimeout(() => {
            setIsSwitching(false);
        }, 250);
        return () => clearTimeout(timeout);
    }, [linkedStudent]);

    useEffect(() => {
        const handleUpdate = () => {
            const history = StorageService.getAttendanceHistory();
            if (history.length > 0) {
                const latest = history[0];
                setLastEvent(latest);
                setStatus(latest.type === 'LOGIN' ? AttendanceStatus.PRESENT : AttendanceStatus.DEPARTED);
            }
            const allNotifs = StorageService.getNotifications();
            const current = linkedStudent;
            const filtered = current
                ? allNotifs.filter(n => !n.studentId || n.studentId === current.id)
                : allNotifs;
            setNotifications(filtered.slice(0, 3));
        };
        window.addEventListener('attendance-updated', handleUpdate);
        return () => window.removeEventListener('attendance-updated', handleUpdate);
    }, [linkedStudent]);

    useEffect(() => {
        if (!linkedStudent) return;
        const handleStorage = (event: StorageEvent) => {
            if (!event.key) return;
            if (event.key === getFrameKey(linkedStudent.id) && event.newValue) {
                setActiveFrame(event.newValue);
            }
            if (event.key === getSkinKey(linkedStudent.id) && event.newValue) {
                setActiveSkin(event.newValue as CardSkin);
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, [linkedStudent]);

    const handleLinkSubmit = async () => {
        if (isLinking) return;
        setLinkError('');
        const normalized = normalizeInviteCode(codeInput) || codeInput.trim().toUpperCase();
        const inviteFormatOk = /^[A-Z0-9]{8}-[A-Z0-9]{6}$/.test(normalized);
        if (!normalized) {
            setLinkError('Enter an invite code');
            return;
        }
        if (!inviteFormatOk) {
            setLinkError('That code does not look valid');
            showToast('error', 'Invalid invite format');
            return;
        }
        setIsLinking(true);
        setSyncState('syncing');
        StorageService.trackEvent('link_attempt', { parentId: user.id, source: linkSource });
        let link: ParentStudentLink | null = null;
        if (navigator.onLine) {
            link = await StorageService.consumeParentInviteToServer(normalized, user.id);
            if (!link) {
                link = StorageService.consumeParentInvite(normalized, user.id);
            }
        } else {
            link = StorageService.consumeParentInvite(normalized, user.id);
        }
        if (!link) {
            setLinkError('Invalid or expired code');
            if (showInviteScanner) {
                setScannerStatus('error');
                setScannerError(navigator.onLine ? 'Invalid or expired invite. Try again.' : 'You are offline. Connect to the internet to link.');
            }
            showToast('error', 'Invalid or expired invite');
            setIsLinking(false);
            setSyncState('idle');
            return;
        }
        const fromServer = await StorageService.getUserProfileFromServer(link.studentId);
        const profile = fromServer || StorageService.getUserProfile(link.studentId);
        if (fromServer) {
            StorageService.saveUserProfile(fromServer);
        }
        if (profile) {
            setLinkedStudent(profile);
            localStorage.setItem(getActiveStudentKey(user.id), profile.id);
        }
        setShowLinkModal(false);
        setShowInviteScanner(false);
        setCodeInput('');
        setLinkSource('manual');
        playSuccessSound();
        showToast('success', 'Student linked');
        setIsLinking(false);
        setSyncState('idle');
    };

    const handleUnlinkClick = (studentId: string) => {
        setUnlinkStudentId(studentId);
        setShowUnlinkModal(true);
    };

    const handleConfirmUnlink = () => {
        if (!unlinkStudentId || isUnlinking) return;
        setIsUnlinking(true);
        StorageService.unlinkParentStudentFromServer(user.id, unlinkStudentId)
            .catch(() => {
                return;
            })
            .finally(() => {
                StorageService.unlinkParentStudent(user.id, unlinkStudentId);
                const l = StorageService.getLinkedStudents(user.id);
                setLinks(l);
                const profiles = l
                    .map(link => StorageService.getUserProfile(link.studentId))
                    .filter(p => p) as User[];
                setLinkedProfiles(profiles);
                if (linkedStudent && linkedStudent.id === unlinkStudentId) {
                    const next = profiles[0] || null;
                    setLinkedStudent(next);
                    const activeKey = getActiveStudentKey(user.id);
                    if (next) {
                        localStorage.setItem(activeKey, next.id);
                    } else {
                        localStorage.removeItem(activeKey);
                    }
                }
                setShowUnlinkModal(false);
                setUnlinkStudentId(null);
                setIsUnlinking(false);
                showToast('success', 'Student unlinked');
            });
    };

    const statusText = status === AttendanceStatus.PRESENT ? 'Inside Campus' : (status === AttendanceStatus.DEPARTED ? 'In Transit' : 'Absent');
    const statusColor = status === AttendanceStatus.PRESENT ? 'bg-emerald-500' : (status === AttendanceStatus.DEPARTED ? 'bg-amber-500' : 'bg-gray-400');
    const statusRingColor = status === AttendanceStatus.PRESENT ? 'border-emerald-300/80' : (status === AttendanceStatus.DEPARTED ? 'border-amber-300/80' : 'border-gray-200/80');
    const statusGlow = status === AttendanceStatus.PRESENT ? 'shadow-[0_0_14px_rgba(52,211,153,0.55)]' : (status === AttendanceStatus.DEPARTED ? 'shadow-[0_0_14px_rgba(251,191,36,0.55)]' : 'shadow-[0_0_14px_rgba(148,163,184,0.55)]');
    const isLinked = !!linkedStudent;
    const showLinkLoading = syncState === 'syncing' && !hasHydratedLinks;
    const linkStatusLabel = showLinkLoading ? 'Syncing' : isLinked ? 'Linked' : 'Not Linked';
    const activeStudentFirstName = linkedStudent ? linkedStudent.name.split(' ')[0] : '';

    // Carousel Logic
    const handleCarouselScroll = () => {
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = window.setTimeout(() => {
            if (!cardContainerRef.current) return;

            const container = cardContainerRef.current;
            const containerRect = container.getBoundingClientRect();
            const containerCenter = containerRect.left + containerRect.width / 2;

            let closestId: string | null = null;
            let minDiff = Infinity;

            const cards = container.querySelectorAll('[data-student-id]');
            cards.forEach((card) => {
                const rect = card.getBoundingClientRect();
                const cardCenter = rect.left + rect.width / 2;
                const diff = Math.abs(cardCenter - containerCenter);
                if (diff < minDiff) {
                    minDiff = diff;
                    closestId = (card as HTMLElement).dataset.studentId || null;
                }
            });

            if (closestId && linkedStudent?.id !== closestId) {
                const profile = linkedProfiles.find(p => p.id === closestId);
                if (profile) {
                    setLinkedStudent(profile);
                    localStorage.setItem(getActiveStudentKey(user.id), profile.id);
                    setIsSwitching(true);
                }
            }
        }, 150); // Debounce duration
    };

    // Scroll to active student on mount or change (if not caused by scroll)
    useEffect(() => {
        if (!cardContainerRef.current || !linkedStudent) return;
        // If the change was triggered by our scroll handler, don't scroll again
        // We can check if the current centered card is already the right one?
        // Simpler: Just scrollIntoView
        const card = cardContainerRef.current.querySelector(`[data-student-id="${linkedStudent.id}"]`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [linkedStudent?.id]);

    return (
        <>
            <style>{`
@keyframes bell-shake {
  0%, 100% { transform: rotate(0deg); }
  15% { transform: rotate(5deg); }
  30% { transform: rotate(-4deg); }
  45% { transform: rotate(3deg); }
  60% { transform: rotate(-2deg); }
  75% { transform: rotate(1deg); }
}
@keyframes drift-slow {
  0% { transform: translate(0, 0); }
  50% { transform: translate(10px, -10px); }
  100% { transform: translate(0, 0); }
}
@keyframes drift-medium {
  0% { transform: translate(0, 0); }
  50% { transform: translate(-15px, 5px); }
  100% { transform: translate(0, 0); }
}
@keyframes sheen {
  0% { background-position: 0% 0%; }
  100% { background-position: 200% 0%; }
}
@keyframes sonar-ping {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(3); opacity: 0; }
}
@keyframes timeline-in {
  0% { opacity: 0; transform: translateY(14px); }
  100% { opacity: 1; transform: translateY(0); }
}
.bell-shake {
  animation: bell-shake 0.6s ease-in-out infinite;
  transform-origin: top center;
}
.animate-drift-slow {
  animation: drift-slow 8s ease-in-out infinite;
}
.animate-drift-medium {
  animation: drift-medium 6s ease-in-out infinite;
}
.animate-sheen {
  animation: sheen 7s ease-in-out infinite;
}
.animate-sonar {
  animation: sonar-ping 3s cubic-bezier(0, 0, 0.2, 2) infinite;
}
.timeline-in {
  animation: timeline-in 650ms cubic-bezier(0.16, 1, 0.3, 1) both;
}
@media (prefers-reduced-motion: reduce) {
  .bell-shake, .animate-drift-slow, .animate-drift-medium, .animate-sheen, .animate-sonar, .timeline-in {
    animation: none !important;
  }
}
/* Skin gradient classes - matches StudentDashboard */
.skin-nebula { background: linear-gradient(135deg, #4f46e5, #7c3aed, #db2777); }
.skin-sunset { background: linear-gradient(135deg, #f59e0b, #ea580c, #db2777); }
.skin-ocean { background: linear-gradient(135deg, #06b6d4, #3b82f6, #6366f1); }
.skin-midnight { background: linear-gradient(135deg, #0f172a, #334155, #475569); }
`}</style>
            {toast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[95]">
                    <div
                        className={`px-4 py-2 rounded-2xl text-[11px] font-semibold shadow-lg border backdrop-blur-md transition-all ${toast.tone === 'success'
                            ? 'bg-emerald-500/15 text-emerald-800 border-emerald-200'
                            : toast.tone === 'error'
                                ? 'bg-red-500/15 text-red-800 border-red-200'
                                : 'bg-slate-900/10 text-slate-700 border-white/40'
                            }`}
                        role="status"
                        aria-live="polite"
                    >
                        {toast.message}
                    </div>
                </div>
            )}
            <div className="flex flex-col relative  pb-32">

                {/* Header */}
                <header
                    className={`pt-6 pb-2 px-6 flex items-center justify-between z-30 sticky top-0 bg-[#f8fafc]/85 dark:bg-slate-900/85 backdrop-blur-md transition-all duration-300 border-b border-transparent ${headerShadow.enabled ? 'shadow-sm border-slate-200 dark:border-slate-800' : ''}`}
                >
                    <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide uppercase">Parent Portal</p>
                        <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{user.name}</h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm active:scale-95 transition-transform"
                        >
                            {resolvedTheme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                        </button>
                        {syncState !== 'idle' && (
                            <div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${syncState === 'syncing' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800'
                                }`}>
                                {syncState === 'syncing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                            </div>
                        )}
                        <button
                            ref={bellButtonRef}
                            onClick={() => setIsNotifOpen(prev => !prev)}
                            className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 shadow-sm active:scale-95 transition-transform"
                        >
                            <Bell className={`w-[18px] h-[18px] ${isBellAnimating ? 'bell-shake' : ''}`} style={{ strokeWidth: 1.5 }} />
                            {unreadCount > 0 && (
                                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#f8fafc] dark:border-slate-900"></span>
                            )}
                        </button>
                    </div>

                    {isNotifOpen && (
                        <div className="absolute top-16 right-4 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="p-4 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                                <h3 className="font-semibold text-slate-900 dark:text-white text-sm">Notifications</h3>
                                <button onClick={handleMarkAllRead} className="text-[10px] text-indigo-600 font-medium" disabled={unreadCount === 0}>
                                    Mark all read
                                </button>
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <Bell className="w-6 h-6 text-slate-300 dark:text-slate-500" />
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No new notifications</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">We'll let you know when updates arrive.</p>
                                    </div>
                                ) : (
                                    notifications.slice(0, 5).map(n => (
                                        <div key={n.id} className={`p-3 border-b border-slate-50 dark:border-slate-700 flex gap-3 ${!n.read ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
                                            <div className="mt-1">
                                                {n.type === 'ALERT' ? <ShieldAlert size={16} className="text-red-500" /> : <Bell size={16} className="text-slate-400 dark:text-slate-500" />}
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium text-slate-900 dark:text-white">{n.title}</p>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                                                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </header>

                <main id="scroll-container" className="flex-1 overflow-y-auto pb-32 space-y-6">

                    {/* 1. Child Selector / Status Cards (Horizontal Scroll) */}
                    <div className="mt-2 animate-in slide-in-from-bottom-4 fade-in duration-700">
                        <div
                            ref={cardContainerRef}
                            onScroll={handleCarouselScroll}
                            className="flex overflow-x-auto snap-x snap-mandatory px-6 gap-4 pb-4 no-scrollbar"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {linkedProfiles.map((student) => {
                                const isActive = linkedStudent?.id === student.id;
                                const sPhoto = student.avatarUrl || getDefaultAvatarUrl(student.name, UserRole.STUDENT);

                                return (
                                    <div
                                        key={student.id}
                                        data-student-id={student.id}
                                        onClick={() => {
                                            setLinkedStudent(student);
                                            localStorage.setItem(getActiveStudentKey(user.id), student.id);
                                        }}
                                        className={`snap-center shrink-0 w-full relative group rounded-[1.5rem] overflow-hidden transition-all duration-300 active:scale-[0.98] ${isActive
                                            ? 'shadow-xl shadow-indigo-900/10 text-white'
                                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-900 dark:text-white opacity-90 scale-[0.98]'
                                            }`}
                                    >
                                        {isActive && (() => {
                                            console.log('[ParentDashboard] Rendering active card with skin:', activeSkin, 'style:', getSkinStyleClass(activeSkin));
                                            return null;
                                        })()}
                                        {isActive && (
                                            <>
                                                <div className={`absolute inset-0 ${getSkinStyleClass(activeSkin)} transition-colors duration-700`}></div>
                                                <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJuIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iMC44IiBudW1PY3RhdmVzLTMiIHN0aXRjaFRpbGVzPSJzdGl0Y2giLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbikiIG9wYWNpdHk9IjEiLz48L3N2Zz4=')]"></div>
                                            </>
                                        )}

                                        <div className="relative p-5 z-10 flex flex-col justify-between h-full min-h-[180px]">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-12 h-12 rounded-xl overflow-hidden ${isActive ? `bg-slate-900/30 backdrop-blur-md ${frameStyles[activeFrame] || 'border-2 border-white/20'}` : 'bg-slate-100 border-2 border-slate-200 grayscale'}`}>
                                                        <img src={sPhoto} className="w-full h-full object-cover" alt="Student" />
                                                    </div>
                                                    <div>
                                                        <h2 className={`text-lg font-semibold tracking-tight leading-tight ${isActive ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{student.name}</h2>
                                                        <p className={`text-[11px] font-medium ${isActive ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                                                            {student.grade ? `Grade ${student.grade}` : 'Student'} • {student.section || 'General'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {isActive && (status === AttendanceStatus.PRESENT) && (
                                                    <div className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-md flex items-center gap-1.5">
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                                                        </span>
                                                        <span className="text-[10px] font-semibold text-emerald-50 uppercase tracking-wide">In Campus</span>
                                                    </div>
                                                )}
                                                {isActive && (status !== AttendanceStatus.PRESENT) && (
                                                    <div className="px-2.5 py-1 rounded-full bg-slate-500/20 border border-slate-400/30 backdrop-blur-md flex items-center gap-1.5">
                                                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                                        <span className="text-[10px] font-semibold text-slate-100 uppercase tracking-wide">
                                                            {status === AttendanceStatus.DEPARTED ? 'Left School' : 'Absent'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {isActive ? (
                                                <div className="grid grid-cols-3 gap-2 mt-4">
                                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/10 text-center">
                                                        <p className="text-[10px] text-white/60 uppercase">Attendance</p>
                                                        <p className="text-sm font-semibold">98%</p>
                                                    </div>
                                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/10 text-center">
                                                        <p className="text-[10px] text-white/60 uppercase">Homework</p>
                                                        <p className="text-sm font-semibold">3 Due</p>
                                                    </div>
                                                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/10 text-center">
                                                        <p className="text-[10px] text-white/60 uppercase">Merits</p>
                                                        <p className="text-sm font-semibold">12 Pts</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="mt-auto">
                                                    <button className="w-full py-2 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                                                        Tap to View Profile
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {linkedProfiles.length === 0 && (
                                <div className="snap-center shrink-0 w-full relative group rounded-[1.5rem] overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col items-center justify-center text-center">
                                    <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center mb-3">
                                        <ScanLine className="text-slate-400 dark:text-slate-500" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Link a Student</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">You haven't linked any student profiles yet.</p>
                                    <button
                                        onClick={() => setShowLinkModal(true)}
                                        className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20"
                                    >
                                        Add Student
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Pagination Dots */}
                        {linkedProfiles.length > 1 && (
                            <div className="flex justify-center gap-1.5 mt-4">
                                {linkedProfiles.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`w-1.5 h-1.5 rounded-full transition-colors ${linkedStudent === linkedProfiles[idx] ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 2. Quick Actions Grid */}
                    <div className="px-6 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-100">
                        <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wide mb-3 pl-1">Quick Actions</h3>
                        <div className="grid grid-cols-4 gap-3">
                            <button className="flex flex-col items-center gap-2 group">
                                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-active:scale-90 transition-transform hover:border-indigo-100 dark:hover:border-indigo-900 hover:shadow-md">
                                    <CalendarClock size={24} style={{ strokeWidth: 1.5 }} />
                                </div>
                                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 text-center leading-tight">Class<br />Schedule</span>
                            </button>

                            <button
                                onClick={() => navigate('/map')}
                                className="flex flex-col items-center gap-2 group"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-active:scale-90 transition-transform hover:border-emerald-100 dark:hover:border-emerald-900 hover:shadow-md">
                                    <MapPin size={24} style={{ strokeWidth: 1.5 }} />
                                </div>
                                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 text-center leading-tight">Locate<br />Student</span>
                            </button>

                            <button className="flex flex-col items-center gap-2 group">
                                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center text-rose-500 dark:text-rose-400 group-active:scale-90 transition-transform hover:border-rose-100 dark:hover:border-rose-900 hover:shadow-md">
                                    <Phone size={24} style={{ strokeWidth: 1.5 }} />
                                </div>
                                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 text-center leading-tight">Contact<br />Teacher</span>
                            </button>

                            <button className="flex flex-col items-center gap-2 group">
                                <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center text-amber-500 dark:text-amber-400 group-active:scale-90 transition-transform hover:border-amber-100 dark:hover:border-amber-900 hover:shadow-md">
                                    <Siren size={24} style={{ strokeWidth: 1.5 }} />
                                </div>
                                <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 text-center leading-tight">Report<br />Incident</span>
                            </button>
                        </div>
                    </div>

                    {/* 3. Academic Notice Widget */}
                    <div className="px-6 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-200">
                        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 shrink-0">
                                <Award size={20} style={{ strokeWidth: 1.5 }} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-semibold text-indigo-900">Mid-Term Exams</h4>
                                <p className="text-xs text-indigo-700/80 mt-0.5 leading-relaxed">Exams for Science and Mathematics are scheduled for next week. Please review the study guide.</p>
                                <div className="mt-3 flex gap-3">
                                    <button className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg shadow-sm active:scale-95 transition-transform">View Syllabus</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Live Activity Feed */}
                    <div className="px-6 animate-in slide-in-from-bottom-4 fade-in duration-700 delay-300">
                        <div className="flex items-center justify-between mb-3 pl-1">
                            <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wide">Recent Activity</h3>
                            <button onClick={() => navigate('/history')} className="text-[10px] font-medium text-indigo-600 hover:text-indigo-700">View All</button>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-sm border border-slate-100 dark:border-slate-700">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">No recent activity</div>
                            ) : (
                                notifications.slice(0, 3).map((item, idx) => (
                                    <div key={item.id} className="group flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-0">
                                        <div className="relative mt-1">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border z-10 relative ${item.type === 'ATTENDANCE'
                                                ? (item.title.includes('LOGIN') ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-900' : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-900')
                                                : 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-900'
                                                }`}>
                                                {item.type === 'ATTENDANCE'
                                                    ? (item.title.includes('LOGIN') ? <LogIn size={14} /> : <LogOut size={14} />)
                                                    : <Bell size={14} />
                                                }
                                            </div>
                                            {idx < 2 && <div className="absolute top-8 left-1/2 -ml-[1px] w-[2px] h-full bg-slate-100 dark:bg-slate-700 group-last:hidden"></div>}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">{item.title}</h4>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap ml-2">
                                                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{item.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {showLinkModal && (
                        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="link-student-title">
                            <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                                <button
                                    onClick={() => {
                                        setShowLinkModal(false);
                                        setLinkError('');
                                        setShowInviteScanner(false);
                                    }}
                                    className="absolute top-5 right-5 p-2 bg-slate-50 dark:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors z-10"
                                >
                                    <X size={20} />
                                </button>
                                <div className="mt-2">
                                    <h3 id="link-student-title" className="text-lg font-bold text-slate-900 dark:text-white mb-2">Link Your Student</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                        Ask your child to open their app and show the parent link code or QR, then enter the code below.
                                    </p>
                                    <div className="space-y-3 mb-4">
                                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                            <span>Have a QR code from your child&apos;s app?</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setLinkSource('qr');
                                                    setShowInviteScanner(true);
                                                }}
                                                className="inline-flex items-center gap-1 text-indigo-600 font-semibold hover:text-indigo-700 active:scale-95 transition"
                                            >
                                                <QrCode className="w-3 h-3" />
                                                <span>Scan QR instead</span>
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={codeInput}
                                                onChange={e => {
                                                    setLinkSource('manual');
                                                    setCodeInput(e.target.value.toUpperCase());
                                                }}
                                                placeholder="ENTER INVITE CODE"
                                                className="w-full text-center text-sm font-mono tracking-[0.25em] px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60 dark:text-white dark:placeholder:text-slate-500"
                                                aria-label="Enter parent invite code"
                                                disabled={isLinking}
                                            />
                                            {linkError && <p className="text-[10px] text-red-500 font-medium text-center">{linkError}</p>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLinkSubmit}
                                        className="w-full bg-indigo-600 text-white font-bold py-3 rounded-2xl shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform disabled:opacity-70 disabled:cursor-not-allowed"
                                        disabled={isLinking}
                                        aria-busy={isLinking}
                                    >
                                        <span className="inline-flex items-center justify-center gap-2">
                                            {isLinking && <Loader2 className="w-4 h-4 animate-spin" />}
                                            {isLinking ? 'Linking…' : 'Link Student'}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    <input
                        ref={inviteFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.currentTarget.value = '';
                            if (!file) return;
                            setLinkSource('upload');
                            await handleInviteQrUpload(file);
                        }}
                    />
                    {showInviteScanner && (
                        <div className="fixed inset-0 z-[90] bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300" role="dialog" aria-modal="true" aria-labelledby="scan-invite-title">
                            <button
                                type="button"
                                onClick={() => setShowInviteScanner(false)}
                                className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-10"
                                aria-label="Close QR scanner"
                            >
                                <X size={24} />
                            </button>
                            <div className="w-full max-w-xs text-center relative">
                                <h3 id="scan-invite-title" className="text-white text-lg font-semibold mb-2">Scan Invite QR</h3>
                                <p className="text-white/60 text-xs mb-6">Align the QR code from your child&apos;s app inside the frame.</p>
                                <div className="relative aspect-square w-full rounded-3xl border-2 border-white/20 overflow-hidden bg-white/5 backdrop-blur-sm mb-4">
                                    <video
                                        ref={videoRef}
                                        className="absolute inset-0 w-full h-full object-cover"
                                        autoPlay
                                        playsInline
                                        muted
                                    />
                                    <div className={`absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] z-10 ${scannerStatus === 'scanning' ? 'animate-[scan_2s_ease-in-out_infinite]' : ''}`}></div>
                                    <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
                                    <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
                                    <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
                                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        {scannerStatus === 'scanning' && (
                                            <div className="text-center relative flex flex-col items-center justify-center">
                                                <div className="relative mb-4">
                                                    <QrCode size={56} className="text-white/10" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <ShieldCheck size={28} className="text-indigo-400 animate-pulse" />
                                                    </div>
                                                    <div className="absolute inset-0 border-2 border-indigo-500/30 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                                                </div>
                                                <p className="text-white/70 text-[10px] font-mono tracking-[0.2em] text-indigo-300">SCANNING…</p>
                                            </div>
                                        )}
                                        {scannerStatus === 'success' && (
                                            <div className="bg-emerald-500/25 w-full h-full flex items-center justify-center backdrop-blur-md animate-in fade-in">
                                                <div className="bg-white p-4 rounded-full shadow-xl animate-in zoom-in duration-300">
                                                    <ScanLine className="text-emerald-500 w-8 h-8" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {scannerStatus === 'error' && (
                                    <div className="bg-red-500/10 text-red-300 px-4 py-3 rounded-xl text-[11px] font-medium border border-red-500/30 mb-3">
                                        {scannerError || 'Unable to read QR code. Try again or enter the code manually.'}
                                    </div>
                                )}
                                {scannerStatus !== 'error' && (
                                    <p className="text-[10px] text-white/40 mb-3 max-w-xs mx-auto">
                                        {scannerStatus === 'scanning'
                                            ? 'Hold your phone steady while we read the QR code.'
                                            : 'If camera access is blocked, allow it in your browser settings or enter the code manually.'}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowInviteScanner(false);
                                        setShowLinkModal(true);
                                    }}
                                    className="mt-1 text-[11px] font-semibold text-indigo-200 underline underline-offset-4"
                                >
                                    Enter code manually
                                </button>
                                <button
                                    type="button"
                                    onClick={openInviteQrUpload}
                                    className="mt-3 ml-5 text-[11px] font-semibold text-white/70"
                                >
                                    Upload QR image instead
                                </button>
                            </div>
                        </div>
                    )}

                    {!showLinkModal && showUnlinkModal && unlinkStudentId && (
                        <div className="fixed inset-0 z-[85] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="unlink-student-title">
                            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                                <button
                                    onClick={() => {
                                        if (isUnlinking) return;
                                        setShowUnlinkModal(false);
                                        setUnlinkStudentId(null);
                                    }}
                                    className="absolute top-5 right-5 p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors z-10"
                                    aria-label="Close unlink confirmation"
                                >
                                    <X size={20} />
                                </button>
                                <div className="mt-2">
                                    <h3 id="unlink-student-title" className="text-lg font-bold text-slate-900 mb-2">Unlink Student</h3>
                                    <p className="text-xs text-slate-500 mb-4">
                                        This will remove the connection between your account and this student. You will no longer see their live status, activity, or alerts until you link again.
                                    </p>
                                    <div className="flex items-center justify-end gap-3 mt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isUnlinking) return;
                                                setShowUnlinkModal(false);
                                                setUnlinkStudentId(null);
                                            }}
                                            className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-95 transition"
                                            aria-label="Cancel unlink"
                                            disabled={isUnlinking}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleConfirmUnlink}
                                            className="px-4 py-2 rounded-2xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 active:scale-95 transition inline-flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                            aria-label="Confirm unlink"
                                            data-testid="confirm-unlink"
                                            disabled={isUnlinking}
                                        >
                                            {isUnlinking && <Loader2 className="w-4 h-4 animate-spin" />}
                                            <span>{isUnlinking ? 'Unlinking…' : 'Confirm'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
};
