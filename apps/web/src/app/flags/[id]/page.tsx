'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useFlagStore } from '@/stores/flag.store';
import { useEnvironmentStore } from '@/stores/environment.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Flag, Settings } from 'lucide-react';

export default function FlagDetailPage() {
  const router = useRouter();
  const params = useParams();
  const flagId = params.id as string;

  const { isAuthenticated } = useAuthStore();
  const { currentFlag, loadFlag, flagConfigs, loadFlagConfigs, toggleFlag } = useFlagStore();
  const { environments, loadProjectEnvironments } = useEnvironmentStore();

  const [toggleStates, setToggleStates] = useState<Record<string, boolean>>({});
  const [isToggling, setIsToggling] = useState<Record<string, boolean>>({});

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading flag...</p>
          </div>
        </div>
      </div>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 py-4">
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
                  <h1 className="text-2xl font-bold">{currentFlag.name}</h1>
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
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
                        </div>
                      </div>
                    </CardHeader>
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
      </main>
    </div>
  );
}
