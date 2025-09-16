import React from 'react';
import {
  Box,
  Flex,
  Heading,
  Button,
  Text,
  Avatar,
  HStack,
  IconButton,
  Collapse,
  VStack,
  useDisclosure,
  useColorModeValue,
  Container,
} from '@chakra-ui/react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import { Link, useNavigate } from '@tanstack/react-router';
import { FiChevronDown, FiMenu, FiX } from 'react-icons/fi';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../../hooks/useAuth';

const AppHeader: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, isLogoutLoading } = useAuth();
  const { isOpen, onToggle } = useDisclosure();
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const brandColor = useColorModeValue('blue.600', 'blue.400');

  const handleLogout = async () => {
    try {
      await logout();
      navigate({ to: '/' });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navigationItems = [
    { label: 'Bài tập', href: '/exercises' },
    { label: 'Bảng xếp hạng', href: '/leaderboard' },
    { label: 'Bảng điều khiển', href: '/dashboard', requireAuth: true },
  ];

  return (
    <Box
      as="header"
      w="full"
      bg={bgColor}
      borderBottom="1px solid"
      borderColor={borderColor}
      position="sticky"
      top={0}
      zIndex={1000}
      shadow="sm"
    >
      <Container maxW="7xl">
        <Flex justify="space-between" align="center" h="16" px={4}>
          {/* Brand Logo */}
          <Link to={isAuthenticated ? "/dashboard" : "/"}>
            <Heading as="h1" size="lg" color={brandColor} cursor="pointer">
              CodeLand.io
            </Heading>
          </Link>

          {/* Desktop Navigation */}
          <HStack spacing={8} display={{ base: 'none', md: 'flex' }}>
            {/* Navigation Links */}
            <HStack spacing={6}>
              {navigationItems.map((item) => {
                if (item.requireAuth && !isAuthenticated) return null;
                return (
                  <Link key={item.href} to={item.href}>
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color={useColorModeValue('gray.600', 'gray.300')}
                      _hover={{
                        color: brandColor,
                        textDecoration: 'none',
                      }}
                      cursor="pointer"
                    >
                      {item.label}
                    </Text>
                  </Link>
                );
              })}
            </HStack>

            {/* Theme Toggle */}
            <ThemeToggle size="sm" variant="ghost" />
            
            {/* User Menu or Auth Buttons */}
            {isAuthenticated && user ? (
              <Menu>
                <MenuButton as={Button} variant="ghost" size="sm" rightIcon={<FiChevronDown />}>
                  <HStack spacing={2}>
                    <Avatar size="xs" name={user.username} />
                    <Text fontSize="sm">{user.username}</Text>
                  </HStack>
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={() => navigate({ to: '/dashboard' })}>
                    Trang chính
                  </MenuItem>
                  <MenuItem onClick={() => navigate({ to: '/dashboard/profile' })}>
                    Hồ sơ cá nhân
                  </MenuItem>
                  <MenuItem onClick={() => navigate({ to: '/dashboard/scores' })}>
                    Lịch sử điểm
                  </MenuItem>
                  {user.admin && (
                    <MenuItem onClick={() => navigate({ to: '/users/management' })}>
                      Quản lý người dùng
                    </MenuItem>
                  )}
                  <MenuItem 
                    onClick={handleLogout}
                    isDisabled={isLogoutLoading}
                    color="red.500"
                  >
                    {isLogoutLoading ? 'Đang đăng xuất...' : 'Đăng xuất'}
                  </MenuItem>
                </MenuList>
              </Menu>
            ) : (
              <HStack spacing={3}>
                <Link to="/auth/login">
                  <Button variant="ghost" size="sm">
                    Đăng nhập
                  </Button>
                </Link>
                <Link to="/auth/register">
                  <Button 
                    colorScheme="blue" 
                    size="sm"
                    color="white"
                    bg="blue.500"
                    _hover={{
                      bg: "blue.600",
                    }}
                  >
                    Đăng ký
                  </Button>
                </Link>
              </HStack>
            )}
          </HStack>

          {/* Mobile Menu Button */}
          <IconButton
            display={{ base: 'flex', md: 'none' }}
            onClick={onToggle}
            icon={isOpen ? <FiX /> : <FiMenu />}
            variant="ghost"
            aria-label="Toggle Navigation"
            size="sm"
          />
        </Flex>

        {/* Mobile Navigation Menu */}
        <Collapse in={isOpen} animateOpacity>
          <Box
            pb={4}
            display={{ md: 'none' }}
            borderTop="1px solid"
            borderColor={borderColor}
            bg={bgColor}
          >
            <VStack spacing={4} align="stretch" px={4} pt={4}>
              {/* Mobile Navigation Links */}
              {navigationItems.map((item) => {
                if (item.requireAuth && !isAuthenticated) return null;
                return (
                  <Link key={item.href} to={item.href}>
                    <Text
                      fontSize="md"
                      fontWeight="medium"
                      color={useColorModeValue('gray.600', 'gray.300')}
                      _hover={{
                        color: brandColor,
                      }}
                      cursor="pointer"
                      py={2}
                    >
                      {item.label}
                    </Text>
                  </Link>
                );
              })}

              {/* Mobile Theme Toggle */}
              <Box py={2}>
                <ThemeToggle size="sm" variant="ghost" showLabel />
              </Box>

              {/* Mobile User Menu or Auth Buttons */}
              {isAuthenticated && user ? (
                <VStack spacing={3} align="stretch" pt={2}>
                  <HStack spacing={3} pb={2}>
                    <Avatar size="sm" name={user.username} />
                    <Text fontSize="md" fontWeight="medium">
                      {user.username}
                    </Text>
                  </HStack>
                  
                  <Button
                    variant="ghost"
                    justifyContent="flex-start"
                    onClick={() => {
                      navigate({ to: '/dashboard' });
                      onToggle();
                    }}
                  >
                    Trang chính
                  </Button>
                  
                  <Button
                    variant="ghost"
                    justifyContent="flex-start"
                    onClick={() => {
                      navigate({ to: '/dashboard/profile' });
                      onToggle();
                    }}
                  >
                    Hồ sơ cá nhân
                  </Button>
                  
                  <Button
                    variant="ghost"
                    justifyContent="flex-start"
                    onClick={() => {
                      navigate({ to: '/dashboard/scores' });
                      onToggle();
                    }}
                  >
                    Lịch sử điểm
                  </Button>
                  
                  {user.admin && (
                    <Button
                      variant="ghost"
                      justifyContent="flex-start"
                      onClick={() => {
                        navigate({ to: '/users/management' });
                        onToggle();
                      }}
                    >
                      Quản lý người dùng
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    justifyContent="flex-start"
                    onClick={() => {
                      handleLogout();
                      onToggle();
                    }}
                    isDisabled={isLogoutLoading}
                    color="red.500"
                  >
                    {isLogoutLoading ? 'Đang đăng xuất...' : 'Đăng xuất'}
                  </Button>
                </VStack>
              ) : (
                <VStack spacing={3} align="stretch" pt={2}>
                  <Link to="/auth/login">
                    <Button
                      variant="ghost"
                      w="full"
                      justifyContent="flex-start"
                      onClick={onToggle}
                    >
                      Đăng nhập
                    </Button>
                  </Link>
                  <Link to="/auth/register">
                    <Button
                      colorScheme="blue"
                      w="full"
                      onClick={onToggle}
                    >
                      Đăng ký
                    </Button>
                  </Link>
                </VStack>
              )}
            </VStack>
          </Box>
        </Collapse>
      </Container>
    </Box>
  );
};

export default AppHeader;