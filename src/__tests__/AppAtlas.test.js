/**
 * @jest-environment jsdom
 */

import { render as rtlRender, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { ATLAS_LIVE } from '../config/featureFlags';
import App from '../App';

// The v11.0.0 flip: with no stored preference, no `?view=` param and no
// reduced-motion request, "/" must render the atlas rather than the classic
// editorial homepage. App.test.js covers the classic shell via `?view=classic`.
const render = (ui) => rtlRender(<ThemeProvider>{ui}</ThemeProvider>);

describe('the flip: atlas is the default shell', () => {
  global.fetch = jest.fn(() => Promise.resolve({
    json: jest.fn(() => Promise.resolve({})),
    text: jest.fn(() => Promise.resolve('')),
  }));
  window.scrollTo = jest.fn();

  beforeEach(() => {
    localStorage.clear();
    // Skip the orbit/dive intro so "/" settles straight onto the map: the
    // intro mounts GlobeRenderer, and three.js needs a WebGL context jsdom
    // has no way to give it.
    localStorage.setItem('atlas.v1', JSON.stringify({ version: 1, introSeen: true }));
    window.history.pushState({}, '', '/');
  });

  afterEach(cleanup);

  it('ATLAS_LIVE is on', () => {
    expect(ATLAS_LIVE).toBe(true);
  });

  it('renders the world map at "/" and not the classic nav', async () => {
    render(<App />);

    expect(
      await screen.findByRole('heading', { name: /world map/i }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Primary' })).not.toBeInTheDocument();
  });

  it('redirects /world to /', async () => {
    window.history.pushState({}, '', '/world');
    render(<App />);

    await screen.findByRole('heading', { name: /world map/i }, { timeout: 5000 });
    expect(window.location.pathname).toBe('/');
  });
});
