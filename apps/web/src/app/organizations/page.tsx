'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { useOrganizationStore } from '@/stores/organization.store';
import { AppLayout } from '@/components/layout/AppLayout';
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
import { Plus } from 'lucide-react';

export default function OrganizationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { organizations, isLoading, error, loadOrganizations, createOrganization } =
    useOrganizationStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    loadOrganizations();
  }, [isAuthenticated, router, loadOrganizations]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!name || !slug) {
      setCreateError('Name and slug are required');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setCreateError('Slug can only contain lowercase letters, numbers, and hyphens');
      return;
    }

    setIsCreating(true);
    const org = await createOrganization({ name, slug });
    setIsCreating(false);

    if (org) {
      setIsCreateDialogOpen(false);
      setName('');
      setSlug('');
      router.push(`/organizations/${org.id}`);
    } else {
      setCreateError(error || 'Failed to create organization');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Organizations</h2>
            <p className="text-muted-foreground">
              Manage your organizations and invite team members
            </p>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Organization
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateOrganization}>
                <DialogHeader>
                  <DialogTitle>Create Organization</DialogTitle>
                  <DialogDescription>
                    Create a new organization to manage your feature flags and projects.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {(createError || error) && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md">
                      {createError || error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="name">Organization Name</Label>
                    <Input
                      id="name"
                      placeholder="Acme Inc"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      disabled={isCreating}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug</Label>
                    <Input
                      id="slug"
                      placeholder="acme-inc"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      disabled={isCreating}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Used in URLs. Only lowercase letters, numbers, and hyphens.
                    </p>
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
                    {isCreating ? 'Creating...' : 'Create Organization'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading organizations...</p>
          </div>
        ) : organizations.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No organizations yet</CardTitle>
              <CardDescription>
                Create your first organization to get started with feature flags.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Organization
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <Card
                key={org.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/organizations/${org.id}`)}
              >
                <CardHeader>
                  <CardTitle>{org.name}</CardTitle>
                  <CardDescription>@{org.slug}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{org._count?.projects || 0} projects</span>
                    <span>{org._count?.members || 0} members</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {org.role || 'Member'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
