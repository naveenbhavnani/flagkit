import { prisma } from '@flagkit/database';

export interface EvaluationContext {
  userId?: string;
  sessionId?: string;
  attributes?: Record<string, unknown>;
}

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
    context?: EvaluationContext
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

    // If no config exists, return default disabled state
    if (!config) {
      const defaultVariation = flag.variations.find((v) => v.key === 'false') || flag.variations[0];
      return {
        key: flag.key,
        value: defaultVariation ? JSON.parse(defaultVariation.value) : false,
        variationKey: defaultVariation?.key || 'false',
        enabled: false,
        reason: 'NO_CONFIG',
      };
    }

    // Flag is disabled
    if (!config.enabled) {
      const fallbackVariation = flag.variations.find(
        (v) => v.key === config.fallbackVariationKey
      ) || flag.variations.find((v) => v.key === 'false') || flag.variations[0];

      return {
        key: flag.key,
        value: fallbackVariation ? JSON.parse(fallbackVariation.value) : false,
        variationKey: fallbackVariation?.key || 'false',
        enabled: false,
        reason: 'DISABLED',
      };
    }

    // TODO: Implement targeting rules evaluation
    // For now, just return the default variation

    // Flag is enabled - return default variation
    const defaultVariation = flag.variations.find(
      (v) => v.key === config.defaultVariationKey
    ) || flag.variations.find((v) => v.key === 'true') || flag.variations[0];

    return {
      key: flag.key,
      value: defaultVariation ? JSON.parse(defaultVariation.value) : true,
      variationKey: defaultVariation?.key || 'true',
      enabled: true,
      reason: 'DEFAULT',
    };
  }
}

export const sdkService = new SdkService();
