'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useProjectStore } from '@/stores/project.store';
import { useEnvironmentStore } from '@/stores/environment.store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Copy, Check } from 'lucide-react';

const ENVIRONMENT_COLORS = [
  { name: 'Green', value: '#10b981' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Pink', value: '#ec4899' },
];

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const { isAuthenticated } = useAuthStore();
  const { currentProject, loadProject } = useProjectStore();
  const { environments, createEnvironment, loadProjectEnvironments } = useEnvironmentStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [envName, setEnvName] = useState('');
  const [envKey, setEnvKey] = useState('');
  const [envColor, setEnvColor] = useState(ENVIRONMENT_COLORS[0].value);
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (projectId) {
      loadProject(projectId);
      loadProjectEnvironments(projectId);
    }
  }, [isAuthenticated, projectId, router, loadProject, loadProjectEnvironments]);

  if (!isAuthenticated) {
    return null;
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading project...</p>
          </div>
        </div>
      </div>
    );
  }

  const generateEnvKey = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (value: string) => {
    setEnvName(value);
    if (!envKey || envKey === generateEnvKey(envName)) {
      setEnvKey(generateEnvKey(value));
    }
  };

  const handleCreateEnvironment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!envName || !envKey) {
      setCreateError('Name and key are required');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(envKey)) {
      setCreateError('Key can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    setIsCreating(true);
    const environment = await createEnvironment(projectId, {
      name: envName,
      key: envKey,
      color: envColor,
    });
    setIsCreating(false);

    if (environment) {
      setIsCreateDialogOpen(false);
      setEnvName('');
      setEnvKey('');
      setEnvColor(ENVIRONMENT_COLORS[0].value);
    } else {
      setCreateError('Failed to create environment');
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
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
              <div>
                <h1 className="text-2xl font-bold">{currentProject.name}</h1>
                <p className="text-sm text-muted-foreground">{currentProject.key}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Project Info */}
        {currentProject.description && (
          <div className="mb-8">
            <p className="text-muted-foreground">{currentProject.description}</p>
          </div>
        )}

        {/* Environments Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Environments</h2>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Environment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateEnvironment}>
                  <DialogHeader>
                    <DialogTitle>Create Environment</DialogTitle>
                    <DialogDescription>
                      Create a new environment for this project (e.g., Development, Production).
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    {createError && (
                      <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md">
                        {createError}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="env-name">Environment Name</Label>
                      <Input
                        id="env-name"
                        placeholder="Production"
                        value={envName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        disabled={isCreating}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="env-key">Environment Key</Label>
                      <Input
                        id="env-key"
                        placeholder="prod"
                        value={envKey}
                        onChange={(e) => setEnvKey(e.target.value.toLowerCase())}
                        disabled={isCreating}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Lowercase letters, numbers, and hyphens only
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Color</Label>
                      <div className="flex gap-2">
                        {ENVIRONMENT_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => setEnvColor(color.value)}
                            className={`w-8 h-8 rounded-full border-2 ${
                              envColor === color.value
                                ? 'border-primary ring-2 ring-primary ring-offset-2'
                                : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? 'Creating...' : 'Create Environment'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {environments.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {environments.map((env) => (
                <Card key={env.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {env.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: env.color }}
                          />
                        )}
                        {env.name}
                      </CardTitle>
                      <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
                        {env.key}
                      </span>
                    </div>
                    <CardDescription>
                      {env._count?.flagConfigs || 0} flag configurations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Client SDK Key</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono overflow-hidden text-ellipsis">
                          {env.clientSdkKey}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(env.clientSdkKey, `client-${env.id}`)}
                        >
                          {copiedKey === `client-${env.id}` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Server SDK Key</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono overflow-hidden text-ellipsis">
                          {env.serverSdkKey}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(env.serverSdkKey, `server-${env.id}`)}
                        >
                          {copiedKey === `server-${env.id}` ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No environments yet</CardTitle>
                <CardDescription>
                  Create environments to manage feature flags across different stages (dev, staging, prod).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Environment
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
