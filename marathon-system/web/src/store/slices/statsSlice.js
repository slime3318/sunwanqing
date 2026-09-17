import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { statsApi } from '../../api/endpoints.js';
import { failed, started, toRejection } from '../helpers.js';

export const fetchOverview = createAsyncThunk('stats/overview', async (params = {}, { rejectWithValue }) => {
  try {
    return await statsApi.overview(params);
  } catch (error) {
    return rejectWithValue(toRejection(error));
  }
});

export const fetchEventBreakdown = createAsyncThunk(
  'stats/eventBreakdown',
  async (eventId, { rejectWithValue }) => {
    try {
      return await statsApi.eventBreakdown(eventId);
    } catch (error) {
      return rejectWithValue(toRejection(error));
    }
  },
);

const initialState = {
  overview: null,
  breakdown: null,
  status: 'idle',
  error: null,
};

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOverview.pending, started)
      .addCase(fetchOverview.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.overview = action.payload;
      })
      .addCase(fetchOverview.rejected, failed)
      .addCase(fetchEventBreakdown.fulfilled, (state, action) => {
        state.breakdown = action.payload;
      });
  },
});

export default statsSlice.reducer;
