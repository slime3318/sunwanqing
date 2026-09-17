import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  addEventGroup,
  clearCurrentEvent,
  clearEventFeedback,
  createEvent,
  fetchEventDetail,
  removeEventGroup,
  updateEvent,
  updateEventGroup,
} from '../../store/slices/eventsSlice.js';
import { toDateInputValue } from '../../utils/format.js';
import Alert, { Spinner } from '../../components/Feedback.jsx';
import { Field, TextArea, TextInput } from '../../components/Form.jsx';

const emptyGroup = () => ({
  code: '',
  name: '',
  distanceKm: '',
  price: '',
  quota: '',
  minAge: 16,
  maxAge: 75,
  requiresMedicalCertificate: true,
  enabled: true,
});

const emptyEvent = {
  title: '',
  city: '',
  venue: '',
  coverImage: '',
  description: '',
  rules: '',
  startDate: '',
  endDate: '',
  registrationStart: '',
  registrationEnd: '',
};

export default function EventFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { current, saving, error, fieldErrors } = useSelector((state) => state.events);
  const loadedEventRef = useRef(null);
  const [form, setForm] = useState(emptyEvent);
  const [groups, setGroups] = useState([emptyGroup()]);
  const [groupDrafts, setGroupDrafts] = useState({});
  const [newGroup, setNewGroup] = useState(emptyGroup());

  useEffect(() => {
    dispatch(clearEventFeedback());
    if (isEdit) dispatch(fetchEventDetail(id));
    else setForm(emptyEvent);
    return () => dispatch(clearCurrentEvent());
  }, [dispatch, id, isEdit]);

  useEffect(() => {
    if (!isEdit || !current) return;
    // 仅在首次加载 / 切换赛事时回填，避免保存组别后覆盖正在编辑中的赛事表单
    if (loadedEventRef.current === current._id) return;
    loadedEventRef.current = current._id;

    setForm({
      title: current.title || '',
      city: current.city || '',
      venue: current.venue || '',
      coverImage: current.coverImage || '',
      description: current.description || '',
      rules: current.rules || '',
      startDate: toDateInputValue(current.startDate),
      endDate: toDateInputValue(current.endDate),
      registrationStart: toDateInputValue(current.registrationStart),
      registrationEnd: toDateInputValue(current.registrationEnd),
    });
  }, [current, isEdit]);

  useEffect(() => {
    if (!isEdit || !current) return;
    setGroupDrafts(
      Object.fromEntries(
        current.groups.map((group) => [
          group._id,
          {
            ...group,
            startTime: toDateInputValue(group.startTime),
          },
        ]),
      ),
    );
  }, [current, isEdit]);

  const update = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));

  const payload = useMemo(
    () => ({
      title: form.title.trim(),
      city: form.city.trim(),
      venue: form.venue.trim(),
      coverImage: form.coverImage || undefined,
      description: form.description || undefined,
      rules: form.rules || undefined,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      registrationStart: form.registrationStart ? new Date(form.registrationStart).toISOString() : undefined,
      registrationEnd: form.registrationEnd ? new Date(form.registrationEnd).toISOString() : undefined,
    }),
    [form],
  );

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();

    if (!isEdit) {
      const normalized = groups.map((group) => ({
        code: group.code.trim().toUpperCase(),
        name: group.name.trim(),
        distanceKm: Number(group.distanceKm),
        price: Number(group.price),
        quota: Number(group.quota),
        minAge: Number(group.minAge),
        maxAge: Number(group.maxAge),
        requiresMedicalCertificate: Boolean(group.requiresMedicalCertificate),
        enabled: true,
      }));

      const result = await dispatch(createEvent({ ...payload, groups: normalized }));
      if (result.meta.requestStatus === 'fulfilled') {
        navigate(`/admin/events/${result.payload._id}/edit`);
      }
      return;
    }

    await dispatch(updateEvent({ id, payload }));
  };

  const updateGroupRow = (groupId, patch) =>
    setGroupDrafts((prev) => ({ ...prev, [groupId]: { ...prev[groupId], ...patch } }));

  const saveGroupRow = async (groupId) => {
    const draft = groupDrafts[groupId];
    await dispatch(
      updateEventGroup({
        id,
        groupId,
        payload: {
          code: draft.code,
          name: draft.name,
          distanceKm: Number(draft.distanceKm),
          price: Number(draft.price),
          quota: Number(draft.quota),
          minAge: Number(draft.minAge),
          maxAge: Number(draft.maxAge),
          requiresMedicalCertificate: Boolean(draft.requiresMedicalCertificate),
          enabled: Boolean(draft.enabled),
          startTime: draft.startTime ? new Date(draft.startTime).toISOString() : undefined,
        },
      }),
    );
  };

  const handleAddGroup = async () => {
    const result = await dispatch(
      addEventGroup({
        id,
        payload: {
          code: newGroup.code.trim().toUpperCase(),
          name: newGroup.name.trim(),
          distanceKm: Number(newGroup.distanceKm),
          price: Number(newGroup.price),
          quota: Number(newGroup.quota),
          minAge: Number(newGroup.minAge),
          maxAge: Number(newGroup.maxAge),
          requiresMedicalCertificate: Boolean(newGroup.requiresMedicalCertificate),
          enabled: true,
        },
      }),
    );
    if (result.meta.requestStatus === 'fulfilled') setNewGroup(emptyGroup());
  };

  const handleRemoveGroup = async (groupId) => {
    if (!window.confirm('确认删除该组别？已产生报名的组别无法删除。')) return;
    await dispatch(removeEventGroup({ id, groupId }));
  };

  if (isEdit && !current && !error) return <Spinner label="正在加载赛事信息…" />;

  return (
    <div className="stack">
      <header className="section-head">
        <h2>{isEdit ? '编辑赛事' : '新建赛事'}</h2>
        <button type="button" className="btn btn--ghost" onClick={() => navigate('/admin/events')}>
          返回列表
        </button>
      </header>

      <Alert tone="danger" onClose={() => dispatch(clearEventFeedback())}>
        {error}
      </Alert>

      <section className="card">
        <h3>赛事基本信息</h3>
        <form className="form" onSubmit={handleSubmit} noValidate>
          <Field label="赛事名称" required error={fieldErrors.title}>
            <TextInput value={form.title} onChange={update('title')} placeholder="如：2026 城市国际马拉松" />
          </Field>

          <div className="form-row">
            <Field label="城市" required error={fieldErrors.city}>
              <TextInput value={form.city} onChange={update('city')} placeholder="如：杭州" />
            </Field>
            <Field label="起点 / 场地" required error={fieldErrors.venue}>
              <TextInput value={form.venue} onChange={update('venue')} placeholder="如：杭州奥体中心" />
            </Field>
          </div>

          <div className="form-row">
            <Field label="赛事开始时间" required error={fieldErrors.startDate}>
              <TextInput type="datetime-local" value={form.startDate} onChange={update('startDate')} />
            </Field>
            <Field label="赛事结束时间" error={fieldErrors.endDate}>
              <TextInput type="datetime-local" value={form.endDate} onChange={update('endDate')} />
            </Field>
          </div>

          <div className="form-row">
            <Field label="报名开始时间" required error={fieldErrors.registrationStart}>
              <TextInput
                type="datetime-local"
                value={form.registrationStart}
                onChange={update('registrationStart')}
              />
            </Field>
            <Field label="报名截止时间" required error={fieldErrors.registrationEnd}>
              <TextInput type="datetime-local" value={form.registrationEnd} onChange={update('registrationEnd')} />
            </Field>
          </div>

          <Field label="封面图片地址" error={fieldErrors.coverImage} hint="选填，填写可公开访问的图片 URL">
            <TextInput value={form.coverImage} onChange={update('coverImage')} placeholder="https://…" />
          </Field>

          <Field label="赛事介绍" error={fieldErrors.description}>
            <TextArea rows={4} value={form.description} onChange={update('description')} />
          </Field>

          <Field label="参赛须知" error={fieldErrors.rules}>
            <TextArea rows={4} value={form.rules} onChange={update('rules')} />
          </Field>

          {!isEdit ? (
            <>
              <h3>赛事组别</h3>
              <p className="muted">至少配置一个组别，每组独立定价与人数上限。</p>
              <div className="stack">
                {groups.map((group, index) => (
                  <div className="group-editor" key={`group-${index}`}>
                    <div className="form-row">
                      <Field label="组别代码" required>
                        <TextInput
                          value={group.code}
                          onChange={(value) =>
                            setGroups((prev) =>
                              prev.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, code: value.toUpperCase() } : item,
                              ),
                            )
                          }
                          placeholder="FULL / HALF"
                        />
                      </Field>
                      <Field label="组别名称" required>
                        <TextInput
                          value={group.name}
                          onChange={(value) =>
                            setGroups((prev) =>
                              prev.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, name: value } : item,
                              ),
                            )
                          }
                          placeholder="全程马拉松"
                        />
                      </Field>
                    </div>
                    <div className="form-row form-row--4">
                      <Field label="距离 (km)" required>
                        <TextInput
                          type="number"
                          step="0.1"
                          value={group.distanceKm}
                          onChange={(value) =>
                            setGroups((prev) =>
                              prev.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, distanceKm: value } : item,
                              ),
                            )
                          }
                        />
                      </Field>
                      <Field label="报名费 (元)" required>
                        <TextInput
                          type="number"
                          value={group.price}
                          onChange={(value) =>
                            setGroups((prev) =>
                              prev.map((item, itemIndex) => (itemIndex === index ? { ...item, price: value } : item)),
                            )
                          }
                        />
                      </Field>
                      <Field label="人数上限" required>
                        <TextInput
                          type="number"
                          value={group.quota}
                          onChange={(value) =>
                            setGroups((prev) =>
                              prev.map((item, itemIndex) => (itemIndex === index ? { ...item, quota: value } : item)),
                            )
                          }
                        />
                      </Field>
                      <Field label="年龄范围">
                        <div className="input-group">
                          <TextInput
                            type="number"
                            value={group.minAge}
                            onChange={(value) =>
                              setGroups((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, minAge: value } : item,
                                ),
                              )
                            }
                          />
                          <TextInput
                            type="number"
                            value={group.maxAge}
                            onChange={(value) =>
                              setGroups((prev) =>
                                prev.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, maxAge: value } : item,
                                ),
                              )
                            }
                          />
                        </div>
                      </Field>
                    </div>
                    <div className="row-actions">
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={group.requiresMedicalCertificate}
                          onChange={(event) =>
                            setGroups((prev) =>
                              prev.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, requiresMedicalCertificate: event.target.checked }
                                  : item,
                              ),
                            )
                          }
                        />
                        需要体检证明
                      </label>
                      {groups.length > 1 ? (
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          onClick={() => setGroups((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                        >
                          删除组别
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn--outline" onClick={() => setGroups((prev) => [...prev, emptyGroup()])}>
                添加组别
              </button>
            </>
          ) : null}

          <div className="row-actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? '保存中…' : isEdit ? '保存赛事信息' : '创建赛事'}
            </button>
          </div>
        </form>
      </section>

      {isEdit && current ? (
        <section className="card">
          <h3>组别管理</h3>
          <p className="muted">名额不能低于已报名人数；已有报名的组别可关闭但不可删除。</p>

          <div className="stack">
            {current.groups.map((group) => {
              const draft = groupDrafts[group._id] || group;
              return (
                <div className="group-editor" key={group._id}>
                  <header className="row-actions">
                    <strong>
                      {group.name} ({group.code})
                    </strong>
                    <span className="muted">已占用 {group.approvedCount} / {group.quota}</span>
                  </header>
                  <div className="form-row form-row--4">
                    <Field label="组别名称">
                      <TextInput value={draft.name} onChange={(value) => updateGroupRow(group._id, { name: value })} />
                    </Field>
                    <Field label="报名费 (元)">
                      <TextInput
                        type="number"
                        value={draft.price}
                        onChange={(value) => updateGroupRow(group._id, { price: value })}
                      />
                    </Field>
                    <Field label="人数上限">
                      <TextInput
                        type="number"
                        value={draft.quota}
                        onChange={(value) => updateGroupRow(group._id, { quota: value })}
                      />
                    </Field>
                    <Field label="组别状态">
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={Boolean(draft.enabled)}
                          onChange={(event) => updateGroupRow(group._id, { enabled: event.target.checked })}
                        />
                        开放报名
                      </label>
                    </Field>
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      disabled={saving}
                      onClick={() => saveGroupRow(group._id)}
                    >
                      保存组别
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      disabled={saving || group.approvedCount > 0}
                      onClick={() => handleRemoveGroup(group._id)}
                    >
                      删除组别
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <h4>新增组别</h4>
          <div className="form-row form-row--4">
            <Field label="组别代码">
              <TextInput
                value={newGroup.code}
                onChange={(value) => setNewGroup((prev) => ({ ...prev, code: value.toUpperCase() }))}
              />
            </Field>
            <Field label="组别名称">
              <TextInput value={newGroup.name} onChange={(value) => setNewGroup((prev) => ({ ...prev, name: value }))} />
            </Field>
            <Field label="距离 (km)">
              <TextInput
                type="number"
                step="0.1"
                value={newGroup.distanceKm}
                onChange={(value) => setNewGroup((prev) => ({ ...prev, distanceKm: value }))}
              />
            </Field>
            <Field label="报名费 (元)">
              <TextInput
                type="number"
                value={newGroup.price}
                onChange={(value) => setNewGroup((prev) => ({ ...prev, price: value }))}
              />
            </Field>
          </div>
          <div className="form-row form-row--4">
            <Field label="人数上限">
              <TextInput
                type="number"
                value={newGroup.quota}
                onChange={(value) => setNewGroup((prev) => ({ ...prev, quota: value }))}
              />
            </Field>
            <Field label="最小年龄">
              <TextInput
                type="number"
                value={newGroup.minAge}
                onChange={(value) => setNewGroup((prev) => ({ ...prev, minAge: value }))}
              />
            </Field>
            <Field label="最大年龄">
              <TextInput
                type="number"
                value={newGroup.maxAge}
                onChange={(value) => setNewGroup((prev) => ({ ...prev, maxAge: value }))}
              />
            </Field>
            <Field label=" " hint=" ">
              <button
                type="button"
                className="btn btn--outline btn--block"
                disabled={saving || !newGroup.code || !newGroup.name}
                onClick={handleAddGroup}
              >
                添加组别
              </button>
            </Field>
          </div>
        </section>
      ) : null}
    </div>
  );
}
