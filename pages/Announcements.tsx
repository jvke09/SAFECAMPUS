import React, { useState } from 'react';
import { ShieldAlert, Bell, School, ArrowLeft, Siren, Clock, CloudRain, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type AlertType = 'EMERGENCY' | 'SUSPENSION' | 'DISMISSAL' | 'INFO';

interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  timestamp: string;
  sender: string;
  verified: boolean;
}

export const Announcements: React.FC = () => {
  const navigate = useNavigate();
  const [alerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'EMERGENCY',
      title: 'Earthquake Drill in Progress',
      message: 'This is a scheduled earthquake drill. Please follow standard evacuation protocols immediately. Proceed to the designated open grounds.',
      timestamp: 'Just now',
      sender: 'School Administration',
      verified: true
    },
    {
      id: '2',
      type: 'SUSPENSION',
      title: 'Classes Suspended Tomorrow',
      message: 'Due to the forecasted typhoon, all classes (Preschool to Senior High) are suspended for tomorrow, Dec 17. Stay safe.',
      timestamp: '2 hours ago',
      sender: 'Office of the Principal',
      verified: true
    },
    {
      id: '3',
      type: 'DISMISSAL',
      title: 'Early Dismissal for Grade 10',
      message: 'Grade 10 students will be dismissed at 1:00 PM today due to the faculty meeting.',
      timestamp: '5 hours ago',
      sender: 'Academic Coordinator',
      verified: true
    }
  ]);

  const getAlertStyle = (type: AlertType) => {
    switch (type) {
      case 'EMERGENCY':
        return 'bg-red-50 border-l-4 border-red-500 text-red-900';
      case 'SUSPENSION':
        return 'bg-amber-50 border-l-4 border-amber-500 text-amber-900';
      case 'DISMISSAL':
        return 'bg-blue-50 border-l-4 border-blue-500 text-blue-900';
      default:
        return 'bg-slate-50 border-l-4 border-slate-500 text-slate-900';
    }
  };

  const getIcon = (type: AlertType) => {
    switch (type) {
      case 'EMERGENCY': return <Siren className="text-red-600 animate-pulse" size={24} />;
      case 'SUSPENSION': return <CloudRain className="text-amber-600" size={24} />;
      case 'DISMISSAL': return <Clock className="text-blue-600" size={24} />;
      default: return <Info className="text-slate-600" size={24} />;
    }
  };

  return (
    <div className="min-h-full bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white sticky top-0 z-30 px-6 py-4 shadow-sm flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            School Alerts
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">Official Broadcast Channel</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Verification Badge */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-4 text-white shadow-lg shadow-indigo-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <School size={24} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-indigo-100 uppercase tracking-wider">Verified Source</p>
              <p className="font-bold">Manila Science High School</p>
            </div>
          </div>
          <ShieldAlert size={24} className="text-white/80" />
        </div>

        {/* Alerts Feed */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Recent Broadcasts</h2>
          
          {alerts.map((alert) => (
            <div 
              key={alert.id} 
              className={`p-5 rounded-2xl shadow-sm ${getAlertStyle(alert.type)} transition-all duration-300 hover:shadow-md hover:scale-[1.02]`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded-full shadow-sm">
                    {getIcon(alert.type)}
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide border ${
                      alert.type === 'EMERGENCY' ? 'bg-red-100 text-red-700 border-red-200' :
                      alert.type === 'SUSPENSION' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                      'bg-blue-100 text-blue-700 border-blue-200'
                    }`}>
                      {alert.type}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-medium opacity-60">{alert.timestamp}</span>
              </div>

              <h3 className="text-lg font-bold mb-1">{alert.title}</h3>
              <p className="text-sm opacity-90 leading-relaxed mb-4">{alert.message}</p>

              <div className="flex items-center justify-between pt-3 border-t border-black/5">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden">
                    <img src="https://ui-avatars.com/api/?name=Admin&background=random" alt="Admin" />
                  </div>
                  <span className="text-xs font-semibold opacity-75">{alert.sender}</span>
                </div>
                {alert.verified && (
                  <div className="flex items-center gap-1 text-[10px] font-bold opacity-60">
                    <ShieldAlert size={12} />
                    VERIFIED
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
