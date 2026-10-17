import React from 'react';
import { createRoot } from 'react-dom/client';
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

// Always a fresh render, never hydrate. #root arrives holding the crawler
// fallback the edge middleware writes (src/lib/seo/fallbackHtml.js) — plain
// HTML, not React output — and createRoot clears it on the first commit.
// hydrateRoot would try to adopt it and fail. (The old hydrate branch was for
// react-snap, which is no longer installed.)
createRoot(rootElement).render(<StrictApp />);
