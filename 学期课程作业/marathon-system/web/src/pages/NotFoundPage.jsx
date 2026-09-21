import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="page">
      <div className="empty-state">
        <h1 className="empty-state__title">404</h1>
        <p className="empty-state__desc">页面不存在或已被移除。</p>
        <Link to="/" className="btn btn--primary">
          返回首页
        </Link>
      </div>
    </div>
  );
}
