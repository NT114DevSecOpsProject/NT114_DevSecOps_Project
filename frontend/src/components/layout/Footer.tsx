// Footer Component
// Component footer với thông tin ứng dụng và links

import React from 'react';
import {
  Box,
  Container,
  Flex,
  Text,
  Link,
  Stack,
  Divider,
  HStack,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { Link as RouterLink } from '@tanstack/react-router';

const Footer: React.FC = () => {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const linkColor = useColorModeValue('blue.600', 'blue.400');

  const currentYear = new Date().getFullYear();

  return (
    <Box
      as="footer"
      bg={bgColor}
      borderTop="1px solid"
      borderColor={borderColor}
      mt="auto"
      py={8}
    >
      <Container maxW="7xl">
        <VStack spacing={6}>
          {/* Main Footer Content */}
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align={{ base: 'center', md: 'flex-start' }}
            w="full"
            gap={8}
          >
            {/* Brand Section */}
            <VStack align={{ base: 'center', md: 'flex-start' }} spacing={3}>
              <Text fontSize="xl" fontWeight="bold" color={linkColor}>
                CodeLand.io
              </Text>
              <Text fontSize="sm" color={textColor} textAlign={{ base: 'center', md: 'left' }}>
                Nền tảng học lập trình tương tác
              </Text>
              <Text fontSize="sm" color={textColor} textAlign={{ base: 'center', md: 'left' }}>
                Phát triển kỹ năng coding với các bài tập thực hành
              </Text>
            </VStack>

            {/* Navigation Links */}
            <Stack
              direction={{ base: 'column', sm: 'row' }}
              spacing={{ base: 4, sm: 8 }}
              align="center"
            >
              <VStack align={{ base: 'center', md: 'flex-start' }} spacing={2}>
                <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                  Tính năng
                </Text>
                <Link
                  as={RouterLink}
                  to="/exercises"
                  fontSize="sm"
                  color={linkColor}
                  _hover={{ textDecoration: 'underline' }}
                >
                  Bài tập
                </Link>
                <Link
                  as={RouterLink}
                  to="/dashboard"
                  fontSize="sm"
                  color={linkColor}
                  _hover={{ textDecoration: 'underline' }}
                >
                  Bảng điều khiển
                </Link>
              </VStack>

              <VStack align={{ base: 'center', md: 'flex-start' }} spacing={2}>
                <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                  Tài khoản
                </Text>
                <Link
                  as={RouterLink}
                  to="/auth/login"
                  fontSize="sm"
                  color={linkColor}
                  _hover={{ textDecoration: 'underline' }}
                >
                  Đăng nhập
                </Link>
                <Link
                  as={RouterLink}
                  to="/auth/register"
                  fontSize="sm"
                  color={linkColor}
                  _hover={{ textDecoration: 'underline' }}
                >
                  Đăng ký
                </Link>
              </VStack>

              <VStack align={{ base: 'center', md: 'flex-start' }} spacing={2}>
                <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                  Hỗ trợ
                </Text>
                <Link
                  href="mailto:support@codeland.io"
                  fontSize="sm"
                  color={linkColor}
                  _hover={{ textDecoration: 'underline' }}
                >
                  Liên hệ
                </Link>
                <Link
                  href="#"
                  fontSize="sm"
                  color={linkColor}
                  _hover={{ textDecoration: 'underline' }}
                >
                  Trợ giúp
                </Link>
              </VStack>
            </Stack>
          </Flex>

          <Divider />

          {/* Bottom Section */}
          <Flex
            direction={{ base: 'column', sm: 'row' }}
            justify="space-between"
            align="center"
            w="full"
            gap={4}
          >
            <Text fontSize="sm" color={textColor}>
              © {currentYear} CodeLand.io. Tất cả quyền được bảo lưu.
            </Text>
            
            <HStack spacing={4}>
              <Link
                href="#"
                fontSize="sm"
                color={linkColor}
                _hover={{ textDecoration: 'underline' }}
              >
                Điều khoản sử dụng
              </Link>
              <Link
                href="#"
                fontSize="sm"
                color={linkColor}
                _hover={{ textDecoration: 'underline' }}
              >
                Chính sách bảo mật
              </Link>
            </HStack>
          </Flex>
        </VStack>
      </Container>
    </Box>
  );
};

export default Footer;