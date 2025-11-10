export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  READ = 'READ',
}

export enum AuditResourceType {
  FLAG = 'FLAG',
  PROJECT = 'PROJECT',
  ENVIRONMENT = 'ENVIRONMENT',
  ORGANIZATION = 'ORGANIZATION',
}

export interface AuditLogUser {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface AuditLog {
  id: string;
  action: AuditAction;
  resourceType: AuditResourceType;
  resourceId: string | null;
  userId: string | null;
  user: AuditLogUser | null;
  organizationId: string;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface FlagChange {
  id: string;
  flagId: string;
  userId: string | null;
  user: AuditLogUser | null;
  changeType: 'CREATED' | 'UPDATED' | 'TOGGLED' | 'DELETED' | 'CONFIG_UPDATED';
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  comment: string | null;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

export interface FlagChangeHistoryResponse {
  changes: FlagChange[];
  total: number;
  limit: number;
  offset: number;
}
