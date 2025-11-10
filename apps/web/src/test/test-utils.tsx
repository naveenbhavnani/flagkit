import { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';

// Custom render function that includes providers if needed
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  return render(ui, { ...options });
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';
export { renderWithProviders as render };
