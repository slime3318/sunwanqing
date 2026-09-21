import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEvents } from '../store/slices/eventsSlice.js';
import { EVENT_STATUS_LABELS, EVENT_STATUS_TONES, describeRegistrationWindow, formatDate } from '../utils/format.js';
import { StatusBadge } from '../components/Badge.jsx';
import Alert, { EmptyState, Spinner } from '../components/Feedback.jsx';

const highlights = [
  { title: '在线报名', desc: '身份证/联系方式自动校验，按组别独立配额，杜绝超额。' },
  { title: '报名审核', desc: '支持体检证明上传、单条与批量审核，结果自动通知选手。' },
  { title: '数据统计', desc: '各项目报名人数与资金收入实时汇总，一屏掌握全局。' },
  { title: '权限体系', desc: 'RBAC 模型区分超级管理员、运营与赛事编辑员。' },
];

export default function HomePage() {
  const dispatch = useDispatch();
  const { list, status, error } = useSelector((state) => state.events);

  useEffect(() => {
    dispatch(fetchEvents({ page: 1, pageSize: 3 }));
  }, [dispatch]);

  const upcoming = (list || []).slice(0, 3);

  return (
    <div className="page">
      <section className="hero">
        <div className="hero__content">
          <p className="hero__eyebrow">Marathon Registration System</p>
          <h1>一站式马拉松赛事报名管理平台</h1>
          <p className="hero__desc">
            从赛事发布、选手报名、支付到审核与统计，覆盖赛事运营全流程，帮助组委会把时间花在赛事本身。
          </p>
          <div className="hero__actions">
            <Link to="/events" className="btn btn--primary btn--lg">
              浏览赛事
            </Link>
            <Link to="/register" className="btn btn--outline btn--lg">
              注册选手账号
            </Link>
          </div>
        </div>
        <div className="hero__stats">
          <div className="hero__stat">
            <strong>7</strong>
            <span>核心功能模块</span>
          </div>
          <div className="hero__stat">
            <strong>3</strong>
            <span>角色权限分层</span>
          </div>
          <div className="hero__stat">
            <strong>24/7</strong>
            <span>在线报名服务</span>
          </div>
        </div>
      </section>

      <section className="section">
        <header className="section__head">
          <h2>核心能力</h2>
          <p>覆盖需求文档中的全部模块，支持后续扩展通知、证书与退费流程。</p>
        </header>
        <div className="grid grid--4">
          {highlights.map((item) => (
            <article className="card card--flat" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <header className="section__head">
          <h2>近期赛事</h2>
          <Link to="/events" className="link">
            查看全部 →
          </Link>
        </header>

        {error ? (
          <Alert tone="danger">
            无法连接后端服务：{error}
            <br />
            <small>
              请确认 API 地址（VITE_API_BASE_URL）已配置且后端服务已启动。未连接后端时，赛事数据无法加载。
            </small>
          </Alert>
        ) : null}

        {status === 'loading' && !upcoming.length ? <Spinner /> : null}

        {status !== 'loading' && !error && !upcoming.length ? (
          <EmptyState title="暂未发布赛事" description="管理员可在后台创建赛事并发布报名。" />
        ) : null}

        <div className="grid grid--3">
          {upcoming.map((event) => (
            <article className="card event-card" key={event._id}>
              <div className="event-card__head">
                <StatusBadge status={event.status} labels={EVENT_STATUS_LABELS} tones={EVENT_STATUS_TONES} />
                <span className="event-card__city">{event.city}</span>
              </div>
              <h3>{event.title}</h3>
              <p className="event-card__meta">起点：{event.venue}</p>
              <p className="event-card__meta">比赛日：{formatDate(event.startDate)}</p>
              <div className="event-card__groups">
                {event.groups.slice(0, 3).map((group) => (
                  <span key={group._id} className="chip">
                    {group.name} · {group.distanceKm}km · ¥{group.price}
                  </span>
                ))}
              </div>
              <footer className="event-card__foot">
                <span>{describeRegistrationWindow(event)}</span>
                <Link to={`/events/${event._id}`} className="btn btn--sm btn--primary">
                  查看详情
                </Link>
              </footer>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
