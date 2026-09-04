import { useState } from 'react';
import type { ConditionalRule, RuleOperator } from '../../types/spreadsheet';
import { OPERATOR_LABELS } from './conditionalFormatting';
import { MAX_DECIMALS, MIN_DECIMALS } from './constants';
import styles from './ConditionalFormattingDialog.module.css';

const OPERATORS: RuleOperator[] = ['lt', 'lte', 'gt', 'gte', 'eq', 'neq'];
const DEFAULT_COLOR = '#3ecf8e';

interface ConditionalFormattingDialogProps {
  columnLabel: string;
  rules: ConditionalRule[];
  decimals: number;
  onSave: (rules: ConditionalRule[], decimals: number) => void;
  onClose: () => void;
}

function makeId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `rule-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ConditionalFormattingDialog({
  columnLabel,
  rules,
  decimals,
  onSave,
  onClose,
}: ConditionalFormattingDialogProps) {
  const [draftRules, setDraftRules] = useState<ConditionalRule[]>(rules);
  const [draftDecimals, setDraftDecimals] = useState(decimals);

  const updateRule = (id: string, patch: Partial<ConditionalRule>) => {
    setDraftRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  };

  const addRule = () => {
    setDraftRules((prev) => [...prev, { id: makeId(), operator: 'lt', value: 0, color: DEFAULT_COLOR }]);
  };

  const removeRule = (id: string) => {
    setDraftRules((prev) => prev.filter((rule) => rule.id !== id));
  };

  const handleApply = () => {
    onSave(draftRules, draftDecimals);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Conditional Formatting</h2>
        <p className={styles.subtitle}>
          Color column {columnLabel}'s text when its value matches a rule. The first matching rule wins.
        </p>

        <h3 className={styles.sectionTitle}>Rules</h3>
        {draftRules.length === 0 && <p className={styles.emptyText}>No rules yet for this column.</p>}

        {draftRules.map((rule) => (
          <div className={styles.rule} key={rule.id}>
            <select
              className={styles.select}
              value={rule.operator}
              onChange={(e) => updateRule(rule.id, { operator: e.target.value as RuleOperator })}
            >
              {OPERATORS.map((op) => (
                <option key={op} value={op}>
                  {OPERATOR_LABELS[op]}
                </option>
              ))}
            </select>
            <input
              type="number"
              className={styles.valueInput}
              value={rule.value}
              onChange={(e) => updateRule(rule.id, { value: Number(e.target.value) })}
            />
            <input
              type="color"
              className={styles.colorInput}
              value={rule.color}
              onChange={(e) => updateRule(rule.id, { color: e.target.value })}
              title="Text color"
            />
            <button className={styles.removeButton} onClick={() => removeRule(rule.id)} aria-label="Remove rule">
              ×
            </button>
          </div>
        ))}

        <button className={styles.addButton} onClick={addRule}>
          + Add rule
        </button>

        <div className={styles.decimalsRow}>
          <label htmlFor="decimals" className={styles.decimalsLabel}>
            Decimal places
          </label>
          <input
            id="decimals"
            type="number"
            className={styles.valueInput}
            min={MIN_DECIMALS}
            max={MAX_DECIMALS}
            value={draftDecimals}
            onChange={(e) =>
              setDraftDecimals(Math.min(MAX_DECIMALS, Math.max(MIN_DECIMALS, Number(e.target.value))))
            }
          />
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.applyButton} onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
