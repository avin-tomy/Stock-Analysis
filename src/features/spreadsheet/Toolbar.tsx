import type { RefreshInfo, SaveInfo } from '../../types/spreadsheet';
import styles from './Toolbar.module.css';

interface ToolbarProps {
  refresh: RefreshInfo;
  save: SaveInfo;
  onRefresh: () => void;
  onSave: () => void;
  onOpenFormat: () => void;
}

export function Toolbar({ refresh, save, onRefresh, onSave, onOpenFormat }: ToolbarProps) {
  const isRefreshing = refresh.state === 'refreshing';
  const isSaving = save.state === 'saving';

  return (
    <div className={styles.toolbar}>
      <button className={styles.refreshButton} onClick={onRefresh} disabled={isRefreshing}>
        <span className={`${styles.icon} ${isRefreshing ? styles.spinning : ''}`} aria-hidden="true">
          ↻
        </span>
        {isRefreshing ? 'Refreshing…' : 'Refresh Prices'}
      </button>
      <span className={styles.status}>
        {isRefreshing
          ? 'Fetching latest prices…'
          : refresh.summary
            ? refresh.summary
            : refresh.lastUpdated
              ? `Last updated ${refresh.lastUpdated}`
              : 'Not refreshed yet'}
        {!isRefreshing && refresh.lastUpdated && refresh.summary ? ` · ${refresh.lastUpdated}` : ''}
      </span>

      <button className={styles.saveButton} onClick={onSave} disabled={isSaving}>
        <span className={styles.icon} aria-hidden="true">
          ⬇
        </span>
        {isSaving ? 'Saving…' : 'Save'}
      </button>
      <span className={styles.status}>
        {isSaving
          ? 'Saving your sheet…'
          : save.state === 'error'
            ? save.error
            : save.lastSavedAt
              ? `Saved ${new Date(save.lastSavedAt).toLocaleTimeString()}`
              : 'Not saved yet'}
      </span>

      <button className={styles.formatButton} onClick={onOpenFormat}>
        <span className={styles.icon} aria-hidden="true">
          🎨
        </span>
        Format
      </button>

      <span className={styles.hint}>Type "=" in a cell to start a formula, e.g. =SUM(H2:H5)</span>
    </div>
  );
}
