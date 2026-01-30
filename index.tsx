
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * PRODUCTION POLYFILL:
 * Browser environments do not have the 'process' global variable.
 * Without this polyfill, any reference to process.env.API_KEY will crash the app on load.
 */
if (typeof (window as any).process === 'undefined') {
  (window as any).process = {
    env: {
      // These will be overridden if the build tool (Vite) uses 'define' replacements
      API_KEY: '', 
      SUPABASE_URL: '',
      SUPABASE_ANON_KEY: ''
    }
  };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
