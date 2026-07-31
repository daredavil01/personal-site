/**
 * @jest-environment jsdom
 */

import launchConfetti from '../atlas/lib/confetti';

// jsdom does not implement 2D canvas, so getContext('2d') returns null. The
// burst queues a requestAnimationFrame and has no cancel path, so an unguarded
// null context threw `Cannot read properties of null (reading 'clearRect')` on
// every frame — surfacing as a failure in whichever test happened to be running
// when the frame fired. It only reproduced on slower machines (CI), where the
// frame lands before teardown.
describe('launchConfetti', () => {
  let frames;

  beforeEach(() => {
    frames = [];
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  const mountHost = () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    return host;
  };

  it('bails without scheduling a frame when there is no 2D context', () => {
    const host = mountHost();

    expect(() => launchConfetti(host, ['#fff'])).not.toThrow();
    expect(frames).toHaveLength(0);
    // The throwaway canvas is cleaned up rather than left in the DOM.
    expect(host.querySelector('canvas')).toBeNull();
  });

  it('stops the loop when the host unmounts mid-burst', () => {
    const ctx = {
      clearRect: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      fillRect: jest.fn(),
    };
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);

    const host = mountHost();
    launchConfetti(host, ['#fff']);
    expect(frames).toHaveLength(1);

    // A route change removes the host while the burst is still running.
    host.remove();
    frames[0](performance.now());

    expect(ctx.clearRect).not.toHaveBeenCalled();
    expect(frames).toHaveLength(1); // no re-queue, so the loop is dead
  });

  it('draws and re-queues while the canvas is still attached', () => {
    const ctx = {
      clearRect: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      rotate: jest.fn(),
      fillRect: jest.fn(),
    };
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);

    const host = mountHost();
    launchConfetti(host, ['#fff']);
    frames[0](performance.now());

    expect(ctx.clearRect).toHaveBeenCalledTimes(1);
    expect(frames).toHaveLength(2);
  });
});
