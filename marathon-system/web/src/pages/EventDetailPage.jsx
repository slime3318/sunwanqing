import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearCurrentEvent, fetchEventDetail } from '../store/slices/eventsSlice.js';
import {
  clearRegistrationFeedback,
  createRegistration,
  payRegistration,
} from '../store/slices/registrationsSlice.js';
import {
  EVENT_STATUS_LABELS,
  EVENT_STATUS_TONES,
  PAYMENT_METHOD_LABELS,
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUS_TONES,
  describeRegistrationWindow,
  formatCurrency,
  formatDate,
} from '../utils/format.js';
import { parseIdCard, validateParticipantForm } from '../utils/validation.js';
import Alert, { Spinner } from '../components/Feedback.jsx';
import { StatusBadge } from '../components/Badge.jsx';
import { Field, Select, TextArea, TextInput } from '../components/Form.jsx';

const tshirtOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((value) => ({
  value,
  label: value,
}));

const bloodOptions = [
  { value: 'unknown', label: '未知' },
  { value: 'A', label: 'A 型' },
  { value: 'B', label: 'B 型' },
  { value: 'AB', label: 'AB 型' },
  { value: 'O', label: 'O 型' },
];

export default function EventDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { current: event, status: eventStatus, error: eventError } = useSelector((state) => state.events);
  const user = useSelector((state) => state.auth.user);
  const registrationState = useSelector((state) => state.registrations);

  const [groupId, setGroupId] = useState('');
  const [form, setForm] = useState({
    name: '',
    idCard: '',
    phone: '',
    email: '',
    city: '',
    club: '',
    tshirtSize: 'M',
    bloodType: 'unknown',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    remark: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('wechat');
  const [localErrors, setLocalErrors] = useState({});
  const [created, setCreated] = useState(null);

  useEffect(() => {
    dispatch(fetchEventDetail(id));
    return () => dispatch(clearCurrentEvent());
  }, [dispatch, id]);

  useEffect(() => {
    dispatch(clearRegistrationFeedback());
  }, [dispatch, id]);

  useEffect(() => {
    if (!user) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || user.name || '',
      phone: prev.phone || user.phone || '',
      email: prev.email || user.email || '',
      city: prev.city || user.city || '',
      club: prev.club || user.club || '',
    }));
  }, [user]);

  useEffect(() => {
    if (!event) return;
    const firstEnabled = event.groups.find((group) => group.enabled && group.remainingQuota > 0);
    setGroupId((prev) => prev || firstEnabled?._id || event.groups[0]?._id || '');
  }, [event]);

  const selectedGroup = useMemo(
    () => event?.groups.find((group) => group._id === groupId) || null,
    [event, groupId],
  );

  const parsed = useMemo(() => parseIdCard(form.idCard), [form.idCard]);
  const windowText = describeRegistrationWindow(event);
  const canRegister = event && event.status === 'published' && windowText === '报名进行中';

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();
    if (!user) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }

    const errors = validateParticipantForm(form);
    if (!selectedGroup) errors.groupId = '请选择参赛组别';
    if (selectedGroup && !selectedGroup.enabled) errors.groupId = '该组别已关闭报名';
    setLocalErrors(errors);
    if (Object.keys(errors).length) return;

    const result = await dispatch(
      createRegistration({
        eventId: event._id,
        groupId: selectedGroup._id,
        paymentMethod,
        remark: form.remark || undefined,
        participant: {
          name: form.name.trim(),
          idCard: form.idCard.trim().toUpperCase(),
          phone: form.phone.trim(),
          email: form.email.trim() || undefined,
          city: form.city || undefined,
          club: form.club || undefined,
          tshirtSize: form.tshirtSize,
          bloodType: form.bloodType,
          emergencyContact: {
            name: form.emergencyContactName.trim(),
            phone: form.emergencyContactPhone.trim(),
            relation: form.emergencyContactRelation || undefined,
          },
        },
      }),
    );

    if (result.meta.requestStatus === 'fulfilled') {
      setCreated(result.payload);
    }
  };

  const handlePay = async () => {
    if (!created) return;
    const result = await dispatch(payRegistration({ id: created._id, method: paymentMethod }));
    if (result.meta.requestStatus === 'fulfilled') {
      setCreated(result.payload);
    }
  };

  const errors = { ...localErrors, ...registrationState.fieldErrors };

  if (eventStatus === 'loading' && !event) return <Spinner label="正在加载赛事信息…" />;

  if (!event) {
    return (
      <div className="page">
        <Alert tone="danger">{eventError || '赛事不存在或已下架'}</Alert>
        <Link to="/events" className="btn btn--outline">
          返回赛事列表
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <nav className="breadcrumb">
        <Link to="/events">赛事列表</Link>
        <span>/</span>
        <span>{event.title}</span>
      </nav>

      <header className="event-hero card">
        <div>
          <StatusBadge status={event.status} labels={EVENT_STATUS_LABELS} tones={EVENT_STATUS_TONES} />
          <h1>{event.title}</h1>
          <p className="event-hero__meta">
            {event.city} · {event.venue}
          </p>
          <p className="event-hero__meta">
            比赛日：{formatDate(event.startDate, true)}
            {event.endDate ? ` ~ ${formatDate(event.endDate, true)}` : ''}
          </p>
          <p className="event-hero__meta">
            报名期：{formatDate(event.registrationStart, true)} ~ {formatDate(event.registrationEnd, true)}
            <span className="muted">（{windowText}）</span>
          </p>
        </div>
        <div className="event-hero__aside">
          <div>
            <span className="muted">总名额</span>
            <strong>{event.totalQuota}</strong>
          </div>
          <div>
            <span className="muted">已报名</span>
            <strong>{event.totalApproved}</strong>
          </div>
        </div>
      </header>

      <div className="detail-layout">
        <div className="detail-main">
          {event.description ? (
            <section className="card">
              <h2>赛事介绍</h2>
              <p className="pre-line">{event.description}</p>
            </section>
          ) : null}

          {event.rules ? (
            <section className="card">
              <h2>参赛须知</h2>
              <p className="pre-line">{event.rules}</p>
            </section>
          ) : null}

          <section className="card">
            <h2>赛事组别</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>选择</th>
                    <th>组别</th>
                    <th>距离</th>
                    <th>报名费</th>
                    <th>年龄要求</th>
                    <th>名额</th>
                  </tr>
                </thead>
                <tbody>
                  {event.groups.map((group) => (
                    <tr key={group._id} className={group._id === groupId ? 'is-selected' : ''}>
                      <td>
                        <input
                          type="radio"
                          name="group"
                          value={group._id}
                          checked={group._id === groupId}
                          disabled={!group.enabled || group.remainingQuota <= 0}
                          onChange={() => setGroupId(group._id)}
                        />
                      </td>
                      <td>
                        <strong>{group.name}</strong>
                        <small className="muted"> {group.code}</small>
                      </td>
                      <td>{group.distanceKm} km</td>
                      <td>{formatCurrency(group.price)}</td>
                      <td>
                        {group.minAge}-{group.maxAge} 周岁
                      </td>
                      <td>
                        {group.remainingQuota > 0 ? (
                          <span>
                            余 {group.remainingQuota} / {group.quota}
                          </span>
                        ) : (
                          <span className="danger-text">已满员</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="detail-side">
          <section className="card">
            {created ? (
              <RegistrationResult
                registration={created}
                paymentMethod={paymentMethod}
                onPay={handlePay}
                submitting={registrationState.submitting}
                onGoMine={() => navigate('/my/registrations')}
              />
            ) : (
              <>
                <h2>在线报名</h2>
                <p className="muted">
                  {selectedGroup
                    ? `${selectedGroup.name} · ${formatCurrency(selectedGroup.price)}`
                    : '请选择参赛组别'}
                </p>

                {!canRegister ? <Alert tone="warn">当前{windowText}，暂不可提交报名。</Alert> : null}
                {!user ? (
                  <Alert tone="info">
                    报名前请先
                    <Link to="/login" state={{ from: `/events/${id}` }}>
                      {' '}
                      登录
                    </Link>
                    ，还没有账号？
                    <Link to="/register">立即注册</Link>
                  </Alert>
                ) : null}

                <Alert tone="danger" onClose={() => dispatch(clearRegistrationFeedback())}>
                  {registrationState.error}
                </Alert>

                <form className="form" onSubmit={handleSubmit} noValidate>
                  {errors.groupId ? <Alert tone="danger">{errors.groupId}</Alert> : null}

                  <Field label="姓名" required error={errors['participant.name']} htmlFor="p-name">
                    <TextInput id="p-name" value={form.name} onChange={update('name')} placeholder="与身份证一致" />
                  </Field>

                  <Field
                    label="身份证号"
                    required
                    error={errors['participant.idCard']}
                    htmlFor="p-idcard"
                    hint={
                      parsed
                        ? `已识别：${parsed.gender === 'male' ? '男' : '女'} · ${parsed.age} 周岁 · 出生日期 ${parsed.birthDate}`
                        : '用于核验参赛资格，请如实填写 18 位身份证号'
                    }
                  >
                    <TextInput
                      id="p-idcard"
                      value={form.idCard}
                      onChange={(value) => update('idCard')(value.toUpperCase())}
                      placeholder="请输入 18 位身份证号"
                      maxLength={18}
                    />
                  </Field>

                  <Field label="手机号" required error={errors['participant.phone']} htmlFor="p-phone">
                    <TextInput id="p-phone" value={form.phone} onChange={update('phone')} placeholder="接收报名通知" />
                  </Field>

                  <Field label="邮箱" error={errors['participant.email']} htmlFor="p-email">
                    <TextInput id="p-email" value={form.email} onChange={update('email')} placeholder="选填" />
                  </Field>

                  <div className="form-row">
                    <Field label="城市" htmlFor="p-city">
                      <TextInput id="p-city" value={form.city} onChange={update('city')} placeholder="常住城市" />
                    </Field>
                    <Field label="跑团 / 俱乐部" htmlFor="p-club">
                      <TextInput id="p-club" value={form.club} onChange={update('club')} placeholder="选填" />
                    </Field>
                  </div>

                  <div className="form-row">
                    <Field label="T 恤尺码" htmlFor="p-shirt">
                      <Select id="p-shirt" value={form.tshirtSize} onChange={update('tshirtSize')} options={tshirtOptions} />
                    </Field>
                    <Field label="血型" htmlFor="p-blood">
                      <Select id="p-blood" value={form.bloodType} onChange={update('bloodType')} options={bloodOptions} />
                    </Field>
                  </div>

                  <Field label="紧急联系人姓名" required error={errors['participant.emergencyContact.name']} htmlFor="p-ec-name">
                    <TextInput id="p-ec-name" value={form.emergencyContactName} onChange={update('emergencyContactName')} />
                  </Field>

                  <Field
                    label="紧急联系人手机号"
                    required
                    error={errors['participant.emergencyContact.phone']}
                    htmlFor="p-ec-phone"
                  >
                    <TextInput id="p-ec-phone" value={form.emergencyContactPhone} onChange={update('emergencyContactPhone')} />
                  </Field>

                  <Field label="与本人关系" htmlFor="p-ec-relation">
                    <TextInput
                      id="p-ec-relation"
                      value={form.emergencyContactRelation}
                      onChange={update('emergencyContactRelation')}
                      placeholder="如：家属 / 朋友"
                    />
                  </Field>

                  <Field label="支付方式" htmlFor="p-pay">
                    <Select
                      id="p-pay"
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }))}
                    />
                  </Field>

                  <Field label="备注" htmlFor="p-remark" hint="选填，如成绩证明、特殊需求等">
                    <TextArea id="p-remark" rows={3} value={form.remark} onChange={update('remark')} />
                  </Field>

                  <button
                    type="submit"
                    className="btn btn--primary btn--block btn--lg"
                    disabled={registrationState.submitting || !canRegister}
                  >
                    {registrationState.submitting
                      ? '提交中…'
                      : selectedGroup
                        ? `提交报名 · ${formatCurrency(selectedGroup.price)}`
                        : '提交报名'}
                  </button>
                </form>
              </>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function RegistrationResult({ registration, paymentMethod, onPay, submitting, onGoMine }) {
  const needsPayment = registration.status === 'pending_payment';

  return (
    <div className="result-panel">
      <h2>{needsPayment ? '报名已创建，等待支付' : '报名已提交'}</h2>
      <dl className="summary">
        <div>
          <dt>报名单号</dt>
          <dd>{registration.orderNo}</dd>
        </div>
        <div>
          <dt>参赛组别</dt>
          <dd>{registration.groupSnapshot.name}</dd>
        </div>
        <div>
          <dt>报名费</dt>
          <dd>{formatCurrency(registration.payment.amount)}</dd>
        </div>
        <div>
          <dt>当前状态</dt>
          <dd>
            <StatusBadge
              status={registration.status}
              labels={REGISTRATION_STATUS_LABELS}
              tones={REGISTRATION_STATUS_TONES}
            />
          </dd>
        </div>
      </dl>

      {needsPayment ? (
        <>
          <Alert tone="warn">订单 30 分钟内未支付将自动释放名额（演示环境为即时模拟支付）。</Alert>
          <button type="button" className="btn btn--primary btn--block btn--lg" onClick={onPay} disabled={submitting}>
            {submitting ? '支付中…' : `使用${PAYMENT_METHOD_LABELS[paymentMethod]}支付`}
          </button>
        </>
      ) : (
        <Alert tone="success">报名已进入审核队列，审核结果将通过短信/邮件通知。</Alert>
      )}

      <button type="button" className="btn btn--outline btn--block" onClick={onGoMine}>
        查看我的报名
      </button>
    </div>
  );
}
