import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import AppRoutes from './routes/AppRoutes';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401 || error?.response?.status === 403) return false;
        return failureCount < 1;
      },
      staleTime: 4000, // 4 Seconds - Instant UI cache delivery with immediate background sync
      gcTime: 1000 * 60 * 60, // 1 Hour cache retention
      placeholderData: (previousData: any) => previousData, // Eliminates full page reloads and UI flicker
    },
  },
});

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRoutes />
          <Toaster 
            position="top-right" 
            toastOptions={{
              duration: 4000,
              style: {
                background: '#0c1520',
                color: '#e2e8f0',
                border: '1px solid rgba(52, 211, 153, 0.2)',
                borderRadius: '0.75rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 0 12px rgba(16,185,129,0.08)',
              }
            }}
          />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
