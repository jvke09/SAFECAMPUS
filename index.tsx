import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import './i18n/config'; // Initialize i18n

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Wrap App with Error Boundary and Theme Provider
try {
  const root = createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <ThemeProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </ThemeProvider>
    </React.StrictMode>
  );
} catch (error) {
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; color: red;">
      <h1>Application Error</h1>
      <p>Failed to start the application.</p>
      <pre style="background: #f0f0f0; padding: 10px; overflow: auto;">${error instanceof Error ? error.message : String(error)}</pre>
    </div>
  `;
}

// Global error handler for "White Screen of Death" debugging
window.addEventListener('error', (event) => {
  const root = document.getElementById('root');
  if (root && root.innerHTML === "") {
    root.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif; color: #DC2626;">
      <h1 style="font-size: 24px; margin-bottom: 10px;">Startup Error</h1>
      <p>The application encountered a critical error during loading.</p>
      <pre style="background: #FEF2F2; padding: 15px; border-radius: 8px; overflow: auto; border: 1px solid #FECACA;">${event.message}</pre>
    </div>
  `;
  }
});