import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserRole, User, AttendanceRecord } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, CalendarClock, User as UserIcon, CreditCard, QrCode, X, ScanLine, Map as MapIcon, Bell, ShieldCheck, Camera, AlertCircle } from 'lucide-react';
import { StorageService } from '../services/storageService';
import jsQR from 'jsqr';

interface LayoutProps {
  children: React.ReactNode;
  userRole: UserRole;
  onLogout: () => void;
  isOnline: boolean;
  user: User;
}

const generateId = () => Math.random().toString(36).substr(2, 9);

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
    } catch {
      return '';
    }
  }
  return '';
};

export const Layout: React.FC<LayoutProps> = ({ children, userRole, isOnline, user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [toast, setToast] = useState<{ tone: 'success' | 'error' | 'info'; message: string } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // Camera/QR scanning refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scanningRef = useRef(false);

  const showToast = (tone: 'success' | 'error' | 'info', message: string) => {
    setToast({ tone, message });
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 2200);
  };

  const playSuccessSound = () => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.11);
      osc.onended = () => {
        ctx.close().catch(() => {
          return;
        });
      };
    } catch {
      return;
    }
  };

  // Process attendance (shared by QR scan and NFC tap)
  const processAttendance = useCallback(async (gate: string = 'main') => {
    try {
      const history = StorageService.getAttendanceHistory();
      const lastRecord = history.length > 0 ? history[0] : null;
      const newType = (!lastRecord || lastRecord.type === 'LOGOUT') ? 'LOGIN' : 'LOGOUT';

      const newRecord: AttendanceRecord = {
        id: generateId(),
        studentId: user.id,
        timestamp: Date.now(),
        type: newType,
        synced: isOnline,
        location: { lat: 14.5995, lng: 120.9842 }
      };

      if (isOnline) {
        const serverOutcome = await StorageService.saveAttendanceToServerWithValidation(newRecord);
        if (serverOutcome === 'error') {
          StorageService.addToQueue({ ...newRecord, synced: false });
          showToast('info', 'Saved offline (will sync when online)');
        }
      }

      const dedupResult = StorageService.saveAttendanceWithDedup(newRecord);

      if (dedupResult === 'saved') {
        if (isOnline) {
          StorageService.saveNotification({
            id: generateId(),
            title: `Attendance: ${newType}`,
            message: `${user.name} has ${newType === 'LOGIN' ? 'arrived at' : 'left'} school via ${gate} gate.`,
            timestamp: newRecord.timestamp,
            type: 'ATTENDANCE',
            read: false,
            studentId: user.id
          });
        } else {
          StorageService.addToQueue(newRecord);
        }
      } else if (dedupResult === 'merged') {
        if (isOnline) {
          const title = `Attendance: ${newType}`;
          const message = `${user.name} has ${newType === 'LOGIN' ? 'arrived at' : 'left'} school via ${gate} gate.`;
          const existing = StorageService.getNotifications();
          const idx = existing.findIndex(
            n => n.type === 'ATTENDANCE' && n.studentId === user.id && n.title === title
          );
          if (idx >= 0) {
            const updatedItem = { ...existing[idx], timestamp: newRecord.timestamp, message };
            const nextList = existing.slice();
            nextList.splice(idx, 1);
            nextList.unshift(updatedItem);
            StorageService.setNotifications(nextList);
          } else {
            StorageService.saveNotification({
              id: generateId(),
              title,
              message,
              timestamp: newRecord.timestamp,
              type: 'ATTENDANCE',
              read: false,
              studentId: user.id
            });
          }
        } else {
          const queue = StorageService.getQueue();
          let updated = false;
          for (let i = queue.length - 1; i >= 0; i--) {
            const q = queue[i];
            if (q.studentId !== user.id || q.type !== newType) continue;
            if (newRecord.timestamp - q.timestamp >= 60 * 1000) break;
            queue[i] = { ...q, timestamp: newRecord.timestamp };
            updated = true;
            break;
          }
          if (updated) {
            StorageService.setQueue(queue);
          }
        }
      }

      StorageService.trackEvent('attendance_qr', { studentId: user.id, type: newType, gate });

      if (dedupResult === 'saved' || dedupResult === 'merged') {
        window.dispatchEvent(new Event('attendance-updated'));
        return { success: true, type: newType, message: dedupResult === 'merged' ? 'Attendance updated' : 'Attendance recorded' };
      } else {
        return { success: true, type: newType, message: 'Already up to date' };
      }
    } catch (error) {
      return { success: false, type: null, message: 'Error recording attendance' };
    }
  }, [user.id, user.name, isOnline]);

  // Parse QR code data to extract gate info
  const parseQRData = (data: string): { valid: boolean; gate: string } => {
    // Accept formats:
    // 1. URL: https://...?action=attendance&gate=main
    // 2. Simple: SAFEPATH:GATE:main
    // 3. JSON: {"action":"attendance","gate":"main"}

    if (data.includes('action=attendance')) {
      try {
        const url = new URL(data);
        const gate = url.searchParams.get('gate') || 'main';
        return { valid: true, gate };
      } catch {
        // Try parsing from hash
        const match = data.match(/gate=([a-zA-Z0-9]+)/);
        return { valid: true, gate: match?.[1] || 'main' };
      }
    }

    if (data.startsWith('SAFEPATH:GATE:')) {
      return { valid: true, gate: data.replace('SAFEPATH:GATE:', '').toLowerCase() };
    }

    try {
      const json = JSON.parse(data);
      if (json.action === 'attendance') {
        return { valid: true, gate: json.gate || 'main' };
      }
    } catch {
      // Not JSON
    }

    // For demo: accept any QR as valid attendance
    return { valid: true, gate: 'main' };
  };

  // Stop camera and cleanup
  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start camera and QR scanning
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setScanning(true);
    scanningRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Start scanning loop
        const scanLoop = () => {
          if (!scanningRef.current || !videoRef.current || !canvasRef.current) return;

          const video = videoRef.current;
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');

          if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
            animationFrameRef.current = requestAnimationFrame(scanLoop);
            return;
          }

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data) {
            const { valid, gate } = parseQRData(code.data);

            if (valid) {
              scanningRef.current = false;
              stopCamera();

              // Process attendance
              processAttendance(gate).then(result => {
                if (result.success) {
                  setScanResult('success');
                  playSuccessSound();
                  showToast('success', result.message);
                } else {
                  setScanResult('error');
                  showToast('error', result.message);
                }

                setTimeout(() => {
                  setShowScanner(false);
                  setScanning(false);
                  setScanResult(null);
                }, 1500);
              });

              return;
            }
          }

          animationFrameRef.current = requestAnimationFrame(scanLoop);
        };

        animationFrameRef.current = requestAnimationFrame(scanLoop);
      }
    } catch (error: any) {
      setScanning(false);
      if (error.name === 'NotAllowedError') {
        setCameraError('Camera permission denied. Please allow camera access.');
      } else if (error.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError('Unable to access camera. Please try again.');
      }
    }
  }, [processAttendance, stopCamera]);

  // Handle manual gate code entry (accessibility fallback)
  const handleManualEntry = useCallback(async () => {
    if (!manualCode.trim()) {
      showToast('error', 'Please enter a gate code');
      return;
    }

    const gate = manualCode.trim().toLowerCase();
    const validGates = ['main', 'east', 'west', 'north', 'south', 'gate1', 'gate2'];

    if (!validGates.includes(gate)) {
      showToast('error', 'Invalid gate code. Try: main, east, west');
      return;
    }

    stopCamera();

    const result = await processAttendance(gate);
    if (result.success) {
      setScanResult('success');
      playSuccessSound();
      showToast('success', result.message);
    } else {
      setScanResult('error');
      showToast('error', result.message);
    }

    setTimeout(() => {
      setShowScanner(false);
      setScanning(false);
      setScanResult(null);
      setManualCode('');
      setShowManualEntry(false);
    }, 1500);
  }, [manualCode, processAttendance, stopCamera]);

  // Handle NFC tap event (from deep link)
  useEffect(() => {
    const handleNfcTap = (event: CustomEvent<{ gate: string; userId: string }>) => {
      if (userRole !== UserRole.STUDENT) return;

      const { gate } = event.detail;
      processAttendance(gate).then(result => {
        if (result.success) {
          playSuccessSound();
          showToast('success', `${result.message} via NFC tap at ${gate} gate`);
        } else {
          showToast('error', result.message);
        }
        window.dispatchEvent(new Event('attendance-updated'));
      });
    };

    window.addEventListener('attendance-nfc-tap', handleNfcTap as EventListener);
    return () => {
      window.removeEventListener('attendance-nfc-tap', handleNfcTap as EventListener);
    };
  }, [userRole, processAttendance]);

  // Auto-start camera when scanner opens (for students)
  useEffect(() => {
    if (showScanner && !scanning && !scanResult && userRole === UserRole.STUDENT) {
      startCamera();
    }

    return () => {
      if (!showScanner) {
        stopCamera();
      }
    };
  }, [showScanner, userRole, startCamera, stopCamera]);

  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;
    (async () => {
      const beforeCount = StorageService.getQueue().length;
      if (beforeCount === 0) return;
      const result = await StorageService.flushQueueToServerWithValidation().catch(() => {
        return null;
      });
      if (cancelled || !result) return;
      if (result.sent > 0) {
        window.dispatchEvent(new Event('attendance-updated'));
        playSuccessSound();
        showToast('success', `Synced ${result.sent} offline record${result.sent === 1 ? '' : 's'}`);
      } else if (result.failed > 0) {
        showToast('info', 'Still offline records pending sync');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOnline]);

  const handleScan = () => {
    // If parent, dispatch event to open student link scanner
    if (userRole === UserRole.PARENT) {
      window.dispatchEvent(new Event('open-link-student-scanner'));
      return;
    }
    // For students, just open the scanner modal (camera starts automatically via useEffect)
    setShowScanner(true);
  };

  const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
    const isActive = location.pathname === to;
    return (
      <button
        onClick={() => navigate(to)}
        className={`nav-btn group flex flex-col items-center gap-1.5 transition-colors active:scale-95 ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-600'
          }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <span
          className={`p-2 rounded-2xl transition-colors ${isActive ? 'bg-indigo-50 shadow-sm' : 'bg-transparent group-hover:bg-slate-50'
            }`}
        >
          <Icon size={22} className={`transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
        </span>
        <span className={`text-[11px] font-semibold tracking-tight ${isActive ? 'text-indigo-600' : ''}`}>{label}</span>
      </button>
    );
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 h-screen w-screen overflow-hidden flex justify-center items-center font-sans">
      {/* Mobile Container */}
      <div className="w-full max-w-md h-full bg-white dark:bg-slate-900 sm:h-[95vh] sm:rounded-[2.5rem] sm:shadow-2xl sm:border-[8px] sm:border-slate-900 overflow-hidden relative flex flex-col">

        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-amber-500 text-white text-[10px] font-bold text-center py-1 px-4 absolute top-0 w-full z-50">
            OFFLINE MODE
          </div>
        )}

        {/* Dynamic Content Area */}
        <main id="sp-scroll-container" className="flex-1 overflow-y-auto hide-scrollbar bg-slate-50 dark:bg-slate-900 relative">
          {children}
        </main>

        {toast && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[70]">
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

        {/* Bottom Navigation */}
        <nav className="bg-white/90 backdrop-blur-xl border-t border-slate-200/70 px-6 pt-2 pb-7 flex justify-between items-center z-30 relative shadow-[0_-12px_30px_rgba(15,23,42,0.08)]">
          {userRole === UserRole.PARENT ? (
            <>
              <div className="flex gap-14 items-center">
                <NavItem to="/dashboard" icon={Home} label="Home" />
                <NavItem to="/history" icon={CalendarClock} label="History" />
              </div>

              {/* Central QR Scan Button */}
              <div className="absolute left-1/2 -top-8 -translate-x-1/2">
                <button
                  onClick={() => {
                    setShowScanner(true);
                  }}
                  className="w-16 h-16 rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center text-white active:scale-95 transition-transform ring-4 ring-white overflow-hidden group bg-indigo-600 hover:bg-indigo-700"
                  aria-label="Link Student QR Scanner"
                >
                  <div className="relative">
                    <QrCode size={28} className="relative z-10 group-hover:scale-110 transition-transform duration-300" />
                    {/* Animated Scan Line Effect */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-[scan-vertical_2s_ease-in-out_infinite] rounded-full z-20"></div>
                  </div>
                </button>
              </div>

              <div className="flex gap-14 items-center">
                <NavItem to="/map" icon={MapIcon} label="Track" />
                <NavItem to="/profile" icon={UserIcon} label="Profile" />
              </div>
            </>
          ) : (
            <>
              <div className="flex gap-14 items-center">
                <NavItem to="/student-dashboard" icon={CreditCard} label="My ID" />
                <NavItem to="/map" icon={MapIcon} label="Track" />
              </div>

              {/* Central QR Scan Button */}
              <div className="absolute left-1/2 -top-8 -translate-x-1/2">
                <button
                  onClick={() => {
                    setShowScanner(true);
                  }}
                  className="w-16 h-16 rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center text-white active:scale-95 transition-transform ring-4 ring-white overflow-hidden group bg-indigo-600 hover:bg-indigo-700"
                  aria-label="Scan attendance QR"
                >
                  <div className="relative">
                    <QrCode size={28} className="relative z-10 group-hover:scale-110 transition-transform duration-300" />
                    {/* Animated Scan Line Effect */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-white/50 shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-[scan-vertical_2s_ease-in-out_infinite] rounded-full z-20"></div>
                  </div>
                </button>
              </div>

              <div className="flex gap-14 items-center">
                <NavItem to="/history" icon={CalendarClock} label="History" />
                <NavItem to="/profile" icon={UserIcon} label="Profile" />
              </div>
            </>
          )}
        </nav>

        {/* QR Scanner Overlay */}
        {showScanner && (
          <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
            <button
              onClick={() => {
                stopCamera();
                setShowScanner(false);
                setScanning(false);
                setScanResult(null);
                setCameraError(null);
              }}
              className="absolute top-6 right-6 text-white/50 hover:text-white p-2 z-10"
            >
              <X size={24} />
            </button>

            <div className="w-full max-w-xs text-center relative">
              <h3 className="text-white text-lg font-semibold mb-2">Scan Attendance QR</h3>
              <p className="text-white/60 text-sm mb-8">Point your camera at the QR code</p>

              <div className="relative aspect-square w-full rounded-3xl border-2 border-white/20 overflow-hidden bg-black mb-8">
                {/* Live Camera Video Feed */}
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />

                {/* Hidden canvas for QR processing */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Scanning Animation Line */}
                <div className={`absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] z-10 ${scanning && !scanResult ? 'animate-[scan_2s_ease-in-out_infinite]' : ''}`}></div>

                {/* Corner Markers */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl z-10"></div>
                <div className="absolute top-4 right-4 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl z-10"></div>
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl z-10"></div>
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl z-10"></div>

                {/* Camera Error State */}
                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                    <div className="text-center p-4">
                      <AlertCircle size={48} className="text-red-400 mx-auto mb-3" />
                      <p className="text-red-300 text-sm font-medium mb-4">{cameraError}</p>
                      <button
                        onClick={startCamera}
                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}

                {/* Scanning Status */}
                {scanning && !scanResult && !cameraError && (
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
                    <p className="text-white/80 text-xs font-mono font-semibold tracking-wider bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                      SCANNING...
                    </p>
                  </div>
                )}

                {/* Success State */}
                {scanResult === 'success' && (
                  <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center backdrop-blur-md animate-in fade-in z-20">
                    <div className="bg-white p-4 rounded-full shadow-xl animate-in zoom-in duration-300">
                      <ScanLine className="text-emerald-500 w-8 h-8" />
                    </div>
                  </div>
                )}

                {/* Error State */}
                {scanResult === 'error' && (
                  <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center backdrop-blur-md animate-in fade-in z-20">
                    <div className="bg-white p-4 rounded-full shadow-xl animate-in zoom-in duration-300">
                      <AlertCircle className="text-red-500 w-8 h-8" />
                    </div>
                  </div>
                )}
              </div>

              {scanResult === 'success' && (
                <div className="bg-emerald-500/20 text-emerald-300 px-4 py-3 rounded-xl text-sm font-medium animate-in slide-in-from-bottom-2 border border-emerald-500/20">
                  Attendance Recorded Successfully
                </div>
              )}

              {/* Manual Entry Toggle - Accessibility Fallback */}
              {!scanResult && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowManualEntry(!showManualEntry)}
                    className="text-white/50 text-xs font-medium hover:text-white/80 transition-colors underline underline-offset-2"
                  >
                    {showManualEntry ? 'Hide manual entry' : "Can't scan? Enter code manually"}
                  </button>

                  {showManualEntry && (
                    <div className="mt-4 animate-in slide-in-from-bottom-2 duration-200">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          placeholder="Enter gate code (e.g., main)"
                          className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/40 focus:outline-none focus:border-indigo-400 focus:bg-white/15"
                          onKeyDown={(e) => e.key === 'Enter' && handleManualEntry()}
                        />
                        <button
                          onClick={handleManualEntry}
                          className="px-4 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
                        >
                          Submit
                        </button>
                      </div>
                      <p className="text-white/40 text-[10px] mt-2">
                        Valid codes: main, east, west, north, south
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Camera Permission Note */}
            {!scanning && !scanResult && !cameraError && !showManualEntry && (
              <p className="absolute bottom-8 text-white/30 text-[10px] text-center max-w-[200px]">
                SafePath requires camera access to scan attendance QR codes.
              </p>
            )}
          </div>
        )}

      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        @keyframes scan-vertical {
          0% { top: -10%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
