import { describe, it, expect } from 'vitest';
import { gameRegistry } from '@/registry';
import type { GameDefinition } from './game';

describe('GameDefinition metadata', () => {
  it('每個遊戲都提供必要的中繼資料', () => {
    for (const game of gameRegistry) {
      expect(game.id, `${game.name} 缺 id`).toBeTruthy();
      expect(game.name, `${game.id} 缺 name`).toBeTruthy();
      expect(game.description, `${game.id} 缺 description`).toBeTruthy();
      expect(game.minPlayers, `${game.id} 缺 minPlayers`).toBeGreaterThanOrEqual(1);
      expect(game.maxPlayers, `${game.id} 缺 maxPlayers`).toBeGreaterThanOrEqual(game.minPlayers);
      expect(game.icon, `${game.id} 缺 icon`).toBeDefined();
      expect(typeof game.loadComponent, `${game.id} 缺 loadComponent`).toBe('function');
    }
  });

  it('estimatedDurationMin 為正整數', () => {
    for (const game of gameRegistry) {
      if (game.estimatedDurationMin !== undefined) {
        expect(
          Number.isInteger(game.estimatedDurationMin),
          `${game.id} 的 estimatedDurationMin 應為整數`
        ).toBe(true);
        expect(game.estimatedDurationMin, `${game.id} 的 estimatedDurationMin 應 > 0`).toBeGreaterThan(0);
      }
    }
  });

  it('tutorialSteps 至少 1 步', () => {
    for (const game of gameRegistry) {
      if (game.tutorialSteps !== undefined) {
        expect(
          game.tutorialSteps.length,
          `${game.id} 的 tutorialSteps 至少要有 1 步`
        ).toBeGreaterThanOrEqual(1);
        for (const step of game.tutorialSteps) {
          expect(typeof step, `${game.id} 的 tutorialSteps 應為字串`).toBe('string');
          expect(step.length, `${game.id} 的 tutorialSteps 不應為空字串`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('GameDefinition 型別有 expected 欄位（compile-time + runtime）', () => {
    // 這個測試確保 type 變更後 runtime 還認得這些欄位
    // 用 cast 繞過 React.ComponentType<{...}> 的精確 props 比對
    const fakeDef = {
      id: 'fake',
      name: 'Fake',
      description: 'desc',
      minPlayers: 2,
      maxPlayers: 2,
      loadComponent: (() =>
        Promise.resolve(null)) as unknown as GameDefinition['loadComponent'],
      engine: {} as GameDefinition<unknown>['engine'],
      syncStrategy: 'firestore' as const,
      icon: () => null,
      estimatedDurationMin: 5,
      tutorialSteps: ['step 1'],
    } satisfies Partial<GameDefinition>;
    expect(fakeDef.estimatedDurationMin).toBe(5);
    expect(fakeDef.tutorialSteps?.[0]).toBe('step 1');
  });
});
