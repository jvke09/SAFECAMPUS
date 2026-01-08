import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, BellRing, MessageCircle, Map, ChevronRight, Flame, Moon, Globe } from 'lucide-react';
import { User, UserRole } from '../types';
import { getDefaultAvatarUrl } from '../utils/avatarUtils';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { changeLanguage, languages, getCurrentLanguage } from '../i18n/config';

interface ProfileProps {
	user: User;
	onLogout: () => void;
}

const getDevMaxLevelKey = (studentId: string) => `safepath_dev_max_level_${studentId}`;

export const Profile: React.FC<ProfileProps> = ({ user, onLogout }) => {
	const navigate = useNavigate();
	const isParent = user.role === UserRole.PARENT;
	const [devMaxLevel, setDevMaxLevel] = useState(false);
	const { resolvedTheme, toggleTheme } = useTheme();
	const { t } = useTranslation();
	const [currentLang, setCurrentLang] = useState(getCurrentLanguage());

	useEffect(() => {
		if (user.role !== UserRole.STUDENT) {
			setDevMaxLevel(false);
			return;
		}
		const stored = localStorage.getItem(getDevMaxLevelKey(user.id)) === '1';
		setDevMaxLevel(stored);
	}, [user]);

	const handleToggleDevMax = () => {
		if (user.role !== UserRole.STUDENT) return;
		const next = !devMaxLevel;
		setDevMaxLevel(next);
		const key = getDevMaxLevelKey(user.id);
		if (next) {
			localStorage.setItem(key, '1');
		} else {
			localStorage.removeItem(key);
		}
	};

	const handleLanguageChange = (lang: string) => {
		changeLanguage(lang);
		setCurrentLang(lang);
	};

	return (
		<div className="p-6 pb-24 animate-in fade-in duration-500">
			<h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">{t('settings.title')}</h2>

			{/* Profile Header */}
			<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 mb-6 flex items-center gap-4">
				<img
					src={user.avatarUrl || getDefaultAvatarUrl(user.name || user.id, user.role)}
					className="w-16 h-16 rounded-full object-cover"
					alt="Profile"
				/>
				<div>
					<h3 className="font-bold text-slate-900 dark:text-white">{user.name}</h3>
					{isParent ? (
						<p className="text-xs text-slate-500 dark:text-slate-400">{t('profile.parentAccount')}</p>
					) : (
						<p className="text-xs text-slate-500 dark:text-slate-400">{t('profile.studentId')}: {user.schoolId || '2024-001'}</p>
					)}
					{isParent ? (
						<span className="inline-block mt-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded">
							{user.relationship || t('roles.guardian')}{user.occupation ? ` • ${user.occupation}` : ''}
						</span>
					) : (
						<span className="inline-block mt-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded">
							{user.grade ? `Grade ${user.grade}` : 'Grade 10'} {user.section ? `• ${user.section}` : ''}
						</span>
					)}
				</div>
				<button
					onClick={() => navigate('/edit-profile')}
					className="ml-auto text-blue-600 dark:text-blue-400 font-medium text-xs"
				>
					{t('common.edit')}
				</button>
			</div>

			{/* Settings List */}
			<div className="space-y-4">
				<div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
					<div className="p-4 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400"><BellRing size={20} /></div>
							<span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.pushNotifications')}</span>
						</div>
						<div className="w-10 h-6 bg-blue-600 rounded-full relative cursor-pointer">
							<div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
						</div>
					</div>
					<div className="p-4 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="bg-green-50 dark:bg-green-900/30 p-2 rounded-lg text-green-600 dark:text-green-400"><MessageCircle size={20} /></div>
							<span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.whatsappAlerts')}</span>
						</div>
						<div className="w-10 h-6 bg-blue-600 rounded-full relative cursor-pointer">
							<div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
						</div>
					</div>
					<div className="p-4 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded-lg text-amber-600 dark:text-amber-400"><Map size={20} /></div>
							<span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.gpsHistory')}</span>
						</div>
						<div className="w-10 h-6 bg-slate-200 dark:bg-slate-600 rounded-full relative cursor-pointer">
							<div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
						</div>
					</div>

					{/* Language Switcher */}
					<div className="p-4 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="bg-cyan-50 dark:bg-cyan-900/30 p-2 rounded-lg text-cyan-600 dark:text-cyan-400"><Globe size={20} /></div>
							<div>
								<span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t('settings.language')}</span>
								<p className="text-[11px] text-slate-400 dark:text-slate-500">{t('settings.languageDesc')}</p>
							</div>
						</div>
						<select
							value={currentLang}
							onChange={(e) => handleLanguageChange(e.target.value)}
							className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
						>
							{languages.map((lang) => (
								<option key={lang.code} value={lang.code}>{lang.nativeName}</option>
							))}
						</select>
					</div>
					{!isParent && (
						<div className="p-4 border-t border-slate-50 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="bg-purple-50 p-2 rounded-lg text-purple-600"><Flame size={20} /></div>
								<div>
									<span className="text-sm font-medium text-slate-700">Max Level Booster</span>
									<p className="text-[11px] text-slate-400">Local dev toggle to unlock all frames & skins</p>
								</div>
							</div>
							<button
								type="button"
								onClick={handleToggleDevMax}
								className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${devMaxLevel ? 'bg-purple-600' : 'bg-slate-200'}`}
							>
								<div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${devMaxLevel ? 'right-1' : 'left-1'}`}></div>
							</button>
						</div>
					)}
				</div>

				<button
					onClick={onLogout}
					className="w-full bg-red-50 text-red-600 font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
				>
					<LogOut size={20} /> Log Out
				</button>
			</div>
		</div>
	);
};
