import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { usersApi } from '../../api/endpoints.js';
import { failed, listOf, paginationOf, started, toRejection } from '../helpers.js';

export const fetchUsers = createAsyncThunk('users/fetchList', async (params = {}, { rejectWithValue }) => {
  try {
    return await usersApi.list(params);
  } catch (error) {
    return rejectWithValue(toRejection(error));
  }
});

export const fetchUserMeta = createAsyncThunk('users/fetchMeta', async (_, { rejectWithValue }) => {
  try {
    return await usersApi.meta();
  } catch (error) {
    return rejectWithValue(toRejection(error));
  }
});

export const assignUserRole = createAsyncThunk(
  'users/assignRole',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await usersApi.assignRole(id, payload);
      return data.user;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const updateUserStatus = createAsyncThunk(
  'users/updateStatus',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const data = await usersApi.updateStatus(id, payload);
      return data.user;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

const initialState = {
  list: [],
  pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
  filters: { keyword: '', role: '', status: '', page: 1, pageSize: 10 },
  roles: [],
  status: 'idle',
  saving: false,
  error: null,
  fieldErrors: {},
  notice: null,
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setUserFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearUserFeedback(state) {
      state.error = null;
      state.notice = null;
      state.fieldErrors = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, started)
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = listOf(action.payload);
        state.pagination = paginationOf(action.payload, state.pagination);
      })
      .addCase(fetchUsers.rejected, failed)
      .addCase(fetchUserMeta.fulfilled, (state, action) => {
        state.roles = Array.isArray(action.payload?.roles) ? action.payload.roles : [];
      });

    [assignUserRole, updateUserStatus].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.saving = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.saving = false;
          state.notice = '已更新';
          state.list = state.list.map((item) =>
            item._id === action.payload._id ? { ...item, ...action.payload } : item,
          );
        })
        .addCase(thunk.rejected, (state, action) => {
          state.saving = false;
          failed(state, action);
        });
    });
  },
});

export const { setUserFilters, clearUserFeedback } = usersSlice.actions;
export default usersSlice.reducer;
