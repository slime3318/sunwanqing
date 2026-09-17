import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { authApi, usersApi } from '../../api/endpoints.js';
import { TOKEN_KEY } from '../../api/client.js';
import { failed, started, toRejection } from '../helpers.js';

export const bootstrapSession = createAsyncThunk('auth/bootstrap', async (_, { rejectWithValue }) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return rejectWithValue({ message: '未登录' });
  try {
    return await authApi.me();
  } catch (error) {
    localStorage.removeItem(TOKEN_KEY);
    return rejectWithValue(toRejection(error));
  }
});

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const data = await authApi.login(payload);
    localStorage.setItem(TOKEN_KEY, data.token);
    return { user: data.user, permissions: data.permissions || [] };
  } catch (error) {
    return rejectWithValue(toRejection(error));
  }
});

export const loginBySms = createAsyncThunk('auth/loginBySms', async (payload, { rejectWithValue }) => {
  try {
    const data = await authApi.loginBySms(payload);
    localStorage.setItem(TOKEN_KEY, data.token);
    return { user: data.user, permissions: data.permissions || [] };
  } catch (error) {
    return rejectWithValue(toRejection(error));
  }
});

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const data = await authApi.register(payload);
    localStorage.setItem(TOKEN_KEY, data.token);
    return { user: data.user, permissions: data.permissions || [] };
  } catch (error) {
    return rejectWithValue(toRejection(error));
  }
});

export const fetchProfile = createAsyncThunk('auth/fetchProfile', async (_, { rejectWithValue }) => {
  try {
    return await authApi.me();
  } catch (error) {
    return rejectWithValue(toRejection(error));
  }
});

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (payload, { rejectWithValue }) => {
    try {
      return await usersApi.updateProfile(payload);
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (payload, { rejectWithValue }) => {
    try {
      await authApi.changePassword(payload);
      return true;
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

const initialState = {
  user: null,
  permissions: [],
  status: 'idle',
  initializing: true,
  error: null,
  fieldErrors: {},
  notice: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      localStorage.removeItem(TOKEN_KEY);
      state.user = null;
      state.permissions = [];
      state.status = 'idle';
      state.error = null;
      state.notice = null;
    },
    clearAuthFeedback(state) {
      state.error = null;
      state.notice = null;
      state.fieldErrors = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapSession.pending, (state) => {
        state.initializing = true;
      })
      .addCase(bootstrapSession.fulfilled, (state, action) => {
        state.initializing = false;
        state.user = action.payload.user;
        state.permissions = action.payload.permissions || [];
        state.status = 'succeeded';
      })
      .addCase(bootstrapSession.rejected, (state) => {
        state.initializing = false;
        state.user = null;
        state.permissions = [];
        state.status = 'idle';
      })
      .addCase(login.pending, started)
      .addCase(login.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.permissions = action.payload.permissions;
        state.error = null;
        state.fieldErrors = {};
        state.notice = '登录成功，欢迎回来';
      })
      .addCase(login.rejected, failed)
      .addCase(loginBySms.pending, started)
      .addCase(loginBySms.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.permissions = action.payload.permissions;
        state.error = null;
        state.fieldErrors = {};
        state.notice = '登录成功，欢迎回来';
      })
      .addCase(loginBySms.rejected, failed)
      .addCase(register.pending, started)
      .addCase(register.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.permissions = action.payload.permissions;
        state.error = null;
        state.fieldErrors = {};
        state.notice = '注册成功，请完善个人资料';
      })
      .addCase(register.rejected, failed)
      .addCase(fetchProfile.fulfilled, (state, action) => {
        if (action.payload?.user) {
          state.user = action.payload.user;
          state.permissions = action.payload.permissions || state.permissions;
        }
      })
      .addCase(updateProfile.pending, started)
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.permissions = action.payload.permissions || state.permissions;
        state.notice = '资料已保存';
        state.fieldErrors = {};
      })
      .addCase(updateProfile.rejected, failed)
      .addCase(changePassword.pending, started)
      .addCase(changePassword.fulfilled, (state) => {
        state.status = 'succeeded';
        state.notice = '密码修改成功，请重新登录';
      })
      .addCase(changePassword.rejected, failed);
  },
});

export const { logout, clearAuthFeedback } = authSlice.actions;
export default authSlice.reducer;
