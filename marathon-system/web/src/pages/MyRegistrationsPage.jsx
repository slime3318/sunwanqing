import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  cancelRegistration,
  clearRegistrationFeedback,
  fetchMyRegistrations,
  payRegistration,
} from '../store/slices/registrationsSlice.js';
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUS_TONES,
  formatCurrency,
  formatDate,
} from '../utils/format.js';
import Alert, { EmptyState, Spinner } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/Badge.jsx';
import Pagination from '../components/Pagination.jsx';

export default function MyRegistrationsPage() {
  const dispatch = useDispatch();
  const { mine, minePagination, status, error, notice, submitting } = useSelector(
    (state) => state.registrations,
  );
  const [page, setPage] = useState(1);

  useEffect(() => {
    dispatch(fetchMyRegistrations({ page, pageSize: 10 }));
  }, [dispatch, page]);

  const handlePay = (registration) => {
    dispatch(payRegistration({ id: registration._id, method: registration.payment?.method || 'wechat' }));
  };

  const handleCancel = (registration) => {
    const reason = window.prompt('请输入取消原因（可留空）') ?? undefined;
    if (reason === undefined) return;
    dispatch(cancelRegistration({ id: registration._id, reason: reason || undefined }));
  };

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1>我的报名</h1>
          <p className="page__sub">查询报名状态、完成支付或取消报名。</p>
        </div>
        <Link to="/events" className="btn btn--outline">
          继续报名
        </Link>
      </header>

      <Alert tone="success" onClose={() => dispatch(clearRegistrationFeedback())}>
        {notice}
      </Alert>
      <Alert tone="danger" onClose={() => dispatch(clearRegistrationFeedback())}>
        {error}
      </Alert>

      {status === 'loading' && !mine.length ? <Spinner /> : null}

      {status !== 'loading' && !mine.length ? (
        <EmptyState
          title="还没有报名记录"
          description="去赛事列表挑选一场比赛开始你的第一场马拉松。"
          action={
            <Link to="/events" className="btn btn--primary">
              浏览赛事
            </Link>
          }
        />
      ) : null}

      <div className="stack">
        {mine.map((registration) => (
          <article className="card registration-card" key={registration._id}>
            <header className="registration-card__head">
              <div>
                <h3>{registration.event?.title || '赛事已下架'}</h3>
                <p className="muted">
                  {registration.groupSnapshot.name} · {registration.groupSnapshot.distanceKm}km · 单号{' '}
                  {registration.orderNo}
                </p>
              </div>
              <StatusBadge
                status={registration.status}
                labels={REGISTRATION_STATUS_LABELS}
                tones={REGISTRATION_STATUS_TONES}
              />
            </header>

            <dl className="summary summary--inline">
              <div>
                <dt>选手</dt>
                <dd>{registration.participant.name}</dd>
              </div>
              <div>
                <dt>报名费</dt>
                <dd>{formatCurrency(registration.payment?.amount)}</dd>
              </div>
              <div>
                <dt>支付状态</dt>
                <dd>{PAYMENT_STATUS_LABELS[registration.payment?.status] || '-'}</dd>
              </div>
              <div>
                <dt>参赛号码</dt>
                <dd>{registration.bibNumber || '待分配'}</dd>
              </div>
              <div>
                <dt>报名时间</dt>
                <dd>{formatDate(registration.createdAt, true)}</dd>
              </div>
            </dl>

            {registration.review?.comment ? (
              <p className="muted">审核意见：{registration.review.comment}</p>
            ) : null}

            <footer className="registration-card__foot">
              <Link to={`/events/${registration.event?._id}`} className="btn btn--ghost btn--sm">
                赛事详情
              </Link>
              {registration.status === 'pending_payment' ? (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={submitting}
                  onClick={() => handlePay(registration)}
                >
                  去支付（{PAYMENT_METHOD_LABELS[registration.payment?.method] || '在线支付'}）
                </button>
              ) : null}
              {['pending_payment', 'pending_review'].includes(registration.status) ? (
                <button
                  type="button"
                  className="btn btn--danger btn--sm"
                  disabled={submitting}
                  onClick={() => handleCancel(registration)}
                >
                  取消报名
                </button>
              ) : null}
            </footer>
          </article>
        ))}
      </div>

      <Pagination pagination={minePagination} onChange={setPage} disabled={status === 'loading'} />
    </div>
  );
}
