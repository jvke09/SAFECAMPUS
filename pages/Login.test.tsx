import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { Login } from './Login';
import { authService } from '../services/authService';

vi.mock('../services/authService', () => {
	return {
		authService: {
			login: vi.fn(),
			register: vi.fn(),
			resetPassword: vi.fn(),
			loginWithGoogle: vi.fn(),
			loginWithApple: vi.fn()
		}
	};
});

describe('Login forgot password UI', () => {
	it('hides backend status badge in forgot password mode', () => {
		render(
			<BrowserRouter>
				<Login onLogin={vi.fn()} />
			</BrowserRouter>
		);

		expect(screen.getByText(/system:/i)).toBeTruthy();
		fireEvent.click(screen.getByRole('button', { name: /forgot password\?/i }));
		expect(screen.queryByText(/system:/i)).toBeNull();
		expect(screen.getByRole('button', { name: /send reset link/i })).toBeTruthy();
	});
});

describe('Login username input', () => {
  it('renders label and placeholder for email or username', () => {
    render(
      <BrowserRouter>
        <Login onLogin={vi.fn()} />
      </BrowserRouter>
    );

    expect(screen.getByText(/email or username/i)).toBeTruthy();
    const input = screen.getByPlaceholderText(/your email or username/i);
    expect(input).toBeTruthy();
  });

  it('submits using a username identifier', async () => {
    (authService.login as any).mockResolvedValue({ uid: 'u1', displayName: 'Maria' });

    render(
      <BrowserRouter>
        <Login onLogin={vi.fn()} />
      </BrowserRouter>
    );

    const identifier = screen.getByPlaceholderText(/your email or username/i);
    const password = screen.getByPlaceholderText(/•+/i);

    fireEvent.change(identifier, { target: { value: 'mariasantos' } });
    fireEvent.change(password, { target: { value: 'secret123' } });

    fireEvent.click(screen.getByRole('button', { name: /parent login|student login/i }));

    expect(authService.login).toHaveBeenCalledWith('mariasantos', 'secret123', 'PARENT');
  });
});
