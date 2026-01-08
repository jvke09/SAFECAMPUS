import React, { useState, useEffect } from 'react';
import { UserRole } from '../types';
import { Mail, Lock, Eye, EyeOff, User as UserIcon, ArrowLeft, AlertCircle, Loader2, CheckCircle, GraduationCap, Users, Apple, Sun, Moon, School } from 'lucide-react';
import { authService } from '../services/authService';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: (role: UserRole, name: string, uid: string) => void;
}

type AuthMode = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';

const GoogleLogo: React.FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5.23832 14.2838L4.41557 17.3552L1.40844 17.4188C0.509752 15.752 0 13.8449 0 11.8182C0 9.85848 0.476605 8.01041 1.32142 6.38315H1.32207L3.99925 6.87397L5.17202 9.53509C4.92657 10.2507 4.79278 11.0189 4.79278 11.8182C4.79287 12.6857 4.95002 13.5169 5.23832 14.2838Z"
      fill="#FBBB00"
    />
    <path
      d="M23.4299 9.61035C23.5656 10.3253 23.6364 11.0636 23.6364 11.8181C23.6364 12.6642 23.5474 13.4896 23.3779 14.2857C22.8026 16.9948 21.2994 19.3604 19.2169 21.0344L19.2163 21.0337L15.8442 20.8617L15.367 17.8824C16.7488 17.0721 17.8287 15.8039 18.3975 14.2857H12.078V9.61035H18.4897H23.4299Z"
      fill="#518EF8"
    />
    <path
      d="M19.2162 21.0338L19.2169 21.0344C17.1916 22.6623 14.6188 23.6364 11.8182 23.6364C7.31754 23.6364 3.40457 21.1208 1.40845 17.4189L5.23832 14.2838C6.23636 16.9474 8.80584 18.8436 11.8182 18.8436C13.113 18.8436 14.326 18.4935 15.3669 17.8825L19.2162 21.0338Z"
      fill="#28B446"
    />
    <path
      d="M19.3617 2.72077L15.5332 5.85517C14.4559 5.18181 13.1825 4.79283 11.8182 4.79283C8.73771 4.79283 6.12016 6.77593 5.17212 9.53506L1.32212 6.38311H1.32147C3.28837 2.59091 7.25069 0 11.8182 0C14.6858 0 17.315 1.02144 19.3617 2.72077Z"
      fill="#F14336"
    />
  </svg>
);

