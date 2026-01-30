
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global error catcher for deployment debugging
if (typeof window !== 'undefined') {
  window.onerror = (message, source, lineno, colno, error) => {
    console.error("GLOBAL ERROR DETECTED:", message, "at", source, ":", lineno);
  };
  window.onunhandledrejection = (event) => {
    console.error("UNHANDLED PROMISE REJECTION:", event.reason);
  };
}

/**
 * PRODUCTION POLYFILL:
 * Browser environments do not have the 'process' global variable.
 */
if (typeof (window as any).process === 'undefined') {
  (window as any).process = {
    env: {}
  };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Critical Failure: Could not find 'root' element in index.html.");
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
