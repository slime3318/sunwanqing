import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuthFeedback, login, loginBySms } from '../store/slices/authSlice.js';
import { authApi } from '../api/endpoints.js';
import Alert from '../components/Feedback.jsx';
import { Field, TextInput } from '../components/Form.jsx';

const initialForm = { account: '', password: '', phone: '', smsCode: '' };

export default function LoginPage() {
  const [mode, setMode] = useState('password');
  const [form, setForm] = useState(initialForm);
  const [smsHint, setSmsHint] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error, fieldErrors, notice } = useSelector((state) => state.auth);
  const submitting = status === 'loading';
  const redirectTo = location.state?.from || '/';

  useEffect(() => {
    dispatch(clearAuthFeedback());
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [dispatch, mode]);

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => navigate(redirectTo, { replace: true }), 600);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [notice, navigate, redirectTo]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const startCooldown = () => {
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
  };

  const handleSendCode = async () => {
    setSmsHint('');
    try {
      const data = await authApi.sendSmsCode({ phone: form.phone, scene: 'login' });
      setSmsHint(
        data.devCode
          ? `演示环境验证码：${data.devCode}（真实环境将通过短信发送）`
          : '验证码已发送，请查看手机短信',
      );
      startCooldown();
    } catch (requestError) {
      setSmsHint(requestError.message);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (mode === 'password') {
      await dispatch(login({ account: form.account.trim(), password: form.password }));
    } else {
      await dispatch(loginBySms({ phone: form.phone.trim(), smsCode: form.smsCode.trim() }));
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>登录</h1>
        <p className="auth-card__sub">使用手机号/邮箱或短信验证码登录报名系统</p>

        <div className="tabs">
          <button
            type="button"
            className={mode === 'password' ? 'is-active' : ''}
            onClick={() => setMode('password')}
          >
            账号密码
          </button>
          <button type="button" className={mode === 'sms' ? 'is-active' : ''} onClick={() => setMode('sms')}>
            短信验证码
          </button>
        </div>

        <Alert tone="danger" onClose={() => dispatch(clearAuthFeedback())}>
          {error}
        </Alert>

        <form onSubmit={handleSubmit} className="form">
          {mode === 'password' ? (
            <>
              <Field label="手机号 / 邮箱" required error={fieldErrors.account} htmlFor="account">
                <TextInput
                  id="account"
                  value={form.account}
                  onChange={update('account')}
                  placeholder="13800000000 或 runner@marathon.local"
                  autoComplete="username"
                  required
                />
              </Field>
              <Field label="密码" required error={fieldErrors.password} htmlFor="password">
                <TextInput
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={update('password')}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  required
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="手机号" required error={fieldErrors.phone} htmlFor="phone">
                <div className="input-group">
                  <TextInput
                    id="phone"
                    value={form.phone}
                    onChange={update('phone')}
                    placeholder="请输入注册手机号"
                    autoComplete="tel"
                    required
                  />
                  <button
                    type="button"
                    className="btn btn--outline"
                    onClick={handleSendCode}
                    disabled={cooldown > 0 || !form.phone}
                  >
                    {cooldown > 0 ? `${cooldown}s` : '获取验证码'}
                  </button>
                </div>
              </Field>
              <Field label="短信验证码" required error={fieldErrors.smsCode} htmlFor="smsCode" hint={smsHint}>
                <TextInput
                  id="smsCode"
                  value={form.smsCode}
                  onChange={update('smsCode')}
                  placeholder="6 位数字验证码"
                  maxLength={6}
                  inputMode="numeric"
                  required
                />
              </Field>
            </>
          )}

          <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={submitting}>
            {submitting ? '登录中…' : '登录'}
          </button>
        </form>

        <p className="auth-card__foot">
          还没有账号？<Link to="/register">立即注册</Link>
        </p>

        <div className="demo-accounts">
          <p>演示账号</p>
          <ul>
            <li>超级管理员：13800000000 / Admin123456</li>
            <li>运营人员：13800000001 / Operator123456</li>
            <li>赛事编辑员：13800000002 / Editor123456</li>
            <li>选手：13900000001 / Runner123456</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
