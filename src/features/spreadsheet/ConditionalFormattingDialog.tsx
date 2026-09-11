import { useState } from 'react';
import type { ConditionalRule, RuleOperator } from '../../types/spreadsheet';
import { OPERATOR_LABELS } from './conditionalFormatting';
import { MAX_DECIMALS, MIN_DECIMALS } from './constants';
import styles from './ConditionalFormattingDialog.module.css';

const OPERATORS: RuleOperator[] = ['lt', 'lte', 'gt', 'gte', 'eq', 'neq'];
const DEFAULT_COLOR = '#3ecf8e';

interface ConditionalFormattingDialogProps {
  /** The specific cell the rules below apply to, e.g. "C5". */
  cellAddress: string;
  /** The cell's column letter, e.g. "C" — decimal places are shared across the whole column, unlike the rules. */
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
  cellAddress,
  columnLabel,
  rules,
  decimals,
  onSave,
  onClose,
}: ConditionalFormattingDialogProps) {
  const [draftRules, setDraftRules] = useState<ConditionalRule[]>(rules);
  const [draftDecimals, setDraftDecimals] = useState(decimals);

  // What each number input actually displays, kept separate from the real
  // numeric values above. A controlled input bound directly to a number
  // can't be cleared: backspacing to "" immediately becomes Number("") = 0,
  // which re-renders the field back to "0" before the user can type a
  // replacement. Text state has no such coercion, so it can sit empty (or
  // mid-typing something like "-") while the real value only updates once
  // the text actually parses.
  const [valueTexts, setValueTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(rules.map((rule) => [rule.id, String(rule.value)]))
  );
  const [decimalsText, setDecimalsText] = useState(String(decimals));

  const updateRule = (id: string, patch: Partial<ConditionalRule>) => {
    setDraftRules((prev) => prev.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)));
  };

  const addRule = () => {
    const id = makeId();
    setDraftRules((prev) => [...prev, { id, operator: 'lt', value: 0, color: DEFAULT_COLOR }]);
    // Starts blank rather than "0" so there's nothing to backspace before typing a value.
    setValueTexts((prev) => ({ ...prev, [id]: '' }));
  };

  const removeRule = (id: string) => {
    setDraftRules((prev) => prev.filter((rule) => rule.id !== id));
    setValueTexts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleRuleValueChange = (id: string, text: string) => {
    setValueTexts((prev) => ({ ...prev, [id]: text }));
    const parsed = Number(text);
    if (text.trim() !== '' && !Number.isNaN(parsed)) {
      updateRule(id, { value: parsed });
    }
  };

  // If the field is left empty or invalid, snap the displayed text back to
  // the last real value instead of leaving it blank indefinitely.
  const handleRuleValueBlur = (id: string, currentValue: number) => {
    const text = valueTexts[id];
    if (text === undefined || text.trim() === '' || Number.isNaN(Number(text))) {
      setValueTexts((prev) => ({ ...prev, [id]: String(currentValue) }));
    }
  };

  const handleDecimalsChange = (text: string) => {
    setDecimalsText(text);
    const parsed = Number(text);
    if (text.trim() !== '' && !Number.isNaN(parsed)) {
      setDraftDecimals(Math.min(MAX_DECIMALS, Math.max(MIN_DECIMALS, parsed)));
    }
  };

  const handleDecimalsBlur = () => {
    if (decimalsText.trim() === '' || Number.isNaN(Number(decimalsText))) {
      setDecimalsText(String(draftDecimals));
    }
  };

  const handleApply = () => {
    onSave(draftRules, draftDecimals);
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.title}>Format {cellAddress}</h2>
        <p className={styles.subtitle}>
          Color {cellAddress}'s text when its value matches a rule. The first matching rule wins. These rules apply
          only to this cell — set them separately for other cells in the column.
        </p>

        <h3 className={styles.sectionTitle}>Rules for {cellAddress}</h3>
        {draftRules.length === 0 && <p className={styles.emptyText}>No rules yet for this cell.</p>}

        {draftRules.map((rule) => (
          <div className={styles.rule} key={rule.id}>
            <span className={styles.ruleLabel}>Value</span>
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
              value={valueTexts[rule.id] ?? rule.value}
              onChange={(e) => handleRuleValueChange(rule.id, e.target.value)}
              onBlur={() => handleRuleValueBlur(rule.id, rule.value)}
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
            Decimal places (applies to column {columnLabel})
          </label>
          <input
            id="decimals"
            type="number"
            className={styles.valueInput}
            min={MIN_DECIMALS}
            max={MAX_DECIMALS}
            value={decimalsText}
            onChange={(e) => handleDecimalsChange(e.target.value)}
            onBlur={handleDecimalsBlur}
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
