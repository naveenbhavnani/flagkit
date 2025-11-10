import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Label } from '../label';
import { Input } from '../input';

describe('Label Component', () => {
  it('should render label element', () => {
    render(<Label>Test Label</Label>);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('should associate with input using htmlFor', () => {
    render(
      <div>
        <Label htmlFor="test-input">Username</Label>
        <Input id="test-input" />
      </div>
    );

    const label = screen.getByText('Username');
    const input = screen.getByRole('textbox');

    expect(label).toHaveAttribute('for', 'test-input');
    expect(input).toHaveAttribute('id', 'test-input');
  });

  it('should support custom className', () => {
    render(<Label className="custom-label">Custom Label</Label>);
    expect(screen.getByText('Custom Label')).toHaveClass('custom-label');
  });

  it('should render as label element', () => {
    render(<Label data-testid="label">Label Content</Label>);
    const label = screen.getByTestId('label');
    expect(label.tagName).toBe('LABEL');
  });

  it('should support additional HTML attributes', () => {
    render(
      <Label data-testid="label" title="Label Title">
        Label with Attributes
      </Label>
    );
    const label = screen.getByTestId('label');
    expect(label).toHaveAttribute('title', 'Label Title');
  });

  it('should have proper styling classes', () => {
    render(<Label>Styled Label</Label>);
    const label = screen.getByText('Styled Label');
    expect(label).toHaveClass('text-sm', 'font-medium', 'leading-none');
  });
});
