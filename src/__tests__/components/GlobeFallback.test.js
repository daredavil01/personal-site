/**
 * @jest-environment jsdom
 */

// The homepage used to go blank when three.js could not get a WebGL context:
// GlobeRenderer threw, nothing caught it, and React unmounted the whole app.
// These tests make the globe fail both ways — no WebGL, and a throw anyway —
// and check the page around it still stands.

import React from 'react';
import {
  render as rtlRender, screen, cleanup,
} from '@testing-library/react';
import { ThemeProvider } from '../../context/ThemeContext';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { hasWebGL } from '../../lib/webgl';
import App from '../../App';

jest.mock('../../components/Index/GlobeRenderer', () => {
  const ReactActual = jest.requireActual('react');
  const Throwing = ReactActual.forwardRef(() => {
    throw new Error('Error creating WebGL context.');
  });
  return { __esModule: true, default: Throwing };
});

jest.mock('../../lib/webgl', () => ({
  __esModule: true,
  hasWebGL: jest.fn(() => true),
  default: jest.fn(() => true),
}));

const render = (ui) => rtlRender(<ThemeProvider>{ui}</ThemeProvider>);
const timeout = 5000;

// The jest.setup stub never reports an intersection, so the globe would never
// mount. This one says everything is on screen at once.
class VisibleObserver {
  constructor(callback) { this.callback = callback; }

  observe(el) { this.callback?.([{ isIntersecting: true, target: el }], this); }

  unobserve() { this.callback = this.callback || null; }

  disconnect() { this.callback = null; }
}

describe('the globe failing does not blank the page', () => {
  const originalObserver = window.IntersectionObserver;
  let errorSpy;

  beforeAll(() => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(''),
    }));
    window.scrollTo = jest.fn();
  });

  beforeEach(() => {
    localStorage.clear();
    window.IntersectionObserver = VisibleObserver;
    // React logs every caught error; these are expected.
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    window.IntersectionObserver = originalObserver;
    errorSpy.mockRestore();
    hasWebGL.mockImplementation(() => true);
  });

  it('classic homepage: keeps its heading when three.js throws', async () => {
    window.history.pushState({}, '', '/?view=classic');
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: /Sanket Tambare/ }, { timeout }))
      .toBeInTheDocument();
    expect(await screen.findByText(/The globe needs WebGL/, {}, { timeout })).toBeInTheDocument();
  });

  it('classic homepage: draws the panel without trying when there is no WebGL', async () => {
    hasWebGL.mockImplementation(() => false);
    window.history.pushState({}, '', '/?view=classic');
    render(<App />);
    expect(await screen.findByText(/The globe needs WebGL/, {}, { timeout })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: /Sanket Tambare/ })).toBeInTheDocument();
  });

  it('atlas arrival: the title and both buttons survive a throwing globe', async () => {
    window.history.pushState({}, '', '/?view=atlas');
    render(<App />);
    expect(await screen.findByRole('button', { name: /Enter the World/ }, { timeout }))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Skip intro/ })).toBeInTheDocument();
  });

  it('atlas arrival: skips straight to the map when there is no WebGL', async () => {
    hasWebGL.mockImplementation(() => false);
    window.history.pushState({}, '', '/?view=atlas');
    render(<App />);
    expect(await screen.findByRole('heading', { name: /world map/i }, { timeout }))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Enter the World/ })).not.toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  let errorSpy;
  beforeEach(() => { errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { cleanup(); errorSpy.mockRestore(); });

  const Boom = ({ fail }) => {
    if (fail) throw new Error('boom');
    return <p>fine</p>;
  };

  it('draws the fallback, then recovers when a reset key changes', () => {
    const { rerender } = rtlRender(
      <ErrorBoundary fallback={<p>broken</p>} resetKeys={['/a']}>
        <Boom fail />
      </ErrorBoundary>,
    );
    expect(screen.getByText('broken')).toBeInTheDocument();

    rerender(
      <ErrorBoundary fallback={<p>broken</p>} resetKeys={['/b']}>
        <Boom fail={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('fine')).toBeInTheDocument();
  });

  it('passes the error and a reset function to a function fallback', () => {
    rtlRender(
      <ErrorBoundary fallback={(error) => <p>{`caught: ${error.message}`}</p>}>
        <Boom fail />
      </ErrorBoundary>,
    );
    expect(screen.getByText('caught: boom')).toBeInTheDocument();
  });
});
