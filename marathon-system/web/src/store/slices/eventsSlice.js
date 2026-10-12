import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { eventsApi } from '../../api/endpoints.js';
import { failed, listOf, paginationOf, started, toRejection } from '../helpers.js';

export const fetchEvents = createAsyncThunk('events/fetchList', async (params = {}, { rejectWithValue }) => {
  try {
    return await eventsApi.list({ scope: 'public', ...params });
  } catch (error) {
    return rejectWithValue(toRejection(error));
  }
});

export const fetchAdminEvents = createAsyncThunk(
  'events/fetchAdminList',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await eventsApi.list({ scope: 'admin', ...params });
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const fetchEventDetail = createAsyncThunk('events/fetchDetail', async (id, { rejectWithValue }) => {
  try {
    const data = await eventsApi.detail(id);
    return data.event;
  } catch (error) {
    return rejectWithValue(toRejection(error));
  }
});

export const createEvent = createAsyncThunk('events/create', async (payload, { rejectWithValue }) => {
  try {
    const data = await eventsApi.create(payload);
    return data.event;
  } catch (error) {
    return rejectWithValue(toRejection(error));
  }
});

export const updateEvent = createAsyncThunk(
  'events/update',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await eventsApi.update(id, payload);
      return data.event;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const updateEventStatus = createAsyncThunk(
  'events/updateStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const data = await eventsApi.updateStatus(id, status);
      return data.event;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const deleteEvent = createAsyncThunk('events/remove', async (id, { rejectWithValue }) => {
  try {
    await eventsApi.remove(id);
    return id;
  } catch (error) {
    return rejectWithValue(toRejection(error));
  }
});

export const addEventGroup = createAsyncThunk(
  'events/addGroup',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await eventsApi.addGroup(id, payload);
      return data.event;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const updateEventGroup = createAsyncThunk(
  'events/updateGroup',
  async ({ id, groupId, payload }, { rejectWithValue }) => {
    try {
      const data = await eventsApi.updateGroup(id, groupId, payload);
      return data.event;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const removeEventGroup = createAsyncThunk(
  'events/removeGroup',
  async ({ id, groupId }, { rejectWithValue }) => {
    try {
      const data = await eventsApi.removeGroup(id, groupId);
      return data.event;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

const initialState = {
  list: [],
  pagination: { page: 1, pageSize: 12, total: 0, totalPages: 1 },
  filters: { keyword: '', city: '', status: '', page: 1, pageSize: 12 },
  adminList: [],
  adminPagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
  adminFilters: { keyword: '', status: '', page: 1, pageSize: 10 },
  current: null,
  status: 'idle',
  saving: false,
  error: null,
  fieldErrors: {},
  notice: null,
};

function applyEvent(state, event) {
  state.saving = false;
  if (!event || !event._id) return;

  state.current = event;
  state.adminList = state.adminList.map((item) => (item._id === event._id ? event : item));
  state.list = state.list.map((item) => (item._id === event._id ? event : item));
}

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setEventFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    setAdminEventFilters(state, action) {
      state.adminFilters = { ...state.adminFilters, ...action.payload };
    },
    clearEventFeedback(state) {
      state.error = null;
      state.notice = null;
      state.fieldErrors = {};
    },
    clearCurrentEvent(state) {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, started)
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = listOf(action.payload);
        state.pagination = paginationOf(action.payload, state.pagination);
      })
      .addCase(fetchEvents.rejected, failed)
      .addCase(fetchAdminEvents.pending, started)
      .addCase(fetchAdminEvents.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.adminList = listOf(action.payload);
        state.adminPagination = paginationOf(action.payload, state.adminPagination);
      })
      .addCase(fetchAdminEvents.rejected, failed)
      .addCase(fetchEventDetail.pending, started)
      .addCase(fetchEventDetail.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.current = action.payload ?? null;
      })
      .addCase(fetchEventDetail.rejected, failed);

    [createEvent, updateEvent, updateEventStatus, addEventGroup, updateEventGroup, removeEventGroup]
      .forEach((thunk) => {
        builder
          .addCase(thunk.pending, (state) => {
            state.saving = true;
            state.error = null;
            state.fieldErrors = {};
          })
          .addCase(thunk.fulfilled, (state, action) => {
            state.notice = '保存成功';
            applyEvent(state, action.payload);
          })
          .addCase(thunk.rejected, (state, action) => {
            state.saving = false;
            failed(state, action);
          });
      });

    builder
      .addCase(deleteEvent.pending, (state) => {
        state.saving = true;
      })
      .addCase(deleteEvent.fulfilled, (state, action) => {
        state.saving = false;
        state.notice = '赛事已删除';
        state.adminList = state.adminList.filter((item) => item._id !== action.payload);
        state.list = state.list.filter((item) => item._id !== action.payload);
      })
      .addCase(deleteEvent.rejected, (state, action) => {
        state.saving = false;
        failed(state, action);
      });
  },
});

export const { setEventFilters, setAdminEventFilters, clearEventFeedback, clearCurrentEvent } =
  eventsSlice.actions;
export default eventsSlice.reducer;
