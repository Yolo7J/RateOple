import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';
import { AuthProvider } from '../context/AuthContext';
import { MediaCartProvider } from '../context/MediaCartContext';
import { queryClient } from '../shared/api/queryClient';

function AppProviders({ children }) {
  const showQueryDevtools = import.meta.env.DEV && import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS !== 'false';

  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <MediaCartProvider>{children}</MediaCartProvider>
            </AuthProvider>
          </BrowserRouter>
          {showQueryDevtools ? <ReactQueryDevtools initialIsOpen={false} /> : null}
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default AppProviders;
