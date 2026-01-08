import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./firebase', () => {
	return {
		db: {} as any
	};
});

import { StorageService } from './storageService';
import type { AttendanceRecord } from '../types';

const makeRecord = (overrides: Partial<AttendanceRecord>): AttendanceRecord => {
	return {
		id: overrides.id || 'rec-1',
		studentId: overrides.studentId || 'student-1',
		timestamp: overrides.timestamp || Date.now(),
		type: overrides.type || 'LOGIN',
		synced: overrides.synced ?? true,
		location: overrides.location
	};
};

describe('StorageService.saveAttendanceWithDedup', () => {
	beforeEach(() => {
		localStorage.clear();
		vi.useRealTimers();
	});

	it('saves first record', () => {
		const r1 = makeRecord({ id: 'a', timestamp: 1000, type: 'LOGIN' });
		const res = StorageService.saveAttendanceWithDedup(r1);
		expect(res).toBe('saved');
		expect(StorageService.getAttendanceHistory()).toHaveLength(1);
	});

	it('merges same-type record within 60 seconds', () => {
		const r1 = makeRecord({ id: 'a', timestamp: 1000, type: 'LOGIN' });
		const r2 = makeRecord({ id: 'b', timestamp: 1000 + 59_000, type: 'LOGIN' });
		StorageService.saveAttendanceWithDedup(r1);
		const res = StorageService.saveAttendanceWithDedup(r2);
		expect(res).toBe('merged');
		const history = StorageService.getAttendanceHistory();
		expect(history).toHaveLength(1);
		expect(history[0].timestamp).toBe(r2.timestamp);
	});

	it('rejects conflicting type within 60 seconds', () => {
		const r1 = makeRecord({ id: 'a', timestamp: 1000, type: 'LOGIN' });
		const r2 = makeRecord({ id: 'b', timestamp: 1000 + 10_000, type: 'LOGOUT' });
		StorageService.saveAttendanceWithDedup(r1);
		const res = StorageService.saveAttendanceWithDedup(r2);
		expect(res).toBe('merged');
		const history = StorageService.getAttendanceHistory();
		expect(history).toHaveLength(1);
		expect(history[0].type).toBe('LOGOUT');
	});

	it('rejects outdated records', () => {
		const r1 = makeRecord({ id: 'a', timestamp: 2000, type: 'LOGIN' });
		const r2 = makeRecord({ id: 'b', timestamp: 1000, type: 'LOGOUT' });
		StorageService.saveAttendanceWithDedup(r1);
		const res = StorageService.saveAttendanceWithDedup(r2);
		expect(res).toBe('rejected_outdated');
		const history = StorageService.getAttendanceHistory();
		expect(history).toHaveLength(1);
		expect(history[0].timestamp).toBe(2000);
	});
});
