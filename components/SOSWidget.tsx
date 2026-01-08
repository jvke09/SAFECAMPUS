import React, { useState } from 'react';
import { AlertTriangle, Siren, Check, X } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Notification } from '../types';

export const SOSWidget: React.FC = () => {
  const [active, setActive] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const triggerSOS = () => {
    setActive(true);
    let timer = 3;
    setCountdown(3);

    const interval = setInterval(() => {
      timer -= 1;
      setCountdown(timer);
      if (timer === 0) {
        clearInterval(interval);
        executeEmergencyProtocol();
      }
    }, 1000);

    (window as any).sosInterval = interval;
  };

  const cancelSOS = () => {
    setActive(false);
    clearInterval((window as any).sosInterval);
  };

  const executeEmergencyProtocol = () => {
    const notification: Notification = {
      id: Date.now().toString(),
      title: 'SOS ALERT',
      message: 'Emergency distress signal activated at current location.',
      timestamp: Date.now(),
      type: 'SOS',
      read: false
    };
    StorageService.saveNotification(notification);
    // Simulate alert
    // In a real app we wouldn't use alert() inside the UI flow usually, but for demo:
    // We stay in the "Emergency Mode" screen instead of closing it immediately
  };

  if (active && countdown === 0) {
      // Full Screen Emergency Mode (Post-Countdown)
      return (
        <div className="fixed inset-0 z-50 bg-red-600 text-white p-8 flex flex-col justify-between overflow-hidden animate-in fade-in duration-300">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-500 to-red-700 z-0"></div>
            
            <div className="relative z-10 text-center mt-8">
                <div className="inline-block bg-red-800/30 p-4 rounded-full mb-6 animate-pulse">
                    <Siren size={64} />
                </div>
                <h1 className="text-3xl font-bold mb-2">EMERGENCY MODE</h1>
                <p className="text-red-100">Broadcasting high-precision location.</p>
            </div>

            <div className="relative z-10 space-y-4">
                <div className="bg-white/10 backdrop-blur border border-white/20 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-white text-red-600 rounded-full flex items-center justify-center">
                        <Check size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">Parents Notified</h3>
                        <p className="text-xs text-red-100">SMS and Push Notification sent</p>
                    </div>
                </div>
                 <div className="bg-white/10 backdrop-blur border border-white/20 p-4 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-white text-red-600 rounded-full flex items-center justify-center">
                        <Check size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm">School Admin Alerted</h3>
                        <p className="text-xs text-red-100">Incident report created</p>
                    </div>
                </div>
            </div>

            <div className="relative z-10 space-y-4">
                <button onClick={() => window.location.href = "tel:911"} className="w-full bg-white text-red-600 font-bold py-4 rounded-2xl shadow-lg">
                    CALL 911
                </button>
                 <button onClick={cancelSOS} className="w-full border-2 border-white/30 text-white font-semibold py-4 rounded-2xl">
                    I AM SAFE (CANCEL)
                </button>
            </div>
        </div>
      );
  }

  if (active) {
    // Countdown Screen
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-600 bg-opacity-95 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="text-center text-white p-8">
          <div className="mb-6 animate-pulse">
            <AlertTriangle size={80} className="mx-auto mb-4" />
            <h1 className="text-4xl font-bold">SOS ACTIVATED</h1>
            <p className="text-xl mt-2">Alerting Guardians in {countdown}s...</p>
          </div>
          <button 
            onClick={cancelSOS}
            className="bg-white text-red-600 px-8 py-4 rounded-full font-bold text-xl shadow-lg active:scale-95 transition-transform flex items-center gap-2 mx-auto"
          >
            <X size={24} /> CANCEL ALERT
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={triggerSOS}
      className="fixed bottom-24 right-4 z-40 group focus:outline-none"
      aria-label="Emergency SOS"
    >
      <div className="relative flex items-center justify-center w-14 h-14 bg-red-500 rounded-full shadow-lg shadow-red-500/40 active:scale-90 transition-transform">
        <div className="sos-ring"></div>
        <Siren className="text-white relative z-10" size={24} />
      </div>
    </button>
  );
};