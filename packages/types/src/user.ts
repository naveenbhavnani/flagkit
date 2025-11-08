import { z } from 'zod';

export enum AuthProvider {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
  GITHUB = 'GITHUB',
  MICROSOFT = 'MICROSOFT',
}

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  emailVerified: z.boolean(),
  name: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  authProvider: z.nativeEnum(AuthProvider),
  twoFactorEnabled: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().nullable(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).optional(),
  name: z.string().optional(),
  authProvider: z.nativeEnum(AuthProvider).default(AuthProvider.EMAIL),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
