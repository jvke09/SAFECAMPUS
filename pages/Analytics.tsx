import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Download, Calendar, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { StorageService } from '../services/storageService';
import { User, AttendanceRecord } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface AnalyticsProps {
    user: User;
}

type TimeRange = 'week' | 'month' | 'year';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export const Analytics: React.FC<AnalyticsProps> = ({ user }) => {
    const { t } = useTranslation();
    const { resolvedTheme } = useTheme();
    const [timeRange, setTimeRange] = useState<TimeRange>('week');

    // Get attendance data
    const attendanceData = useMemo(() => {
        const history = StorageService.getAttendanceHistory();
        return history.filter(record => record.studentId === user.id);
    }, [user.id]);

    // Calculate weekly/monthly data
    const chartData = useMemo(() => {
        const now = new Date();
        const data: { name: string; present: number; late: number; absent: number }[] = [];

        if (timeRange === 'week') {
            // Last 7 days
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                const dayName = date.toLocaleDateString('en', { weekday: 'short' });
                const dayRecords = attendanceData.filter(r => {
                    const recordDate = new Date(r.timestamp);
                    return recordDate.toDateString() === date.toDateString();
                });
                const loginRecords = dayRecords.filter(r => r.type === 'LOGIN');
                data.push({
                    name: dayName,
                    present: loginRecords.length > 0 ? 1 : 0,
                    late: 0,
                    absent: loginRecords.length === 0 ? 1 : 0
                });
            }
        } else if (timeRange === 'month') {
            // Last 4 weeks
            for (let i = 3; i >= 0; i--) {
                const weekStart = new Date(now);
                weekStart.setDate(weekStart.getDate() - (i * 7) - 6);
                const weekEnd = new Date(now);
                weekEnd.setDate(weekEnd.getDate() - (i * 7));

                const weekRecords = attendanceData.filter(r => {
                    const recordDate = new Date(r.timestamp);
                    return recordDate >= weekStart && recordDate <= weekEnd;
                });
                const loginCount = weekRecords.filter(r => r.type === 'LOGIN').length;

                data.push({
                    name: `Week ${4 - i}`,
                    present: Math.min(loginCount, 5),
                    late: 0,
                    absent: Math.max(0, 5 - loginCount)
                });
            }
        } else {
            // Last 12 months
            for (let i = 11; i >= 0; i--) {
                const month = new Date(now);
                month.setMonth(month.getMonth() - i);
                const monthName = month.toLocaleDateString('en', { month: 'short' });

                const monthRecords = attendanceData.filter(r => {
                    const recordDate = new Date(r.timestamp);
                    return recordDate.getMonth() === month.getMonth() &&
                        recordDate.getFullYear() === month.getFullYear();
                });
                const loginCount = monthRecords.filter(r => r.type === 'LOGIN').length;

                data.push({
                    name: monthName,
                    present: loginCount,
                    late: 0,
                    absent: Math.max(0, 20 - loginCount)
                });
            }
        }

        return data;
    }, [attendanceData, timeRange]);

    // Calculate summary stats
    const stats = useMemo(() => {
        const totalLogins = attendanceData.filter(r => r.type === 'LOGIN').length;
        const totalLogouts = attendanceData.filter(r => r.type === 'LOGOUT').length;
        const avgTimeInSchool = totalLogouts > 0 ? '6h 30m' : '--'; // Placeholder calculation

        return {
            totalDays: totalLogins,
            attendanceRate: totalLogins > 0 ? Math.min(100, Math.round((totalLogins / 20) * 100)) : 0,
            avgTimeInSchool,
            streak: Math.min(totalLogins, 5) // Placeholder
        };
    }, [attendanceData]);

    // Pie chart data
    const pieData = useMemo(() => [
        { name: 'Present', value: stats.attendanceRate },
        { name: 'Absent', value: 100 - stats.attendanceRate }
    ], [stats.attendanceRate]);

    // Export to CSV
    const exportCSV = () => {
        const headers = ['Date', 'Time', 'Type', 'Status'];
        const rows = attendanceData.map(record => {
            const date = new Date(record.timestamp);
            return [
                date.toLocaleDateString(),
                date.toLocaleTimeString(),
                record.type,
                record.synced ? 'Synced' : 'Pending'
            ].join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `attendance_${user.name}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Export to PDF
    const exportPDF = () => {
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text('Attendance Report', 20, 20);

        doc.setFontSize(12);
        doc.text(`Student: ${user.name}`, 20, 35);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);

        doc.setFontSize(14);
        doc.text('Summary', 20, 60);

        doc.setFontSize(11);
        doc.text(`Total Days Present: ${stats.totalDays}`, 20, 75);
        doc.text(`Attendance Rate: ${stats.attendanceRate}%`, 20, 85);
        doc.text(`Current Streak: ${stats.streak} days`, 20, 95);

        doc.setFontSize(14);
        doc.text('Recent Records', 20, 115);

        let yPos = 130;
        attendanceData.slice(0, 10).forEach(record => {
            const date = new Date(record.timestamp);
            doc.setFontSize(10);
            doc.text(
                `${date.toLocaleDateString()} ${date.toLocaleTimeString()} - ${record.type}`,
                20,
                yPos
            );
            yPos += 10;
        });

        doc.save(`attendance_${user.name}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const isDark = resolvedTheme === 'dark';

    return (
        <div className="p-4 pb-24 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Attendance Analytics
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={exportCSV}
                        className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                        title="Export CSV"
                    >
                        <Download size={18} />
                    </button>
                    <button
                        onClick={exportPDF}
                        className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                        title="Export PDF"
                    >
                        <Download size={18} />
                    </button>
                </div>
            </div>

            {/* Time Range Selector */}
            <div className="flex gap-2 mb-6">
                {(['week', 'month', 'year'] as TimeRange[]).map((range) => (
                    <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${timeRange === range
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                    >
                        {range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'Year'}
                    </button>
                ))}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg">
                            <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Days Present</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalDays}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg">
                            <TrendingUp size={16} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Attendance Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.attendanceRate}%</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg">
                            <Clock size={16} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Avg. Time</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.avgTimeInSchool}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="bg-rose-100 dark:bg-rose-900/30 p-2 rounded-lg">
                            <Calendar size={16} className="text-rose-600 dark:text-rose-400" />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Streak</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.streak} days</p>
                </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 mb-6">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                    Attendance Trend
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                        <XAxis
                            dataKey="name"
                            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                            axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
                        />
                        <YAxis
                            tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}
                            axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: isDark ? '#1e293b' : '#fff',
                                border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                                borderRadius: '8px'
                            }}
                        />
                        <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="absent" fill="#f87171" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">
                    Overall Attendance
                </h3>
                <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                        <span className="text-xs text-slate-600 dark:text-slate-400">Absent</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
