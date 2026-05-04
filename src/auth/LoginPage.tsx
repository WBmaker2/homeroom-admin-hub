import { useEffect, useMemo, useState } from 'react';
import { type FormEvent } from 'react';
import { FirebaseError } from 'firebase/app';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

type AuthError = {
  message?: string;
  code?: string;
};

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/user-not-found': '등록되지 않은 이메일입니다.',
  'auth/wrong-password': '비밀번호가 틀렸습니다.',
  'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
  'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
  'auth/invalid-email': '유효한 이메일 형식이 아닙니다.',
  'auth/network-request-failed': '네트워크 상태를 확인하고 다시 시도해 주세요.',
} as const;

function getErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return (
      AUTH_ERROR_MESSAGES[error.code]
      ?? '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    );
  }

  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as AuthError).code === 'string'
  ) {
    return (
      AUTH_ERROR_MESSAGES[(error as AuthError).code as keyof typeof AUTH_ERROR_MESSAGES]
      ?? '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
    );
  }

  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

function LoadingMessage() {
  return (
    <main className="login-shell">
      <style>{`
        .login-shell {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: var(--color-background);
          color: var(--color-muted);
          padding: 24px;
        }
      `}</style>
      <p>인증 상태 확인 중...</p>
    </main>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, signIn, createAccount } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [authInProgress, setAuthInProgress] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate('/app/inbox', { replace: true });
    }
  }, [loading, user, navigate]);

  const disabled = useMemo(
    () => busy || loading || authInProgress,
    [busy, loading, authInProgress],
  );

  const clearAndGoInbox = async (action: () => Promise<unknown>) => {
    setError('');
    setBusy(true);
    setAuthInProgress(true);

    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err));
      setAuthInProgress(false);
    } finally {
      setBusy(false);
    }
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await clearAndGoInbox(() => signIn(email.trim(), password));
  };

  const handleCreateAccount = async () => {
    await clearAndGoInbox(() => createAccount(email.trim(), password));
  };

  if (loading) {
    return <LoadingMessage />;
  }

  if (user) {
    return null;
  }

  return (
    <main className="login-shell">
      <style>{`
        .login-shell {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: var(--color-background);
          padding: 24px;
        }
        .auth-card {
          width: min(100%, 420px);
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-panel);
          padding: 24px;
          display: grid;
          gap: 14px;
        }
        .auth-card h1 {
          margin: 0;
          font-size: 24px;
        }
        .auth-field-group {
          display: grid;
          gap: 8px;
        }
        .auth-field-group label {
          font-weight: 600;
          font-size: 14px;
        }
        .auth-field-group input {
          padding: 12px;
          border-radius: var(--radius-control);
          border: 1px solid var(--color-border);
          min-width: 0;
          font-size: 16px;
        }
        .auth-actions {
          margin-top: 4px;
          display: grid;
          gap: 8px;
        }
        .auth-button {
          min-height: 44px;
          border: 1px solid transparent;
          border-radius: var(--radius-control);
          font-weight: 600;
          cursor: pointer;
          background: var(--color-accent);
          color: #fff;
          font-size: 16px;
        }
        .auth-button--secondary {
          background: var(--color-surface);
          color: var(--color-accent);
          border-color: var(--color-accent);
        }
        .auth-error {
          margin: 0;
          color: var(--color-danger);
          font-size: 14px;
        }
      `}</style>
      <section className="auth-card">
        <h1>로그인</h1>
        <form onSubmit={handleSignIn} noValidate>
          <div className="auth-field-group">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="auth-field-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <div className="auth-actions">
            <button type="submit" className="auth-button" disabled={disabled}>
              로그인
            </button>
            <button
              type="button"
              className="auth-button auth-button--secondary"
              disabled={disabled}
              onClick={handleCreateAccount}
            >
              새 계정 만들기
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
