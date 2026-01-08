import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { ParentDashboard } from './pages/ParentDashboard';
import { StudentDashboard } from './pages/StudentDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { MapTracking } from './pages/MapTracking';
import { AttendanceHistory } from './pages/AttendanceHistory';
import { Profile } from './pages/Profile';
import { EditProfile } from './pages/EditProfile';
import { Announcements } from './pages/Announcements';
import { Analytics } from './pages/Analytics';
import { SOSWidget } from './components/SOSWidget';
import { StorageService } from './services/storageService';
import { User, UserRole } from './types';
import { useTheme } from './contexts/ThemeContext';

// NFC/QR Deep Link Handler Component
const DeepLinkHandler: React.FC<{ user: User | null }> = ({ user }) => {
  const location = useLocation();

  useEffect(() => {
    // Parse URL hash for deep link parameters
    // Format: /#/scan?action=attendance&gate=main
    const hash = window.location.hash;
    const queryStart = hash.indexOf('?');

    if (queryStart === -1) return;

    const queryString = hash.substring(queryStart);
    const params = new URLSearchParams(queryString);
    const action = params.get('action');
    const gate = params.get('gate') || 'main';

    if (action === 'attendance' && user) {
      // Dispatch event for attendance recording via NFC tap
      window.dispatchEvent(new CustomEvent('attendance-nfc-tap', {
        detail: { gate, userId: user.id, userName: user.name }
      }));

      // Clear the URL params after handling
      const cleanHash = hash.substring(0, queryStart > 0 ? queryStart : hash.length);
      window.history.replaceState(null, '', cleanHash || '#/');
    }
  }, [location, user]);

  return null;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { theme, setTheme } = useTheme();


  useEffect(() => {
    const storedUser = StorageService.getUser();
    if (storedUser) setUser(storedUser);

    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = (role: UserRole, name: string, uid: string) => {
    const existingProfile = StorageService.getUserProfile(uid);
    const newUser: User = {
      id: uid,
      name: existingProfile?.name || name,
      role,
      avatarUrl: existingProfile?.avatarUrl || '',
      schoolId:
        existingProfile?.schoolId || (role === UserRole.STUDENT ? '2023-0192' : undefined),
      parentId: existingProfile?.parentId,
      grade: existingProfile?.grade,
      section: existingProfile?.section
    };
    StorageService.saveUser(newUser);
    StorageService.saveUserProfile(newUser);
    StorageService.upsertUserProfileToServer(newUser).catch(() => {
      return;
    });
    setUser(newUser);
  };

  const handleLogout = () => {
    StorageService.clearUser();
    setUser(null);
  };

  const handleUserUpdate = (updatedUser: User) => {
    StorageService.saveUser(updatedUser);
    StorageService.saveUserProfile(updatedUser);
    StorageService.upsertUserProfileToServer(updatedUser).catch(() => {
      return;
    });
    setUser(updatedUser);
  };

  // Sync User Preference to App (On Login)
  useEffect(() => {
    if (user && user.themePreference) {
      setTheme(user.themePreference);
    }
  }, [user?.id]); // Only run on login/user switch, NOT on every update to prevent loops

  // Sync App Theme to User Preference (On Toggle)
  useEffect(() => {
    if (user && theme && user.themePreference !== theme) {
      const updatedUser = { ...user, themePreference: theme };
      handleUserUpdate(updatedUser);
    }
  }, [theme]); // Sync when theme changes manually

  return (
    <Router>
      <DeepLinkHandler user={user} />
      <div className="antialiased text-gray-900">
        {!user ? (
          <Login onLogin={handleLogin} />
        ) : user.role === UserRole.TEACHER ? (
          <Routes>
            <Route path="/" element={<Navigate to="/teacher-dashboard" replace />} />
            <Route path="/teacher-dashboard" element={<TeacherDashboard user={user} />} />
            {/* Reuse Profile or create TeacherProfile later if needed */}
            <Route path="/profile" element={<Profile user={user} onLogout={handleLogout} />} />
            <Route path="*" element={<Navigate to="/teacher-dashboard" replace />} />
          </Routes>
        ) : (
          <Layout user={user} userRole={user.role} onLogout={handleLogout} isOnline={isOnline}>
            <Routes>
              {user.role === UserRole.PARENT ? (
                <>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<ParentDashboard user={user} />} />
                  <Route path="/map" element={<MapTracking />} />
                  <Route path="/history" element={<AttendanceHistory user={user} isOnline={isOnline} />} />
                  <Route path="/analytics" element={<Analytics user={user} />} />
                  <Route path="/profile" element={<Profile user={user} onLogout={handleLogout} />} />
                  <Route path="/edit-profile" element={<EditProfile user={user} onUpdate={handleUserUpdate} />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </>
              ) : (
                <>
                  <Route path="/" element={<Navigate to="/student-dashboard" replace />} />
                  <Route path="/student-dashboard" element={<StudentDashboard user={user} isOnline={isOnline} />} />
                  <Route path="/map" element={<MapTracking />} />
                  <Route path="/history" element={<AttendanceHistory user={user} isOnline={isOnline} />} />
                  <Route path="/analytics" element={<Analytics user={user} />} />
                  <Route path="/announcements" element={<Announcements />} />
                  <Route path="/profile" element={<Profile user={user} onLogout={handleLogout} />} />
                  <Route path="/edit-profile" element={<EditProfile user={user} onUpdate={handleUserUpdate} />} />
                  <Route path="*" element={<Navigate to="/student-dashboard" replace />} />
                </>
              )}
            </Routes>
            {user.role === UserRole.STUDENT && <SOSWidget />}
          </Layout>
        )}
      </div>
    </Router>
  );
}

export default App;
