import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './AppLayout.module.css';

export function AppLayout({ children }: { children: ReactNode }) {
  const { userEmail, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.layout}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <h1>StockSheet</h1>
          <span>Indian stock analysis</span>
        </div>
        <div className={styles.userArea}>
          {userEmail && <span>{userEmail}</span>}
          <button className={styles.logoutButton} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
