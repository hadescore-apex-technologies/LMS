import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface ThemeState {
  mode: 'light';
}

if (typeof document !== 'undefined') {
  document.documentElement.classList.remove('dark');
}

const initialState: ThemeState = {
  mode: 'light',
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme(state, _action: PayloadAction<'light' | 'dark'>) {
      state.mode = 'light';
      document.documentElement.classList.remove('dark');
    },
    toggleTheme(state) {
      state.mode = 'light';
      document.documentElement.classList.remove('dark');
    }
  }
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
