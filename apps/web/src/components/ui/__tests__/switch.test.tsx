import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { Switch } from '../switch';

describe('Switch Component', () => {
  it('should render switch element', () => {
    render(<Switch aria-label="Toggle switch" />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeInTheDocument();
  });

  it('should be unchecked by default', () => {
    render(<Switch aria-label="Toggle switch" />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('data-state', 'unchecked');
  });

  it('should handle checked state', () => {
    render(<Switch checked aria-label="Toggle switch" />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveAttribute('data-state', 'checked');
  });

  it('should toggle when clicked', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Switch onCheckedChange={handleChange} aria-label="Toggle switch" />);
    const switchElement = screen.getByRole('switch');

    await user.click(switchElement);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Switch disabled aria-label="Toggle switch" />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeDisabled();
  });

  it('should not toggle when disabled', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Switch disabled onCheckedChange={handleChange} aria-label="Toggle switch" />);
    const switchElement = screen.getByRole('switch');

    await user.click(switchElement);
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should support custom className', () => {
    render(<Switch className="custom-switch" aria-label="Toggle switch" />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toHaveClass('custom-switch');
  });

  it('should be keyboard accessible', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();

    render(<Switch onCheckedChange={handleChange} aria-label="Toggle switch" />);
    const switchElement = screen.getByRole('switch');

    switchElement.focus();
    await user.keyboard(' ');
    expect(handleChange).toHaveBeenCalledWith(true);
  });
});
