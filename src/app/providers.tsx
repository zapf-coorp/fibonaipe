import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/features/theme/ThemeProvider';
import { router } from './router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children?: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children ?? <RouterProvider router={router} />}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
