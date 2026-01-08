import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { AttendanceRecord, Classroom, Notification, ParentStudentLink, User, UserRole } from '../types';
import { db } from './firebase';

const STORAGE_KEYS = {
	USER: 'safepath_user',
	USER_PROFILES: 'safepath_user_profiles',
	ATTENDANCE: 'safepath_attendance',
	NOTIFICATIONS: 'safepath_notifications',
	PARENT_LINKS: 'safepath_parent_links',
	PARENT_INVITES: 'safepath_parent_invites',
	OFFLINE_QUEUE: 'safepath_offline_queue',
	ANALYTICS: 'safepath_analytics',
	CLASSROOMS: 'safepath_classrooms'
};

export const StorageService = {
	// User Persistence
	saveUser: (user: User) => {
		localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
	},
	getUser: (): User | null => {
		const data = localStorage.getItem(STORAGE_KEYS.USER);
		return data ? JSON.parse(data) : null;
	},
	clearUser: () => {
		localStorage.removeItem(STORAGE_KEYS.USER);
	},
	upsertUserProfileToServer: async (user: User) => {
		try {
			await db
				.collection('profiles')
				.doc(user.id)
				.set(
					{
						name: user.name,
						role: user.role,
						avatarUrl: user.avatarUrl,
						schoolId: user.schoolId || null,
						grade: user.grade || null,
						section: user.section || null,
						parentId: user.parentId || null,
						occupation: user.occupation || null,
						relationship: user.relationship || null,
						themePreference: user.themePreference || null,
						updatedAt: firebase.firestore.FieldValue.serverTimestamp()
					},
					{ merge: true }
				);
			StorageService.trackEvent('profile_upsert_server', { userId: user.id });
		} catch (error: any) {
			StorageService.trackEvent('profile_upsert_server_error', {
				userId: user.id,
				message: typeof error?.message === 'string' ? error.message : 'unknown'
			});
		}
	},
	getUserProfileFromServer: async (userId: string): Promise<User | null> => {
		try {
			const snap = await db.collection('profiles').doc(userId).get();
			if (!snap.exists) return null;
			const data = snap.data() as any;
			const role =
				data?.role === UserRole.PARENT || data?.role === UserRole.ADMIN || data?.role === UserRole.STUDENT
					? (data.role as UserRole)
					: UserRole.STUDENT;
			const user: User = {
				id: userId,
				name: typeof data?.name === 'string' ? data.name : 'User',
				role,
				avatarUrl: typeof data?.avatarUrl === 'string' ? data.avatarUrl : '',
				schoolId: typeof data?.schoolId === 'string' ? data.schoolId : undefined,
				grade: typeof data?.grade === 'string' ? data.grade : undefined,
				section: typeof data?.section === 'string' ? data.section : undefined,
				parentId: typeof data?.parentId === 'string' ? data.parentId : undefined,
				occupation: typeof data?.occupation === 'string' ? data.occupation : undefined,
				relationship: typeof data?.relationship === 'string' ? data.relationship : undefined,
				themePreference: typeof data?.themePreference === 'string' ? data.themePreference : undefined
			};
			return user;
		} catch (error: any) {
			StorageService.trackEvent('profile_fetch_server_error', {
				userId,
				message: typeof error?.message === 'string' ? error.message : 'unknown'
			});
			return null;
		}
	},
	subscribeLinkedStudents: (
		parentId: string,
		onUpdate: (links: ParentStudentLink[]) => void,
		onError?: (error: unknown) => void
	) => {
		StorageService.trackEvent('sync_links_subscribe', { parentId });
		return db
			.collection('parentLinks')
			.where('parentId', '==', parentId)
			.onSnapshot(
				(snapshot) => {
					const links: ParentStudentLink[] = snapshot.docs
						.map((doc) => {
							const data = doc.data() as any;
							return {
								id: doc.id,
								parentId: typeof data?.parentId === 'string' ? data.parentId : parentId,
								studentId: typeof data?.studentId === 'string' ? data.studentId : '',
								createdAt: typeof data?.createdAt === 'number' ? data.createdAt : Date.now()
							};
						})
						.filter((l) => !!l.studentId);
					onUpdate(links);
				},
				(error) => {
					StorageService.trackEvent('sync_links_subscribe_error', {
						parentId,
						message: typeof (error as any)?.message === 'string' ? (error as any).message : 'unknown'
					});
					onError?.(error);
				}
			);
	},
	subscribeAttendanceLatest: (
		studentId: string,
		onUpdate: (payload: { lastType: 'LOGIN' | 'LOGOUT'; timestamp: number; lastEventId?: string; bucketMs?: number }) => void,
		onError?: (error: unknown) => void
	) => {
		StorageService.trackEvent('sync_attendance_latest_subscribe', { studentId });
		return db
			.collection('attendanceLatest')
			.doc(studentId)
			.onSnapshot(
				(snapshot) => {
					const data = snapshot.data() as any;
					if (!data) return;
					const lastType = data?.lastType === 'LOGIN' || data?.lastType === 'LOGOUT' ? data.lastType : null;
					const timestamp = typeof data?.recordTimestamp === 'number' ? data.recordTimestamp : null;
					if (!lastType || timestamp === null) return;
					onUpdate({
						lastType,
						timestamp,
						lastEventId: typeof data?.lastEventId === 'string' ? data.lastEventId : undefined,
						bucketMs: typeof data?.bucketMs === 'number' ? data.bucketMs : undefined
					});
				},
				(error) => {
					StorageService.trackEvent('sync_attendance_latest_subscribe_error', {
						studentId,
						message: typeof (error as any)?.message === 'string' ? (error as any).message : 'unknown'
					});
					onError?.(error);
				}
			);
	},
	getStudentAppearancePrefsFromServer: async (
		studentId: string
	): Promise<{ frameId: string; skinId: string; updatedAtMs: number; version: number } | null> => {
		try {
			const snap = await db.collection('studentAppearance').doc(studentId).get();
			if (!snap.exists) return null;
			const data = snap.data() as any;
			const frameId = typeof data?.frameId === 'string' ? data.frameId : null;
			const skinId = typeof data?.skinId === 'string' ? data.skinId : null;
			const updatedAtMs = typeof data?.updatedAtMs === 'number' ? data.updatedAtMs : null;
			const version = typeof data?.version === 'number' ? data.version : 0;
			if (!frameId || !skinId || updatedAtMs === null) return null;
			return { frameId, skinId, updatedAtMs, version };
		} catch (error: any) {
			StorageService.trackEvent('student_appearance_fetch_server_error', {
				studentId,
				message: typeof error?.message === 'string' ? error.message : 'unknown'
			});
			return null;
		}
	},
	upsertStudentAppearancePrefsToServer: async (params: {
		studentId: string;
		frameId: string;
		skinId: string;
		updatedAtMs: number;
	}): Promise<'saved' | 'rejected_outdated' | 'error'> => {
		try {
			const { studentId, frameId, skinId, updatedAtMs } = params;
			const ref = db.collection('studentAppearance').doc(studentId);
			const outcome = await db.runTransaction(async (tx) => {
				const snap = await tx.get(ref);
				const data = snap.exists ? (snap.data() as any) : null;
				const existingUpdatedAtMs = typeof data?.updatedAtMs === 'number' ? data.updatedAtMs : 0;
				if (existingUpdatedAtMs > updatedAtMs) return 'rejected_outdated' as const;
				const existingVersion = typeof data?.version === 'number' ? data.version : 0;
				tx.set(
					ref,
					{
						studentId,
						frameId,
						skinId,
						updatedAtMs,
						version: existingVersion + 1,
						updatedAt: firebase.firestore.FieldValue.serverTimestamp()
					},
					{ merge: true }
				);
				return 'saved' as const;
			});

			if (outcome === 'saved') {
				StorageService.trackEvent('student_appearance_upsert_server', { studentId, versionedAt: updatedAtMs });
			} else {
				StorageService.trackEvent('student_appearance_upsert_server_rejected', { studentId, versionedAt: updatedAtMs });
			}
			return outcome;
		} catch (error: any) {
			StorageService.trackEvent('student_appearance_upsert_server_error', {
				studentId: params.studentId,
				message: typeof error?.message === 'string' ? error.message : 'unknown'
			});
			return 'error';
		}
	},
	subscribeStudentAppearancePrefs: (
		studentId: string,
		onUpdate: (prefs: { frameId: string; skinId: string; updatedAtMs: number; version: number }) => void,
		onError?: (error: unknown) => void
	) => {
		StorageService.trackEvent('student_appearance_subscribe', { studentId });
		return db
			.collection('studentAppearance')
			.doc(studentId)
			.onSnapshot(
				(snapshot) => {
					const data = snapshot.data() as any;
					if (!data) return;
					const frameId = typeof data?.frameId === 'string' ? data.frameId : null;
					const skinId = typeof data?.skinId === 'string' ? data.skinId : null;
					const updatedAtMs = typeof data?.updatedAtMs === 'number' ? data.updatedAtMs : null;
					const version = typeof data?.version === 'number' ? data.version : 0;
					if (!frameId || !skinId || updatedAtMs === null) return;
					onUpdate({ frameId, skinId, updatedAtMs, version });
				},
				(error) => {
					StorageService.trackEvent('student_appearance_subscribe_error', {
						studentId,
						message: typeof (error as any)?.message === 'string' ? (error as any).message : 'unknown'
					});
					onError?.(error);
				}
			);
	},
	subscribeNotificationsForUser: (
		userId: string,
		onUpdate: (notifications: Notification[]) => void,
		onError?: (error: unknown) => void,
		limit: number = 200
	) => {
		StorageService.trackEvent('notifications_subscribe', { userId });
		return db
			.collection('profiles')
			.doc(userId)
			.collection('notifications')
			.orderBy('timestamp', 'desc')
			.limit(limit)
			.onSnapshot(
				(snapshot) => {
					const items: Notification[] = snapshot.docs
						.map((doc) => {
							const data = doc.data() as any;
							return {
								id: doc.id,
								title: typeof data?.title === 'string' ? data.title : '',
								message: typeof data?.message === 'string' ? data.message : '',
								timestamp: typeof data?.timestamp === 'number' ? data.timestamp : 0,
								type:
									data?.type === 'INFO' || data?.type === 'ALERT' || data?.type === 'SOS' || data?.type === 'ATTENDANCE'
										? (data.type as Notification['type'])
										: 'INFO',
								read: !!data?.read,
								studentId: typeof data?.studentId === 'string' ? data.studentId : undefined,
								parentId: typeof data?.parentId === 'string' ? data.parentId : undefined,
								readAt: typeof data?.readAt === 'number' ? data.readAt : undefined
							} satisfies Notification;
						})
						.filter((n) => !!n.id && !!n.timestamp);
					onUpdate(items);
				},
				(error) => {
					StorageService.trackEvent('notifications_subscribe_error', {
						userId,
						message: typeof (error as any)?.message === 'string' ? (error as any).message : 'unknown'
					});
					onError?.(error);
				}
			);
	},
	subscribeAttendanceHistory: (
		studentId: string,
		onUpdate: (records: AttendanceRecord[]) => void,
		onError?: (error: unknown) => void,
		limit: number = 120
	) => {
		StorageService.trackEvent('sync_attendance_history_subscribe', { studentId });
		return db
			.collection('attendanceBuckets')
			.where('studentId', '==', studentId)
			.orderBy('timestamp', 'desc')
			.limit(limit)
			.onSnapshot(
				(snapshot) => {
					const records: AttendanceRecord[] = snapshot.docs
						.map<AttendanceRecord | null>((doc) => {
							const data = doc.data() as any;
							const type = data?.type === 'LOGIN' || data?.type === 'LOGOUT' ? data.type : null;
							const timestamp = typeof data?.timestamp === 'number' ? data.timestamp : null;
							const studentIdValue = typeof data?.studentId === 'string' ? data.studentId : studentId;
							if (!type || timestamp === null) return null;
							return {
								id: typeof data?.id === 'string' ? data.id : doc.id,
								studentId: studentIdValue,
								timestamp,
								type,
								synced: true,
								location: data?.location && typeof data.location?.lat === 'number' && typeof data.location?.lng === 'number'
									? { lat: data.location.lat, lng: data.location.lng }
									: undefined
							} as AttendanceRecord;
						})
						.filter((r): r is AttendanceRecord => r !== null);
					onUpdate(records);
				},
				(error) => {
					StorageService.trackEvent('sync_attendance_history_subscribe_error', {
						studentId,
						message: typeof (error as any)?.message === 'string' ? (error as any).message : 'unknown'
					});
					onError?.(error);
				}
			);
	},
	createParentInvite: (student: User, ttlMinutes: number = 60) => {
		const rawCode = Math.random().toString(36).slice(2, 10).toUpperCase();
		const code = `${rawCode}-${student.id.slice(0, 6).toUpperCase()}`;
		const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
		const data = localStorage.getItem(STORAGE_KEYS.PARENT_INVITES);
		const invites = data ? JSON.parse(data) : {};
		invites[code] = {
			code,
			studentId: student.id,
			expiresAt
		};
		localStorage.setItem(STORAGE_KEYS.PARENT_INVITES, JSON.stringify(invites));
		return code;
	},
	createParentInviteToServer: async (student: User, ttlMinutes: number = 60) => {
		const rawCode = Math.random().toString(36).slice(2, 10).toUpperCase();
		const code = `${rawCode}-${student.id.slice(0, 6).toUpperCase()}`;
		const expiresAt = Date.now() + ttlMinutes * 60 * 1000;
		await db
			.collection('parentInvites')
			.doc(code)
			.set({
				code,
				studentId: student.id,
				expiresAt,
				createdAt: Date.now(),
				updatedAt: firebase.firestore.FieldValue.serverTimestamp()
			});
		StorageService.trackEvent('invite_create_server', { studentId: student.id });
		return code;
	},
	consumeParentInvite: (code: string, parentId: string): ParentStudentLink | null => {
		const data = localStorage.getItem(STORAGE_KEYS.PARENT_INVITES);
		if (!data) return null;
		const invites = JSON.parse(data);
		const invite = invites[code];
		if (!invite) return null;
		if (invite.expiresAt < Date.now()) {
			delete invites[code];
			localStorage.setItem(STORAGE_KEYS.PARENT_INVITES, JSON.stringify(invites));
			return null;
		}
		delete invites[code];
		localStorage.setItem(STORAGE_KEYS.PARENT_INVITES, JSON.stringify(invites));
		const linkId = `${parentId}_${invite.studentId}`;
		const link: ParentStudentLink = {
			id: linkId,
			parentId,
			studentId: invite.studentId,
			createdAt: Date.now()
		};
		const linksRaw = localStorage.getItem(STORAGE_KEYS.PARENT_LINKS);
		const links: Record<string, ParentStudentLink> = linksRaw ? JSON.parse(linksRaw) : {};
		links[linkId] = link;
		localStorage.setItem(STORAGE_KEYS.PARENT_LINKS, JSON.stringify(links));
		return link;
	},
	consumeParentInviteToServer: async (code: string, parentId: string): Promise<ParentStudentLink | null> => {
		try {
			const outcome = await db.runTransaction(async (tx) => {
				const inviteRef = db.collection('parentInvites').doc(code);
				const inviteSnap = await tx.get(inviteRef);
				if (!inviteSnap.exists) return null;
				const invite = inviteSnap.data() as any;
				const studentId = typeof invite?.studentId === 'string' ? invite.studentId : null;
				const expiresAt = typeof invite?.expiresAt === 'number' ? invite.expiresAt : null;
				if (!studentId || expiresAt === null || expiresAt < Date.now()) {
					tx.delete(inviteRef);
					return null;
				}
				const linkId = `${parentId}_${studentId}`;
				const linkRef = db.collection('parentLinks').doc(linkId);
				tx.delete(inviteRef);
				tx.set(
					linkRef,
					{
						parentId,
						studentId,
						createdAt: Date.now(),
						updatedAt: firebase.firestore.FieldValue.serverTimestamp()
					},
					{ merge: true }
				);
				return {
					id: linkId,
					parentId,
					studentId,
					createdAt: Date.now()
				} satisfies ParentStudentLink;
			});
			if (!outcome) return null;
			const linksRaw = localStorage.getItem(STORAGE_KEYS.PARENT_LINKS);
			const links: Record<string, ParentStudentLink> = linksRaw ? JSON.parse(linksRaw) : {};
			links[outcome.id] = outcome;
			localStorage.setItem(STORAGE_KEYS.PARENT_LINKS, JSON.stringify(links));
			StorageService.trackEvent('invite_consume_server', { parentId });
			return outcome;
		} catch (error: any) {
			StorageService.trackEvent('invite_consume_server_error', {
				parentId,
				message: typeof error?.message === 'string' ? error.message : 'unknown'
			});
			return null;
		}
	},
	unlinkParentStudent: (parentId: string, studentId: string) => {
		const linksRaw = localStorage.getItem(STORAGE_KEYS.PARENT_LINKS);
		if (!linksRaw) return;
		const links: Record<string, ParentStudentLink> = JSON.parse(linksRaw);
		const linkId = `${parentId}_${studentId}`;
		if (!links[linkId]) return;
		delete links[linkId];
		localStorage.setItem(STORAGE_KEYS.PARENT_LINKS, JSON.stringify(links));
	},
	unlinkParentStudentFromServer: async (parentId: string, studentId: string) => {
		try {
			const linkId = `${parentId}_${studentId}`;
			await db.collection('parentLinks').doc(linkId).delete();
			StorageService.trackEvent('unlink_server', { parentId, studentId });
		} catch (error: any) {
			StorageService.trackEvent('unlink_server_error', {
				parentId,
				studentId,
				message: typeof error?.message === 'string' ? error.message : 'unknown'
			});
		}
	},
	getLinkedStudents: (parentId: string): ParentStudentLink[] => {
		const linksRaw = localStorage.getItem(STORAGE_KEYS.PARENT_LINKS);
		if (!linksRaw) return [];
		const links: Record<string, ParentStudentLink> = JSON.parse(linksRaw);
		return Object.values(links).filter(l => l.parentId === parentId);
	},
	saveAttendanceWithDedup: (
		record: AttendanceRecord,
		minIntervalSeconds: number = 60
	): 'saved' | 'merged' | 'rejected_outdated' => {
		const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
		const history: AttendanceRecord[] = data ? JSON.parse(data) : [];
		const minIntervalMs = minIntervalSeconds * 1000;
		const last = history.length > 0 ? history[0] : null;
		if (last) {
			if (record.timestamp <= last.timestamp) {
				StorageService.trackEvent('attendance_dedup_outdated', {
					studentId: record.studentId,
					prevType: last.type,
					newType: record.type
				});
				return 'rejected_outdated';
			}
			const delta = record.timestamp - last.timestamp;
			if (delta < minIntervalMs) {
				const prevType = last.type;
				last.timestamp = record.timestamp;
				last.synced = record.synced;
				last.type = record.type;
				last.location = record.location;
				localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(history));
				StorageService.trackEvent('attendance_dedup_merge', {
					studentId: record.studentId,
					prevType,
					newType: record.type
				});
				return 'merged';
			}
		}
		StorageService.saveAttendance(record);
		return 'saved';
	},
	saveAttendanceToServerWithValidation: async (
		record: AttendanceRecord
	): Promise<'saved' | 'rejected_outdated' | 'error'> => {
		try {
			const bucketMs = Math.floor(record.timestamp / 60000) * 60000;
			const bucketId = `${record.studentId}_${bucketMs}`;
			const latestRef = db.collection('attendanceLatest').doc(record.studentId);
			const bucketRef = db.collection('attendanceBuckets').doc(bucketId);

			const outcome = await db.runTransaction(async (tx) => {
				const existing = await tx.get(bucketRef);
				if (existing.exists) {
					const data = existing.data() as any;
					const existingTs = typeof data?.timestamp === 'number' ? data.timestamp : 0;
					if (existingTs > record.timestamp) {
						return 'rejected_outdated' as const;
					}
				}

				tx.set(
					bucketRef,
					{
						...record,
						id: bucketId,
						bucketMs,
						updatedAt: firebase.firestore.FieldValue.serverTimestamp()
					},
					{ merge: true }
				);
				tx.set(
					latestRef,
					{
						lastAt: firebase.firestore.FieldValue.serverTimestamp(),
						lastType: record.type,
						lastEventId: bucketId,
						bucketMs,
						recordTimestamp: record.timestamp,
						location: record.location || null
					},
					{ merge: true }
				);
				return 'saved' as const;
			});

			if (outcome === 'rejected_outdated') {
				StorageService.trackEvent('attendance_server_rejected', {
					studentId: record.studentId,
					type: record.type
				});
			}

			return outcome;
		} catch (error: any) {
			StorageService.trackEvent('attendance_server_error', {
				studentId: record.studentId,
				type: record.type,
				message: typeof error?.message === 'string' ? error.message : 'unknown'
			});
			return 'error';
		}
	},
	saveUserProfile: (user: User) => {
		const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILES);
		const profiles: Record<string, User> = data ? JSON.parse(data) : {};
		profiles[user.id] = user;
		localStorage.setItem(STORAGE_KEYS.USER_PROFILES, JSON.stringify(profiles));
	},
	getUserProfile: (userId: string): User | null => {
		const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILES);
		if (!data) return null;
		const profiles: Record<string, User> = JSON.parse(data);
		return profiles[userId] || null;
	},

	// Teacher Classroom Management
	getClassrooms: (teacherId: string): Classroom[] => {
		const data = localStorage.getItem(STORAGE_KEYS.CLASSROOMS);
		const all: Classroom[] = data ? JSON.parse(data) : [];
		return all.filter(c => c.teacherId === teacherId);
	},

	createClassroom: async (classroom: Classroom) => {
		const data = localStorage.getItem(STORAGE_KEYS.CLASSROOMS);
		const all: Classroom[] = data ? JSON.parse(data) : [];
		all.push(classroom);
		localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(all));

		try {
			await db.collection('classrooms').doc(classroom.id).set({
				...classroom,
				updatedAt: firebase.firestore.FieldValue.serverTimestamp()
			});
		} catch (error) {
			console.error('Failed to sync classroom creation:', error);
		}
	},

	updateClassroom: async (classroom: Classroom) => {
		const data = localStorage.getItem(STORAGE_KEYS.CLASSROOMS);
		const all: Classroom[] = data ? JSON.parse(data) : [];
		const updated = all.map(c => c.id === classroom.id ? classroom : c);
		localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(updated));

		try {
			await db.collection('classrooms').doc(classroom.id).set({
				...classroom,
				updatedAt: firebase.firestore.FieldValue.serverTimestamp()
			}, { merge: true });
		} catch (error) {
			console.error('Failed to sync classroom update:', error);
		}
	},

	deleteClassroom: async (classId: string) => {
		const data = localStorage.getItem(STORAGE_KEYS.CLASSROOMS);
		const all: Classroom[] = data ? JSON.parse(data) : [];
		const filtered = all.filter(c => c.id !== classId);
		localStorage.setItem(STORAGE_KEYS.CLASSROOMS, JSON.stringify(filtered));

		try {
			await db.collection('classrooms').doc(classId).delete();
		} catch (error) {
			console.error('Failed to sync classroom deletion:', error);
		}
	},

	// Offline Queue Management
	addToQueue: (record: AttendanceRecord) => {
		const queue = StorageService.getQueue();
		const bucketMs = Math.floor(record.timestamp / 60000) * 60000;
		const existingIdx = queue.findIndex((q) => {
			const qBucket = Math.floor(q.timestamp / 60000) * 60000;
			return q.studentId === record.studentId && qBucket === bucketMs;
		});
		if (existingIdx >= 0) {
			const existing = queue[existingIdx];
			if (record.timestamp > existing.timestamp) {
				queue[existingIdx] = { ...existing, ...record };
			}
		} else {
			queue.push(record);
		}
		localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
	},
	getQueue: (): AttendanceRecord[] => {
		const data = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
		return data ? JSON.parse(data) : [];
	},
	setQueue: (queue: AttendanceRecord[]) => {
		localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
	},
	clearQueue: () => {
		localStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
	},
	flushQueueToServerWithValidation: async (): Promise<{ sent: number; failed: number }> => {
		const queue = StorageService.getQueue();
		if (queue.length === 0) return { sent: 0, failed: 0 };
		const bucketKeyFor = (record: AttendanceRecord) => {
			const bucketMs = Math.floor(record.timestamp / 60000) * 60000;
			return `${record.studentId}_${bucketMs}`;
		};
		let sent = 0;
		let failed = 0;
		const remaining: AttendanceRecord[] = [];
		const syncedBuckets = new Set<string>();
		for (const record of queue) {
			const outcome = await StorageService.saveAttendanceToServerWithValidation({
				...record,
				synced: true
			});
			if (outcome === 'saved' || outcome === 'rejected_outdated') {
				sent += 1;
				syncedBuckets.add(bucketKeyFor(record));
			} else {
				failed += 1;
				remaining.push(record);
			}
		}
		StorageService.setQueue(remaining);
		if (syncedBuckets.size > 0) {
			const historyRaw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
			const history: AttendanceRecord[] = historyRaw ? JSON.parse(historyRaw) : [];
			if (history.length > 0) {
				const nextHistory = history.map((rec) => {
					if (rec.synced) return rec;
					const key = bucketKeyFor(rec);
					if (!syncedBuckets.has(key)) return rec;
					return { ...rec, synced: true };
				});
				localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(nextHistory));
			}
		}
		StorageService.trackEvent('offline_queue_flush', { sent, failed, remaining: remaining.length });
		return { sent, failed };
	},

	// Local "Database" for demo purposes
	saveAttendance: (record: AttendanceRecord) => {
		const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
		const history: AttendanceRecord[] = data ? JSON.parse(data) : [];
		// Prevent duplicates based on ID
		if (!history.find(r => r.id === record.id)) {
			history.unshift(record); // Add to top
			localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(history));
		}
	},
	getAttendanceHistory: (): AttendanceRecord[] => {
		const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
		return data ? JSON.parse(data) : [];
	},
	upsertAttendanceHistoryRecords: (records: AttendanceRecord[]) => {
		if (!records || records.length === 0) return;
		const existing = StorageService.getAttendanceHistory();
		const byId = new Map<string, AttendanceRecord>();
		existing.forEach((r) => {
			if (!r?.id) return;
			byId.set(r.id, r);
		});
		records.forEach((r) => {
			if (!r?.id) return;
			byId.set(r.id, { ...r, synced: true });
		});
		const merged = Array.from(byId.values()).sort((a, b) => b.timestamp - a.timestamp);
		localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(merged));
	},

	saveNotification: (notif: Notification) => {
		const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
		const list: Notification[] = data ? JSON.parse(data) : [];
		list.unshift(notif);
		localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
		const ownerId = notif.parentId || notif.studentId;
		if (!ownerId) return;
		try {
			void db
				.collection('profiles')
				.doc(ownerId)
				.collection('notifications')
				.doc(notif.id)
				.set(
					{
						...notif,
						updatedAt: firebase.firestore.FieldValue.serverTimestamp()
					},
					{ merge: true }
				);
		} catch {
			return;
		}
	},
	setNotifications: (notifications: Notification[]) => {
		localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
		try {
			const byOwner = new Map<string, Notification[]>();
			notifications.forEach((notif) => {
				const ownerId = notif.parentId || notif.studentId;
				if (!ownerId) return;
				const existing = byOwner.get(ownerId) || [];
				existing.push(notif);
				byOwner.set(ownerId, existing);
			});
			byOwner.forEach((items, ownerId) => {
				const batch = db.batch();
				items.forEach((notif) => {
					const ref = db.collection('profiles').doc(ownerId).collection('notifications').doc(notif.id);
					batch.set(
						ref,
						{
							...notif,
							updatedAt: firebase.firestore.FieldValue.serverTimestamp()
						},
						{ merge: true }
					);
				});
				void batch.commit();
			});
		} catch {
			return;
		}
	},
	markAllNotificationsRead: (filter?: { studentId?: string; parentId?: string }) => {
		const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
		if (!data) return;
		const list: Notification[] = JSON.parse(data);
		const now = Date.now();
		const updated = list.map(n => {
			const matchStudent = !filter?.studentId || !n.studentId || n.studentId === filter.studentId;
			const matchParent = !filter?.parentId || !n.parentId || n.parentId === filter.parentId;
			if (!matchStudent || !matchParent || n.read) return n;
			return { ...n, read: true, readAt: now };
		});
		localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updated));
		const ownerId = filter?.parentId || filter?.studentId;
		if (!ownerId) return;
		try {
			const batch = db.batch();
			updated.forEach((notif) => {
				if (!notif.read) return;
				if (filter?.studentId && notif.studentId && notif.studentId !== filter.studentId) return;
				if (filter?.parentId && notif.parentId && notif.parentId !== filter.parentId) return;
				const ref = db.collection('profiles').doc(ownerId).collection('notifications').doc(notif.id);
				batch.set(
					ref,
					{
						read: true,
						readAt: notif.readAt || now,
						updatedAt: firebase.firestore.FieldValue.serverTimestamp()
					},
					{ merge: true }
				);
			});
			void batch.commit();
		} catch {
			return;
		}
	},
	getNotifications: (): Notification[] => {
		const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
		return data ? JSON.parse(data) : [];
	},

	trackEvent: (name: string, payload: any) => {
		try {
			const data = localStorage.getItem(STORAGE_KEYS.ANALYTICS);
			let events: any[] = data ? JSON.parse(data) : [];

			// Limit to last 100 events to prevent quota exceeded errors
			if (events.length > 100) {
				events = events.slice(-100);
			}

			events.push({ name, payload, timestamp: Date.now() });
			localStorage.setItem(STORAGE_KEYS.ANALYTICS, JSON.stringify(events));
		} catch (error) {
			// Fail silently or clear if quota exceeded
			if (error instanceof DOMException && error.name === 'QuotaExceededError') {
				try {
					// Emergency clear of analytics to free space
					localStorage.removeItem(STORAGE_KEYS.ANALYTICS);
				} catch { } // Ignore cleanup errors
			}
		}
	}
};
