'use client';

import { useState, useEffect, useCallback } from 'react';
import { FlagChange } from '@/types/audit.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clock,
  User,
  GitCommit,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface AuditLogViewerProps {
  flagId: string;
}

export function AuditLogViewer({ flagId }: AuditLogViewerProps) {
  const [changes, setChanges] = useState<FlagChange[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [expandedChanges, setExpandedChanges] = useState<Set<string>>(new Set());
  const limit = 20;

  const loadChanges = useCallback(async (newOffset = 0) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/flags/${flagId}/history?limit=${limit}&offset=${newOffset}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load change history');
      }

      const data = await response.json();

      if (data.success) {
        if (newOffset === 0) {
          setChanges(data.data.changes);
        } else {
          setChanges((prev) => [...prev, ...data.data.changes]);
        }
        setTotal(data.data.total);
        setOffset(newOffset);
      } else {
        throw new Error(data.error?.message || 'Failed to load change history');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [flagId, limit]);

  useEffect(() => {
    loadChanges(0);
  }, [loadChanges]);

  const toggleExpanded = (changeId: string) => {
    setExpandedChanges((prev) => {
      const next = new Set(prev);
      if (next.has(changeId)) {
        next.delete(changeId);
      } else {
        next.add(changeId);
      }
      return next;
    });
  };

  const loadMore = () => {
    loadChanges(offset + limit);
  };

  const getChangeTypeColor = (changeType: FlagChange['changeType']) => {
    switch (changeType) {
      case 'CREATED':
        return 'bg-green-500';
      case 'UPDATED':
        return 'bg-blue-500';
      case 'TOGGLED':
        return 'bg-yellow-500';
      case 'CONFIG_UPDATED':
        return 'bg-purple-500';
      case 'DELETED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getChangeTypeLabel = (changeType: FlagChange['changeType']) => {
    switch (changeType) {
      case 'CREATED':
        return 'Created';
      case 'UPDATED':
        return 'Updated';
      case 'TOGGLED':
        return 'Toggled';
      case 'CONFIG_UPDATED':
        return 'Config Updated';
      case 'DELETED':
        return 'Deleted';
      default:
        return changeType;
    }
  };

  const renderChangeDetails = (change: FlagChange) => {
    const isExpanded = expandedChanges.has(change.id);

    return (
      <div className="space-y-3">
        {/* Change summary */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0 mt-1">
              <Avatar className="h-8 w-8">
                {change.user?.avatarUrl && (
                  <AvatarImage src={change.user.avatarUrl} alt={change.user.name || 'User'} />
                )}
                <AvatarFallback>
                  {change.user?.name
                    ? change.user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">
                  {change.user?.name || change.user?.email || 'Unknown user'}
                </span>
                <Badge variant="outline" className={getChangeTypeColor(change.changeType)}>
                  {getChangeTypeLabel(change.changeType)}
                </Badge>
              </div>

              {change.comment && (
                <p className="text-sm text-muted-foreground mt-1">{change.comment}</p>
              )}

              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(change.createdAt), { addSuffix: true })}
                </span>
                <span>•</span>
                <span>{new Date(change.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {(change.before || change.after) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpanded(change.id)}
              className="flex-shrink-0"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Details
                </>
              )}
            </Button>
          )}
        </div>

        {/* Expanded details */}
        {isExpanded && (change.before || change.after) && (
          <div className="ml-11 mt-3 space-y-3">
            {change.before && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Before</Label>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-48">
                  {JSON.stringify(change.before, null, 2)}
                </pre>
              </div>
            )}

            {change.after && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">After</Label>
                <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto max-h-48">
                  {JSON.stringify(change.after, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitCommit className="h-5 w-5" />
              Change History
            </CardTitle>
            <CardDescription>
              {total > 0 ? `${total} change${total === 1 ? '' : 's'}` : 'No changes yet'}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadChanges(0)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading && changes.length === 0 ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : changes.length === 0 ? (
          <div className="text-center py-12">
            <GitCommit className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No change history yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Changes will appear here when you modify this flag
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Timeline */}
            <div className="relative space-y-6">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              {changes.map((change) => (
                <div key={change.id} className="relative">
                  {/* Timeline dot */}
                  <div
                    className={`absolute left-2.5 top-3 h-3 w-3 rounded-full ${getChangeTypeColor(
                      change.changeType
                    )} ring-4 ring-background`}
                  />

                  {/* Change content */}
                  <div className="ml-11 pb-6">
                    <Card className="border-muted">
                      <CardContent className="pt-4">{renderChangeDetails(change)}</CardContent>
                    </Card>
                  </div>
                </div>
              ))}
            </div>

            {/* Load more */}
            {changes.length < total && (
              <div className="flex justify-center pt-4">
                <Button onClick={loadMore} disabled={loading} variant="outline">
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      Load More ({changes.length} of {total})
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Label({ className, children, ...props }: React.HTMLAttributes<HTMLLabelElement>) {
  return (
    <label className={className} {...props}>
      {children}
    </label>
  );
}
