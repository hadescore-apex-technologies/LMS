import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface User {
  name: any;
  email: string;
  role: 'SUPER_ADMIN' | 'STAFF' | 'STUDENT';
  first_name: string;
  last_name: string;
  categories?: string[];
  category_name?: string | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loginPath: string;
}

const rawStoredUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null;
const formatUserName = (u: any) => {
  if (!u) return null;
  if (u.first_name !== undefined || u.last_name !== undefined) {
    u.name = `${u.first_name || ''} ${u.last_name || ''}`.trim();
  }
  return u;
};
const storedUser = formatUserName(rawStoredUser);
const roleLoginPathMap: Record<string, string> = {
  SUPER_ADMIN: '/admin/login',
  STAFF: '/staff/login',
  STUDENT: '/student/login',
};
const storedLoginPath = localStorage.getItem('loginPath')
  || (storedUser?.role ? roleLoginPathMap[storedUser.role] : '/student/login')
  || '/student/login';

const initialState: AuthState = {
  user: storedUser,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  loginPath: storedLoginPath,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<{ user: User; access: string; refresh: string; loginPath: string }>) {
      const u = formatUserName({ ...action.payload.user });
      state.user = u;
      state.accessToken = action.payload.access;
      state.refreshToken = action.payload.refresh;
      state.isAuthenticated = true;
      state.loginPath = action.payload.loginPath;

      localStorage.setItem('user', JSON.stringify(u));
      localStorage.setItem('accessToken', action.payload.access);
      localStorage.setItem('refreshToken', action.payload.refresh);
      localStorage.setItem('loginPath', action.payload.loginPath);
    },
    updateUser(state, action: PayloadAction<Partial<User>>) {
      if (state.user) {
        const updated = formatUserName({ ...state.user, ...action.payload });
        state.user = updated;
        localStorage.setItem('user', JSON.stringify(updated));
      }
    },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      // keep loginPath so Sidebar can redirect back to it

      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Clear any polling intervals by dispatching a custom event
      window.dispatchEvent(new Event('auth-logout'));
    }
  }
});

export const { loginSuccess, updateUser, logout } = authSlice.actions;
export default authSlice.reducer;
export type { User };
