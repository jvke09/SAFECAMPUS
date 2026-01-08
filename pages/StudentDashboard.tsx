import React, { useState, useEffect, useRef } from 'react';
import { User, AttendanceRecord, UserRole } from '../types';
import { StorageService } from '../services/storageService';
import { getDefaultAvatarUrl } from '../utils/avatarUtils';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  CalendarCheck,
  Check,
  Lock,
  CheckCircle2,
  LogIn,
  QrCode,
  X,
  Link2,
  ScanLine,
  Bell,
  User as UserIcon,
  Palette,
  MapPin,
  GraduationCap,
  Crown,
  CreditCard,
  CalendarClock,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const generateId = () => Math.random().toString(36).substr(2, 9);

type Tier = 'IRON' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'EMERALD' | 'DIAMOND' | 'MASTER' | 'GRANDMASTER' | 'ETERNAL';
type CardSkin = 'nebula' | 'sunset' | 'ocean_depths' | 'magma' | 'midnight_city' | 'cyber_grid' | 'royal_gold' | 'dark_matter' | 'skin-nebula' | 'skin-sunset' | 'skin-ocean' | 'skin-midnight';

const getFrameKey = (studentId: string) => `safepath_student_frame_${studentId}`;
const getSkinKey = (studentId: string) => `safepath_student_skin_${studentId}`;
const getAppearanceUpdatedKey = (studentId: string) => `safepath_student_appearance_updated_${studentId}`;
const getDevMaxLevelKey = (studentId: string) => `safepath_dev_max_level_${studentId}`;

const getAttendanceStats = (history: AttendanceRecord[]) => {
  const loginRecords = history.filter(r => r.type === 'LOGIN');
  const byDay: Record<string, boolean> = {};
  loginRecords.forEach(r => {
    const d = new Date(r.timestamp).toDateString();
    byDay[d] = true;
  });
  const days = Object.keys(byDay)
    .map(d => new Date(d).getTime())
    .sort((a, b) => b - a);
  const today = new Date();
  const todayKey = today.toDateString();
  let streak = 0;
  let cursor = new Date(todayKey).getTime();
  const daySet = new Set(days);

  // Check if today is present to start streak, otherwise check yesterday
  if (!daySet.has(cursor)) {
    cursor -= 24 * 60 * 60 * 1000;
  }

  while (daySet.has(cursor)) {
    streak += 1;
    cursor -= 24 * 60 * 60 * 1000;
  }

  const presentDays = days.length;
  let level = 1;
  let tier: Tier = 'IRON';

  // Level & Tier Logic (10 Tiers)
  if (presentDays >= 150) { level = 10; tier = 'ETERNAL'; }
  else if (presentDays >= 100) { level = 9; tier = 'GRANDMASTER'; }
  else if (presentDays >= 80) { level = 8; tier = 'MASTER'; }
  else if (presentDays >= 60) { level = 7; tier = 'DIAMOND'; }
  else if (presentDays >= 45) { level = 6; tier = 'EMERALD'; }
  else if (presentDays >= 30) { level = 5; tier = 'PLATINUM'; }
  else if (presentDays >= 20) { level = 4; tier = 'GOLD'; }
  else if (presentDays >= 10) { level = 3; tier = 'SILVER'; }
  else if (presentDays >= 5) { level = 2; tier = 'BRONZE'; }

  // XP Calculation
  const levels = [0, 5, 10, 20, 30, 45, 60, 80, 100, 150];
  const currentLevelBase = levels[level - 1];
  const nextLevelTarget = level < 10 ? levels[level] : 200; // Cap at 200 for now

  const clamped = Math.max(currentLevelBase, Math.min(presentDays, nextLevelTarget));
  const xpProgress = nextLevelTarget === currentLevelBase ? 100 : ((clamped - currentLevelBase) / (nextLevelTarget - currentLevelBase)) * 100;

  return { level, tier, streak, presentDays, xpProgress };
};

