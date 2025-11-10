import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma, Environment, Flag, FlagVariation, FlagEnvironmentConfig } from '@flagkit/database';
import { sdkService } from '../sdk.service';

// Mock the prisma client
vi.mock('@flagkit/database', () => ({
  prisma: {
    environment: {
      findFirst: vi.fn(),
    },
    flag: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    flagEvaluation: {
      create: vi.fn(),
    },
  },
}));

describe('SdkService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEnvironmentBySdkKey', () => {
    it('should return environment for valid client SDK key', async () => {
      const mockEnvironment: Partial<Environment> = {
        id: 'env-1',
        name: 'Production',
        key: 'prod',
        projectId: 'proj-1',
      };

      vi.mocked(prisma.environment.findFirst).mockResolvedValue(mockEnvironment as Environment);

      const result = await sdkService.getEnvironmentBySdkKey('client-sdk-key', 'client');

      expect(result).toEqual(mockEnvironment);
      expect(prisma.environment.findFirst).toHaveBeenCalledWith({
        where: { clientSdkKey: 'client-sdk-key' },
        select: {
          id: true,
          name: true,
          key: true,
          projectId: true,
        },
      });
    });

    it('should return environment for valid server SDK key', async () => {
      const mockEnvironment: Partial<Environment> = {
        id: 'env-1',
        name: 'Production',
        key: 'prod',
        projectId: 'proj-1',
      };

      vi.mocked(prisma.environment.findFirst).mockResolvedValue(mockEnvironment as Environment);

      const result = await sdkService.getEnvironmentBySdkKey('server-sdk-key', 'server');

      expect(result).toEqual(mockEnvironment);
      expect(prisma.environment.findFirst).toHaveBeenCalledWith({
        where: { serverSdkKey: 'server-sdk-key' },
        select: {
          id: true,
          name: true,
          key: true,
          projectId: true,
        },
      });
    });

    it('should return null for invalid SDK key', async () => {
      vi.mocked(prisma.environment.findFirst).mockResolvedValue(null);

      const result = await sdkService.getEnvironmentBySdkKey('invalid-key', 'client');

      expect(result).toBeNull();
    });
  });

  describe('getAllFlags', () => {
    it('should return all flags for environment', async () => {
      const mockEnvironment: Partial<Environment> = {
        id: 'env-1',
        name: 'Production',
        key: 'prod',
        projectId: 'proj-1',
      };

      type FlagWithRelations = Flag & {
        variations: Partial<FlagVariation>[];
        envConfigs: Partial<FlagEnvironmentConfig>[];
      };

      const mockFlags: Partial<FlagWithRelations>[] = [
        {
          id: 'flag-1',
          key: 'feature-flag',
          status: 'ACTIVE',
          variations: [
            { key: 'true', value: JSON.stringify(true) },
            { key: 'false', value: JSON.stringify(false) },
          ],
          envConfigs: [
            {
              enabled: true,
              defaultVariationKey: 'true',
              fallbackVariationKey: 'false',
              targetingRules: null,
              rolloutPercentage: null,
            },
          ],
        },
      ];

      vi.mocked(prisma.environment.findFirst).mockResolvedValue(mockEnvironment as Environment);
      vi.mocked(prisma.flag.findMany).mockResolvedValue(mockFlags as Flag[]);

      const result = await sdkService.getAllFlags('client-sdk-key', 'client');

      expect(result).toBeDefined();
      expect(result?.environment).toEqual({
        id: mockEnvironment.id,
        name: mockEnvironment.name,
        key: mockEnvironment.key,
      });
      expect(result?.flags['feature-flag']).toBeDefined();
      expect(result?.flags['feature-flag'].value).toBe(true);
      expect(result?.flags['feature-flag'].enabled).toBe(true);
    });

    it('should return disabled flags correctly', async () => {
      const mockEnvironment: Partial<Environment> = {
        id: 'env-1',
        name: 'Production',
        key: 'prod',
        projectId: 'proj-1',
      };

      type FlagWithRelations = Flag & {
        variations: Partial<FlagVariation>[];
        envConfigs: Partial<FlagEnvironmentConfig>[];
      };

      const mockFlags: Partial<FlagWithRelations>[] = [
        {
          id: 'flag-1',
          key: 'disabled-flag',
          status: 'ACTIVE',
          variations: [
            { key: 'true', value: JSON.stringify(true) },
            { key: 'false', value: JSON.stringify(false) },
          ],
          envConfigs: [
            {
              enabled: false,
              defaultVariationKey: 'true',
              fallbackVariationKey: 'false',
              targetingRules: null,
              rolloutPercentage: null,
            },
          ],
        },
      ];

      vi.mocked(prisma.environment.findFirst).mockResolvedValue(mockEnvironment as Environment);
      vi.mocked(prisma.flag.findMany).mockResolvedValue(mockFlags as Flag[]);

      const result = await sdkService.getAllFlags('client-sdk-key', 'client');

      expect(result?.flags['disabled-flag']).toBeDefined();
      expect(result?.flags['disabled-flag'].value).toBe(false);
      expect(result?.flags['disabled-flag'].enabled).toBe(false);
      expect(result?.flags['disabled-flag'].reason).toBe('DISABLED');
    });

    it('should handle flags without configuration', async () => {
      const mockEnvironment: Partial<Environment> = {
        id: 'env-1',
        name: 'Production',
        key: 'prod',
        projectId: 'proj-1',
      };

      type FlagWithRelations = Flag & {
        variations: Partial<FlagVariation>[];
        envConfigs: Partial<FlagEnvironmentConfig>[];
      };

      const mockFlags: Partial<FlagWithRelations>[] = [
        {
          id: 'flag-1',
          key: 'no-config-flag',
          status: 'ACTIVE',
          variations: [
            { key: 'true', value: JSON.stringify(true) },
            { key: 'false', value: JSON.stringify(false) },
          ],
          envConfigs: [], // No configuration
        },
      ];

      vi.mocked(prisma.environment.findFirst).mockResolvedValue(mockEnvironment as Environment);
      vi.mocked(prisma.flag.findMany).mockResolvedValue(mockFlags as Flag[]);

      const result = await sdkService.getAllFlags('client-sdk-key', 'client');

      expect(result?.flags['no-config-flag']).toBeDefined();
      expect(result?.flags['no-config-flag'].value).toBe(false);
      expect(result?.flags['no-config-flag'].enabled).toBe(false);
      expect(result?.flags['no-config-flag'].reason).toBe('NO_CONFIG');
    });

    it('should return null for invalid SDK key', async () => {
      vi.mocked(prisma.environment.findFirst).mockResolvedValue(null);

      const result = await sdkService.getAllFlags('invalid-key', 'client');

      expect(result).toBeNull();
    });
  });

  describe('evaluateFlag', () => {
    it('should evaluate enabled flag with default variation', async () => {
      const mockEnvironment: Partial<Environment> = {
        id: 'env-1',
        name: 'Production',
        key: 'prod',
        projectId: 'proj-1',
      };

      type FlagWithRelations = Flag & {
        variations: Partial<FlagVariation>[];
        envConfigs: Partial<FlagEnvironmentConfig>[];
      };

      const mockFlag: Partial<FlagWithRelations> = {
        id: 'flag-1',
        key: 'test-flag',
        status: 'ACTIVE',
        variations: [
          { key: 'true', value: JSON.stringify(true) },
          { key: 'false', value: JSON.stringify(false) },
        ],
        envConfigs: [
          {
            enabled: true,
            defaultVariationKey: 'true',
            fallbackVariationKey: 'false',
            targetingRules: null,
            rolloutPercentage: null,
          },
        ],
      };

      vi.mocked(prisma.environment.findFirst).mockResolvedValue(mockEnvironment as Environment);
      vi.mocked(prisma.flag.findFirst).mockResolvedValue(mockFlag as Flag);

      const result = await sdkService.evaluateFlag('client-key', 'client', 'test-flag');

      expect(result).toBeDefined();
      expect(result?.key).toBe('test-flag');
      expect(result?.value).toBe(true);
      expect(result?.variationKey).toBe('true');
      expect(result?.enabled).toBe(true);
      expect(result?.reason).toBe('DEFAULT');
    });

    it('should evaluate disabled flag correctly', async () => {
      const mockEnvironment: Partial<Environment> = {
        id: 'env-1',
        name: 'Production',
        key: 'prod',
        projectId: 'proj-1',
      };

      type FlagWithRelations = Flag & {
        variations: Partial<FlagVariation>[];
        envConfigs: Partial<FlagEnvironmentConfig>[];
      };

      const mockFlag: Partial<FlagWithRelations> = {
        id: 'flag-1',
        key: 'test-flag',
        status: 'ACTIVE',
        variations: [
          { key: 'true', value: JSON.stringify(true) },
          { key: 'false', value: JSON.stringify(false) },
        ],
        envConfigs: [
          {
            enabled: false,
            defaultVariationKey: 'true',
            fallbackVariationKey: 'false',
            targetingRules: null,
            rolloutPercentage: null,
          },
        ],
      };

      vi.mocked(prisma.environment.findFirst).mockResolvedValue(mockEnvironment as Environment);
      vi.mocked(prisma.flag.findFirst).mockResolvedValue(mockFlag as Flag);

      const result = await sdkService.evaluateFlag('client-key', 'client', 'test-flag');

      expect(result).toBeDefined();
      expect(result?.value).toBe(false);
      expect(result?.variationKey).toBe('false');
      expect(result?.enabled).toBe(false);
      expect(result?.reason).toBe('DISABLED');
    });

    it('should evaluate flag with targeting rules', async () => {
      const mockEnvironment: Partial<Environment> = {
        id: 'env-1',
        name: 'Production',
        key: 'prod',
        projectId: 'proj-1',
      };

      type FlagWithRelations = Flag & {
        variations: Partial<FlagVariation>[];
        envConfigs: Partial<FlagEnvironmentConfig>[];
      };

      const mockFlag: Partial<FlagWithRelations> = {
        id: 'flag-1',
        key: 'test-flag',
        status: 'ACTIVE',
        variations: [
          { key: 'on', value: JSON.stringify('enabled') },
          { key: 'off', value: JSON.stringify('disabled') },
        ],
        envConfigs: [
          {
            enabled: true,
            defaultVariationKey: 'off',
            fallbackVariationKey: 'off',
            targetingRules: [
              {
                id: 'rule-1',
                priority: 1,
                conditions: [
                  {
                    attribute: 'userId',
                    operator: 'equals',
                    value: 'user-123',
                  },
                ],
                variationKey: 'on',
              },
            ],
            rolloutPercentage: null,
          },
        ],
      };

      vi.mocked(prisma.environment.findFirst).mockResolvedValue(mockEnvironment as Environment);
      vi.mocked(prisma.flag.findFirst).mockResolvedValue(mockFlag as Flag);

      const result = await sdkService.evaluateFlag(
        'client-key',
        'client',
        'test-flag',
        { userId: 'user-123' }
      );

      expect(result).toBeDefined();
      expect(result?.value).toBe('enabled');
      expect(result?.variationKey).toBe('on');
      expect(result?.enabled).toBe(true);
      expect(result?.reason).toBe('TARGETING_RULE:rule-1');
    });

    it('should return null for non-existent flag', async () => {
      const mockEnvironment: Partial<Environment> = {
        id: 'env-1',
        name: 'Production',
        key: 'prod',
        projectId: 'proj-1',
      };

      vi.mocked(prisma.environment.findFirst).mockResolvedValue(mockEnvironment as Environment);
      vi.mocked(prisma.flag.findFirst).mockResolvedValue(null);

      const result = await sdkService.evaluateFlag('client-key', 'client', 'non-existent');

      expect(result).toBeNull();
    });

    it('should return null for invalid SDK key', async () => {
      vi.mocked(prisma.environment.findFirst).mockResolvedValue(null);

      const result = await sdkService.evaluateFlag('invalid-key', 'client', 'test-flag');

      expect(result).toBeNull();
    });

    it('should handle flag without configuration', async () => {
      const mockEnvironment: Partial<Environment> = {
        id: 'env-1',
        name: 'Production',
        key: 'prod',
        projectId: 'proj-1',
      };

      type FlagWithRelations = Flag & {
        variations: Partial<FlagVariation>[];
        envConfigs: Partial<FlagEnvironmentConfig>[];
      };

      const mockFlag: Partial<FlagWithRelations> = {
        id: 'flag-1',
        key: 'test-flag',
        status: 'ACTIVE',
        variations: [
          { key: 'true', value: JSON.stringify(true) },
          { key: 'false', value: JSON.stringify(false) },
        ],
        envConfigs: [], // No config
      };

      vi.mocked(prisma.environment.findFirst).mockResolvedValue(mockEnvironment as Environment);
      vi.mocked(prisma.flag.findFirst).mockResolvedValue(mockFlag as Flag);

      const result = await sdkService.evaluateFlag('client-key', 'client', 'test-flag');

      expect(result).toBeDefined();
      expect(result?.value).toBe(false);
      expect(result?.enabled).toBe(false);
      expect(result?.reason).toBe('NO_CONFIG');
    });
  });
});
