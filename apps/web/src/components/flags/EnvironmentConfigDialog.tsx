'use client';

import { useState, useEffect } from 'react';
import {
  TargetingRule,
  ConditionOperator,
  ConditionLogic,
} from '@/types/targeting.types';
import { TargetingRuleBuilder } from './TargetingRuleBuilder';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertCircle, Code } from 'lucide-react';

interface EnvironmentConfig {
  enabled: boolean;
  defaultVariationKey: string | null;
  targetingRules: TargetingRule[];
  rolloutPercentage: number | null;
}

interface EnvironmentConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  environmentName: string;
  variations: Array<{ key: string; name: string; value: string }>;
  initialConfig?: Partial<EnvironmentConfig>;
  onSave: (config: EnvironmentConfig) => Promise<void>;
}

export function EnvironmentConfigDialog({
  isOpen,
  onClose,
  environmentName,
  variations,
  initialConfig,
  onSave,
}: EnvironmentConfigDialogProps) {
  const [config, setConfig] = useState<EnvironmentConfig>({
    enabled: initialConfig?.enabled ?? false,
    defaultVariationKey: initialConfig?.defaultVariationKey ?? variations[0]?.key ?? null,
    targetingRules: initialConfig?.targetingRules ?? [],
    rolloutPercentage: initialConfig?.rolloutPercentage ?? null,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('visual');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (initialConfig) {
      setConfig({
        enabled: initialConfig.enabled ?? false,
        defaultVariationKey: initialConfig.defaultVariationKey ?? variations[0]?.key ?? null,
        targetingRules: initialConfig.targetingRules ?? [],
        rolloutPercentage: initialConfig.rolloutPercentage ?? null,
      });
    }
  }, [initialConfig, variations, isOpen]);

  const handleAddRule = () => {
    const newRule: TargetingRule = {
      id: `rule-${Date.now()}`,
      description: '',
      conditions: [
        {
          attribute: '',
          operator: ConditionOperator.EQUALS,
          value: '',
        },
      ],
      conditionLogic: ConditionLogic.AND,
      variationKey: variations[0]?.key ?? '',
    };

    setConfig({
      ...config,
      targetingRules: [...config.targetingRules, newRule],
    });
  };

  const handleRuleChange = (index: number, rule: TargetingRule) => {
    const newRules = [...config.targetingRules];
    newRules[index] = rule;
    setConfig({ ...config, targetingRules: newRules });
  };

  const handleRemoveRule = (index: number) => {
    const newRules = config.targetingRules.filter((_, i) => i !== index);
    setConfig({ ...config, targetingRules: newRules });
  };

  const handleGlobalRolloutChange = (percentage: number | null) => {
    setConfig({ ...config, rolloutPercentage: percentage });
  };

  const validateConfig = (): boolean => {
    const errors: string[] = [];

    // Validate default variation is set
    if (!config.defaultVariationKey) {
      errors.push('Default variation must be selected');
    }

    // Validate targeting rules
    config.targetingRules.forEach((rule, index) => {
      if (!rule.variationKey) {
        errors.push(`Rule ${index + 1}: Variation must be selected`);
      }

      if (rule.conditions.length === 0) {
        errors.push(`Rule ${index + 1}: At least one condition is required`);
      }

      rule.conditions.forEach((condition, condIndex) => {
        if (!condition.attribute.trim()) {
          errors.push(
            `Rule ${index + 1}, Condition ${condIndex + 1}: Attribute is required`
          );
        }
        if (
          condition.value === '' ||
          (Array.isArray(condition.value) && condition.value.length === 0)
        ) {
          errors.push(
            `Rule ${index + 1}, Condition ${condIndex + 1}: Value is required`
          );
        }
      });
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validateConfig()) {
      setActiveTab('visual');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(config);
      onClose();
    } catch (error) {
      console.error('Failed to save config:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const configJSON = JSON.stringify(
    {
      enabled: config.enabled,
      defaultVariationKey: config.defaultVariationKey,
      rolloutPercentage: config.rolloutPercentage,
      targetingRules: config.targetingRules,
    },
    null,
    2
  );

  const hasGlobalRollout = config.rolloutPercentage !== null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Configure {environmentName}</DialogTitle>
          <DialogDescription>
            Set up targeting rules, rollouts, and default behavior for this environment
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visual">Visual Editor</TabsTrigger>
            <TabsTrigger value="json">JSON Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="flex-1 overflow-y-auto mt-4 space-y-6">
            {/* Enable/Disable */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Enable Flag</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Turn this flag on or off for this environment
                    </p>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Default Variation */}
            <Card>
              <CardContent className="pt-6">
                <Label className="text-base">Default Variation</Label>
                <p className="text-sm text-muted-foreground mt-1 mb-3">
                  Served when no targeting rules match or flag evaluation fails
                </p>
                <Select
                  value={config.defaultVariationKey || ''}
                  onValueChange={(value) =>
                    setConfig({ ...config, defaultVariationKey: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {variations.map((variation) => (
                      <SelectItem key={variation.key} value={variation.key}>
                        <div className="flex items-center gap-2">
                          <span>{variation.name}</span>
                          <code className="text-xs text-muted-foreground">
                            ({variation.value})
                          </code>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Targeting Rules */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <Label className="text-base">Targeting Rules</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Rules are evaluated in order. First match wins.
                  </p>
                </div>
                <Button onClick={handleAddRule} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>

              {config.targetingRules.length > 0 ? (
                <div className="space-y-3">
                  {config.targetingRules.map((rule, index) => (
                    <TargetingRuleBuilder
                      key={rule.id}
                      rule={rule}
                      variations={variations.map((v) => ({ key: v.key, name: v.name }))}
                      onChange={(r) => handleRuleChange(index, r)}
                      onRemove={() => handleRemoveRule(index)}
                      canRemove={true}
                      ruleIndex={index}
                    />
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">
                      No targeting rules. Click &quot;Add Rule&quot; to create one.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Global Rollout Percentage */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label className="text-base">Global Rollout Percentage</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Applies after targeting rules. Gradually rollout to a percentage of users.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      handleGlobalRolloutChange(hasGlobalRollout ? null : 100)
                    }
                  >
                    {hasGlobalRollout ? 'Remove' : 'Add'}
                  </Button>
                </div>

                {hasGlobalRollout && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[config.rolloutPercentage || 100]}
                        onValueChange={(values) => handleGlobalRolloutChange(values[0])}
                        min={0}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <div className="w-16 text-right">
                        <Badge variant="secondary" className="text-sm">
                          {config.rolloutPercentage}%
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {config.rolloutPercentage}% of users will receive the default variation
                      (stable bucketing by userId)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Please fix the following errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-sm">
                        {error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="json" className="flex-1 overflow-y-auto mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Code className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">JSON Configuration</Label>
                </div>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-[500px]">
                  {configJSON}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
