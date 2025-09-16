import React from 'react';
import { Box, Flex, useBreakpointValue } from '@chakra-ui/react';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';
import { ProtectedRoute } from '../auth/ProtectedRoute';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const contentPadding = useBreakpointValue({ base: 4, md: 6, lg: 8 });

  return (
    <ProtectedRoute>
      <Box minH="100vh" bg="gray.50" _dark={{ bg: 'gray.900' }}>
        {/* Header */}
        <AppHeader />

        {/* Main Layout */}
        <Flex direction={{ base: 'column', md: 'row' }}>
          {/* Sidebar - Hidden on mobile, shown on desktop */}
          {!isMobile && <Sidebar />}

          {/* Main Content */}
          <Box 
            flex="1" 
            p={contentPadding}
            maxW="100%"
            overflow="hidden"
          >
            <Box maxW="1200px" mx="auto">
              {children}
            </Box>
          </Box>
        </Flex>
      </Box>
    </ProtectedRoute>
  );
};

export default DashboardLayout;