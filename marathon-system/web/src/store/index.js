import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice.js';
import eventsReducer from './slices/eventsSlice.js';
import registrationsReducer from './slices/registrationsSlice.js';
import usersReducer from './slices/usersSlice.js';
import statsReducer from './slices/statsSlice.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    events: eventsReducer,
    registrations: registrationsReducer,
    users: usersReducer,
    stats: statsReducer,
  },
  devTools: import.meta.env.MODE !== 'production',
});

export default store;
