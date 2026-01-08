import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ParentDashboard } from './ParentDashboard';
import { StudentDashboard } from './StudentDashboard';
import { ParentStudentLink, User, UserRole } from '../types';
import { StorageService } from '../services/storageService';

vi.mock('../services/storageService', () => {
	return {
		StorageService: {
			getLinkedStudents: vi.fn<[], ParentStudentLink[]>(() => []),
			getUserProfile: vi.fn<[string], User | null>(() => null),
			getUserProfileFromServer: vi.fn<[string], Promise<User | null>>(() => Promise.resolve(null)),
			getAttendanceHistory: vi.fn(() => []),
			getNotifications: vi.fn(() => []),
			consumeParentInvite: vi.fn(() => null),
			consumeParentInviteToServer: vi.fn(() => Promise.resolve(null)),
			unlinkParentStudent: vi.fn(() => {}),
			unlinkParentStudentFromServer: vi.fn(() => Promise.resolve()),
			subscribeLinkedStudents: vi.fn(() => () => {}),
			subscribeAttendanceLatest: vi.fn(() => () => {}),
			subscribeStudentAppearancePrefs: vi.fn(() => () => {}),
			getStudentAppearancePrefsFromServer: vi.fn(() => Promise.resolve(null)),
			upsertStudentAppearancePrefsToServer: vi.fn(() => Promise.resolve('saved')),
			saveUserProfile: vi.fn(() => {}),
			saveNotification: vi.fn(() => {}),
			markAllNotificationsRead: vi.fn(() => {}),
			trackEvent: vi.fn(() => {}),
		}
	};
});

const mockedStorage = StorageService as any;

const renderWithRouter = (ui: React.ReactElement) => {
	return render(<BrowserRouter>{ui}</BrowserRouter>);
};

const parentUser: User = {
	id: 'parent-1',
	name: 'Parent User',
	role: UserRole.PARENT,
	avatarUrl: '',
};

	describe('ParentDashboard linked state', () => {
		beforeEach(() => {
			mockedStorage.getLinkedStudents.mockReturnValue([]);
			mockedStorage.getUserProfile.mockReturnValue(null);
			mockedStorage.getUserProfileFromServer.mockResolvedValue(null);
			mockedStorage.getAttendanceHistory.mockReturnValue([]);
			mockedStorage.getNotifications.mockReturnValue([]);
			mockedStorage.consumeParentInviteToServer.mockResolvedValue(null);
			mockedStorage.unlinkParentStudentFromServer.mockResolvedValue();
			mockedStorage.subscribeLinkedStudents.mockImplementation((_parentId, onUpdate) => {
				onUpdate([]);
				return () => {};
			});
			mockedStorage.subscribeAttendanceLatest.mockImplementation(() => () => {});
		});

		it('shows not linked status when there is no linked student', async () => {
			renderWithRouter(<ParentDashboard user={parentUser} />);
			expect(await screen.findByText(/not linked/i)).toBeTruthy();
		});
	});

describe('ParentDashboard quick actions and unlink flow', () => {
	const student: User = {
		id: 'student-1',
		name: 'Alex Anderson',
		role: UserRole.STUDENT,
		avatarUrl: '',
		schoolId: 'STU-1234',
	};

	beforeEach(() => {
		mockedStorage.getLinkedStudents.mockReturnValue([
			{
				id: 'parent-1_student-1',
				parentId: 'parent-1',
				studentId: 'student-1',
				createdAt: Date.now(),
			},
		]);
		mockedStorage.getUserProfile.mockImplementation((id: string) => (id === 'student-1' ? student : null));
		mockedStorage.getUserProfileFromServer.mockResolvedValue(null);
		mockedStorage.getAttendanceHistory.mockReturnValue([]);
		mockedStorage.getNotifications.mockReturnValue([]);
		mockedStorage.consumeParentInviteToServer.mockResolvedValue(null);
		mockedStorage.unlinkParentStudentFromServer.mockResolvedValue();
		mockedStorage.subscribeLinkedStudents.mockImplementation((_parentId, onUpdate) => {
			onUpdate(mockedStorage.getLinkedStudents());
			return () => {};
		});
		mockedStorage.subscribeAttendanceLatest.mockImplementation(() => () => {});
	});

	it('renders quick actions using the active student name', async () => {
		renderWithRouter(<ParentDashboard user={parentUser} />);
		await screen.findAllByText(/Alex Anderson/i);
		expect(screen.getByRole('button', { name: /locate alex anderson on map/i })).toBeTruthy();
		expect(screen.getByRole('button', { name: /call regarding alex anderson/i })).toBeTruthy();
		expect(screen.getByRole('button', { name: /message about alex anderson/i })).toBeTruthy();
	});

	it('opens unlink confirmation and calls unlink service on confirm', async () => {
		renderWithRouter(<ParentDashboard user={parentUser} />);
		await screen.findAllByText(/Alex Anderson/i);
		const unlinkButton = screen.getByRole('button', {
			name: /unlink alex anderson from this parent account/i,
		});
		fireEvent.click(unlinkButton);
		const confirmButton = await screen.findByTestId('confirm-unlink');
		fireEvent.click(confirmButton);
		await waitFor(() => {
			expect(mockedStorage.unlinkParentStudent).toHaveBeenCalledWith('parent-1', 'student-1');
		});
	});
});

