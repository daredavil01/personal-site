import '@testing-library/jest-dom';

// Rendering the full app (lazy routes + slideshows) in jsdom regularly takes
// longer than jest's 5s default per-test timeout.
jest.setTimeout(15000);

// jsdom does not implement matchMedia, which ThemeContext uses to read the
// system color-scheme preference.
// jsdom does not implement IntersectionObserver (LifeStats scroll animations)
// or ResizeObserver.
class ObserverStub {
  observe() {}

  unobserve() {}

  disconnect() {}
}
window.IntersectionObserver = ObserverStub;
window.ResizeObserver = ObserverStub;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
