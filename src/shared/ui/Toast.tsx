import { useEffect } from 'react';
import { useUiStore } from '@/shared/hooks/useUiStore';
import styles from './Toast.module.css';

export function Toast() {
  const toast = useUiStore((s) => s.toast);
  const clearToast = useUiStore((s) => s.clearToast);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(clearToast, 2800);
    return () => window.clearTimeout(id);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      {toast}
    </div>
  );
}
