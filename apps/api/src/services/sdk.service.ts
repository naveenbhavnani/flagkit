import { prisma } from '@flagkit/database';
import {
  TargetingRule,
  evaluateRule,
  isInRollout,
  EvaluationContext as TargetingContext,
} from '../types/targeting.types';

export type EvaluationContext = TargetingContext;

export interface FlagEvaluation {
  key: string;
  value: unknown;
  variationKey: string;
  enabled: boolean;
  reason: string;
}

export interface FlagsResponse {
  flags: Record<string, FlagEvaluation>;
  environment: {
    id: string;
    name: string;
    key: string;
  };
}

class SdkService {

  /**
   * Evaluate targeting rules and return the variation key
   */
  private evaluateTargeting(
    config: {
      targetingRules: unknown;
      rolloutPercentage: number | null;
      defaultVariationKey: string | null;
    },
    flagKey: string,
    context?: EvaluationContext
  ): { variationKey: string; reason: string } {
    // Parse targeting rules
    let rules: TargetingRule[] = [];
    if (config.targetingRules && typeof config.targetingRules === 'object') {
      try {
        rules = Array.isArray(config.targetingRules)
          ? (config.targetingRules as TargetingRule[])
          : [];
      } catch {
        // Invalid targeting rules, ignore
      }
    }

    // If we have context and targeting rules, evaluate them in order
    if (context && rules.length > 0) {
      for (const rule of rules) {
        if (evaluateRule(rule, context)) {
          // Rule matched! Check if there's a rollout percentage for this rule
          if (rule.rolloutPercentage !== undefined && rule.rolloutPercentage < 100) {
            const inRollout = isInRollout(flagKey, context.userId, rule.rolloutPercentage);
            if (inRollout) {
              return {
                variationKey: rule.variationKey,
                reason: `TARGETING_RULE:${rule.id}:ROLLOUT`,
              };
            }
            // Not in rollout percentage, continue to next rule
            continue;
          }

          // No rollout or 100% rollout - return this variation
          return {
            variationKey: rule.variationKey,
            reason: `TARGETING_RULE:${rule.id}`,
          };
        }
      }
    }

    // Check global rollout percentage
    if (config.rolloutPercentage !== null && config.rolloutPercentage > 0) {
      const inRollout = isInRollout(
        flagKey,
        context?.userId,
        config.rolloutPercentage
      );
      if (!inRollout) {
        // User not in rollout - return default but as disabled
        return {
          variationKey: config.defaultVariationKey || 'false',
          reason: 'ROLLOUT_NOT_INCLUDED',
        };
      }
      return {
        variationKey: config.defaultVariationKey || 'true',
        reason: 'ROLLOUT_INCLUDED',
      };
    }

    // No targeting rules matched or no context provided - return default
    return {
      variationKey: config.defaultVariationKey || 'true',
      reason: 'DEFAULT',
    };
  }

  /**
   * Authenticate and get environment by SDK key
   */
  async getEnvironmentBySdkKey(
    sdkKey: string,
    keyType: 'client' | 'server'
  ): Promise<{ id: string; name: string; key: string; projectId: string } | null> {
    const environment = await prisma.environment.findFirst({
      where:
        keyType === 'client'
          ? { clientSdkKey: sdkKey }
          : { serverSdkKey: sdkKey },
      select: {
        id: true,
        name: true,
        key: true,
        projectId: true,
      },
    });

    return environment;
  }

