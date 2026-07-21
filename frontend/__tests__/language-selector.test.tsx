import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LocalizationProvider } from '@/lib/localization';
import { LanguageSelector } from '@/components/LanguageSelector';

describe('LanguageSelector', () => {
  it('renders inside the provider', () => {
    render(<LocalizationProvider><LanguageSelector /></LocalizationProvider>);
    expect(screen.getByRole('button')).toBeTruthy();
  });
});