describe('ParentDashboard notifications dropdown', () => {
	const student: User = {
		id: 'student-notif',
		name: 'Notif Student',
		role: UserRole.STUDENT,
		avatarUrl: '',
		schoolId: 'STU-9999',
	};

	beforeEach(() => {
		mockedStorage.getLinkedStudents.mockReturnValue([
			{
				id: 'parent-1_student-notif',
				parentId: 'parent-1',
				studentId: 'student-notif',
				createdAt: Date.now(),
			},
		]);
		mockedStorage.getUserProfile.mockImplementation((id: string) => (id === 'student-notif' ? student : null));
		mockedStorage.getUserProfileFromServer.mockResolvedValue(null);
		mockedStorage.getAttendanceHistory.mockReturnValue([]);
		const baseTime = Date.now();
		mockedStorage.getNotifications.mockReturnValue(
			Array.from({ length: 12 }).map((_, index) => ({
				id: `notif-${index + 1}`,
				title: index % 2 === 0 ? 'Attendance: LOGIN' : 'Attendance: LOGOUT',
				message: `Notification ${index + 1}`,
				timestamp: baseTime - index * 1000,
				type: 'ATTENDANCE',
				read: false,
				studentId: 'student-notif',
				parentId: 'parent-1',
			}))
		);
		mockedStorage.consumeParentInviteToServer.mockResolvedValue(null);
		mockedStorage.unlinkParentStudentFromServer.mockResolvedValue();
		mockedStorage.subscribeLinkedStudents.mockImplementation((_parentId, onUpdate) => {
			onUpdate(mockedStorage.getLinkedStudents());
			return () => {};
		});
		mockedStorage.subscribeAttendanceLatest.mockImplementation(() => () => {});
	});

	it('expands notifications list when View all is clicked', async () => {
		renderWithRouter(<ParentDashboard user={parentUser} />);
		const bellButton = screen.getByLabelText(/notifications/i);
		fireEvent.click(bellButton);

		const region = await screen.findByRole('region', { name: /recent notifications/i });
		const initialItems = region.querySelectorAll('li');
		expect(initialItems.length).toBe(10);

		const buttons = Array.from(region.querySelectorAll('button'));
		const viewAllButton = buttons.find(btn => btn.textContent && btn.textContent.toLowerCase().includes('view all')) as HTMLButtonElement | undefined;
		expect(viewAllButton).toBeTruthy();
		if (!viewAllButton) return;
		expect(viewAllButton.getAttribute('aria-expanded')).toBe('false');

		fireEvent.click(viewAllButton);
		expect(viewAllButton.getAttribute('aria-expanded')).toBe('true');

		const expandedItems = region.querySelectorAll('li');
		expect(expandedItems.length).toBe(12);
	});
});

describe('StudentDashboard layout', () => {
	it('renders grade and section in a grid-based layout', () => {
		const studentUser: User = {
			id: 'student-layout',
			name: 'Layout Student',
			role: UserRole.STUDENT,
			avatarUrl: '',
			grade: '10',
			section: 'Newton',
		};

		renderWithRouter(<StudentDashboard user={studentUser} isOnline={true} />);
		const gradeChip = screen.getByText(/Grade 10/i);
		const container = gradeChip.parentElement;
		expect(container).toBeTruthy();
		if (container) {
			expect(container.className.includes('grid')).toBe(true);
		}
	});
});
