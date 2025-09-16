
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import theme from './theme';
import ColorModeProvider from './components/layout/ColorModeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { queryClient } from './lib/queryClient';
import { router } from './lib/router';
import ErrorBoundary from './components/common/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <ColorModeProvider>
        <ChakraProvider theme={theme}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <RouterProvider router={router} />
              {/* React Query Devtools chỉ hiển thị trong development */}
              {process.env.NODE_ENV === 'development' && (
                <ReactQueryDevtools initialIsOpen={false} />
              )}
            </AuthProvider>
          </QueryClientProvider>
        </ChakraProvider>
      </ColorModeProvider>
    </ErrorBoundary>
  );
}

export default App;
