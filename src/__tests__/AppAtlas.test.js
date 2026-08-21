/**
 * @jest-environment jsdom
 */

import { render as rtlRender, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import { ATLAS_LIVE, DEFAULT_VIEW } from '../config/featureFlags';
import App from '../App';

// The atlas shell still owns "/" as the world map (ATLAS_LIVE), but since
// v13.2.0 it is no longer the default landing shell — a visitor has to ask for
// it via `?view=atlas` or a stored preference. App.test.js covers the classic
// shell, which is now what "/" renders with no preference at all.
const render = (ui) => rtlRender(<ThemeProvider>{ui}</ThemeProvider>);

describe('the atlas shell, opted into', () => {
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
    // `view: 'atlas'` is the stored opt-in the classic default now requires.
    localStorage.setItem(
      'atlas.v1',
      JSON.stringify({ version: 1, introSeen: true, view: 'atlas' }),
    );
    window.history.pushState({}, '', '/');
  });

  afterEach(cleanup);

  it('ATLAS_LIVE is on, but classic is the default view', () => {
    expect(ATLAS_LIVE).toBe(true);
    expect(DEFAULT_VIEW).toBe('classic');
  });

  it('renders the world map at "/" for an opted-in visitor, not the classic nav', async () => {
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
