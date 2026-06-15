import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playPop, playChime, setMuted, isMuted, REACTION_SOUNDS } from './sound';

describe('sound', () => {
  let mockOscillators: Array<{
    type: string;
    frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
    connect: ReturnType<typeof vi.fn>;
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }>;
  let mockGains: Array<{
    gain: {
      setValueAtTime: ReturnType<typeof vi.fn>;
      linearRampToValueAtTime: ReturnType<typeof vi.fn>;
      exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
    };
    connect: ReturnType<typeof vi.fn>;
  }>;

  beforeEach(() => {
    setMuted(false);
    mockOscillators = [];
    mockGains = [];
    const makeOsc = () => ({
      type: '',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn().mockReturnThis(),
      start: vi.fn(),
      stop: vi.fn(),
    });
    const makeGain = () => ({
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn().mockReturnThis(),
    });
    const mockCtx = {
      currentTime: 0,
      destination: {},
      state: 'running',
      createOscillator: () => {
        const osc = makeOsc();
        mockOscillators.push(osc);
        return osc;
      },
      createGain: () => {
        const gain = makeGain();
        mockGains.push(gain);
        return gain;
      },
      resume: vi.fn(),
    };
    // @ts-expect-error - 模擬 window.AudioContext
    globalThis.window = { AudioContext: function () { return mockCtx; } };
  });

  it('playPop 建立 1 個 oscillator + 1 個 gain', () => {
    playPop(880, 0.12, 0.18);
    expect(mockOscillators).toHaveLength(1);
    expect(mockGains).toHaveLength(1);
  });

  it('playChime 建立 N 個 oscillator（每個音符一個）', () => {
    playChime([523, 659, 784]);
    expect(mockOscillators).toHaveLength(3);
    expect(mockGains).toHaveLength(3);
  });

  it('setMuted(true) 之後 playPop 不發聲', () => {
    setMuted(true);
    playPop();
    expect(mockOscillators).toHaveLength(0);
  });

  it('isMuted 反映 setMuted 的狀態', () => {
    expect(isMuted()).toBe(false);
    setMuted(true);
    expect(isMuted()).toBe(true);
    setMuted(false);
    expect(isMuted()).toBe(false);
  });

  it('REACTION_SOUNDS 包含五個 key', () => {
    expect(Object.keys(REACTION_SOUNDS)).toEqual(
      expect.arrayContaining(['cheer', 'congrats', 'surprise', 'respect', 'encourage'])
    );
  });

  it('REACTION_SOUNDS 裡的函式呼叫時會發聲', () => {
    REACTION_SOUNDS.cheer();
    expect(mockOscillators.length).toBeGreaterThanOrEqual(1);
  });
});
