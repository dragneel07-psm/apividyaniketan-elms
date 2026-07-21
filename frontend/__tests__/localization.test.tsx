import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalizationProvider, useTranslation } from '@/lib/localization';

function Probe() {
  const { t, locale, setLocale } = useTranslation();
  return (
    <div>
      <span data-testid="loc">{locale}</span>
      <span data-testid="title">{t('student.dashboard.title')}</span>
      <span data-testid="greet">{t('common.greeting', { name: 'Sita' })}</span>
      <span data-testid="missing">{t('student.dashboard.nope')}</span>
      <span data-testid="enonly">{t('common.enOnly')}</span>
      <button onClick={() => setLocale('ne')}>ne</button>
    </div>
  );
}

describe('localization', () => {
  beforeEach(() => { document.cookie = 'lang=; max-age=0; path=/'; });

  it('defaults to English and interpolates vars', () => {
    render(<LocalizationProvider><Probe /></LocalizationProvider>);
    expect(screen.getByTestId('loc').textContent).toBe('en');
    expect(screen.getByTestId('title').textContent).toBe('Dashboard');
    expect(screen.getByTestId('greet').textContent).toBe('Welcome, Sita');
  });

  it('switches to Nepali and persists to the lang cookie', () => {
    render(<LocalizationProvider><Probe /></LocalizationProvider>);
    act(() => { screen.getByText('ne').click(); });
    expect(screen.getByTestId('title').textContent).toBe('ड्यासबोर्ड');
    expect(document.cookie).toContain('lang=ne');
  });

  it('falls back to English when a Nepali key is missing', () => {
    render(<LocalizationProvider><Probe /></LocalizationProvider>);
    act(() => { screen.getByText('ne').click(); });
    expect(screen.getByTestId('missing').textContent).toBe('student.dashboard.nope');
  });

  it('returns English value for en-only key when locale is ne', () => {
    render(<LocalizationProvider><Probe /></LocalizationProvider>);
    act(() => { screen.getByText('ne').click(); });
    expect(screen.getByTestId('enonly').textContent).toBe('English Only');
  });
});
