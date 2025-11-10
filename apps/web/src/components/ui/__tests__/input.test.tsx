import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { Input } from '../input';
import React from 'react';

describe('Input Component', () => {
  it('should render input element', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('should handle text input', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Enter text" />);

    const input = screen.getByPlaceholderText('Enter text') as HTMLInputElement;
    await user.type(input, 'Hello World');

    expect(input.value).toBe('Hello World');
  });

  it('should support different input types', () => {
    const { rerender } = render(<Input type="email" placeholder="Email" />);
    expect(screen.getByPlaceholderText('Email')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" placeholder="Password" />);
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Input placeholder="Disabled input" disabled />);
    const input = screen.getByPlaceholderText('Disabled input');
    expect(input).toBeDisabled();
  });

  it('should not allow typing when disabled', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Disabled input" disabled />);

    const input = screen.getByPlaceholderText('Disabled input') as HTMLInputElement;
    await user.type(input, 'Test');

    expect(input.value).toBe('');
  });

  it('should support custom className', () => {
    render(<Input className="custom-input" placeholder="Custom" />);
    expect(screen.getByPlaceholderText('Custom')).toHaveClass('custom-input');
  });

  it('should handle required attribute', () => {
    render(<Input placeholder="Required input" required />);
    expect(screen.getByPlaceholderText('Required input')).toBeRequired();
  });

  it('should support controlled input', async () => {
    const TestComponent = () => {
      const [value, setValue] = React.useState('');
      return <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Controlled" />;
    };

    const user = userEvent.setup();
    render(<TestComponent />);

    const input = screen.getByPlaceholderText('Controlled') as HTMLInputElement;
    await user.type(input, 'Controlled text');

    expect(input.value).toBe('Controlled text');
  });
});
