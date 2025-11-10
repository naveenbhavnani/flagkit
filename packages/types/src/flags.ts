import { z } from 'zod';

// JSON value types for flags
type JsonPrimitive = boolean | string | number | null;
type JsonObject = { [key: string]: JsonValue };
type JsonArray = JsonValue[];
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

// Flag value can be any JSON-serializable type
export type FlagValue = boolean | string | number | JsonObject | JsonArray;

export enum FlagType {
  BOOLEAN = 'BOOLEAN',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  JSON = 'JSON',
}

export enum FlagStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export const FlagSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.nativeEnum(FlagType),
  status: z.nativeEnum(FlagStatus),
  projectId: z.string(),
  tags: z.array(z.string()),
  ownerId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Flag = z.infer<typeof FlagSchema>;

export const CreateFlagSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.nativeEnum(FlagType).default(FlagType.BOOLEAN),
  tags: z.array(z.string()).default([]),
});

export type CreateFlagInput = z.infer<typeof CreateFlagSchema>;

export const FlagVariationSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  value: z.string(), // JSON-stringified value
  description: z.string().nullable(),
  flagId: z.string(),
});

export type FlagVariation = z.infer<typeof FlagVariationSchema>;

// Zod schema for JSON values
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ])
);

export const CreateFlagVariationSchema = z.object({
  key: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  value: jsonValueSchema, // Will be JSON-stringified
  description: z.string().optional(),
});

export type CreateFlagVariationInput = z.infer<typeof CreateFlagVariationSchema>;

// Targeting rules
export const TargetingConditionSchema = z.object({
  attribute: z.string(),
  operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in']),
  value: jsonValueSchema,
});

export type TargetingCondition = z.infer<typeof TargetingConditionSchema>;

export const TargetingRuleSchema = z.object({
  conditions: z.array(TargetingConditionSchema),
  variationKey: z.string(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
});

export type TargetingRule = z.infer<typeof TargetingRuleSchema>;

export const FlagEnvironmentConfigSchema = z.object({
  id: z.string(),
  flagId: z.string(),
  environmentId: z.string(),
  enabled: z.boolean(),
  defaultVariationKey: z.string().nullable(),
  fallbackVariationKey: z.string().nullable(),
  targetingRules: z.array(TargetingRuleSchema).nullable(),
  rolloutPercentage: z.number().min(0).max(100).nullable(),
  updatedAt: z.date(),
});

export type FlagEnvironmentConfig = z.infer<typeof FlagEnvironmentConfigSchema>;

// Flag evaluation context
export const EvaluationContextSchema = z.object({
  userId: z.string().optional(),
  attributes: z.record(z.string(), jsonValueSchema).optional(),
});

export type EvaluationContext = z.infer<typeof EvaluationContextSchema>;

// Flag evaluation result
export interface FlagEvaluationResult {
  flagKey: string;
  value: FlagValue;
  variationKey: string;
  reason: string;
}
