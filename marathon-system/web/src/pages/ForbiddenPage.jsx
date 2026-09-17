import { Link } from 'react-router-dom';

export default function ForbiddenPage() {
  return (
    <div className="page">
      <div className="empty-state">
        <h1 className="empty-state__title">403</h1>
        <p className="empty-state__desc">当前账号没有访问该页面的权限，请联系超级管理员分配。</p>
        <Link to="/" className="btn btn--primary">
          返回首页
        </Link>
      </div>
    </div>
  );
}
