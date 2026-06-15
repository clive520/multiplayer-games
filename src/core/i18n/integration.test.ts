/**
 * i18n 模組整合測試（不透過 React）
 * 確保在 Node 環境中 init 也能跑（瀏覽器環境會有 LanguageDetector 額外做事）
 */
import { describe, it, expect, beforeAll } from 'vitest';
import i18n, { initI18n } from './index';

describe('i18n integration', () => {
  beforeAll(async () => {
    // 確保 init 完成
    await initI18n;
  });

  it('init 完成後能翻譯 zh-TW', () => {
    void i18n.changeLanguage('zh-TW');
    // 測試簡單 key
    const r1 = i18n.t('common.loading');
    const r2 = i18n.t('lobby.title');
    const r3 = i18n.t('common.loading', { lng: 'zh-TW' });
    // eslint-disable-next-line no-console
    console.log('TEST t(common.loading) =', r1);
    // eslint-disable-next-line no-console
    console.log('TEST t(lobby.title) =', r2);
    // eslint-disable-next-line no-console
    console.log('TEST t(common.loading, {lng:zh-TW}) =', r3);
    // eslint-disable-next-line no-console
    console.log('TEST i18n.language =', i18n.language, 'i18n.languages =', i18n.languages);
    expect(r1).toBe('載入中...');
    expect(r2).toBe('遊戲大廳');
  });

  it('init 完成後能翻譯 en-US', () => {
    void i18n.changeLanguage('en-US');
    expect(i18n.t('lobby.title')).toBe('Game Lobby');
    expect(i18n.t('common.loading')).toBe('Loading...');
  });

  it('changeLanguage 會切換語言', () => {
    void i18n.changeLanguage('zh-TW');
    expect(i18n.t('lobby.title')).toBe('遊戲大廳');
    void i18n.changeLanguage('en-US');
    expect(i18n.t('lobby.title')).toBe('Game Lobby');
  });

  it('不支援的語言 fallback 到預設', () => {
    void i18n.changeLanguage('fr-FR');
    // fr 不在我們的 resources 內，fallback 到 zh-TW
    expect(i18n.t('lobby.title')).toBe('遊戲大廳');
  });

  it('initI18n promise 會 resolve', async () => {
    // beforeAll 已經 await 過，現在應該已經 initialized
    expect(i18n.isInitialized).toBe(true);
  });
});
