import type { ConditionalRule, RuleOperator } from '../../types/spreadsheet';

export const OPERATOR_LABELS: Record<RuleOperator, string> = {
  lt: '<',
  lte: '≤',
  gt: '>',
  gte: '≥',
  eq: '=',
  neq: '≠',
};

export function matchesRule(value: number, rule: ConditionalRule): boolean {
  switch (rule.operator) {
    case 'lt':
      return value < rule.value;
    case 'lte':
      return value <= rule.value;
    case 'gt':
      return value > rule.value;
    case 'gte':
      return value >= rule.value;
    case 'eq':
      return value === rule.value;
    case 'neq':
      return value !== rule.value;
  }
}

/** First matching rule's color wins, mirroring Excel's top-priority-first behavior. */
export function getMatchedColor(value: number, rules: ConditionalRule[]): string | null {
  for (const rule of rules) {
    if (matchesRule(value, rule)) return rule.color;
  }
  return null;
}
