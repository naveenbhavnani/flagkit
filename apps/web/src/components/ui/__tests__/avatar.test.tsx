import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { Avatar, AvatarImage, AvatarFallback } from '../avatar';

describe('Avatar Components', () => {
  describe('Avatar', () => {
    it('should render avatar container', () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByTestId('avatar')).toBeInTheDocument();
    });

    it('should have rounded-full class', () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveClass('rounded-full');
    });

    it('should support custom className', () => {
      render(
        <Avatar className="h-20 w-20" data-testid="avatar">
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      const avatar = screen.getByTestId('avatar');
      expect(avatar).toHaveClass('h-20', 'w-20');
    });
  });

  describe('AvatarImage', () => {
    it('should render avatar with image and fallback', () => {
      render(
        <Avatar>
          <AvatarImage src="https://example.com/avatar.jpg" alt="User avatar" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );

      // In jsdom, images don't load, so Radix Avatar shows fallback
      // We verify the fallback is shown when image doesn't load
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  describe('AvatarFallback', () => {
    it('should render fallback text', () => {
      render(
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      );
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('should have proper background styling', () => {
      render(
        <Avatar>
          <AvatarFallback data-testid="fallback">JD</AvatarFallback>
        </Avatar>
      );
      const fallback = screen.getByTestId('fallback');
      expect(fallback).toHaveClass('bg-muted', 'rounded-full');
    });

    it('should support custom className on fallback', () => {
      render(
        <Avatar>
          <AvatarFallback className="text-lg" data-testid="fallback">
            AB
          </AvatarFallback>
        </Avatar>
      );
      const fallback = screen.getByTestId('fallback');
      expect(fallback).toHaveClass('text-lg');
    });
  });

  describe('Complete Avatar', () => {
    it('should render avatar with both image and fallback', () => {
      render(
        <Avatar data-testid="avatar">
          <AvatarImage src="https://example.com/avatar.jpg" alt="Profile" />
          <AvatarFallback>FB</AvatarFallback>
        </Avatar>
      );

      expect(screen.getByTestId('avatar')).toBeInTheDocument();
      expect(screen.getByText('FB')).toBeInTheDocument();
    });
  });
});
