import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { registrationsApi } from '../../api/endpoints.js';
import { failed, listOf, paginationOf, started, toRejection } from '../helpers.js';

export const createRegistration = createAsyncThunk(
  'registrations/create',
  async (payload, { rejectWithValue }) => {
    try {
      const data = await registrationsApi.create(payload);
      return data.registration;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const fetchMyRegistrations = createAsyncThunk(
  'registrations/fetchMine',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await registrationsApi.mine(params);
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const fetchRegistrations = createAsyncThunk(
  'registrations/fetchList',
  async (params = {}, { rejectWithValue }) => {
    try {
      return await registrationsApi.list(params);
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const payRegistration = createAsyncThunk(
  'registrations/pay',
  async ({ id, method }, { rejectWithValue }) => {
    try {
      const data = await registrationsApi.pay(id, { method });
      return data.registration;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const cancelRegistration = createAsyncThunk(
  'registrations/cancel',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const data = await registrationsApi.cancel(id, { reason });
      return data.registration;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const reviewRegistration = createAsyncThunk(
  'registrations/review',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await registrationsApi.review(id, payload);
      return data.registration;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const batchReviewRegistrations = createAsyncThunk(
  'registrations/batchReview',
  async (payload, { rejectWithValue }) => {
    try {
      return await registrationsApi.batchReview(payload);
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const fetchStatusMeta = createAsyncThunk(
  'registrations/fetchStatusMeta',
  async (_, { rejectWithValue }) => {
    try {
      return await registrationsApi.statuses();
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

const initialState = {
  mine: [],
  minePagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
  list: [],
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  filters: { status: '', eventId: '', groupId: '', keyword: '', page: 1, pageSize: 20 },
  statuses: {},
  paymentStatuses: {},
  status: 'idle',
  submitting: false,
  error: null,
  fieldErrors: {},
  notice: null,
  lastSummary: null,
};

function syncItem(state, registration) {
  state.mine = state.mine.map((item) => (item._id === registration._id ? { ...item, ...registration } : item));
  state.list = state.list.map((item) => (item._id === registration._id ? { ...item, ...registration } : item));
}

const registrationsSlice = createSlice({
  name: 'registrations',
  initialState,
  reducers: {
    setRegistrationFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearRegistrationFeedback(state) {
      state.error = null;
      state.notice = null;
      state.fieldErrors = {};
      state.lastSummary = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(createRegistration.pending, (state) => {
        state.submitting = true;
        state.error = null;
        state.fieldErrors = {};
        state.notice = null;
      })
      .addCase(createRegistration.fulfilled, (state, action) => {
        state.submitting = false;
        state.notice = `报名提交成功，报名单号 ${action.payload.orderNo}`;
        state.mine = [action.payload, ...state.mine];
      })
      .addCase(createRegistration.rejected, (state, action) => {
        state.submitting = false;
        failed(state, action);
      })
      .addCase(fetchMyRegistrations.pending, started)
      .addCase(fetchMyRegistrations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.mine = listOf(action.payload);
        state.minePagination = paginationOf(action.payload, state.minePagination);
      })
      .addCase(fetchMyRegistrations.rejected, failed)
      .addCase(fetchRegistrations.pending, started)
      .addCase(fetchRegistrations.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = listOf(action.payload);
        state.pagination = paginationOf(action.payload, state.pagination);
      })
      .addCase(fetchRegistrations.rejected, failed)
      .addCase(fetchStatusMeta.fulfilled, (state, action) => {
        state.statuses = action.payload.statuses || {};
        state.paymentStatuses = action.payload.paymentStatuses || {};
      })
      .addCase(batchReviewRegistrations.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(batchReviewRegistrations.fulfilled, (state, action) => {
        state.submitting = false;
        state.lastSummary = action.payload;
        state.notice = `批量处理完成：成功 ${action.payload.succeeded.length} 条，失败 ${action.payload.failed.length} 条`;
      })
      .addCase(batchReviewRegistrations.rejected, (state, action) => {
        state.submitting = false;
        failed(state, action);
      });

    [payRegistration, cancelRegistration, reviewRegistration].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.submitting = true;
          state.error = null;
          state.notice = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.submitting = false;
          syncItem(state, action.payload);
          state.notice = '操作成功';
        })
        .addCase(thunk.rejected, (state, action) => {
          state.submitting = false;
          failed(state, action);
        });
    });
  },
});

export const { setRegistrationFilters, clearRegistrationFeedback } = registrationsSlice.actions;
export default registrationsSlice.reducer;
