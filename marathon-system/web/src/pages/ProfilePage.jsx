import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { changePassword, clearAuthFeedback, updateProfile } from '../store/slices/authSlice.js';
import { parseIdCard, isStrongPassword } from '../utils/validation.js';
import { ROLE_LABELS } from '../utils/format.js';
import Alert from '../components/Feedback.jsx';
import Badge from '../components/Badge.jsx';
import { Field, Select, TextInput } from '../components/Form.jsx';

const PERMISSION_LABELS = {
  'user:read': '查看用户',
  'user:write': '管理用户状态',
  'role:assign': '分配角色',
  'event:read': '查看赛事',
  'event:write': '编辑赛事',
  'registration:read': '查看报名',
  'registration:write': '处理报名',
  'registration:review': '审核报名',
  'registration:export': '导出数据',
  'stats:read': '查看统计',
  'settings:manage': '系统设置',
};

const bloodOptions = [
  { value: 'unknown', label: '未知' },
  { value: 'A', label: 'A 型' },
  { value: 'B', label: 'B 型' },
  { value: 'AB', label: 'AB 型' },
  { value: 'O', label: 'O 型' },
];

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { user, permissions, status, error, fieldErrors, notice } = useSelector((state) => state.auth);
  const submitting = status === 'loading';

  const [form, setForm] = useState({
    name: '',
    email: '',
    idCard: '',
    city: '',
    club: '',
    bloodType: 'unknown',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
  });
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || '',
      email: user.email || '',
      idCard: user.idCard || '',
      city: user.city || '',
      club: user.club || '',
      bloodType: user.bloodType || 'unknown',
      emergencyContactName: user.emergencyContact?.name || '',
      emergencyContactPhone: user.emergencyContact?.phone || '',
      emergencyContactRelation: user.emergencyContact?.relation || '',
    });
  }, [user]);

  const parsed = useMemo(() => parseIdCard(form.idCard), [form.idCard]);
  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    dispatch(
      updateProfile({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        idCard: form.idCard.trim().toUpperCase() || undefined,
        city: form.city || undefined,
        club: form.club || undefined,
        bloodType: form.bloodType,
        emergencyContact:
          form.emergencyContactName && form.emergencyContactPhone
            ? {
                name: form.emergencyContactName.trim(),
                phone: form.emergencyContactPhone.trim(),
                relation: form.emergencyContactRelation || undefined,
              }
            : undefined,
      }),
    );
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!passwordForm.oldPassword) errors.oldPassword = '请输入原密码';
    if (!isStrongPassword(passwordForm.newPassword)) errors.newPassword = '新密码至少 8 位且包含字母和数字';
    if (passwordForm.newPassword !== passwordForm.confirm) errors.confirm = '两次输入的密码不一致';
    setPasswordErrors(errors);
    if (Object.keys(errors).length) return;

    const result = await dispatch(
      changePassword({ oldPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword }),
    );
    if (result.meta.requestStatus === 'fulfilled') {
      setPasswordForm({ oldPassword: '', newPassword: '', confirm: '' });
    }
  };

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1>个人中心</h1>
          <p className="page__sub">
            {user?.name} · {ROLE_LABELS[user?.role] || user?.role}
          </p>
        </div>
      </header>

      <Alert tone="success" onClose={() => dispatch(clearAuthFeedback())}>
        {notice}
      </Alert>
      <Alert tone="danger" onClose={() => dispatch(clearAuthFeedback())}>
        {error}
      </Alert>

      <div className="detail-layout">
        <section className="card detail-main">
          <h2>基本信息</h2>
          <p className="muted">身份证号用于报名资格校验，保存后会自动识别性别与出生日期。</p>

          <form className="form" onSubmit={handleSubmit} noValidate>
            <div className="form-row">
              <Field label="姓名" required error={fieldErrors.name}>
                <TextInput value={form.name} onChange={update('name')} />
              </Field>
              <Field label="手机号" hint="手机号作为登录账号，暂不支持自助修改">
                <TextInput value={user?.phone || ''} disabled />
              </Field>
            </div>

            <Field
              label="身份证号"
              error={fieldErrors.idCard}
              hint={
                parsed
                  ? `已识别：${parsed.gender === 'male' ? '男' : '女'} · ${parsed.age} 周岁 · ${parsed.birthDate}`
                  : '填写后可用于赛事报名自动带入'
              }
            >
              <TextInput value={form.idCard} onChange={(value) => update('idCard')(value.toUpperCase())} maxLength={18} />
            </Field>

            <div className="form-row">
              <Field label="邮箱" error={fieldErrors.email}>
                <TextInput type="email" value={form.email} onChange={update('email')} />
              </Field>
              <Field label="血型">
                <Select value={form.bloodType} onChange={update('bloodType')} options={bloodOptions} />
              </Field>
            </div>

            <div className="form-row">
              <Field label="城市">
                <TextInput value={form.city} onChange={update('city')} />
              </Field>
              <Field label="跑团 / 俱乐部">
                <TextInput value={form.club} onChange={update('club')} />
              </Field>
            </div>

            <h3>紧急联系人</h3>
            <div className="form-row">
              <Field label="姓名">
                <TextInput value={form.emergencyContactName} onChange={update('emergencyContactName')} />
              </Field>
              <Field label="手机号">
                <TextInput value={form.emergencyContactPhone} onChange={update('emergencyContactPhone')} />
              </Field>
            </div>
            <Field label="与本人关系">
              <TextInput value={form.emergencyContactRelation} onChange={update('emergencyContactRelation')} />
            </Field>

            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? '保存中…' : '保存资料'}
            </button>
          </form>
        </section>

        <aside className="detail-side">
          <section className="card">
            <h2>我的权限</h2>
            <p className="muted">当前角色：{ROLE_LABELS[user?.role] || user?.role}</p>
            <div className="chip-list">
              {permissions.length ? (
                permissions.map((permission) => (
                  <Badge key={permission} tone="info">
                    {PERMISSION_LABELS[permission] || permission}
                  </Badge>
                ))
              ) : (
                <span className="muted">普通选手账号，无后台权限</span>
              )}
            </div>
          </section>

          <section className="card">
            <h2>修改密码</h2>
            <form className="form" onSubmit={handlePasswordSubmit} noValidate>
              <Field label="原密码" required error={passwordErrors.oldPassword}>
                <TextInput
                  type="password"
                  value={passwordForm.oldPassword}
                  onChange={(value) => setPasswordForm((prev) => ({ ...prev, oldPassword: value }))}
                />
              </Field>
              <Field
                label="新密码"
                required
                error={passwordErrors.newPassword}
                hint="至少 8 位，需包含字母和数字"
              >
                <TextInput
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(value) => setPasswordForm((prev) => ({ ...prev, newPassword: value }))}
                />
              </Field>
              <Field label="确认新密码" required error={passwordErrors.confirm}>
                <TextInput
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(value) => setPasswordForm((prev) => ({ ...prev, confirm: value }))}
                />
              </Field>
              <button type="submit" className="btn btn--outline btn--block" disabled={submitting}>
                提交修改
              </button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}
