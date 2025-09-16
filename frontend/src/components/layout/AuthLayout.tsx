import React from 'react';
import { Box, Container, Flex, Heading, Text, Stack, Link } from '@chakra-ui/react';
import { Link as RouterLink } from '@tanstack/react-router';
import ThemeToggle from './ThemeToggle';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <Box minH="100vh" bg="bg.canvas">
      {/* Header */}
      <Box
        as="header"
        w="full"
        h="16"
        bg="bg.surface"
        borderBottom="1px solid"
        borderColor="border.default"
        px={6}
        py={3}
      >
        <Flex justify="space-between" align="center" h="full">
          <Link as={RouterLink} to="/" _hover={{ textDecoration: 'none' }}>
            <Heading as="h1" size="lg" color="interactive.default">
              CodeLand.io
            </Heading>
          </Link>
          <Flex align="center" gap={4}>
            <Link 
              as={RouterLink} 
              to="/exercises" 
              color="text.secondary"
              _hover={{ color: 'interactive.default' }}
              fontSize="sm"
            >
              Xem bài tập
            </Link>
            <ThemeToggle size="sm" variant="ghost" showLabel />
          </Flex>
        </Flex>
      </Box>

      {/* Main Content */}
      <Container maxW="md" py={16}>
        <Stack gap={8} align="stretch">
          <Stack gap={2} textAlign="center">
            <Heading size="xl">Chào mừng đến với CodeLand.io</Heading>
            <Text color="text.secondary">
              Nền tảng học lập trình tương tác
            </Text>
          </Stack>
          
          {children}
        </Stack>
      </Container>
    </Box>
  );
};

export default AuthLayout;