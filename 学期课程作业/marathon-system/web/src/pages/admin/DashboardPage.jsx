import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEventBreakdown, fetchOverview } from '../../store/slices/statsSlice.js';
import { fetchAdminEvents } from '../../store/slices/eventsSlice.js';
import { EVENT_STATUS_LABELS, REGISTRATION_STATUS_LABELS, formatCurrency } from '../../utils/format.js';
import Alert, { EmptyState, Spinner } from '../../components/Feedback.jsx';
import { Field, Select } from '../../components/Form.jsx';

export default function DashboardPage() {
  const dispatch = useDispatch();
  const { overview, breakdown, status, error } = useSelector((state) => state.stats);
  const adminList = useSelector((state) => state.events.adminList);
  const [eventId, setEventId] = useState('');

  useEffect(() => {
    dispatch(fetchAdminEvents({ page: 1, pageSize: 100 }));
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchOverview(eventId ? { eventId } : {}));
  }, [dispatch, eventId]);

  useEffect(() => {
    if (eventId) dispatch(fetchEventBreakdown(eventId));
  }, [dispatch, eventId]);

  if (status === 'loading' && !overview) return <Spinner label="正在汇总统计数据…" />;
  if (!overview) {
    return (
      <div className="stack">
        <Alert tone="danger">{error || '暂无统计数据，请先创建赛事'}</Alert>
        <EmptyState title="没有可统计的数据" description="创建赛事并发布报名后，这里会实时展示报名与收入数据。" />
      </div>
    );
  }

  const maxDaily = Math.max(1, ...overview.daily.map((item) => item.count));

  return (
    <div className="stack">
      <Alert tone="danger">{error}</Alert>

      <div className="filters card card--flat">
        <Field label="统计范围">
          <Select
            value={eventId}
            onChange={setEventId}
            placeholder="全部赛事"
            options={adminList.map((event) => ({ value: event._id, label: event.title }))}
          />
        </Field>
      </div>

      <div className="grid grid--4">
        <StatCard label="赛事总数" value={overview.events.total} hint={`报名中 ${overview.events.published} 场`} />
        <StatCard label="报名总数" value={overview.registrations.total} hint={`待审核 ${overview.registrations.pendingReview} 人`} />
        <StatCard label="审核通过" value={overview.registrations.approved} hint={`待支付 ${overview.registrations.pendingPayment} 人`} tone="success" />
        <StatCard label="报名收入" value={formatCurrency(overview.revenue.total)} hint={`已支付 ${overview.revenue.paidOrders} 笔`} tone="accent" />
      </div>

      <section className="card">
        <h2>名额使用情况</h2>
        <div className="progress-row">
          <div className="progress">
            <div className="progress__bar" style={{ width: `${Math.min(100, overview.quota.occupancyRate)}%` }} />
          </div>
          <span>
            {overview.quota.occupied} / {overview.quota.total}（{overview.quota.occupancyRate}%）· 剩余{' '}
            {overview.quota.remaining}
          </span>
        </div>
        <div className="status-grid">
          {Object.entries(overview.registrations.byStatus).map(([key, value]) => (
            <div key={key} className="status-grid__item">
              <span className="muted">{REGISTRATION_STATUS_LABELS[key] || key}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>近 14 天报名趋势</h2>
        {overview.daily.length ? (
          <div className="chart">
            {overview.daily.map((item) => (
              <div className="chart__col" key={item.date}>
                <span className="chart__value">{item.count}</span>
                <div className="chart__bar" style={{ height: `${(item.count / maxDaily) * 100}%` }} />
                <span className="chart__label">{item.date.slice(5)}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="暂无报名数据" />
        )}
      </section>

      {breakdown ? (
        <section className="card">
          <h2>
            {breakdown.event.title} · 分组明细
            <small className="muted">
              {' '}
              （{EVENT_STATUS_LABELS[breakdown.event.status] || breakdown.event.status}）
            </small>
          </h2>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>组别</th>
                  <th>单价</th>
                  <th>名额</th>
                  <th>已占用</th>
                  <th>剩余</th>
                  <th>报名数</th>
                  <th>已通过</th>
                  <th>待审核</th>
                  <th>收入</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.byGroup.map((group) => (
                  <tr key={group.groupId}>
                    <td>
                      <strong>{group.name}</strong>
                      <small className="muted"> {group.code}</small>
                    </td>
                    <td>{formatCurrency(group.price)}</td>
                    <td>{group.quota}</td>
                    <td>{group.occupied}</td>
                    <td className={group.remaining > 0 ? '' : 'danger-text'}>{group.remaining}</td>
                    <td>{group.registrations}</td>
                    <td>{group.approved}</td>
                    <td>{group.pendingReview}</td>
                    <td>{formatCurrency(group.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, hint, tone = 'default' }) {
  return (
    <article className={`card stat-card stat-card--${tone}`}>
      <span className="stat-card__label">{label}</span>
      <strong className="stat-card__value">{value}</strong>
      {hint ? <span className="stat-card__hint">{hint}</span> : null}
    </article>
  );
}
