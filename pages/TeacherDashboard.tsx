import React, { useEffect, useState } from 'react';
import { User, Classroom, UserRole } from '../types';
import { StorageService } from '../services/storageService';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    LogOut,
    Plus,
    Users,
    School,
    BookOpen,
    Trash2,
    Edit2,
    Calendar,
    ChevronRight,
    Search,
    X,
    CheckCircle,
    Sun,
    Moon
} from 'lucide-react';
import { AnimatedPage, AnimatedCard } from '../components/AnimatedComponents';

export const TeacherDashboard: React.FC<{ user: User }> = ({ user }) => {
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [classrooms, setClassrooms] = useState<Classroom[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // New Class Form State
    const [newClassName, setNewClassName] = useState('');
    const [newClassGrade, setNewClassGrade] = useState('');
    const [newClassSection, setNewClassSection] = useState('');
    const [newClassSubject, setNewClassSubject] = useState('');

    useEffect(() => {
        loadClassrooms();
    }, [user.id]);

    const loadClassrooms = () => {
        setIsLoading(true);
        const classes = StorageService.getClassrooms(user.id);
        setClassrooms(classes);
        setIsLoading(false);
    };

    const handleCreateClass = async () => {
        if (!newClassName || !newClassGrade || !newClassSection) return;

        const newClass: Classroom = {
            id: `class_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: newClassName,
            grade: newClassGrade,
            section: newClassSection,
            subject: newClassSubject || undefined,
            teacherId: user.id,
            studentIds: [],
            createdAt: Date.now(),
            color: 'indigo' // Default for now
        };

        await StorageService.createClassroom(newClass);
        loadClassrooms();
        setShowCreateModal(false);
        // Reset form
        setNewClassName('');
        setNewClassGrade('');
        setNewClassSection('');
        setNewClassSubject('');
    };

    const handleDeleteClass = async (classId: string) => {
        if (confirm('Are you sure you want to delete this class? This cannot be undone.')) {
            await StorageService.deleteClassroom(classId);
            loadClassrooms();
        }
    };

    const handleLogout = () => {
        StorageService.clearUser();
        window.location.reload();
    };

    return (
        <AnimatedPage className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                <School size={20} />
                            </div>
                            <span className="font-bold text-slate-900 dark:text-white">SafePath Teacher</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
                                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                            </button>
                            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
                                <img
                                    src={user.avatarUrl || "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Teacher.png"}
                                    alt="Profile"
                                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800"
                                />
                                <button onClick={handleLogout} className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors">
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome & Stats */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Welcome back, {user.name}</h1>
                    <p className="text-slate-500 dark:text-slate-400">Manage your classrooms and student attendance.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <AnimatedCard delay={0.1}>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-indigo-600 dark:text-indigo-400">
                                    <BookOpen size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Classes</p>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{classrooms.length}</h3>
                                </div>
                            </div>
                        </div>
                    </AnimatedCard>
                    <AnimatedCard delay={0.2}>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Students</p>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {classrooms.reduce((acc, curr) => acc + curr.studentIds.length, 0)}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </AnimatedCard>
                    <AnimatedCard delay={0.3}>
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-amber-600 dark:text-amber-400">
                                    <LayoutDashboard size={24} />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Average Attendance</p>
                                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">--%</h3>
                                </div>
                            </div>
                        </div>
                    </AnimatedCard>
                </div>

                {/* Classrooms Grid */}
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your Classrooms</h2>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                        <Plus size={18} />
                        Create Class
                    </button>
                </div>

                {classrooms.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-dashed border-slate-300 dark:border-slate-700">
                        <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500">
                            <School size={32} />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No classrooms yet</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">Get started by creating your first classroom to manage students and attendance.</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            <Plus size={18} />
                            Create New Class
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {classrooms.map((classroom, index) => (
                            <AnimatedCard key={classroom.id} delay={index * 0.1}>
                                <div className="group bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:shadow-md transition-all duration-300 hover:border-indigo-200 dark:hover:border-indigo-900">
                                    <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600 relative p-6">
                                        <h3 className="text-xl font-bold text-white mb-1">{classroom.name}</h3>
                                        <p className="text-indigo-100 text-sm">{classroom.grade} - {classroom.section}</p>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClass(classroom.id); }}
                                            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                                <Users size={16} />
                                                <span>{classroom.studentIds.length} Students</span>
                                            </div>
                                            {classroom.subject && (
                                                <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs rounded-md font-medium">
                                                    {classroom.subject}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="flex-1 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium rounded-lg text-sm hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                                                View Details
                                            </button>
                                            {/* Future: Add QR code gen here */}
                                        </div>
                                    </div>
                                </div>
                            </AnimatedCard>
                        ))}
                    </div>
                )}
            </main>

            {/* Create Class Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Create New Class</h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Class Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Mathematics 101"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Grade Level</label>
                                    <select
                                        value={newClassGrade}
                                        onChange={(e) => setNewClassGrade(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all dark:text-white"
                                    >
                                        <option value="">Select Grade</option>
                                        {[7, 8, 9, 10, 11, 12].map(g => (
                                            <option key={g} value={g}>Grade {g}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Section</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. A"
                                        value={newClassSection}
                                        onChange={(e) => setNewClassSection(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all dark:text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Science"
                                    value={newClassSubject}
                                    onChange={(e) => setNewClassSubject(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                            <button
                                onClick={handleCreateClass}
                                disabled={!newClassName || !newClassGrade || !newClassSection}
                                className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                            >
                                <Plus size={20} />
                                Create Classroom
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AnimatedPage>
    );
};