const AppleLogo: React.FC = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 26 26"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clipPath="url(#clip0_3_89)">
      <path
        d="M7.66835 25.5133C7.15573 25.1723 6.70141 24.7509 6.32285 24.2653C5.90643 23.7641 5.52061 23.2383 5.16747 22.6907C4.33879 21.4767 3.68891 20.1498 3.23779 18.7509C2.69585 17.1259 2.43341 15.5683 2.43341 14.0449C2.43341 12.3435 2.80147 10.8583 3.52135 9.61025C4.05498 8.6348 4.83956 7.81965 5.79391 7.24913C6.71879 6.67467 7.78148 6.36029 8.87003 6.33913C9.2511 6.33913 9.66141 6.39438 10.0969 6.5C10.4097 6.58857 10.7908 6.72832 11.2563 6.90219C11.8487 7.1305 12.1745 7.27025 12.285 7.30438C12.6319 7.43113 12.9236 7.48638 13.1527 7.48638C13.3266 7.48638 13.572 7.43113 13.8507 7.34663C14.0075 7.29138 14.3032 7.19388 14.7265 7.01269C15.1458 6.85994 15.4757 6.72913 15.7381 6.63163C16.1403 6.513 16.5295 6.40332 16.8764 6.34807C17.2877 6.28322 17.7051 6.26605 18.1203 6.29688C18.8399 6.34391 19.5487 6.49639 20.2239 6.74944C21.3281 7.19388 22.221 7.88775 22.8857 8.87413C22.6047 9.04727 22.3411 9.24698 22.0983 9.4705C21.5699 9.93897 21.1198 10.4889 20.765 11.0996C20.3013 11.9341 20.0609 12.8741 20.0671 13.8288C20.0842 15.0012 20.3848 16.0339 20.9771 16.9268C21.4126 17.5886 21.9785 18.1545 22.6403 18.59C22.9791 18.8183 23.2708 18.9751 23.5503 19.0808C23.4195 19.487 23.2797 19.8803 23.1148 20.2703C22.7407 21.1448 22.2873 21.9833 21.7603 22.7752C21.2907 23.4569 20.9227 23.9647 20.6432 24.3027C20.2077 24.8186 19.7884 25.2127 19.3651 25.4873C18.8995 25.7961 18.3495 25.961 17.7905 25.961C17.4119 25.9755 17.0334 25.9297 16.6692 25.8253C16.3564 25.7197 16.0468 25.6051 15.7422 25.4743C15.4254 25.3288 15.0988 25.2058 14.7647 25.1063C13.939 24.8942 13.0732 24.8928 12.2468 25.1022C11.908 25.1997 11.5822 25.3134 11.2604 25.4532C10.8078 25.6433 10.5072 25.7709 10.3333 25.8253C9.98641 25.9269 9.62647 25.9903 9.26247 26.0114C8.69941 26.0114 8.17453 25.8505 7.65453 25.5247L7.66835 25.5133ZM15.0946 5.51363C14.3585 5.88169 13.6557 6.0385 12.9577 5.98732C12.848 5.2845 12.9577 4.56544 13.2494 3.77813C13.4977 3.11112 13.8647 2.49453 14.3325 1.95813C14.8265 1.39346 15.4259 0.930622 16.0972 0.595566C16.8122 0.227504 17.4939 0.0284413 18.1455 -0.000808716C18.23 0.735316 18.1455 1.45925 17.875 2.24169C17.6246 2.93336 17.2583 3.57738 16.7919 4.14619C16.3158 4.71163 15.7316 5.17627 15.0735 5.51282L15.0946 5.51363Z"
        fill="black"
      />
    </g>
    <defs>
      <clipPath id="clip0_3_89">
        <rect width="26" height="26" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

// Dynamic Color Configuration
const THEMES = {
  PARENT: {
    primary: 'bg-blue-600 dark:bg-blue-500',
    hover: 'hover:bg-blue-700 dark:hover:bg-blue-600',
    text: 'text-blue-600 dark:text-blue-400',
    textHover: 'hover:text-blue-700 dark:hover:text-blue-300',
    border: 'border-blue-600 dark:border-blue-500',
    borderFocus: 'focus:border-blue-500 dark:focus:border-blue-400',
    ringFocus: 'focus:ring-blue-200 dark:focus:ring-blue-900/50',
    light: 'bg-blue-50 dark:bg-blue-900/20',
    lightBorder: 'border-blue-100 dark:border-blue-900/50',
    shadow: 'shadow-blue-500/30 dark:shadow-blue-900/30',
    icon: 'text-blue-500 dark:text-blue-400',
    selection: 'bg-blue-50/50 text-blue-700 shadow-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:shadow-none',
    pulse: 'bg-blue-600 dark:bg-blue-500',
    accentText: 'text-blue-600 dark:text-blue-400',
    gradient: 'from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500' // Adjusted for dark mode
  },
  STUDENT: {
    primary: 'bg-emerald-500 dark:bg-emerald-500',
    hover: 'hover:bg-emerald-600 dark:hover:bg-emerald-600',
    text: 'text-emerald-600 dark:text-emerald-400',
    textHover: 'hover:text-emerald-700 dark:hover:text-emerald-300',
    border: 'border-emerald-500 dark:border-emerald-500',
    borderFocus: 'focus:border-emerald-500 dark:focus:border-emerald-500',
    ringFocus: 'focus:ring-emerald-200 dark:focus:ring-emerald-900/50',
    light: 'bg-emerald-50 dark:bg-emerald-900/20',
    lightBorder: 'border-emerald-100 dark:border-emerald-900/50',
    shadow: 'shadow-emerald-500/30 dark:shadow-emerald-900/30',
    icon: 'text-emerald-500 dark:text-emerald-400',
    selection: 'bg-emerald-50/50 text-emerald-700 shadow-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:shadow-none',
    pulse: 'bg-emerald-500 dark:bg-emerald-500',
    accentText: 'text-emerald-500 dark:text-emerald-400',
    gradient: 'from-emerald-500 to-teal-600'
  },
  REGISTER: {
    primary: 'bg-violet-600 dark:bg-violet-500',
    hover: 'hover:bg-violet-700 dark:hover:bg-violet-600',
    text: 'text-violet-600 dark:text-violet-400',
    textHover: 'hover:text-violet-700 dark:hover:text-violet-300',
    border: 'border-violet-600 dark:border-violet-500',
    borderFocus: 'focus:border-violet-500 dark:focus:border-violet-400',
    ringFocus: 'focus:ring-violet-200 dark:focus:ring-violet-900/50',
    light: 'bg-violet-50 dark:bg-violet-900/20',
    lightBorder: 'border-violet-100 dark:border-violet-900/50',
    shadow: 'shadow-violet-500/30 dark:shadow-violet-900/30',
    icon: 'text-violet-500 dark:text-violet-400',
    selection: 'bg-violet-50/50 text-violet-700 shadow-violet-100 dark:bg-violet-900/20 dark:text-violet-300 dark:shadow-none',
    pulse: 'bg-violet-600 dark:bg-violet-500',
    accentText: 'text-violet-600 dark:text-violet-400',
    gradient: 'from-violet-600 to-purple-600'
  },
  FORGOT_PASSWORD: {
    primary: 'bg-amber-500 dark:bg-amber-500',
    hover: 'hover:bg-amber-600 dark:hover:bg-amber-600',
    text: 'text-amber-600 dark:text-amber-400',
    textHover: 'hover:text-amber-700 dark:hover:text-amber-300',
    border: 'border-amber-500 dark:border-amber-500',
    borderFocus: 'focus:border-amber-500 dark:focus:border-amber-500',
    ringFocus: 'focus:ring-amber-200 dark:focus:ring-amber-900/50',
    light: 'bg-amber-50 dark:bg-amber-900/20',
    lightBorder: 'border-amber-100 dark:border-amber-900/50',
    shadow: 'shadow-amber-500/30 dark:shadow-amber-900/30',
    icon: 'text-amber-500 dark:text-amber-400',
    selection: 'bg-amber-50/50 text-amber-700 shadow-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:shadow-none',
    pulse: 'bg-amber-500 dark:bg-amber-500',
    accentText: 'text-amber-500 dark:text-amber-400',
    gradient: 'from-amber-500 to-orange-500'
  },
  TEACHER: {
    primary: 'bg-indigo-600 dark:bg-indigo-500',
    hover: 'hover:bg-indigo-700 dark:hover:bg-indigo-600',
    text: 'text-indigo-600 dark:text-indigo-400',
    textHover: 'hover:text-indigo-700 dark:hover:text-indigo-300',
    border: 'border-indigo-600 dark:border-indigo-500',
    borderFocus: 'focus:border-indigo-500 dark:focus:border-indigo-400',
    ringFocus: 'focus:ring-indigo-200 dark:focus:ring-indigo-900/50',
    light: 'bg-indigo-50 dark:bg-indigo-900/20',
    lightBorder: 'border-indigo-100 dark:border-indigo-900/50',
    shadow: 'shadow-indigo-500/30 dark:shadow-indigo-900/30',
    icon: 'text-indigo-500 dark:text-indigo-400',
    selection: 'bg-indigo-50/50 text-indigo-700 shadow-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:shadow-none',
    pulse: 'bg-indigo-600 dark:bg-indigo-500',
    accentText: 'text-indigo-600 dark:text-indigo-400',
    gradient: 'from-indigo-600 to-violet-600 dark:from-indigo-500 dark:to-violet-500'
  }
};

const BACKEND_STATUS = {
  mode: 'NORMAL',
  message: 'All systems are running normally'
};

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [role, setRole] = useState<UserRole>(UserRole.PARENT);
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Feedback State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot Password Cooldown State
  const [cooldown, setCooldown] = useState(0);
  const COOLDOWN_TIME = 30; // seconds

  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginLockSeconds, setLoginLockSeconds] = useState(0);

  // Determine current theme based on Mode first (for Register/Forgot), then Role
  let currentTheme = THEMES.PARENT;
  if (mode === 'FORGOT_PASSWORD') {
    currentTheme = THEMES.FORGOT_PASSWORD;
  } else {
    // Use Role-based theme for both LOGIN and REGISTER
    if (role === UserRole.TEACHER) {
      currentTheme = THEMES.TEACHER;
    } else if (role === UserRole.STUDENT) {
      currentTheme = THEMES.STUDENT;
    } else {
      currentTheme = THEMES.PARENT;
    }
  }

  const statusMode = BACKEND_STATUS.mode;
  const isMaintenance = statusMode === 'MAINTENANCE';
  const isRegistrationDisabled = statusMode === 'REGISTRATION_DISABLED';
  let statusClasses = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
  let dotClasses = 'bg-emerald-500';
  if (isMaintenance) {
    statusClasses = 'bg-amber-50 text-amber-700 border border-amber-200';
    dotClasses = 'bg-amber-500';
  } else if (isRegistrationDisabled) {
    statusClasses = 'bg-rose-50 text-rose-700 border border-rose-200';
    dotClasses = 'bg-rose-500';
  }

  useEffect(() => {
    let interval: any;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  useEffect(() => {
    let interval: any;
    if (loginLockSeconds > 0) {
      interval = setInterval(() => {
        setLoginLockSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [loginLockSeconds]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (mode === 'LOGIN' && loginLockSeconds > 0) {
      return;
    }
    setIsLoading(true);

    try {
      if (mode === 'LOGIN') {
        const user = await authService.login(email, password, role);

        if (!user) {
          throw new Error("Authentication failed. Please try again.");
        }

        onLogin(role, user.displayName || name || email.split('@')[0], user.uid);
        navigate(role === UserRole.PARENT ? '/dashboard' : '/student-dashboard', { replace: true });

      } else if (mode === 'REGISTER') {
        if (!name) throw new Error("Full Name is required.");
        if (!username) throw new Error("Username is required.");

        const user = await authService.register(email, password, name, role, username);

        if (!user) {
          throw new Error("Registration failed. Please try again.");
        }

        setSuccessMsg("Verification link sent! Please check your email to activate your account.");
        setMode('LOGIN');
        setPassword('');

      } else if (mode === 'FORGOT_PASSWORD') {
        await authService.resetPassword(email);
        setSuccessMsg("Reset link sent! Check your email (and spam).");
        setCooldown(COOLDOWN_TIME);
        setIsLoading(false);
        return;
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password.");
      } else if (err.code === 'auth/email-not-verified') {
        setError("Please verify your email. We have sent a new verification link.");
      } else if (err.code === 'auth/user-not-found') {
        if (mode === 'FORGOT_PASSWORD') {
          setError("No account found with this email.");
        } else {
          setError("Account not found. Please sign up.");
        }
      } else if (err.code === 'auth/email-already-in-use') {
        setError("Email already registered. Please log in.");
      } else if (err.code === 'auth/username-already-in-use') {
        setError("Username already taken. Please choose another.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Please enter a valid email address.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many attempts. Please wait a few minutes and try again.");
      } else if (err.code === 'auth/network-request-failed') {
        setError("Network error. Please check your internet connection and try again.");
      } else if (err.code === 'permission-denied' || (typeof err.message === 'string' && err.message.includes('Missing or insufficient permissions'))) {
        if (mode === 'REGISTER') {
          setError("Registrations are currently restricted. Please contact your school administrator.");
        } else {
          setError("You do not have permission to perform this action. Please contact your school administrator.");
        }
      } else if (typeof err.message === 'string' && err.message.includes('Account record missing')) {
        setError("Your account exists but is not fully set up. Please contact your school administrator.");
      } else {
        setError(err.message || "An unexpected error occurred.");
      }
      registerFailedAttempt();
      setIsLoading(false);
    }
  };

  const handleProviderLogin = async (provider: 'google' | 'apple') => {
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      let user: any;
      if (provider === 'google') {
        user = await authService.loginWithGoogle(role);
      } else {
        user = await authService.loginWithApple(role);
      }

      if (!user) {
        throw new Error('Authentication failed. Please try again.');
      }

      const fallbackName = user.email ? user.email.split('@')[0] : 'User';
      onLogin(role, user.displayName || fallbackName, user.uid);
      navigate(role === UserRole.PARENT ? '/dashboard' : '/student-dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Unable to sign in right now. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };



  function registerFailedAttempt() {
    if (mode !== 'LOGIN') {
      return;
    }
    const next = loginAttempts + 1;
    setLoginAttempts(next);
    if (next >= 5 && loginLockSeconds === 0) {
      setLoginLockSeconds(60);
      setError('Too many attempts. Please wait 60 seconds before trying again.');
    }
  }

  const toggleMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMsg(null);
    setPassword('');
  };

  return (
    <div className={`bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white h-screen w-screen overflow-hidden flex justify-center items-center font-sans transition-colors duration-500`}>
      <div className={`w-full max-w-md h-full bg-white dark:bg-slate-900 sm:h-[95vh] sm:rounded-[2.5rem] sm:shadow-2xl sm:border-[8px] transition-colors duration-500 ${mode === 'REGISTER' ? 'sm:border-violet-900 dark:sm:border-violet-900/50' : (role === UserRole.PARENT && mode !== 'FORGOT_PASSWORD' ? 'sm:border-blue-900 dark:sm:border-blue-900/50' : (mode === 'FORGOT_PASSWORD' ? 'sm:border-slate-800 dark:sm:border-slate-800' : 'sm:border-emerald-900 dark:sm:border-emerald-900/50'))} overflow-hidden relative flex flex-col`}>

        <div className="p-8 h-full flex flex-col justify-center animate-in fade-in duration-500 bg-white dark:bg-slate-900 overflow-y-auto hide-scrollbar">

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl flex items-start gap-3 animate-in shake">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-300 font-medium">{error}</p>
            </div>
          )}

          {/* Theme Toggle (Absolute Top Right) */}
          <button
            onClick={toggleTheme}
            className="absolute top-8 right-8 p-3 rounded-full bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors z-30"
          >
            {resolvedTheme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Back Button for Forgot Password/Register */}
          {mode !== 'LOGIN' && (
            <button
              onClick={() => toggleMode('LOGIN')}
              className="absolute top-8 left-8 p-2 -ml-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors z-30"
            >
              <ArrowLeft size={24} />
            </button>
          )}

          {mode !== 'FORGOT_PASSWORD' && BACKEND_STATUS.message && (
            <div className="mb-4 animate-in slide-in-from-top-2 fade-in duration-500">
              <div className={`inline-flex items-center gap-2 text-[10px] font-semibold px-3 py-1.5 mt-10 rounded-full ${statusClasses}`}>
                <span className={`w-2 h-2 rounded-full ${dotClasses} animate-pulse`}></span>
                <span>
                  {isMaintenance ? 'System: Maintenance' : isRegistrationDisabled ? 'System: Limited' : 'System: Online'}
                </span>
              </div>
            </div>
          )}

          <div className="w-full flex justify-center mb-6">
            <img
              src={
                role === UserRole.PARENT ? "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People%20with%20professions/Woman%20in%20Tuxedo%20Light%20Skin%20Tone.png" :
                  role === UserRole.TEACHER ? "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Teacher.png" :
                    "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Student.png"
              }
              alt="Icon"
              width="100"
              className="drop-shadow-lg transition-all duration-300"
            />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-2 transition-colors duration-300">
              SafeCampus<span className={`transition-colors duration-300 ${currentTheme.accentText}`}> APP</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-all duration-300">
              {mode === 'LOGIN' && (
                role === UserRole.PARENT ? 'Parent Portal Access' :
                  role === UserRole.TEACHER ? 'Teacher Portal Access' :
                    'Student ID Access'
              )}
              {mode === 'REGISTER' && 'Create New Account'}
              {mode === 'FORGOT_PASSWORD' && 'Recover Account'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">

            {/* Prominent Role Selection - Only for Login/Register */}
            {mode !== 'FORGOT_PASSWORD' && (
              <div className="mb-6 animate-in slide-in-from-top-4 fade-in duration-500">
                <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setRole(UserRole.PARENT)}
                    className={`relative py-3 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-1 ${role === UserRole.PARENT
                      ? `bg-white dark:bg-slate-700 shadow-md text-blue-700 dark:text-blue-400`
                      : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                      }`}
                  >
                    <Users size={16} />
                    <span className="text-[10px] font-bold tracking-wide">PARENT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole(UserRole.TEACHER)}
                    className={`relative py-3 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-1 ${role === UserRole.TEACHER
                      ? `bg-white dark:bg-slate-700 shadow-md text-indigo-600 dark:text-indigo-400`
                      : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                      }`}
                  >
                    <School size={16} />
                    <span className="text-[10px] font-bold tracking-wide">TEACHER</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole(UserRole.STUDENT)}
                    className={`relative py-3 rounded-xl transition-all duration-300 flex flex-col items-center justify-center gap-1 ${role === UserRole.STUDENT
                      ? `bg-white dark:bg-slate-700 shadow-md text-emerald-600 dark:text-emerald-400`
                      : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                      }`}
                  >
                    <GraduationCap size={16} />
                    <span className="text-[10px] font-bold tracking-wide">STUDENT</span>
                  </button>
                </div>
              </div>
            )}

            {/* Error / Success Messages */}
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 animate-in slide-in-from-top-2 border border-red-100">
                <AlertCircle size={18} className="shrink-0" /> <span className="flex-1">{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 animate-in slide-in-from-top-2 border border-emerald-100">
                <CheckCircle size={18} className="shrink-0" /> {successMsg}
              </div>
            )}

            {/* Full Name - Only Register */}
            {mode === 'REGISTER' && (
              <div className="animate-in slide-in-from-bottom-2 fade-in">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 ml-1 tracking-wider">FULL NAME</label>
                <div className="relative group">
                  <UserIcon className={`absolute left-4 top-3.5 w-5 h-5 transition-colors ${currentTheme.icon}`} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold focus:outline-none ${currentTheme.borderFocus} focus:bg-white transition-all shadow-sm`}
                    placeholder={role === UserRole.PARENT ? "e.g. Maria Santos" : "e.g. Juan Dela Cruz"}
                    required={mode === 'REGISTER'}
                  />
                </div>
              </div>
            )}

            {mode === 'REGISTER' && (
              <div className="animate-in slide-in-from-bottom-3 fade-in">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 ml-1 tracking-wider">USERNAME</label>
                <div className="relative group">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 text-sm font-semibold focus:outline-none ${currentTheme.borderFocus} focus:bg-white transition-all shadow-sm`}
                    placeholder="e.g. mariasantos"
                    required={mode === 'REGISTER'}
                  />
                </div>
              </div>
            )}

            {/* Email / Identifier Input */}
            <div className="animate-in slide-in-from-bottom-3 fade-in">
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 ml-1 tracking-wider">
                {mode === 'LOGIN' ? 'EMAIL OR USERNAME' : 'EMAIL ADDRESS'}
              </label>
              <div className="relative group">
                <Mail className={`absolute left-4 top-3.5 w-5 h-5 transition-colors ${currentTheme.icon}`} />
                <input
                  type={mode === 'LOGIN' ? 'text' : 'email'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-semibold focus:outline-none ${currentTheme.borderFocus} focus:bg-white transition-all shadow-sm`}
                  placeholder={mode === 'LOGIN' ? 'your email or username' : 'name@email.com'}
                  required
                />
              </div>
            </div>

            {/* Password Input - Not for Forgot Password */}
            {mode !== 'FORGOT_PASSWORD' && (
              <div className="animate-in slide-in-from-bottom-4 fade-in">
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5 ml-1 tracking-wider">PASSWORD</label>
                <div className="relative group">
                  <Lock className={`absolute left-4 top-3.5 w-5 h-5 transition-colors ${currentTheme.icon}`} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-12 pr-12 text-sm font-semibold focus:outline-none ${currentTheme.borderFocus} focus:bg-white transition-all shadow-sm`}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-4 top-3.5 text-slate-400 ${currentTheme.textHover} focus:outline-none transition-colors`}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            )}

            {/* Forgot Password Link */}
            {mode === 'LOGIN' && (
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => toggleMode('FORGOT_PASSWORD')}
                  className={`text-xs font-bold ${currentTheme.text} ${currentTheme.textHover}`}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={
                  isLoading ||
                  (mode === 'FORGOT_PASSWORD' && cooldown > 0) ||
                  (mode === 'LOGIN' && loginLockSeconds > 0)
                }
                className={`
                  w-full rounded-2xl py-4 font-bold shadow-lg transition-all relative overflow-hidden
                  ${(mode === 'FORGOT_PASSWORD' && cooldown > 0)
                    ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed border border-slate-200'
                    : `${currentTheme.primary} text-white ${currentTheme.shadow} ${currentTheme.hover} active:scale-[0.98]`
                  }
                  ${isLoading ? 'opacity-90 cursor-wait' : ''}
                `}
              >
                {/* Progress Bar Background for Cooldown */}
                {mode === 'FORGOT_PASSWORD' && cooldown > 0 && (
                  <div
                    className="absolute inset-0 bg-slate-200/50 z-0 transition-all duration-1000 ease-linear origin-left"
                    style={{ width: `${(cooldown / COOLDOWN_TIME) * 100}%` }}
                  ></div>
                )}

                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading && <Loader2 size={20} className="animate-spin" />}

                  {!isLoading && (
                    mode === 'LOGIN' ? (
                      role === UserRole.PARENT ? 'PARENT LOGIN' :
                        role === UserRole.TEACHER ? 'TEACHER LOGIN' :
                          'STUDENT LOGIN'
                    ) :
                      mode === 'REGISTER' ? (
                        role === UserRole.TEACHER ? 'CREATE TEACHER ACCOUNT' :
                          role === UserRole.PARENT ? 'CREATE PARENT ACCOUNT' :
                            'CREATE STUDENT ACCOUNT'
                      ) :
                        cooldown > 0 ? `RESEND LINK IN ${cooldown}s` : 'SEND RESET LINK'
                  )}
                </span>
              </button>
            </div>
          </form>

          {mode !== 'FORGOT_PASSWORD' && (
            <div className="mt-8 text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800 transition-colors"></div></div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest"><span className="bg-white dark:bg-slate-900 px-2 text-slate-300 dark:text-slate-500 transition-colors">Or Continue With</span></div>
              </div>

              {mode === 'LOGIN' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleProviderLogin('google')}
                      disabled={isLoading || loginLockSeconds > 0}
                      className="w-12 h-12 flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all"
                      aria-label="Continue with Google"
                    >
                      <GoogleLogo />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProviderLogin('apple')}
                      disabled={isLoading || loginLockSeconds > 0}
                      className="w-12 h-12 flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md transition-all text-slate-900 dark:text-white"
                      aria-label="Continue with Apple"
                    >
                      <AppleLogo />
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => toggleMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
                className={`text-sm font-semibold text-slate-600 ${currentTheme.textHover} transition-colors`}
              >
                {mode === 'LOGIN' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
