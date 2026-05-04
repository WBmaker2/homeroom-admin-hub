import { type ReactNode } from 'react';
import { CalendarDays, ClipboardCheck, Copy, FileText, Inbox, ListChecks, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  {
    to: '/app/inbox',
    label: '오늘 업무함',
    icon: Inbox,
    end: false,
  },
  {
    to: '/app/tasks',
    label: '전체 업무',
    icon: ListChecks,
    end: true,
  },
  {
    to: '/app/tasks/example',
    label: '공문',
    icon: FileText,
    end: false,
  },
  {
    to: '/app/collections',
    label: '수합판',
    icon: ClipboardCheck,
    end: true,
  },
  {
    to: '/app/templates',
    label: '템플릿',
    icon: Copy,
    end: false,
  },
  {
    to: '/app/calendar',
    label: '마감 캘린더',
    icon: CalendarDays,
    end: false,
  },
  {
    to: '/app/classes',
    label: '학급 명부',
    icon: Users,
    end: false,
  },
] as const;

export function AppShell({ children }: AppShellProps) {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <>
      <style>{`
        .app-shell {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 260px 1fr;
          background: var(--color-background);
        }
        .app-shell-sidebar {
          border-right: 1px solid var(--color-border);
          background: var(--color-surface);
          padding: var(--space-page);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .app-shell-brand {
          margin: 0 0 10px;
          font-weight: 700;
          color: var(--color-foreground);
          font-size: 18px;
        }
        .app-shell-privacy-notice {
          margin: 0 0 12px;
          color: var(--color-muted);
          font-size: 12px;
          line-height: 1.45;
          white-space: pre-wrap;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-control);
          padding: 10px;
        }
        .app-shell-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .app-shell-nav-item,
        .app-shell-logout {
          width: 100%;
          border: 1px solid transparent;
          border-radius: var(--radius-control);
          color: var(--color-muted);
          text-decoration: none;
          padding: 10px 12px;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          font-size: 15px;
          background: transparent;
          cursor: pointer;
          box-sizing: border-box;
        }
        .app-shell-nav-item:hover,
        .app-shell-logout:hover {
          background: rgba(27, 97, 201, 0.05);
          border-color: var(--color-border);
          color: var(--color-foreground);
        }
        .app-shell-nav-item-active,
        .app-shell-logout:hover {
          border-color: var(--color-border);
          color: var(--color-accent);
        }
        .app-shell-main {
          padding: var(--space-page);
        }
        .app-shell-signout {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .app-shell-mobile-nav {
          display: none;
        }

        @media (max-width: 860px) {
          .app-shell {
            grid-template-columns: 1fr;
          }
          .app-shell-sidebar {
            display: none;
          }
          .app-shell-main {
            padding-bottom: calc(98px + env(safe-area-inset-bottom));
          }
          .app-shell-mobile-nav {
            position: fixed;
            left: 0;
            right: 0;
            bottom: 0;
            border-top: 1px solid var(--color-border);
            background: var(--color-surface);
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
            padding:
              8px env(safe-area-inset-right) calc(10px + env(safe-area-inset-bottom))
              env(safe-area-inset-left);
          }
          .app-shell-mobile-links {
            display: flex;
            gap: 6px;
            overflow-x: auto;
          }
          .app-shell-mobile-item,
          .app-shell-logout {
            border: 1px solid var(--color-border);
            border-radius: var(--radius-control);
            background: var(--color-background);
            color: var(--color-muted);
            text-decoration: none;
            padding: 8px 10px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
            gap: 6px;
            font-weight: 600;
            font-size: 12px;
          }
          .app-shell-mobile-links .app-shell-nav-item-active {
            border-color: var(--color-accent);
            color: var(--color-accent);
          }
        }
      `}</style>
      <div className="app-shell">
        <aside className="app-shell-sidebar" aria-label="앱 내비게이션">
          <h1 className="app-shell-brand">담임 행정 허브</h1>
          <nav className="app-shell-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  to={item.to}
                  key={item.to}
                  className={({ isActive }) =>
                    `app-shell-nav-item${isActive ? ' app-shell-nav-item-active' : ''}`
                  }
                  end={item.end}
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="app-shell-signout">
            <button type="button" className="app-shell-logout" onClick={handleSignOut}>
              <ClipboardCheck size={18} aria-hidden="true" />
              <span>로그아웃</span>
            </button>
          </div>
        </aside>
        <main className="app-shell-main">
          <p className="app-shell-privacy-notice" role="note">
            이 앱은 개인용 담임 행정 정리 도구입니다. 공문 원본 파일, 학생 사진, 실제 상담 기록, 생활지도 사건 기록은 저장하지 마세요.
          </p>
          {children}
        </main>
      </div>
      <nav className="app-shell-mobile-nav" aria-label="하단 내비게이션">
        <div className="app-shell-mobile-links">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
                <NavLink
                  to={item.to}
                  key={item.to}
                  className={({ isActive }) =>
                    `app-shell-mobile-item${isActive ? ' app-shell-nav-item-active' : ''}`
                  }
                  end={item.end}
                >
                <Icon size={16} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          <button type="button" className="app-shell-logout" onClick={handleSignOut}>
            <ClipboardCheck size={16} aria-hidden="true" />
            <span>로그아웃</span>
          </button>
        </div>
      </nav>
    </>
  );
}
