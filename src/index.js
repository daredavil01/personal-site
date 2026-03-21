import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { ThemeProvider } from './context/ThemeContext';
import App from './App';

// See https://reactjs.org/docs/strict-mode.html
const StrictApp = () => (
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

const rootElement = document.getElementById('root');

// hydrate is required by react-snap.
if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, <StrictApp />);
} else {
  const root = createRoot(rootElement);
  root.render(<StrictApp />);
}
