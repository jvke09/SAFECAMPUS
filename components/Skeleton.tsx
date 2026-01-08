import React from 'react';

interface SkeletonProps {
    className?: string;
}

/**
 * Base skeleton pulse animation component
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded ${className}`}></div>
);

/**
 * Circle skeleton for avatars
 */
export const SkeletonCircle: React.FC<{ size?: number; className?: string }> = ({
    size = 48,
    className = ''
}) => (
    <div
        className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-full ${className}`}
        style={{ width: size, height: size }}
    ></div>
);

/**
 * Text skeleton for single line text
 */
export const SkeletonText: React.FC<{ width?: string; className?: string }> = ({
    width = '100%',
    className = ''
}) => (
    <div
        className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded h-4 ${className}`}
        style={{ width }}
    ></div>
);

/**
 * Card skeleton for dashboard cards
 */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
            <SkeletonCircle size={40} />
            <div className="flex-1 space-y-2">
                <SkeletonText width="60%" />
                <SkeletonText width="40%" />
            </div>
        </div>
        <div className="space-y-2">
            <SkeletonText width="100%" />
            <SkeletonText width="80%" />
        </div>
    </div>
);

/**
 * Attendance item skeleton
 */
export const SkeletonAttendanceItem: React.FC = () => (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
        <SkeletonCircle size={36} />
        <div className="flex-1 space-y-2">
            <SkeletonText width="50%" />
            <SkeletonText width="30%" />
        </div>
        <Skeleton className="w-16 h-6" />
    </div>
);

/**
 * Dashboard header skeleton
 */
export const SkeletonDashboardHeader: React.FC = () => (
    <div className="p-4 bg-white dark:bg-slate-800 rounded-b-3xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <SkeletonCircle size={48} />
                <div className="space-y-2">
                    <SkeletonText width="120px" />
                    <SkeletonText width="80px" />
                </div>
            </div>
            <Skeleton className="w-10 h-10 rounded-full" />
        </div>
    </div>
);

/**
 * Profile skeleton for profile page
 */
export const SkeletonProfile: React.FC = () => (
    <div className="p-6 space-y-6">
        <SkeletonText width="100px" className="h-6" />

        {/* Profile Header */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <SkeletonCircle size={64} />
            <div className="flex-1 space-y-2">
                <SkeletonText width="60%" className="h-5" />
                <SkeletonText width="40%" />
                <Skeleton className="w-24 h-5 rounded mt-2" />
            </div>
            <Skeleton className="w-10 h-6" />
        </div>

        {/* Settings List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-4 border-b border-slate-50 dark:border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-lg" />
                        <SkeletonText width="120px" />
                    </div>
                    <Skeleton className="w-10 h-6 rounded-full" />
                </div>
            ))}
        </div>

        {/* Logout Button */}
        <Skeleton className="w-full h-14 rounded-2xl" />
    </div>
);

/**
 * Attendance list skeleton
 */
export const SkeletonAttendanceList: React.FC<{ count?: number }> = ({ count = 5 }) => (
    <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonAttendanceItem key={i} />
        ))}
    </div>
);

export default Skeleton;
