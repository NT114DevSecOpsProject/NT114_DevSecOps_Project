import React from 'react';
import { Box } from '@chakra-ui/react';
import AppHeader from './AppHeader';

interface UserLayoutProps {
  children: React.ReactNode;
}

const UserLayout: React.FC<UserLayoutProps> = ({ children }) => {
  return (
    <Box minH="100vh" bg="bg.canvas">
      <AppHeader />
      <Box as="main" pt={4}>
        {children}
      </Box>
    </Box>
  );
};

export default UserLayout;