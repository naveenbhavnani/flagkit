'use client';

import { useState } from 'react';
import { Condition, ConditionOperator } from '@/types/targeting.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X } from 'lucide-react';

interface ConditionEditorProps {
  condition: Condition;
  onChange: (condition: Condition) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  [ConditionOperator.EQUALS]: 'Equals',
  [ConditionOperator.NOT_EQUALS]: 'Does not equal',
  [ConditionOperator.CONTAINS]: 'Contains',
  [ConditionOperator.NOT_CONTAINS]: 'Does not contain',
  [ConditionOperator.IN]: 'Is in list',
  [ConditionOperator.NOT_IN]: 'Is not in list',
  [ConditionOperator.GREATER_THAN]: 'Greater than',
  [ConditionOperator.LESS_THAN]: 'Less than',
  [ConditionOperator.GREATER_THAN_OR_EQUAL]: 'Greater than or equal',
  [ConditionOperator.LESS_THAN_OR_EQUAL]: 'Less than or equal',
  [ConditionOperator.MATCHES]: 'Matches regex',
  [ConditionOperator.NOT_MATCHES]: 'Does not match regex',
  [ConditionOperator.STARTS_WITH]: 'Starts with',
  [ConditionOperator.ENDS_WITH]: 'Ends with',
};

const ARRAY_OPERATORS = [
  ConditionOperator.IN,
  ConditionOperator.NOT_IN,
];

export function ConditionEditor({
  condition,
  onChange,
  onRemove,
  canRemove,
}: ConditionEditorProps) {
  const [attributeInput, setAttributeInput] = useState(condition.attribute);
  const [valueInput, setValueInput] = useState(
    Array.isArray(condition.value)
      ? condition.value.join(', ')
      : String(condition.value)
  );

  const handleAttributeChange = (value: string) => {
    setAttributeInput(value);
    onChange({ ...condition, attribute: value });
  };

  const handleOperatorChange = (value: ConditionOperator) => {
    // Reset value if switching to/from array operators
    const wasArray = ARRAY_OPERATORS.includes(condition.operator);
    const isArray = ARRAY_OPERATORS.includes(value);

    if (wasArray !== isArray) {
      const newValue = isArray ? [] : '';
      setValueInput('');
      onChange({ ...condition, operator: value, value: newValue });
    } else {
      onChange({ ...condition, operator: value });
    }
  };

  const handleValueChange = (value: string) => {
    setValueInput(value);

    const isArrayOp = ARRAY_OPERATORS.includes(condition.operator);

    if (isArrayOp) {
      // Parse comma-separated values
      const arrayValue = value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      onChange({ ...condition, value: arrayValue });
    } else {
      // Try to parse as number or boolean
      let parsedValue: string | number | boolean = value;

      if (value === 'true') {
        parsedValue = true;
      } else if (value === 'false') {
        parsedValue = false;
      } else if (!isNaN(Number(value)) && value !== '') {
        parsedValue = Number(value);
      }

      onChange({ ...condition, value: parsedValue });
    }
  };

  const isArrayOperator = ARRAY_OPERATORS.includes(condition.operator);

  return (
    <div className="flex items-start gap-2 p-4 border rounded-lg bg-muted/30">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Attribute */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2">Attribute</Label>
          <Input
            value={attributeInput}
            onChange={(e) => handleAttributeChange(e.target.value)}
            placeholder="e.g. tier, region, userId"
            className="h-9"
          />
        </div>

        {/* Operator */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2">Operator</Label>
          <Select
            value={condition.operator}
            onValueChange={handleOperatorChange}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OPERATOR_LABELS).map(([op, label]) => (
                <SelectItem key={op} value={op}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Value */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2">
            Value {isArrayOperator && '(comma-separated)'}
          </Label>
          <Input
            value={valueInput}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder={
              isArrayOperator
                ? 'premium, enterprise'
                : 'premium'
            }
            className="h-9"
          />
        </div>
      </div>

      {/* Remove Button */}
      {canRemove && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-9 w-9 shrink-0 mt-6"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
