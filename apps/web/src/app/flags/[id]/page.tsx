'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useFlagStore } from '@/stores/flag.store';
import { useEnvironmentStore } from '@/stores/environment.store';
import { AppLayout } from '@/components/layout/AppLayout';
import { EnvironmentConfigDialog } from '@/components/flags/EnvironmentConfigDialog';
import { AuditLogViewer } from '@/components/flags/AuditLogViewer';
import { AnalyticsDashboard } from '@/components/flags/AnalyticsDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Flag, Settings as SettingsIcon } from 'lucide-react';
import type { TargetingRule } from '@/types/targeting.types';

export default function FlagDetailPage() {
  const router = useRouter();
  const params = useParams();
  const flagId = params.id as string;

  const { isAuthenticated } = useAuthStore();
  const { currentFlag, loadFlag, flagConfigs, loadFlagConfigs, toggleFlag, updateFlagConfig } = useFlagStore();
  const { environments, loadProjectEnvironments } = useEnvironmentStore();

  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});
  const [isToggling, setIsToggling] = useState<Record<string, boolean>>({});
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (flagId) {
      loadFlag(flagId);
      loadFlagConfigs(flagId);
    }
  }, [isAuthenticated, flagId, router, loadFlag, loadFlagConfigs]);

  useEffect(() => {
    if (currentFlag?.projectId) {
      loadProjectEnvironments(currentFlag.projectId);
    }
  }, [currentFlag?.projectId, loadProjectEnvironments]);

  // Initialize toggle states from configs
  useEffect(() => {
    if (flagConfigs[flagId]) {
      const states: Record<string, boolean> = {};
      flagConfigs[flagId].forEach((config) => {
        states[config.environmentId] = config.enabled;
      });
      setToggleStates(states);
    }
  }, [flagConfigs, flagId]);

  if (!isAuthenticated) {
    return null;
  }

  if (!currentFlag) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading flag...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const handleToggle = async (environmentId: string, enabled: boolean) => {
    setIsToggling((prev) => ({ ...prev, [environmentId]: true }));
    setToggleStates((prev) => ({ ...prev, [environmentId]: enabled }));

    const result = await toggleFlag(flagId, environmentId, enabled);

    if (!result) {
      // Revert on failure
      setToggleStates((prev) => ({ ...prev, [environmentId]: !enabled }));
    }

    setIsToggling((prev) => ({ ...prev, [environmentId]: false }));
  };

  const handleOpenConfig = (environmentId: string) => {
    setSelectedEnvironment(environmentId);
    setConfigDialogOpen(true);
  };

  const handleCloseConfig = () => {
    setConfigDialogOpen(false);
    setSelectedEnvironment(null);
  };

  const handleSaveConfig = async (config: {
    enabled: boolean;
    defaultVariationKey: string | null;
    targetingRules: TargetingRule[];
    rolloutPercentage: number | null;
  }) => {
    if (!selectedEnvironment) return;

    await updateFlagConfig(flagId, selectedEnvironment, {
      enabled: config.enabled,
      defaultVariationKey: config.defaultVariationKey || undefined,
      targetingRules: config.targetingRules,
      rolloutPercentage: config.rolloutPercentage || undefined,
    });

    // Reload configs to get updated data
    await loadFlagConfigs(flagId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500';
      case 'INACTIVE':
        return 'bg-yellow-500';
      case 'ARCHIVED':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Flag className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{currentFlag.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {currentFlag.key}
                    </code>
                    <Badge variant="outline" className={getStatusColor(currentFlag.status)}>
                      {currentFlag.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
        {/* Flag Info */}
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Flag Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentFlag.description && (
                <div>
                  <Label className="text-sm text-muted-foreground">Description</Label>
                  <p className="mt-1">{currentFlag.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Type</Label>
                  <p className="mt-1 font-medium">{currentFlag.type}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <p className="mt-1 font-medium">{currentFlag.status}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Created</Label>
                  <p className="mt-1 font-medium">
                    {new Date(currentFlag.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Last Updated</Label>
                  <p className="mt-1 font-medium">
                    {new Date(currentFlag.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {currentFlag.tags.length > 0 && (
                <div>
                  <Label className="text-sm text-muted-foreground">Tags</Label>
                  <div className="flex gap-2 mt-2">
                    {currentFlag.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Variations */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Variations</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {currentFlag.variations.map((variation) => (
                  <div
                    key={variation.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono font-semibold">
                          {variation.key}
                        </code>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm font-medium">{variation.name}</span>
                      </div>
                      {variation.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {variation.description}
                        </p>
                      )}
                    </div>
                    <code className="text-sm bg-muted px-3 py-1 rounded font-mono">
                      {variation.value}
                    </code>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Environment Controls */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Environment Configuration</h2>
          {environments.length > 0 ? (
            <div className="grid gap-4">
              {environments.map((env) => {
                const config = flagConfigs[flagId]?.find((c) => c.environmentId === env.id);
                const isEnabled = toggleStates[env.id] || false;
                const isLoading = isToggling[env.id] || false;

                return (
                  <Card key={env.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {env.color && (
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: env.color }}
                            />
                          )}
                          <div>
                            <CardTitle className="text-base">{env.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {env.key}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Label
                            htmlFor={`toggle-${env.id}`}
                            className={`text-sm font-medium ${
                              isEnabled ? 'text-green-600' : 'text-muted-foreground'
                            }`}
                          >
                            {isEnabled ? 'Enabled' : 'Disabled'}
                          </Label>
                          <Switch
                            id={`toggle-${env.id}`}
                            checked={isEnabled}
                            onCheckedChange={(checked) => handleToggle(env.id, checked)}
                            disabled={isLoading}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenConfig(env.id)}
                          >
                            <SettingsIcon className="h-4 w-4 mr-2" />
                            Configure
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {config && (config.targetingRules as unknown as TargetingRule[])?.length > 0 && (
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="secondary" className="text-xs">
                            {(config.targetingRules as unknown as TargetingRule[]).length} targeting rule(s)
                          </Badge>
                          {config.rolloutPercentage !== null && (
                            <Badge variant="secondary" className="text-xs">
                              {config.rolloutPercentage}% global rollout
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No environments</CardTitle>
                <CardDescription>
                  Create environments in your project to configure this flag.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>

        {/* Analytics Dashboard */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Analytics & Metrics</h2>
          <AnalyticsDashboard flagId={flagId} />
        </div>

        {/* Change History */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Change History</h2>
          <AuditLogViewer flagId={flagId} />
        </div>

        {/* Environment Configuration Dialog */}
        {selectedEnvironment && (
          <EnvironmentConfigDialog
            isOpen={configDialogOpen}
            onClose={handleCloseConfig}
            environmentName={
              environments.find((e) => e.id === selectedEnvironment)?.name || 'Environment'
            }
            variations={currentFlag.variations.map((v) => ({
              key: v.key,
              name: v.name,
              value: String(v.value),
            }))}
            initialConfig={{
              enabled: flagConfigs[flagId]?.find((c) => c.environmentId === selectedEnvironment)
                ?.enabled,
              defaultVariationKey: flagConfigs[flagId]?.find(
                (c) => c.environmentId === selectedEnvironment
              )?.defaultVariationKey,
              targetingRules: (flagConfigs[flagId]?.find((c) => c.environmentId === selectedEnvironment)
                ?.targetingRules as unknown as TargetingRule[]) || [],
              rolloutPercentage: flagConfigs[flagId]?.find(
                (c) => c.environmentId === selectedEnvironment
              )?.rolloutPercentage,
            }}
            onSave={handleSaveConfig}
          />
        )}
      </div>
    </AppLayout>
  );
}
