import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice.js';
import { ROLE_LABELS } from '../utils/format.js';

export default function Layout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const permissions = useSelector((state) => state.auth.permissions);

  const isStaff = permissions.some((permission) => permission.startsWith('event:') || permission.startsWith('stats:'));

  useEffect(() => {
    const handler = () => {
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, [navigate]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <div className="app-shell">
      <header className="navbar">
        <div className="navbar__inner">
          <NavLink to="/" className="navbar__brand">
            <span className="navbar__logo">🏃</span>
            <span>
              马拉松赛事报名
              <small>Marathon Registration System</small>
            </span>
          </NavLink>

          <nav className="navbar__links">
            <NavLink to="/" end>
              首页
            </NavLink>
            <NavLink to="/events">赛事列表</NavLink>
            {user ? <NavLink to="/my/registrations">我的报名</NavLink> : null}
            {isStaff ? <NavLink to="/admin">管理后台</NavLink> : null}
          </nav>

          <div className="navbar__actions">
            {user ? (
              <>
                <NavLink to="/profile" className="navbar__user">
                  <strong>{user.name}</strong>
                  <small>{ROLE_LABELS[user.role] || user.role}</small>
                </NavLink>
                <button type="button" className="btn btn--ghost" onClick={handleLogout}>
                  退出
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="btn btn--ghost">
                  登录
                </NavLink>
                <NavLink to="/register" className="btn btn--primary">
                  注册
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <span>马拉松赛事报名管理系统 · React + Redux Toolkit + Express + MongoDB</span>
        <span>© {new Date().getFullYear()} Marathon System</span>
      </footer>
    </div>
  );
}
