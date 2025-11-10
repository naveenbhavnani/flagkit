// API route types and request/response schemas
import { JsonValue, FlagValue } from './flags';

export interface ApiRoute {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  description?: string;
}

// Health check
export interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version?: string;
}

// Authentication
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  tokens: AuthTokens;
}

// SDK Evaluation
export interface SdkEvaluationRequest {
  context: {
    userId?: string;
    attributes?: Record<string, JsonValue>;
  };
  flags?: string[]; // Optional: specific flags to evaluate
}

export interface SdkEvaluationResponse {
  flags: Record<string, FlagValue>;
  timestamp: string;
}

// Webhook payload
export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: JsonValue;
  organizationId: string;
  projectId?: string;
}