  /**
   * Get all flags for an environment with their evaluated values
   */
  async getAllFlags(sdkKey: string, keyType: 'client' | 'server'): Promise<FlagsResponse | null> {
    const environment = await this.getEnvironmentBySdkKey(sdkKey, keyType);
    if (!environment) {
      return null;
    }

    // Get all active flags for the project
    const flags = await prisma.flag.findMany({
      where: {
        projectId: environment.projectId,
        status: 'ACTIVE',
      },
      include: {
        variations: true,
        envConfigs: {
          where: {
            environmentId: environment.id,
          },
        },
      },
    });

    const evaluatedFlags: Record<string, FlagEvaluation> = {};

    for (const flag of flags) {
      const config = flag.envConfigs[0];

      // If no config exists, create default disabled state
      if (!config) {
        const defaultVariation = flag.variations.find((v) => v.key === 'false') || flag.variations[0];
        evaluatedFlags[flag.key] = {
          key: flag.key,
          value: defaultVariation ? JSON.parse(defaultVariation.value) : false,
          variationKey: defaultVariation?.key || 'false',
          enabled: false,
          reason: 'NO_CONFIG',
        };
        continue;
      }

      // Flag is disabled
      if (!config.enabled) {
        const fallbackVariation = flag.variations.find(
          (v) => v.key === config.fallbackVariationKey
        ) || flag.variations.find((v) => v.key === 'false') || flag.variations[0];

        evaluatedFlags[flag.key] = {
          key: flag.key,
          value: fallbackVariation ? JSON.parse(fallbackVariation.value) : false,
          variationKey: fallbackVariation?.key || 'false',
          enabled: false,
          reason: 'DISABLED',
        };
        continue;
      }

      // Flag is enabled - return default variation
      const defaultVariation = flag.variations.find(
        (v) => v.key === config.defaultVariationKey
      ) || flag.variations.find((v) => v.key === 'true') || flag.variations[0];

      evaluatedFlags[flag.key] = {
        key: flag.key,
        value: defaultVariation ? JSON.parse(defaultVariation.value) : true,
        variationKey: defaultVariation?.key || 'true',
        enabled: true,
        reason: 'DEFAULT',
      };
    }

    return {
      flags: evaluatedFlags,
      environment: {
        id: environment.id,
        name: environment.name,
        key: environment.key,
      },
    };
  }

  /**
   * Evaluate a single flag for a given context
   */
  async evaluateFlag(
    sdkKey: string,
    keyType: 'client' | 'server',
    flagKey: string,
    context?: EvaluationContext,
    _sdkVersion?: string
  ): Promise<FlagEvaluation | null> {
    const environment = await this.getEnvironmentBySdkKey(sdkKey, keyType);
    if (!environment) {
      return null;
    }

    // Get the flag with its configuration
    const flag = await prisma.flag.findFirst({
      where: {
        projectId: environment.projectId,
        key: flagKey,
        status: 'ACTIVE',
      },
      include: {
        variations: true,
        envConfigs: {
          where: {
            environmentId: environment.id,
          },
        },
      },
    });

    if (!flag) {
      return null;
    }

    const config = flag.envConfigs[0];

    let evaluation: FlagEvaluation;

    // If no config exists, return default disabled state
    if (!config) {
      const defaultVariation = flag.variations.find((v) => v.key === 'false') || flag.variations[0];
      evaluation = {
        key: flag.key,
        value: defaultVariation ? JSON.parse(defaultVariation.value) : false,
        variationKey: defaultVariation?.key || 'false',
        enabled: false,
        reason: 'NO_CONFIG',
      };
    }
    // Flag is disabled
    else if (!config.enabled) {
      const fallbackVariation = flag.variations.find(
        (v) => v.key === config.fallbackVariationKey
      ) || flag.variations.find((v) => v.key === 'false') || flag.variations[0];

      evaluation = {
        key: flag.key,
        value: fallbackVariation ? JSON.parse(fallbackVariation.value) : false,
        variationKey: fallbackVariation?.key || 'false',
        enabled: false,
        reason: 'DISABLED',
      };
    }
    // Flag is enabled - evaluate targeting rules
    else {
      const { variationKey, reason } = this.evaluateTargeting(
        {
          targetingRules: config.targetingRules,
          rolloutPercentage: config.rolloutPercentage,
          defaultVariationKey: config.defaultVariationKey,
        },
        flag.key,
        context
      );

      // Find the variation for the determined key
      const variation = flag.variations.find((v) => v.key === variationKey) ||
        flag.variations.find((v) => v.key === config.defaultVariationKey) ||
        flag.variations.find((v) => v.key === 'true') ||
        flag.variations[0];

      evaluation = {
        key: flag.key,
        value: variation ? JSON.parse(variation.value) : true,
        variationKey: variation?.key || 'true',
        enabled: true,
        reason,
      };
    }

    return evaluation;
  }
}

export const sdkService = new SdkService();