const getUnlockedFrames = (presentDays: number) => {
  const frames = ['classic'];
  if (presentDays >= 3) frames.push('neon');
  if (presentDays >= 7) frames.push('aurora');
  if (presentDays >= 15) frames.push('cyber');
  if (presentDays >= 25) frames.push('nature');
  if (presentDays >= 40) frames.push('glitch');
  if (presentDays >= 60) frames.push('royal');
  if (presentDays >= 80) frames.push('cosmic');
  if (presentDays >= 100) frames.push('fire');
  if (presentDays >= 150) frames.push('legend');
  return frames;
};

const getUnlockedSkins = (level: number) => {
  const skins: string[] = ['nebula', 'skin-nebula']; // Allow both old and new keys
  if (level >= 2) skins.push('sunset', 'skin-sunset');
  if (level >= 3) skins.push('ocean_depths', 'skin-ocean');
  if (level >= 4) skins.push('midnight_city', 'skin-midnight');
  if (level >= 5) skins.push('magma');
  if (level >= 6) skins.push('cyber_grid');
  if (level >= 8) skins.push('royal_gold');
  if (level >= 10) skins.push('dark_matter');
  return skins as CardSkin[];
};

export const StudentDashboard: React.FC<{ user: User; isOnline: boolean }> = ({ user, isOnline }) => {
  const navigate = useNavigate();
  const [lastRecord, setLastRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [level, setLevel] = useState(1);
  const [tier, setTier] = useState<Tier>('IRON');
  const [streak, setStreak] = useState(0);
  const [xpProgress, setXpProgress] = useState(0);
  const [presentDays, setPresentDays] = useState(0);
  const [headerShadow, setHeaderShadow] = useState<{ enabled: boolean; alpha: number }>({ enabled: false, alpha: 0 });
  const headerShadowDebounceRef = useRef<number | null>(null);
  const { resolvedTheme, toggleTheme } = useTheme();

  const [unlockedFrames, setUnlockedFrames] = useState<string[]>(['classic']);
  const [activeFrame, setActiveFrame] = useState(() => localStorage.getItem(getFrameKey(user.id)) || 'classic');

  const [unlockedSkins, setUnlockedSkins] = useState<CardSkin[]>(['nebula']);
  const [activeSkin, setActiveSkin] = useState<CardSkin>(() => (localStorage.getItem(getSkinKey(user.id)) as CardSkin) || 'nebula');
  const [showQrModal, setShowQrModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const loadData = () => {
    const historyData = StorageService.getAttendanceHistory();
    setHistory(historyData);
    const devMaxEnabled = localStorage.getItem(getDevMaxLevelKey(user.id)) === '1';
    if (historyData.length > 0) {
      setLastRecord(historyData[0]);
    }
    const baseStats = getAttendanceStats(historyData);
    if (devMaxEnabled) {
      const devPresentDays = 150;
      const devLevel = 10;
      const devTier: Tier = 'ETERNAL';
      setLevel(devLevel);
      setTier(devTier);
      setStreak(baseStats.streak);
      setXpProgress(100);
      setPresentDays(devPresentDays);
      setUnlockedFrames(getUnlockedFrames(devPresentDays));
      setUnlockedSkins(getUnlockedSkins(devLevel));
    } else {
      setLevel(baseStats.level);
      setTier(baseStats.tier);
      setStreak(baseStats.streak);
      setXpProgress(baseStats.xpProgress);
      setPresentDays(baseStats.presentDays);
      setUnlockedFrames(getUnlockedFrames(baseStats.presentDays));
      setUnlockedSkins(getUnlockedSkins(baseStats.level));
    }
  };

  const ensureInvite = () => {
    if (inviteCode) return inviteCode;
    const local = StorageService.createParentInvite(user);
    setInviteCode(local);
    if (isOnline) {
      StorageService.createParentInviteToServer(user)
        .then((serverCode) => {
          setInviteCode(serverCode);
        })
        .catch(() => {
          return;
        });
    }
    return local;
  };

  useEffect(() => {
    loadData();

    const storedFrame = localStorage.getItem(getFrameKey(user.id));
    if (storedFrame) setActiveFrame(storedFrame);

    const storedSkin = localStorage.getItem(getSkinKey(user.id));
    if (storedSkin) setActiveSkin(storedSkin as CardSkin);

    const handleUpdate = () => loadData();
    window.addEventListener('attendance-updated', handleUpdate);
    return () => window.removeEventListener('attendance-updated', handleUpdate);

  }, [user.id]);

  useEffect(() => {
    const unsubscribe = StorageService.subscribeStudentAppearancePrefs(
      user.id,
      (prefs) => {
        const localUpdatedAtMs = Number(localStorage.getItem(getAppearanceUpdatedKey(user.id)) || '0') || 0;
        if (prefs.updatedAtMs < localUpdatedAtMs) return;
        localStorage.setItem(getFrameKey(user.id), prefs.frameId);
        localStorage.setItem(getSkinKey(user.id), prefs.skinId);
        localStorage.setItem(getAppearanceUpdatedKey(user.id), String(prefs.updatedAtMs));
        setActiveFrame(prefs.frameId);
        setActiveSkin(prefs.skinId as CardSkin);
      },
      () => {
        return;
      }
    );
    return () => unsubscribe();
  }, [user.id]);

  useEffect(() => {
    if (!isOnline) return;
    const storedFrame = localStorage.getItem(getFrameKey(user.id));
    const storedSkin = localStorage.getItem(getSkinKey(user.id));
    if (!storedFrame || !storedSkin) return;
    const localUpdatedAtMsRaw = localStorage.getItem(getAppearanceUpdatedKey(user.id));
    const localUpdatedAtMs = Number(localUpdatedAtMsRaw || '0') || 0;
    if (localUpdatedAtMs > 0) {
      StorageService.upsertStudentAppearancePrefsToServer({
        studentId: user.id,
        frameId: storedFrame,
        skinId: storedSkin,
        updatedAtMs: localUpdatedAtMs
      }).catch(() => {
        return;
      });
      return;
    }
    StorageService.getStudentAppearancePrefsFromServer(user.id)
      .then((serverPrefs) => {
        if (serverPrefs) return;
        const now = Date.now();
        localStorage.setItem(getAppearanceUpdatedKey(user.id), String(now));
        return StorageService.upsertStudentAppearancePrefsToServer({
          studentId: user.id,
          frameId: storedFrame,
          skinId: storedSkin,
          updatedAtMs: now
        });
      })
      .catch(() => {
        return;
      });
  }, [user.id, isOnline]);

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
    return () => {
      scrollTarget.removeEventListener('scroll', onScroll);
      if (headerShadowDebounceRef.current) {
        window.clearTimeout(headerShadowDebounceRef.current);
        headerShadowDebounceRef.current = null;
      }
    };
  }, []);

  const applyFrame = (frameId: string) => {
    setActiveFrame(frameId);
    localStorage.setItem(getFrameKey(user.id), frameId);
    const updatedAtMs = Date.now();
    localStorage.setItem(getAppearanceUpdatedKey(user.id), String(updatedAtMs));
    StorageService.trackEvent('frame_selected', { studentId: user.id, frameId });
    if (isOnline) {
      StorageService.upsertStudentAppearancePrefsToServer({
        studentId: user.id,
        frameId,
        skinId: activeSkin,
        updatedAtMs
      }).catch(() => {
        return;
      });
    }
  };

  const applySkin = (skinId: CardSkin) => {
    setActiveSkin(skinId);
    localStorage.setItem(getSkinKey(user.id), skinId);
    const updatedAtMs = Date.now();
    localStorage.setItem(getAppearanceUpdatedKey(user.id), String(updatedAtMs));
    StorageService.trackEvent('skin_selected', { studentId: user.id, skinId });
    if (isOnline) {
      StorageService.upsertStudentAppearancePrefsToServer({
        studentId: user.id,
        frameId: activeFrame,
        skinId,
        updatedAtMs
      }).catch(() => {
        return;
      });
    }
  };

  // Visual Configurations
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
    legend: 'border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse',
    // New frame mappings if needed, defaulting to existing or similar
    'frame-default': 'border-color: rgba(255,255,255,0.2);',
    'frame-gold': 'border-color: #fcd34d; box-shadow: 0 0 15px rgba(252, 211, 77, 0.4);',
    'frame-neon': 'border-color: #22d3ee; box-shadow: 0 0 15px rgba(34, 211, 238, 0.4);'
  };

  const skinStyles: Record<string, string> = {
    nebula: 'bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700',
    sunset: 'bg-gradient-to-tr from-orange-400 to-rose-400',
    ocean_depths: 'bg-gradient-to-bl from-cyan-600 via-teal-600 to-emerald-800',
    magma: 'bg-gradient-to-br from-red-600 via-orange-600 to-yellow-500',
    midnight_city: 'bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900',
    cyber_grid: 'bg-[conic-gradient(at_bottom_right,_var(--tw-gradient-stops))] from-slate-900 via-emerald-900 to-black',
    royal_gold: 'bg-gradient-to-tr from-yellow-600 via-yellow-400 to-yellow-200',
    dark_matter: 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-700 via-slate-900 to-black',
    // New skin classes mapped to Tailwind utilities or keeping class names if we inject CSS
    'skin-nebula': 'skin-nebula',
    'skin-sunset': 'skin-sunset',
    'skin-ocean': 'skin-ocean',
    'skin-midnight': 'skin-midnight'
  };

  // Resolve the actual class to use. If it's a new skin (starts with skin-), use it directly. 
  // If it's an old skin, map to closest new skin or keep old style.
  const getSkinClass = (skin: string) => {
    if (skin.startsWith('skin-')) return skin;
    // Map old skins to new classes if desired, or keep old styles
    return skinStyles[skin] || skinStyles['nebula'];
  };

  const getFrameClass = (frame: string) => {
    // Logic to return Tailwind classes for frames
    return frameStyles[frame] || frameStyles['classic'];
  }

  const headerShadowStyle = { ['--sp-header-shadow-alpha' as any]: headerShadow.alpha } as React.CSSProperties;

  return (
    <div className="flex flex-col relative pb-32">
      <style>{`
        *::-webkit-scrollbar { width: 0; height: 0; }
        * { scrollbar-width: none; -ms-overflow-style: none; }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-enter { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .skin-nebula { background: linear-gradient(135deg, #4f46e5, #7c3aed, #db2777); }
        .skin-sunset { background: linear-gradient(135deg, #f59e0b, #ea580c, #db2777); }
        .skin-ocean { background: linear-gradient(135deg, #06b6d4, #3b82f6, #6366f1); }
        .skin-midnight { background: linear-gradient(135deg, #0f172a, #334155, #475569); }
        .nav-glass { background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        .card-glass { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.2); }
        .glow-shadow { box-shadow: 0 8px 20px -4px rgba(79, 70, 229, 0.4); }
        .frame-default { border-color: rgba(255,255,255,0.2); }
      `}</style>

      {/* Header */}
      <header
        id="app-header"
        style={{
          boxShadow: `0 4px 20px -2px rgba(0, 0, 0, ${headerShadow.alpha})`,
          borderColor: `rgba(226, 232, 240, ${headerShadow.enabled ? 0.6 : 0})`
        }}
        className="pt-3 pb-2 px-6 flex items-center justify-between z-40 sticky top-0 bg-[#f8fafc]/85 backdrop-blur-md transition-all duration-300 border-b border-transparent"
      >
        <div>
          <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">STUDENT PORTAL</p>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900">{user.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
          >
            {resolvedTheme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Online Status Indicator (Mini) */}
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'} shadow-sm`}></div>
          <button
            onClick={() => navigate('/announcements')}
            className="p-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95 transition-transform dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
            aria-label="Open announcements"
          >
            <Bell size={16} />
          </button>

          {/* Link Parent Button (Mini) */}
          <button
            onClick={() => {
              ensureInvite();
              setShowLinkModal(true);
            }}
            className="p-1.5 rounded-full bg-indigo-50 text-indigo-600 active:scale-95 transition-transform dark:bg-indigo-900/30 dark:text-indigo-400"
          >
            <Link2 size={16} />
          </button>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1 px-6 pb-6 space-y-5">

        {/* 1. Digital ID Card */}
        <div className="mt-2 animate-enter" style={{ animationDelay: '0.05s' }}>
          <div className="group relative w-full aspect-[1.58/1] rounded-[1.5rem] overflow-hidden shadow-2xl shadow-indigo-900/10 transition-all duration-500">

            <div id="id-card-bg" className={`absolute inset-0 transition-all duration-700 ${getSkinClass(activeSkin)}`}></div>

            <div className="absolute inset-0 opacity-15 mix-blend-overlay" style={{ backgroundImage: `url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22 opacity=%221%22/%3E%3C/svg%3E')` }}></div>

            <div className="absolute -top-[100%] -left-[100%] w-[200%] h-[200%] bg-gradient-to-br from-transparent via-white/10 to-transparent rotate-45 pointer-events-none"></div>

            <div className="relative h-full flex flex-col justify-between p-5 text-white z-10">

              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 opacity-90">
                  <div className="w-6 h-6 rounded bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <GraduationCap className="text-white w-3.5 h-3.5" strokeWidth={1.5} />
                  </div>
                  <span className="text-[10px] font-semibold tracking-widest uppercase">Apex Academy</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/60 font-medium uppercase tracking-wide">Academic Year</p>
                  <p className="text-xs font-semibold">2024 — 2025</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-1">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative group-active:scale-95 transition-transform">
                    <div id="profile-frame" className={`w-16 h-16 rounded-xl overflow-hidden border-2 bg-slate-800 transition-all duration-300 ${getFrameClass(activeFrame)}`}>
                      <img src={user.avatarUrl || getDefaultAvatarUrl(user.name || user.id, UserRole.STUDENT)} alt="Profile" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-indigo-600 flex items-center justify-center">
                      <Check className="text-white w-2.5 h-2.5" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div className="px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center gap-1">
                    <Crown className="text-amber-300 w-2.5 h-2.5" strokeWidth={1.5} />
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-amber-100">{tier}</span>
                  </div>
                </div>

                <div className="space-y-0.5">
                  <h2 className="text-xl font-semibold tracking-tight leading-none text-white shadow-sm">{user.name}</h2>
                  <p className="text-[11px] text-white/70 font-mono tracking-wide">ID: {user.schoolId || 'STU-8821-XP'}</p>
                  <div className="grid grid-cols-3 gap-2 mt-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/20 border border-white/10 text-white backdrop-blur-md">Grade {user.grade || '12'}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-white/20 border border-white/10 text-white backdrop-blur-md">{user.section || 'SCI'}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-400/20 border border-amber-400/30 text-amber-100 backdrop-blur-md">CAMPUS A</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 mt-2">
                <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>

                <div className="flex gap-2">
                  <button onClick={() => setShowCustomizeModal(true)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors active:scale-90">
                    <Palette className="text-white w-4 h-4" strokeWidth={1.5} />
                  </button>

                  <button onClick={() => setShowQrModal(true)} className="w-8 h-8 rounded-lg bg-white text-indigo-600 shadow-lg flex items-center justify-center transition-transform active:scale-90 hover:bg-indigo-50">
                    <QrCode className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 2. Today's Status */}
        <div className="animate-enter" style={{ animationDelay: '0.1s' }}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-between transition-colors">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${lastRecord?.type === 'LOGIN' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800/50' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-slate-100 dark:border-slate-800'}`}>
                <MapPin className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{lastRecord?.type === 'LOGIN' ? 'In Campus' : 'Off Campus'}</h3>
                  {lastRecord?.type === 'LOGIN' && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {lastRecord ? `Tapped ${lastRecord.type === 'LOGIN' ? 'in' : 'out'} at ${new Date(lastRecord.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'No activity today'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-800">Main Gate</span>
            </div>
          </div>
        </div>

        {/* 3. Streak */}
        <div className="animate-enter" style={{ animationDelay: '0.15s' }}>
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>

            <div className="flex justify-between items-start mb-4 relative z-10">
              <div>
                <div className="flex items-center gap-1.5 text-indigo-200 mb-1">
                  <Flame className="text-orange-400 w-4 h-4" strokeWidth={1.5} />
                  <span className="text-xs font-medium uppercase tracking-wider">Current Streak</span>
                </div>
                <span className="text-3xl font-semibold tracking-tight">{streak} Days</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-indigo-200 font-medium">Level {level}</p>
                <p className="text-lg font-semibold text-slate-200">{tier}</p>
              </div>
            </div>

            <div className="relative z-10">
              <div className="flex justify-between text-[10px] font-medium text-indigo-200 mb-1.5">
                <span>{Math.round(xpProgress)}% to Next Level</span>
                <span>Level {level}</span>
              </div>
              <div className="h-2 w-full bg-indigo-950/50 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full" style={{ width: `${xpProgress}%`, boxShadow: '0 0 10px rgba(99,102,241,0.5)' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Monthly Snapshot Grid */}
        <div className="grid grid-cols-3 gap-3 animate-enter" style={{ animationDelay: '0.2s' }}>
          <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center transition-colors">
            <span className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight mb-1">{presentDays}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase">Present</span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center transition-colors">
            <span className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight mb-1">0</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase">Absent</span>
          </div>
          <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden transition-colors">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500"></div>
            <span className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tracking-tight mb-1">100%</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase">On Time</span>
          </div>
        </div>

        {/* 5. Timeline */}
        <div className="animate-enter pb-4" style={{ animationDelay: '0.25s' }}>
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wide mb-3 pl-1">Today's Timeline</h3>
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
            <div className="relative pl-4 border-l border-slate-100 dark:border-slate-700 space-y-6">

              {history.slice(0, 3).map((record, index) => (
                <div key={record.id} className="relative group">
                  <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-white dark:bg-slate-800 border-2 ${index === 0 ? 'border-indigo-500 group-hover:scale-110' : 'border-slate-300 dark:border-slate-600'} transition-transform`}></span>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className={`text-sm ${index === 0 ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                        {record.type === 'LOGIN' ? 'Gate Entry' : 'Gate Exit'}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Main Campus Gate</p>
                    </div>
                    <span className="text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500">
                      {new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {history.length === 0 && (
                <div className="text-center text-xs text-slate-400 dark:text-slate-500 py-4">No activity recorded today</div>
              )}

            </div>
            <button className="w-full mt-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors border border-dashed border-slate-200 dark:border-slate-700">
              View Full History
            </button>
          </div>
        </div>

      </main>

      {/* Customize Modal */}
      {showCustomizeModal && (
        <div id="customize-overlay" className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 flex items-center justify-center animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 max-w-sm w-full mx-6 rounded-[2rem] shadow-2xl overflow-hidden transform transition-transform duration-300 flex flex-col max-h-[85vh] animate-in zoom-in-95">

            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800 sticky top-0 z-10">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Customize ID</h3>
              <button onClick={() => setShowCustomizeModal(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 dark:text-slate-500">
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-6">

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Card Skin</h4>
                <div className="grid grid-cols-2 gap-3">
                  {['skin-nebula', 'skin-sunset', 'skin-ocean', 'skin-midnight'].map((skin) => {
                    const isUnlocked = unlockedSkins.includes(skin as any) || unlockedSkins.includes(skin.replace('skin-', '') as any);
                    const isActive = activeSkin === skin || activeSkin === skin.replace('skin-', '');

                    return (
                      <button key={skin} onClick={() => isUnlocked && applySkin(skin as CardSkin)} disabled={!isUnlocked} className={`group relative aspect-video rounded-xl overflow-hidden ${isActive ? 'ring-offset-2 ring-2 ring-indigo-500' : 'hover:opacity-90 active:scale-95 transition-all'} ${!isUnlocked ? 'opacity-70 grayscale' : ''}`}>
                        <div className={`absolute inset-0 ${skin}`}></div>
                        <span className="absolute bottom-2 left-2 text-[10px] font-medium text-white">{skin.replace('skin-', '').charAt(0).toUpperCase() + skin.replace('skin-', '').slice(1)}</span>
                        {isActive && (
                          <div className="absolute top-2 right-2 bg-white/20 p-1 rounded-full backdrop-blur-sm">
                            <Check className="text-white w-3 h-3" strokeWidth={1.5} />
                          </div>
                        )}
                        {!isUnlocked && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center flex-col gap-1">
                            <Lock className="text-white/80 w-5 h-5" strokeWidth={1.5} />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Avatar Frame</h4>
                <div className="grid grid-cols-3 gap-3">
                  {unlockedFrames.map(frame => (
                    <button key={frame} onClick={() => applyFrame(frame)} className="flex flex-col items-center gap-2 group">
                      <div className={`w-14 h-14 rounded-xl bg-slate-800 border-2 shadow-sm overflow-hidden relative ${activeFrame === frame ? 'border-indigo-500 ring-2 ring-indigo-500 ring-offset-2' : 'border-white/20'}`}>
                        <img src={user.avatarUrl || getDefaultAvatarUrl(user.name || user.id, UserRole.STUDENT)} className={`opacity-80 object-cover w-full h-full ${getFrameClass(frame)}`} alt="" />
                        {activeFrame === frame && (
                          <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                            <Check className="text-white w-5 h-5 drop-shadow-md" />
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium capitalize ${activeFrame === frame ? 'text-indigo-600' : 'text-slate-500'}`}>{frame}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* QR Modal (Existing logic adapted) */}
      {showQrModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-5 right-5 p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors z-10"
            >
              <X size={20} />
            </button>
            <div className="text-center mt-2">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-slate-100 p-1 mb-4 shadow-inner">
                <img
                  src={user.avatarUrl || getDefaultAvatarUrl(user.name || user.id, UserRole.STUDENT)}
                  alt="Profile"
                  className="w-full h-full rounded-xl object-cover"
                />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{user.name}</h3>
              <p className="text-sm text-slate-500 font-mono tracking-wider">{user.schoolId || 'STU-8821-XP'}</p>
              <div className="my-8 flex justify-center relative">
                <div className="p-5 bg-white border-4 border-slate-900 rounded-[2rem] relative shadow-xl transform transition-transform hover:scale-105 duration-300">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${user.schoolId || 'STU-8821-XP'}`}
                    alt="Student QR"
                    className="w-48 h-48 mix-blend-multiply"
                  />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Grade Level</p>
                  <p className="text-sm font-bold text-slate-900">{user.grade ? `Grade ${user.grade}` : 'Grade 10'}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Section</p>
                  <p className="text-sm font-bold text-slate-900">{user.section || 'Newton'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLinkModal && inviteCode && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setShowLinkModal(false)}
              className="absolute top-5 right-5 p-2 bg-slate-50 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors z-10"
            >
              <X size={20} />
            </button>
            <div className="text-center mt-2">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Link Parent Account</h3>
              <p className="text-xs text-slate-500 mb-4 px-4">
                Share this code or QR with your parent or guardian so they can link to your account.
              </p>
              <div className="font-mono text-sm font-semibold tracking-widest bg-slate-900 text-white inline-flex items-center justify-center px-4 py-2 rounded-full mb-6">
                {inviteCode}
              </div>
              <div className="my-4 flex justify-center relative">
                <div className="p-4 bg-white border-4 border-slate-900 rounded-[2rem] relative shadow-xl">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteCode)}`}
                    alt="Parent Link QR"
                    className="w-40 h-40"
                  />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
              </div>
              <p className="mt-4 text-[10px] text-slate-400 px-4">
                This invite expires in about 1 hour. Your parent can enter the code or scan the QR from their SafePath app.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
