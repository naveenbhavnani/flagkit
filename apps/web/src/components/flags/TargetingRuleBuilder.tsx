'use client';

import { useState } from 'react';
import {
  TargetingRule,
  Condition,
  ConditionOperator,
  ConditionLogic,
} from '@/types/targeting.types';
import { ConditionEditor } from './ConditionEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface TargetingRuleBuilderProps {
  rule: TargetingRule;
  variations: Array<{ key: string; name: string }>;
  onChange: (rule: TargetingRule) => void;
  onRemove: () => void;
  canRemove: boolean;
  ruleIndex: number;
}

export function TargetingRuleBuilder({
  rule,
  variations,
  onChange,
  onRemove,
  canRemove,
  ruleIndex,
}: TargetingRuleBuilderProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleConditionChange = (index: number, condition: Condition) => {
    const newConditions = [...rule.conditions];
    newConditions[index] = condition;
    onChange({ ...rule, conditions: newConditions });
  };

  const handleAddCondition = () => {
    const newCondition: Condition = {
      attribute: '',
      operator: ConditionOperator.EQUALS,
      value: '',
    };
    onChange({ ...rule, conditions: [...rule.conditions, newCondition] });
  };

  const handleRemoveCondition = (index: number) => {
    const newConditions = rule.conditions.filter((_, i) => i !== index);
    onChange({ ...rule, conditions: newConditions });
  };

  const handleDescriptionChange = (description: string) => {
    onChange({ ...rule, description });
  };

  const handleLogicChange = (logic: ConditionLogic) => {
    onChange({ ...rule, conditionLogic: logic });
  };

  const handleVariationChange = (variationKey: string) => {
    onChange({ ...rule, variationKey });
  };

  const handleRolloutChange = (percentage: number | undefined) => {
    onChange({ ...rule, rolloutPercentage: percentage });
  };

  const hasRollout = rule.rolloutPercentage !== undefined;

  return (
    <Card className="border-2">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Rule {ruleIndex + 1}
                {rule.rolloutPercentage && rule.rolloutPercentage < 100 && (
                  <Badge variant="secondary" className="text-xs">
                    {rule.rolloutPercentage}% rollout
                  </Badge>
                )}
              </CardTitle>
              {rule.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {rule.description}
                </p>
              )}
            </div>
          </div>
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="h-8 w-8"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Description */}
          <div>
            <Label className="text-sm">Description</Label>
            <Input
              value={rule.description || ''}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="e.g. Premium tier users"
              className="mt-2"
            />
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm">Conditions</Label>
              {rule.conditions.length > 1 && (
                <Select
                  value={rule.conditionLogic}
                  onValueChange={handleLogicChange}
                >
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ConditionLogic.AND}>AND</SelectItem>
                    <SelectItem value={ConditionLogic.OR}>OR</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              {rule.conditions.map((condition, index) => (
                <div key={index}>
                  <ConditionEditor
                    condition={condition}
                    onChange={(c) => handleConditionChange(index, c)}
                    onRemove={() => handleRemoveCondition(index)}
                    canRemove={rule.conditions.length > 1}
                  />
                  {index < rule.conditions.length - 1 && (
                    <div className="flex justify-center py-1">
                      <Badge variant="outline" className="text-xs">
                        {rule.conditionLogic}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddCondition}
              className="mt-3"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Condition
            </Button>
          </div>

          {/* Serve Variation */}
          <div>
            <Label className="text-sm">Serve Variation</Label>
            <Select
              value={rule.variationKey}
              onValueChange={handleVariationChange}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {variations.map((variation) => (
                  <SelectItem key={variation.key} value={variation.key}>
                    {variation.name} ({variation.key})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rollout Percentage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm">Percentage Rollout (Optional)</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  handleRolloutChange(hasRollout ? undefined : 100)
                }
                className="h-7 text-xs"
              >
                {hasRollout ? 'Remove' : 'Add'}
              </Button>
            </div>

            {hasRollout && (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Slider
                    value={[rule.rolloutPercentage || 100]}
                    onValueChange={(values) => handleRolloutChange(values[0])}
                    min={0}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                  <div className="w-16 text-right">
                    <span className="text-sm font-medium">
                      {rule.rolloutPercentage}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Only {rule.rolloutPercentage}% of users matching this rule will receive the
                  variation (stable bucketing by userId)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
