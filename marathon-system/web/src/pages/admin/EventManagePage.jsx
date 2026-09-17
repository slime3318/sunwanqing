import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearEventFeedback,
  deleteEvent,
  fetchAdminEvents,
  setAdminEventFilters,
  updateEventStatus,
} from '../../store/slices/eventsSlice.js';
import { EVENT_STATUS_LABELS, EVENT_STATUS_TONES, formatCurrency, formatDate } from '../../utils/format.js';
import Alert, { EmptyState, Spinner } from '../../components/Feedback.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import { Field, Select, TextInput } from '../../components/Form.jsx';

const statusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '报名中' },
  { value: 'closed', label: '已结束' },
];

export default function EventManagePage() {
  const dispatch = useDispatch();
  const { adminList, adminPagination, adminFilters, status, saving, error, notice } = useSelector(
    (state) => state.events,
  );
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    dispatch(
      fetchAdminEvents({
        page: adminFilters.page,
        pageSize: adminFilters.pageSize,
        keyword: adminFilters.keyword || undefined,
        status: adminFilters.status || undefined,
      }),
    );
  }, [dispatch, adminFilters]);

  const applyFilter = (patch) =>
    dispatch(setAdminEventFilters({ ...patch, page: patch.page ?? 1 }));

  const handleStatus = async (event, nextStatus) => {
    await dispatch(updateEventStatus({ id: event._id, status: nextStatus }));
    dispatch(
      fetchAdminEvents({
        page: adminFilters.page,
        pageSize: adminFilters.pageSize,
        keyword: adminFilters.keyword || undefined,
        status: adminFilters.status || undefined,
      }),
    );
  };

  const handleDelete = async (event) => {
    if (!window.confirm(`确认删除赛事「${event.title}」？该操作不可恢复。`)) return;
    await dispatch(deleteEvent(event._id));
  };

  return (
    <div className="stack">
      <Alert tone="success" onClose={() => dispatch(clearEventFeedback())}>
        {notice}
      </Alert>
      <Alert tone="danger" onClose={() => dispatch(clearEventFeedback())}>
        {error}
      </Alert>

      <header className="section-head">
        <h2>赛事管理</h2>
        <Link to="/admin/events/new" className="btn btn--primary">
          新建赛事
        </Link>
      </header>

      <section className="filters card card--flat">
        <Field label="关键词">
          <TextInput
            value={adminFilters.keyword}
            onChange={(value) => applyFilter({ keyword: value })}
            placeholder="赛事名称 / 地点"
          />
        </Field>
        <Field label="状态">
          <Select
            value={adminFilters.status}
            onChange={(value) => applyFilter({ status: value })}
            options={statusOptions}
            placeholder="全部"
          />
        </Field>
      </section>

      {status === 'loading' && !adminList.length ? <Spinner /> : null}

      {status !== 'loading' && !adminList.length ? (
        <EmptyState title="暂无赛事" description="点击「新建赛事」创建第一场赛事。" />
      ) : null}

      <div className="stack">
        {adminList.map((event) => (
          <article className="card" key={event._id}>
            <header className="registration-card__head">
              <div>
                <h3>{event.title}</h3>
                <p className="muted">
                  {event.city} · {event.venue} · 比赛日 {formatDate(event.startDate)}
                </p>
                <p className="muted">
                  报名期 {formatDate(event.registrationStart)} ~ {formatDate(event.registrationEnd)}
                </p>
              </div>
              <div className="row-actions">
                <StatusBadge status={event.status} labels={EVENT_STATUS_LABELS} tones={EVENT_STATUS_TONES} />
                <strong>
                  {event.totalApproved} / {event.totalQuota}
                </strong>
              </div>
            </header>

            <div className="progress-row">
              <div className="progress">
                <div
                  className="progress__bar"
                  style={{
                    width: `${event.totalQuota ? Math.min(100, (event.totalApproved / event.totalQuota) * 100) : 0}%`,
                  }}
                />
              </div>
              <span className="muted">
                已报名 {event.totalApproved} 人 · 剩余名额 {Math.max(0, event.totalQuota - event.totalApproved)}
              </span>
            </div>

            <div className="chip-list">
              {event.groups.map((group) => (
                <span className="chip" key={group._id}>
                  {group.name} · {group.distanceKm}km · {formatCurrency(group.price)} · 余 {group.remainingQuota}/
                  {group.quota}
                </span>
              ))}
            </div>

            <footer className="registration-card__foot">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setExpanded(expanded === event._id ? null : event._id)}
              >
                {expanded === event._id ? '收起详情' : '展开详情'}
              </button>
              <Link to={`/admin/events/${event._id}/edit`} className="btn btn--outline btn--sm">
                编辑赛事与组别
              </Link>
              {event.status !== 'published' ? (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={saving}
                  onClick={() => handleStatus(event, 'published')}
                >
                  发布报名
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  disabled={saving}
                  onClick={() => handleStatus(event, 'closed')}
                >
                  关闭报名
                </button>
              )}
              <button
                type="button"
                className="btn btn--danger btn--sm"
                disabled={saving}
                onClick={() => handleDelete(event)}
              >
                删除
              </button>
            </footer>

            {expanded === event._id ? (
              <div className="expand-panel">
                <p className="pre-line">{event.description || '暂无赛事介绍'}</p>
                <p className="muted">参赛须知：{event.rules || '未填写'}</p>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      <Pagination
        pagination={adminPagination}
        onChange={(page) => applyFilter({ page })}
        disabled={status === 'loading'}
      />
    </div>
  );
}
