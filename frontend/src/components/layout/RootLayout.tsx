import React from 'react';
import { Box } from '@chakra-ui/react';
import ErrorBoundary from '../common/ErrorBoundary';

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  return (
    <ErrorBoundary>
      <Box minH="100vh" bg="bg.canvas">
        {children}
      </Box>
    </ErrorBoundary>
  );
};

export default RootLayout;