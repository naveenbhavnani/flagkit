import { z } from 'zod';

export enum ExperimentStatus {
  DRAFT = 'DRAFT',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
}

export const ExperimentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  hypothesis: z.string().nullable(),
  flagId: z.string(),
  status: z.nativeEnum(ExperimentStatus),
  winnerVariationKey: z.string().nullable(),
  primaryMetric: z.string().nullable(),
  guardrailMetrics: z.array(z.string()),
  startedAt: z.date().nullable(),
  completedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Experiment = z.infer<typeof ExperimentSchema>;

export const CreateExperimentSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  hypothesis: z.string().optional(),
  flagId: z.string(),
  primaryMetric: z.string().optional(),
  guardrailMetrics: z.array(z.string()).default([]),
});

export type CreateExperimentInput = z.infer<typeof CreateExperimentSchema>;

export const ExperimentResultSchema = z.object({
  id: z.string(),
  experimentId: z.string(),
  variationKey: z.string(),
  sampleSize: z.number(),
  conversionRate: z.number().nullable(),
  confidence: z.number().nullable(),
  metrics: z.any().nullable(),
  updatedAt: z.date(),
});

export type ExperimentResult = z.infer<typeof ExperimentResultSchema>;
