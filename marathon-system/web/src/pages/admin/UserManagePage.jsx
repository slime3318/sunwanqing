import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  assignUserRole,
  clearUserFeedback,
  fetchUserMeta,
  fetchUsers,
  setUserFilters,
  updateUserStatus,
} from '../../store/slices/usersSlice.js';
import { fetchAdminEvents } from '../../store/slices/eventsSlice.js';
import { ROLE_LABELS, formatDate } from '../../utils/format.js';
import Alert, { EmptyState, Spinner } from '../../components/Feedback.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import { Field, Select, TextInput } from '../../components/Form.jsx';

export default function UserManagePage() {
  const dispatch = useDispatch();
  const { list, pagination, filters, roles, status, saving, error, notice } = useSelector(
    (state) => state.users,
  );
  const permissions = useSelector((state) => state.auth.permissions);
  const currentUserId = useSelector((state) => state.auth.user?._id || state.auth.user?.id);
  const adminEvents = useSelector((state) => state.events.adminList);

  const canAssignRole = permissions.includes('role:assign');
  const canToggleStatus = permissions.includes('user:write');

  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ role: 'participant', managedEvents: [] });

  useEffect(() => {
    dispatch(fetchUserMeta());
    dispatch(fetchAdminEvents({ page: 1, pageSize: 100 }));
  }, [dispatch]);

  useEffect(() => {
    dispatch(
      fetchUsers({
        page: filters.page,
        pageSize: filters.pageSize,
        role: filters.role || undefined,
        status: filters.status || undefined,
        keyword: filters.keyword || undefined,
      }),
    );
  }, [dispatch, filters]);

  const applyFilter = (patch) => dispatch(setUserFilters({ ...patch, page: patch.page ?? 1 }));

  const openEditor = (user) => {
    setEditing(user._id);
    setDraft({ role: user.role, managedEvents: user.managedEvents || [] });
  };

  const saveRole = async () => {
    await dispatch(
      assignUserRole({
        id: editing,
        payload: {
          role: draft.role,
          managedEvents: draft.role === 'event_editor' ? draft.managedEvents : [],
        },
      }),
    );
    setEditing(null);
  };

  const toggleStatus = async (user) => {
    const nextStatus = user.status === 'active' ? 'disabled' : 'active';
    await dispatch(updateUserStatus({ id: user._id, payload: { status: nextStatus } }));
  };

  const toggleManagedEvent = (eventId) =>
    setDraft((prev) => ({
      ...prev,
      managedEvents: prev.managedEvents.includes(eventId)
        ? prev.managedEvents.filter((item) => item !== eventId)
        : [...prev.managedEvents, eventId],
    }));

  return (
    <div className="stack">
      <header className="section-head">
        <h2>用户与权限</h2>
      </header>

      <Alert tone="success" onClose={() => dispatch(clearUserFeedback())}>
        {notice}
      </Alert>
      <Alert tone="danger" onClose={() => dispatch(clearUserFeedback())}>
        {error}
      </Alert>

      <section className="filters card card--flat">
        <Field label="关键词">
          <TextInput
            value={filters.keyword}
            onChange={(value) => applyFilter({ keyword: value })}
            placeholder="姓名 / 手机号 / 邮箱"
          />
        </Field>
        <Field label="角色">
          <Select
            value={filters.role}
            onChange={(value) => applyFilter({ role: value })}
            placeholder="全部角色"
            options={(roles.length ? roles : Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })))}
          />
        </Field>
        <Field label="状态">
          <Select
            value={filters.status}
            onChange={(value) => applyFilter({ status: value })}
            placeholder="全部状态"
            options={[
              { value: 'active', label: '正常' },
              { value: 'disabled', label: '已禁用' },
            ]}
          />
        </Field>
      </section>

      {status === 'loading' && !list.length ? <Spinner /> : null}

      {status !== 'loading' && !list.length ? <EmptyState title="暂无用户" /> : null}

      {list.length ? (
        <div className="table-wrap card card--flat">
          <table className="table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>手机号 / 邮箱</th>
                <th>角色</th>
                <th>状态</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((user) => (
                <tr key={user._id}>
                  <td>
                    <strong>{user.name}</strong>
                    {String(user._id) === String(currentUserId) ? <small className="muted"> （我）</small> : null}
                  </td>
                  <td>
                    {user.phone}
                    <br />
                    <small className="muted">{user.email || '—'}</small>
                  </td>
                  <td>
                    <Badge tone={user.role === 'participant' ? 'muted' : 'info'}>
                      {ROLE_LABELS[user.role] || user.role}
                    </Badge>
                    {user.role === 'event_editor' ? (
                      <small className="muted"> 管辖 {user.managedEvents?.length || 0} 场</small>
                    ) : null}
                  </td>
                  <td>
                    <Badge tone={user.status === 'active' ? 'success' : 'danger'}>
                      {user.status === 'active' ? '正常' : '已禁用'}
                    </Badge>
                  </td>
                  <td>{formatDate(user.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      {canAssignRole ? (
                        <button type="button" className="btn btn--outline btn--xs" onClick={() => openEditor(user)}>
                          分配角色
                        </button>
                      ) : null}
                      {canToggleStatus && String(user._id) !== String(currentUserId) ? (
                        <button
                          type="button"
                          className={`btn btn--xs ${user.status === 'active' ? 'btn--danger' : 'btn--primary'}`}
                          disabled={saving}
                          onClick={() => toggleStatus(user)}
                        >
                          {user.status === 'active' ? '禁用' : '启用'}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {editing ? (
        <section className="card">
          <h3>分配角色</h3>
          <div className="form-row">
            <Field label="角色">
              <Select
                value={draft.role}
                onChange={(value) => setDraft((prev) => ({ ...prev, role: value }))}
                options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </Field>
            <Field label=" " hint="超级管理员拥有全部权限，请谨慎分配">
              <div className="row-actions">
                <button type="button" className="btn btn--primary" disabled={saving} onClick={saveRole}>
                  保存
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setEditing(null)}>
                  取消
                </button>
              </div>
            </Field>
          </div>

          {draft.role === 'event_editor' ? (
            <>
              <h4>管辖赛事</h4>
              <p className="muted">赛事编辑员仅能管理被勾选的赛事，且不能执行报名审核。</p>
              <div className="chip-list">
                {adminEvents.map((event) => (
                  <label className="checkbox chip" key={event._id}>
                    <input
                      type="checkbox"
                      checked={draft.managedEvents.includes(event._id)}
                      onChange={() => toggleManagedEvent(event._id)}
                    />
                    {event.title}
                  </label>
                ))}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      <Pagination
        pagination={pagination}
        onChange={(page) => applyFilter({ page })}
        disabled={status === 'loading'}
      />
    </div>
  );
}
