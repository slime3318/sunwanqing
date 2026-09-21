import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEvents, setEventFilters } from '../store/slices/eventsSlice.js';
import {
  EVENT_STATUS_LABELS,
  EVENT_STATUS_TONES,
  describeRegistrationWindow,
  formatCurrency,
  formatDate,
} from '../utils/format.js';
import { StatusBadge } from '../components/Badge.jsx';
import Alert, { EmptyState, Spinner } from '../components/Feedback.jsx';
import Pagination from '../components/Pagination.jsx';
import { Field, Select, TextInput } from '../components/Form.jsx';

const statusOptions = [
  { value: 'published', label: '报名中' },
  { value: 'closed', label: '已结束' },
  { value: 'draft', label: '草稿' },
];

export default function EventListPage() {
  const dispatch = useDispatch();
  const { list, pagination, filters, status, error } = useSelector((state) => state.events);

  useEffect(() => {
    dispatch(
      fetchEvents({
        page: filters.page,
        pageSize: filters.pageSize,
        keyword: filters.keyword || undefined,
        city: filters.city || undefined,
        status: filters.status || undefined,
      }),
    );
  }, [dispatch, filters]);

  const applyFilter = (patch) => dispatch(setEventFilters({ ...patch, page: patch.page ?? 1 }));

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1>赛事列表</h1>
          <p className="page__sub">选择心仪赛事，查看组别与名额后直接在线报名。</p>
        </div>
      </header>

      <section className="filters card card--flat">
        <Field label="关键词">
          <TextInput
            value={filters.keyword}
            onChange={(value) => applyFilter({ keyword: value })}
            placeholder="赛事名称 / 地点"
          />
        </Field>
        <Field label="城市">
          <TextInput value={filters.city} onChange={(value) => applyFilter({ city: value })} placeholder="如：杭州" />
        </Field>
        <Field label="状态">
          <Select
            value={filters.status}
            onChange={(value) => applyFilter({ status: value })}
            options={statusOptions}
            placeholder="全部"
          />
        </Field>
      </section>

      {error ? (
        <Alert tone="danger">
          无法连接后端服务：{error}
          <br />
          <small>请确认 API 地址（VITE_API_BASE_URL）已配置且后端服务已启动。</small>
        </Alert>
      ) : null}

      {status === 'loading' ? <Spinner /> : null}

      {status !== 'loading' && !error && list.length === 0 ? (
        <EmptyState title="没有符合条件的赛事" description="尝试调整筛选条件，或稍后再来看看。" />
      ) : null}

      <div className="grid grid--3">
        {list.map((event) => (
          <article className="card event-card" key={event._id}>
            <div className="event-card__head">
              <StatusBadge status={event.status} labels={EVENT_STATUS_LABELS} tones={EVENT_STATUS_TONES} />
              <span className="event-card__city">{event.city}</span>
            </div>
            <h3>{event.title}</h3>
            <p className="event-card__meta">起点：{event.venue}</p>
            <p className="event-card__meta">比赛日：{formatDate(event.startDate)}</p>
            <p className="event-card__meta">
              报名期：{formatDate(event.registrationStart)} ~ {formatDate(event.registrationEnd)}
            </p>

            <ul className="group-list">
              {event.groups.map((group) => (
                <li key={group._id}>
                  <span>
                    <strong>{group.name}</strong>
                    <small>
                      {group.distanceKm}km · {formatCurrency(group.price)}
                    </small>
                  </span>
                  <span className={group.remainingQuota > 0 ? 'quota' : 'quota quota--full'}>
                    余 {group.remainingQuota} / {group.quota}
                  </span>
                </li>
              ))}
            </ul>

            <footer className="event-card__foot">
              <span className="muted">{describeRegistrationWindow(event)}</span>
              <Link to={`/events/${event._id}`} className="btn btn--sm btn--primary">
                查看详情
              </Link>
            </footer>
          </article>
        ))}
      </div>

      <Pagination
        pagination={pagination}
        onChange={(page) => applyFilter({ page })}
        disabled={status === 'loading'}
      />
    </div>
  );
}
