import { z } from 'zod';

export enum MemberRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  PROJECT_ADMIN = 'PROJECT_ADMIN',
  DEVELOPER = 'DEVELOPER',
  VIEWER = 'VIEWER',
}

export const OrganizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().url().nullable(),
  subscriptionTier: z.string(),
  subscriptionStatus: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Organization = z.infer<typeof OrganizationSchema>;

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  organizationId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const EnvironmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  key: z.string(),
  color: z.string().nullable(),
  projectId: z.string(),
  clientSdkKey: z.string(),
  serverSdkKey: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Environment = z.infer<typeof EnvironmentSchema>;

export const CreateEnvironmentSchema = z.object({
  name: z.string().min(1).max(100),
  key: z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export type CreateEnvironmentInput = z.infer<typeof CreateEnvironmentSchema>;
