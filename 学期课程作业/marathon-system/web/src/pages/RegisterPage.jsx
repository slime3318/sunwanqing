import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuthFeedback, register } from '../store/slices/authSlice.js';
import { authApi } from '../api/endpoints.js';
import Alert from '../components/Feedback.jsx';
import { Field, TextInput } from '../components/Form.jsx';
import { isStrongPassword, isValidEmail, isValidPhone } from '../utils/validation.js';

const initialForm = { name: '', phone: '', email: '', password: '', confirmPassword: '', smsCode: '' };

export default function RegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [localErrors, setLocalErrors] = useState({});
  const [smsHint, setSmsHint] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status, error, fieldErrors, notice } = useSelector((state) => state.auth);
  const submitting = status === 'loading';

  useEffect(() => {
    dispatch(clearAuthFeedback());
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [dispatch]);

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => navigate('/profile', { replace: true }), 700);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [notice, navigate]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const errors = {};
    if (!form.name.trim() || form.name.trim().length < 2) errors.name = '请填写真实姓名（至少 2 个字）';
    if (!isValidPhone(form.phone)) errors.phone = '请输入 11 位有效手机号';
    if (!isValidEmail(form.email)) errors.email = '邮箱格式不正确';
    if (!isStrongPassword(form.password)) errors.password = '密码至少 8 位，且包含字母和数字';
    if (form.password !== form.confirmPassword) errors.confirmPassword = '两次输入的密码不一致';
    if (!/^\d{6}$/.test(form.smsCode)) errors.smsCode = '请输入 6 位短信验证码';
    setLocalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendCode = async () => {
    setSmsHint('');
    if (!isValidPhone(form.phone)) {
      setLocalErrors((prev) => ({ ...prev, phone: '请先填写有效手机号' }));
      return;
    }
    try {
      const data = await authApi.sendSmsCode({ phone: form.phone, scene: 'register' });
      setSmsHint(
        data.devCode
          ? `演示环境验证码：${data.devCode}（真实环境将通过短信发送）`
          : '验证码已发送，请查看手机短信',
      );
      setCooldown(60);
      timerRef.current = setInterval(() => {
        setCooldown((value) => {
          if (value <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return value - 1;
        });
      }, 1000);
    } catch (requestError) {
      setSmsHint(requestError.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    await dispatch(
      register({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        password: form.password,
        smsCode: form.smsCode.trim(),
      }),
    );
  };

  const errors = { ...localErrors, ...fieldErrors };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>注册选手账号</h1>
        <p className="auth-card__sub">注册后即可在线报名赛事、查询报名进度</p>

        <Alert tone="danger" onClose={() => dispatch(clearAuthFeedback())}>
          {error}
        </Alert>

        <form onSubmit={handleSubmit} className="form" noValidate>
          <Field label="姓名" required error={errors.name} htmlFor="name">
            <TextInput id="name" value={form.name} onChange={update('name')} placeholder="请输入真实姓名" />
          </Field>

          <Field label="手机号" required error={errors.phone} htmlFor="phone">
            <div className="input-group">
              <TextInput
                id="phone"
                value={form.phone}
                onChange={update('phone')}
                placeholder="用于登录与接收通知"
                autoComplete="tel"
              />
              <button
                type="button"
                className="btn btn--outline"
                onClick={handleSendCode}
                disabled={cooldown > 0}
              >
                {cooldown > 0 ? `${cooldown}s` : '获取验证码'}
              </button>
            </div>
          </Field>

          <Field label="短信验证码" required error={errors.smsCode} htmlFor="smsCode" hint={smsHint}>
            <TextInput
              id="smsCode"
              value={form.smsCode}
              onChange={update('smsCode')}
              placeholder="6 位数字验证码"
              maxLength={6}
              inputMode="numeric"
            />
          </Field>

          <Field label="邮箱" error={errors.email} htmlFor="email" hint="选填，用于接收报名结果通知">
            <TextInput
              id="email"
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="name@example.com"
              autoComplete="email"
            />
          </Field>

          <Field
            label="密码"
            required
            error={errors.password}
            htmlFor="password"
            hint="至少 8 位，需包含字母和数字"
          >
            <TextInput
              id="password"
              type="password"
              value={form.password}
              onChange={update('password')}
              placeholder="请输入密码"
              autoComplete="new-password"
            />
          </Field>

          <Field label="确认密码" required error={errors.confirmPassword} htmlFor="confirmPassword">
            <TextInput
              id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              placeholder="请再次输入密码"
              autoComplete="new-password"
            />
          </Field>

          <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={submitting}>
            {submitting ? '注册中…' : '注册并登录'}
          </button>
        </form>

        <p className="auth-card__foot">
          已有账号？<Link to="/login">返回登录</Link>
        </p>
      </div>
    </div>
  );
}
