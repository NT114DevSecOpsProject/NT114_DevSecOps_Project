import React from 'react';
import { Box, Stack, Text, Button, Divider, useColorModeValue } from '@chakra-ui/react';
import { Link, useLocation } from '@tanstack/react-router';
import { useAuth } from '../../hooks/useAuth';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  // Theme colors
  const sidebarBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textMuted = useColorModeValue('gray.600', 'gray.400');
  const textPrimary = useColorModeValue('gray.800', 'white');
  const userInfoBg = useColorModeValue('gray.50', 'gray.700');
  const hoverBg = useColorModeValue('gray.100', 'gray.600');

  const mainMenuItems = [
    {
      label: '📊 Dashboard',
      path: '/dashboard',
      isActive: location.pathname === '/dashboard',
    },
    {
      label: '📝 Bài Tập',
      path: '/exercises',
      isActive: location.pathname.startsWith('/exercises'),
    },
    {
      label: '🏆 Điểm Số',
      path: '/dashboard/scores',
      isActive: location.pathname === '/dashboard/scores',
    },
    {
      label: '👤 Hồ Sơ',
      path: '/dashboard/profile',
      isActive: location.pathname === '/dashboard/profile',
    },
  ];

  const adminMenuItems = user?.admin ? [
    {
      label: '👥 Quản lý người dùng',
      path: '/users/management',
      isActive: location.pathname.startsWith('/users/management'),
    },
    {
      label: '⚙️ Quản lý bài tập',
      path: '/exercises/management',
      isActive: location.pathname === '/exercises/management',
    },
  ] : [];

  return (
    <Box
      w="64"
      minH="calc(100vh - 64px)"
      bg={sidebarBg}
      borderRight="1px solid"
      borderColor={borderColor}
      p={4}
    >
      <Stack gap={2}>
        {/* Main Menu */}
        <Text fontSize="sm" color={textMuted} fontWeight="semibold" mb={2}>
          MENU CHÍNH
        </Text>
        {mainMenuItems.map((item) => (
          <Link key={item.path} to={item.path}>
            <Button
              variant="ghost"
              justifyContent="flex-start"
              bg={item.isActive ? 'blue.500' : 'transparent'}
              color={item.isActive ? 'white' : textPrimary}
              _hover={{
                bg: item.isActive ? 'blue.600' : hoverBg,
              }}
              w="full"
            >
              {item.label}
            </Button>
          </Link>
        ))}

        {/* Admin Menu */}
        {adminMenuItems.length > 0 && (
          <>
            <Divider my={4} borderColor={borderColor} />
            <Text fontSize="sm" color={textMuted} fontWeight="semibold" mb={2}>
              QUẢN TRỊ
            </Text>
            {adminMenuItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button
                  variant="ghost"
                  justifyContent="flex-start"
                  bg={item.isActive ? 'purple.500' : 'transparent'}
                  color={item.isActive ? 'white' : textPrimary}
                  _hover={{
                    bg: item.isActive ? 'purple.600' : hoverBg,
                  }}
                  w="full"
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </>
        )}

        {/* User Info */}
        <Divider my={4} borderColor={borderColor} />
        <Box p={3} bg={userInfoBg} borderRadius="md">
          <Text fontSize="sm" fontWeight="semibold" color={textPrimary}>
            {user?.username}
          </Text>
          <Text fontSize="xs" color={textMuted}>
            {user?.admin ? 'Quản trị viên' : 'Người dùng'}
          </Text>
        </Box>
      </Stack>
    </Box>
  );
};

export default Sidebar;