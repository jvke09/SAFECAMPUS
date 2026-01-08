import React, { useEffect, useMemo, useState } from 'react';
import { StorageService } from '../services/storageService';
import { AttendanceRecord, User, UserRole } from '../types';
import { LogIn, LogOut, Calendar } from 'lucide-react';

type AttendanceHistoryProps = {
	user: User;
	isOnline: boolean;
};

const getActiveStudentKey = (parentId: string) => `safepath_parent_active_student_${parentId}`;

export const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({ user, isOnline }) => {
	const [history, setHistory] = useState<AttendanceRecord[]>([]);

	const targetStudentId = useMemo(() => {
		if (user.role === UserRole.STUDENT) return user.id;
		if (user.role !== UserRole.PARENT) return user.id;
		const links = StorageService.getLinkedStudents(user.id);
		if (links.length === 0) return null;
		const activeKey = getActiveStudentKey(user.id);
		const storedActiveId = localStorage.getItem(activeKey);
		const activeFromStorage = storedActiveId && links.some((l) => l.studentId === storedActiveId) ? storedActiveId : null;
		return activeFromStorage || links[0].studentId;
	}, [user.id, user.role]);

	const readLocalHistory = useMemo(() => {
		return (studentId: string | null): AttendanceRecord[] => {
			if (!studentId) return [];
			return StorageService.getAttendanceHistory().filter((r) => r.studentId === studentId);
		};
	}, []);

	useEffect(() => {
		setHistory(readLocalHistory(targetStudentId));
	}, [readLocalHistory, targetStudentId]);

	useEffect(() => {
		if (!targetStudentId) return;
		const handleUpdate = () => {
			setHistory(readLocalHistory(targetStudentId));
		};
		window.addEventListener('attendance-updated', handleUpdate);
		return () => window.removeEventListener('attendance-updated', handleUpdate);
	}, [readLocalHistory, targetStudentId]);

	useEffect(() => {
		if (!isOnline) return;
		if (!targetStudentId) return;
		const unsubscribe = StorageService.subscribeAttendanceHistory(
			targetStudentId,
			(records) => {
				StorageService.upsertAttendanceHistoryRecords(records);
				setHistory(readLocalHistory(targetStudentId));
			},
			() => {
				return;
			}
		);
		return () => unsubscribe();
	}, [isOnline, readLocalHistory, targetStudentId]);

	const groupedHistory = history.reduce((acc, record) => {
		const dateKey = new Date(record.timestamp).toLocaleDateString();
		if (!acc[dateKey]) acc[dateKey] = [];
		acc[dateKey].push(record);
		return acc;
	}, {} as Record<string, AttendanceRecord[]>);

	// Mock days for the top scroll
	const days = [
		{ day: 'Mon', date: '12', active: true },
		{ day: 'Tue', date: '13', active: false },
		{ day: 'Wed', date: '14', active: false },
		{ day: 'Thu', date: '15', active: false },
		{ day: 'Fri', date: '16', active: false }
	];

	return (
		<div className="p-6 pb-24 animate-in fade-in duration-500">
			<h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">Attendance History</h2>

			{/* Horizontal Date Scroll */}
			<div className="flex justify-between mb-2 overflow-x-auto pb-5 hide-scrollbar">
				{days.map((d, i) => (
					<div
						key={i}
						className={`flex flex-col items-center gap-2 min-w-[70px] p-2 rounded-xl border transition-colors ${d.active
							? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 border-blue-600'
							: 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500'
							}`}
					>
						<span className="text-xs font-medium">{d.day}</span>
						<span className="text-lg font-bold">{d.date}</span>
					</div>
				))}
			</div>

			<div className="space-y-6">
				{Object.keys(groupedHistory).length === 0 && (
					<div className="text-center py-10 opacity-50">
						<Calendar size={48} className="mx-auto mb-2 text-slate-300" />
						<p className="text-slate-400">No records found</p>
					</div>
				)}

				{Object.entries(groupedHistory).map(([date, records]) => (
					<div key={date}>
						<h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
							{date === new Date().toLocaleDateString() ? 'Today' : date}
						</h3>
						{records.map((item) => (
							<div
								key={item.id}
								className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 mb-3 transition-colors"
							>
								<div
									className={`w-12 h-12 ${item.type === 'LOGIN' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
										} rounded-2xl flex items-center justify-center`}
								>
									{item.type === 'LOGIN' ? <LogIn size={24} /> : <LogOut size={24} />}
								</div>
								<div>
									<h4 className="text-sm font-bold text-slate-900 dark:text-white">{item.type === 'LOGIN' ? 'Time In' : 'Time Out'}</h4>
									<p className="text-xs text-slate-500 dark:text-slate-400">Northridge Academy</p>
								</div>
								<div className="ml-auto bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
									<p className="text-xs font-bold text-slate-700 dark:text-slate-300">
										{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
									</p>
								</div>
							</div>
						))}
					</div>
				))}
			</div>
		</div>
	);
};
