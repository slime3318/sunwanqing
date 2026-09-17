import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  batchReviewRegistrations,
  clearRegistrationFeedback,
  fetchRegistrations,
  fetchStatusMeta,
  reviewRegistration,
  setRegistrationFilters,
} from '../../store/slices/registrationsSlice.js';
import { fetchAdminEvents } from '../../store/slices/eventsSlice.js';
import { registrationsApi } from '../../api/endpoints.js';
import {
  PAYMENT_STATUS_LABELS,
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUS_TONES,
  formatCurrency,
  formatDate,
  maskIdCard,
} from '../../utils/format.js';
import Alert, { EmptyState, Spinner } from '../../components/Feedback.jsx';
import { StatusBadge } from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import { Field, Select, TextInput } from '../../components/Form.jsx';

export default function RegistrationManagePage() {
  const dispatch = useDispatch();
  const { list, pagination, filters, status, submitting, error, notice, lastSummary } = useSelector(
    (state) => state.registrations,
  );
  const adminEvents = useSelector((state) => state.events.adminList);
  const canReview = useSelector((state) => state.auth.permissions.includes('registration:review'));
  const canExport = useSelector((state) => state.auth.permissions.includes('registration:export'));

  const [selected, setSelected] = useState([]);
  const [comment, setComment] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    dispatch(fetchStatusMeta());
    dispatch(fetchAdminEvents({ page: 1, pageSize: 100 }));
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      fetchRegistrations({
        scope: 'all',
        page: filters.page,
        pageSize: filters.pageSize,
        status: filters.status || undefined,
        eventId: filters.eventId || undefined,
        keyword: filters.keyword || undefined,
      }),
    );
  }, [dispatch, filters]);

  useEffect(() => {
    setSelected([]);
  }, [list]);

  const applyFilter = (patch) => dispatch(setRegistrationFilters({ ...patch, page: patch.page ?? 1 }));

  const statusOptions = useMemo(
    () => Object.entries(REGISTRATION_STATUS_LABELS).map(([value, label]) => ({ value, label })),
    [],
  );

  const allSelected = list.length > 0 && selected.length === list.length;
  const toggleAll = () => setSelected(allSelected ? [] : list.map((item) => item._id));
  const toggleOne = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const handleReview = async (id, nextStatus) => {
    const remark =
      nextStatus === 'rejected' ? window.prompt('请输入驳回原因') ?? undefined : comment || undefined;
    await dispatch(reviewRegistration({ id, payload: { status: nextStatus, comment: remark || undefined } }));
  };

  const handleBatch = async (nextStatus) => {
    if (!selected.length) return;
    const payloadComment =
      nextStatus === 'rejected' ? window.prompt('请输入批量驳回原因') ?? undefined : comment || undefined;
    await dispatch(
      batchReviewRegistrations({
        ids: selected,
        status: nextStatus,
        comment: payloadComment || undefined,
      }),
    );
    setComment('');
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await registrationsApi.exportCsv({
        scope: 'all',
        status: filters.status || undefined,
        eventId: filters.eventId || undefined,
        keyword: filters.keyword || undefined,
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `报名数据-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="stack">
      <header className="section-head">
        <h2>报名管理</h2>
        {canExport ? (
          <button type="button" className="btn btn--outline" onClick={handleExport} disabled={exporting}>
            {exporting ? '导出中…' : '导出 Excel (CSV)'}
          </button>
        ) : null}
      </header>

      <Alert tone="success" onClose={() => dispatch(clearRegistrationFeedback())}>
        {notice}
      </Alert>
      <Alert tone="danger" onClose={() => dispatch(clearRegistrationFeedback())}>
        {error}
      </Alert>

      {lastSummary?.failed?.length ? (
        <Alert tone="warn">
          部分记录处理失败：
          <ul className="error-list">
            {lastSummary.failed.map((item) => (
              <li key={item.id}>{item.message}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <section className="filters card card--flat">
        <Field label="赛事">
          <Select
            value={filters.eventId}
            onChange={(value) => applyFilter({ eventId: value })}
            placeholder="全部赛事"
            options={adminEvents.map((event) => ({ value: event._id, label: event.title }))}
          />
        </Field>
        <Field label="状态">
          <Select
            value={filters.status}
            onChange={(value) => applyFilter({ status: value })}
            placeholder="全部状态"
            options={statusOptions}
          />
        </Field>
        <Field label="选手查询" hint="按姓名或身份证号搜索">
          <TextInput
            value={filters.keyword}
            onChange={(value) => applyFilter({ keyword: value })}
            placeholder="姓名 / 身份证号"
          />
        </Field>
      </section>

      {canReview ? (
        <section className="card card--flat bulk-bar">
          <span className="muted">已选择 {selected.length} 条</span>
          <TextInput value={comment} onChange={setComment} placeholder="审核备注（选填）" />
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={!selected.length || submitting}
            onClick={() => handleBatch('approved')}
          >
            批量通过
          </button>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            disabled={!selected.length || submitting}
            onClick={() => handleBatch('rejected')}
          >
            批量驳回
          </button>
        </section>
      ) : null}

      {status === 'loading' && !list.length ? <Spinner /> : null}

      {status !== 'loading' && !list.length ? (
        <EmptyState title="暂无报名记录" description="调整筛选条件后再试。" />
      ) : null}

      {list.length ? (
        <div className="table-wrap card card--flat">
          <table className="table">
            <thead>
              <tr>
                {canReview ? (
                  <th>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="全选" />
                  </th>
                ) : null}
                <th>报名单号</th>
                <th>赛事 / 组别</th>
                <th>选手</th>
                <th>联系方式</th>
                <th>报名费</th>
                <th>状态</th>
                <th>参赛号码</th>
                <th>报名时间</th>
                {canReview ? <th>操作</th> : null}
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item._id}>
                  {canReview ? (
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(item._id)}
                        onChange={() => toggleOne(item._id)}
                        aria-label={`选择 ${item.participant.name}`}
                      />
                    </td>
                  ) : null}
                  <td className="mono">{item.orderNo}</td>
                  <td>
                    <strong>{item.event?.title || '—'}</strong>
                    <small className="muted">
                      {' '}
                      {item.groupSnapshot.name} · {item.groupSnapshot.distanceKm}km
                    </small>
                  </td>
                  <td>
                    <strong>{item.participant.name}</strong>
                    <small className="muted">
                      {' '}
                      {item.participant.gender === 'male' ? '男' : '女'} · {item.participant.age} 岁
                    </small>
                    <br />
                    <small className="mono muted">{maskIdCard(item.participant.idCard)}</small>
                  </td>
                  <td>
                    {item.participant.phone}
                    <br />
                    <small className="muted">{item.participant.email || '—'}</small>
                  </td>
                  <td>
                    {formatCurrency(item.payment?.amount)}
                    <br />
                    <small className="muted">{PAYMENT_STATUS_LABELS[item.payment?.status] || '-'}</small>
                  </td>
                  <td>
                    <StatusBadge
                      status={item.status}
                      labels={REGISTRATION_STATUS_LABELS}
                      tones={REGISTRATION_STATUS_TONES}
                    />
                  </td>
                  <td>{item.bibNumber || '—'}</td>
                  <td>{formatDate(item.createdAt, true)}</td>
                  {canReview ? (
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn--primary btn--xs"
                          disabled={item.status !== 'pending_review' || submitting}
                          onClick={() => handleReview(item._id, 'approved')}
                        >
                          通过
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger btn--xs"
                          disabled={item.status !== 'pending_review' || submitting}
                          onClick={() => handleReview(item._id, 'rejected')}
                        >
                          驳回
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <Pagination
        pagination={pagination}
        onChange={(page) => applyFilter({ page })}
        disabled={status === 'loading'}
      />
    </div>
  );
}
