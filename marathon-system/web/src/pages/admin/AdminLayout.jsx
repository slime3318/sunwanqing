import { NavLink, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function AdminLayout() {
  const permissions = useSelector((state) => state.auth.permissions);
  const has = (permission) => permissions.includes(permission);

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1>管理后台</h1>
          <p className="page__sub">赛事运营、报名审核与数据统计的统一入口。</p>
        </div>
      </header>

      <div className="admin-layout">
        <nav className="admin-nav">
          {has('stats:read') ? <NavLink to="/admin/dashboard">数据概览</NavLink> : null}
          {has('event:write') ? <NavLink to="/admin/events">赛事管理</NavLink> : null}
          {has('registration:read') ? <NavLink to="/admin/registrations">报名管理</NavLink> : null}
          {has('user:read') ? <NavLink to="/admin/users">用户与权限</NavLink> : null}
        </nav>
        <section className="admin-content">
          <Outlet />
        </section>
      </div>
    </div>
  );
}
