/**
 * @jest-environment jsdom
 */

import { render as rtlRender, screen, within, act, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ThemeProvider } from '../context/ThemeContext';
import App from '../App';

// Render with the same providers as src/index.js
const render = (ui) => rtlRender(<ThemeProvider>{ui}</ThemeProvider>);

// Since the v11.0.0 flip the atlas is the default shell, and it has no classic
// nav/sidebar. These tests are about the classic shell, so they enter through
// `?view=classic` — the same escape hatch a real visitor uses. useViewMode
// persists that choice, so the later in-app navigations stay classic too.
const startClassic = () => window.history.pushState({}, '', '/?view=classic');

// Increase timeout for async finding
const timeout = 5000;

// Several menus (desktop nav, hamburger drawer, sidebar) render the same link
// labels, so all queries are scoped to the desktop nav landmark.
const findPrimaryNav = async () => screen.findByRole('navigation', { name: 'Primary' }, { timeout });

describe('renders the app', () => {
  // mocks the fetch API used on the stats page and the about page.
  const jsonMock = jest.fn(() => Promise.resolve({}));
  const textMock = jest.fn(() => Promise.resolve(''));
  global.fetch = jest.fn(() => Promise.resolve({
    json: jsonMock,
    text: textMock,
  }));
  // mocks the scrollTo API used when navigating to a new page.
  window.scrollTo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    startClassic();
  });

  afterEach(() => {
    cleanup();
  });

  it('should render the app', async () => {
    render(<App />);
    const mainElement = await screen.findByRole('main', { timeout });
    expect(mainElement).toBeInTheDocument();
  });

  it('should render the title', async () => {
    render(<App />);
    await waitFor(() => expect(document.title).toBe('Sanket Tambare'), { timeout });
  });

  it('can navigate to /about', async () => {
    render(<App />);
    const nav = await findPrimaryNav();
    const aboutLink = await within(nav).findByRole('link', { name: /About/i }, { timeout });
    expect(aboutLink).toBeInTheDocument();
    await act(async () => {
      await aboutLink.click();
    });
    await waitFor(() => expect(document.title).toContain('About'), { timeout });
    expect(window.location.pathname).toBe('/about');
  });

  it('can navigate to /resume', async () => {
    render(<App />);
    const nav = await findPrimaryNav();
    const resumeLink = await within(nav).findByRole('link', { name: /Resume/i }, { timeout });
    expect(resumeLink).toBeInTheDocument();
    await act(async () => {
      await resumeLink.click();
    });
    await waitFor(() => expect(document.title).toContain('Resume'), { timeout });
    expect(window.location.pathname).toBe('/resume');
  });

  it('can navigate to /projects', async () => {
    render(<App />);
    const nav = await findPrimaryNav();
    // Open dropdown
    const moreButton = await within(nav).findByRole('button', { name: /More/i }, { timeout });
    fireEvent.mouseEnter(moreButton);

    const projectsLink = await within(nav).findByRole('link', { name: /Projects/i }, { timeout });
    expect(projectsLink).toBeInTheDocument();
    await act(async () => {
      await projectsLink.click();
    });
    await waitFor(() => expect(document.title).toContain('Projects'), { timeout });
    expect(window.location.pathname).toBe('/projects');
  });

  it('can navigate to /stats', async () => {
    render(<App />);
    const nav = await findPrimaryNav();
    const statsLink = await within(nav).findByRole('link', { name: /Stats/i }, { timeout });
    expect(statsLink).toBeInTheDocument();
    await act(async () => {
      await statsLink.click();
    });
    await waitFor(() => expect(document.title).toContain('Stats'), { timeout });
    expect(window.location.pathname).toBe('/stats');
  });

  it('can navigate to /contact', async () => {
    render(<App />);
    const nav = await findPrimaryNav();
    // Open dropdown
    const moreButton = await within(nav).findByRole('button', { name: /More/i }, { timeout });
    fireEvent.mouseEnter(moreButton);

    const contactLink = await within(nav).findByRole('link', { name: /Contact/i }, { timeout });
    expect(contactLink).toBeInTheDocument();
    await act(async () => {
      await contactLink.click();
    });
    await waitFor(() => expect(document.title).toContain('Contact'), { timeout });
    expect(window.location.pathname).toBe('/contact');
  });
});
