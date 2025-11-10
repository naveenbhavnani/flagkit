// Targeting rule types (matching backend)

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'notEquals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'notContains',
  IN = 'in',
  NOT_IN = 'notIn',
  GREATER_THAN = 'greaterThan',
  LESS_THAN = 'lessThan',
  GREATER_THAN_OR_EQUAL = 'greaterThanOrEqual',
  LESS_THAN_OR_EQUAL = 'lessThanOrEqual',
  MATCHES = 'matches',
  NOT_MATCHES = 'notMatches',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
}

export type ConditionValue = string | number | boolean | string[] | number[];

export interface Condition {
  attribute: string;
  operator: ConditionOperator;
  value: ConditionValue;
}

export enum ConditionLogic {
  AND = 'AND',
  OR = 'OR',
}

export interface TargetingRule {
  id: string;
  description?: string;
  conditions: Condition[];
  conditionLogic: ConditionLogic;
  variationKey: string;
  rolloutPercentage?: number;
}
