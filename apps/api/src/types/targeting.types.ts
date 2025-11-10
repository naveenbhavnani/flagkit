// Targeting rule types for flag evaluation

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
  MATCHES = 'matches', // Regex match
  NOT_MATCHES = 'notMatches',
  STARTS_WITH = 'startsWith',
  ENDS_WITH = 'endsWith',
}

export type ConditionValue = string | number | boolean | string[] | number[];

export interface Condition {
  attribute: string; // e.g., 'userId', 'email', 'country', custom attribute
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
  rolloutPercentage?: number; // 0-100, optional percentage rollout for matched users
}

export interface EvaluationContext {
  userId?: string;
  sessionId?: string;
  attributes?: Record<string, unknown>;
}

/**
 * Evaluate a single condition against the evaluation context
 */
export function evaluateCondition(
  condition: Condition,
  context: EvaluationContext
): boolean {
  const { attribute, operator, value } = condition;

  // Get the actual value from context
  let actualValue: unknown;
  if (attribute === 'userId') {
    actualValue = context.userId;
  } else if (attribute === 'sessionId') {
    actualValue = context.sessionId;
  } else if (context.attributes && attribute in context.attributes) {
    actualValue = context.attributes[attribute];
  } else {
    // Attribute not found in context
    return false;
  }

  // Handle operators
  switch (operator) {
    case ConditionOperator.EQUALS:
      return actualValue === value;

    case ConditionOperator.NOT_EQUALS:
      return actualValue !== value;

    case ConditionOperator.CONTAINS:
      return typeof actualValue === 'string' && typeof value === 'string'
        ? actualValue.includes(value)
        : false;

    case ConditionOperator.NOT_CONTAINS:
      return typeof actualValue === 'string' && typeof value === 'string'
        ? !actualValue.includes(value)
        : false;

    case ConditionOperator.IN:
      return Array.isArray(value) ? (value as (string | number)[]).includes(actualValue as string | number) : false;

    case ConditionOperator.NOT_IN:
      return Array.isArray(value) ? !(value as (string | number)[]).includes(actualValue as string | number) : false;

    case ConditionOperator.GREATER_THAN:
      return typeof actualValue === 'number' && typeof value === 'number'
        ? actualValue > value
        : false;

    case ConditionOperator.LESS_THAN:
      return typeof actualValue === 'number' && typeof value === 'number'
        ? actualValue < value
        : false;

    case ConditionOperator.GREATER_THAN_OR_EQUAL:
      return typeof actualValue === 'number' && typeof value === 'number'
        ? actualValue >= value
        : false;

    case ConditionOperator.LESS_THAN_OR_EQUAL:
      return typeof actualValue === 'number' && typeof value === 'number'
        ? actualValue <= value
        : false;

    case ConditionOperator.STARTS_WITH:
      return typeof actualValue === 'string' && typeof value === 'string'
        ? actualValue.startsWith(value)
        : false;

    case ConditionOperator.ENDS_WITH:
      return typeof actualValue === 'string' && typeof value === 'string'
        ? actualValue.endsWith(value)
        : false;

    case ConditionOperator.MATCHES:
      try {
        return typeof actualValue === 'string' && typeof value === 'string'
          ? new RegExp(value).test(actualValue)
          : false;
      } catch {
        return false;
      }

    case ConditionOperator.NOT_MATCHES:
      try {
        return typeof actualValue === 'string' && typeof value === 'string'
          ? !new RegExp(value).test(actualValue)
          : false;
      } catch {
        return false;
      }

    default:
      return false;
  }
}

/**
 * Evaluate a targeting rule against the evaluation context
 */
export function evaluateRule(
  rule: TargetingRule,
  context: EvaluationContext
): boolean {
  if (!rule.conditions || rule.conditions.length === 0) {
    return true; // No conditions means rule always matches
  }

  const results = rule.conditions.map((condition) =>
    evaluateCondition(condition, context)
  );

  // Apply condition logic
  if (rule.conditionLogic === ConditionLogic.AND) {
    return results.every((result) => result === true);
  } else {
    // OR logic
    return results.some((result) => result === true);
  }
}

/**
 * Hash a string to a number between 0-99 (for percentage rollout)
 * Uses simple djb2 hash algorithm
 */
export function hashToPercentage(key: string): number {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 33) ^ key.charCodeAt(i);
  }
  return Math.abs(hash) % 100;
}

/**
 * Check if a user should be included in a percentage rollout
 */
export function isInRollout(
  flagKey: string,
  userId: string | undefined,
  percentage: number
): boolean {
  if (!userId || percentage <= 0) {
    return false;
  }
  if (percentage >= 100) {
    return true;
  }

  // Create a stable hash key combining flag and user
  const hashKey = `${flagKey}:${userId}`;
  const bucket = hashToPercentage(hashKey);

  return bucket < percentage;
}
