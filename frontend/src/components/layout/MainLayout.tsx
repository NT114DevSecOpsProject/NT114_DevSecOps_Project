// Main Layout Component
// Layout wrapper chính cho toàn bộ ứng dụng với proper spacing

import React from 'react';
import {
  Box,
  Flex,
  useColorModeValue,
} from '@chakra-ui/react';
import type { ReactNode } from 'react';
import AppHeader from './AppHeader';
import Footer from './Footer';

interface MainLayoutProps {
  children: ReactNode;
  showFooter?: boolean;
  maxWidth?: string;
  px?: number | string;
  py?: number | string;
}

/**
 * Main Layout component với header, footer và proper spacing
 * @param children - Nội dung chính của trang
 * @param showFooter - Có hiển thị footer hay không (mặc định: true)
 * @param maxWidth - Max width của container (mặc định: "7xl")
 * @param px - Horizontal padding (mặc định: 4)
 * @param py - Vertical padding (mặc định: 6)
 */
const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  showFooter = true,
  maxWidth = "7xl",
  px = 4,
  py = 6,
}) => {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const contentBgColor = useColorModeValue('white', 'gray.800');

  return (
    <Flex direction="column" minH="100vh" bg={bgColor}>
      {/* Header */}
      <AppHeader />

      {/* Main Content Area */}
      <Box
        as="main"
        flex="1"
        w="full"
        maxW={maxWidth}
        mx="auto"
        px={px}
        py={py}
        bg={contentBgColor}
        borderRadius={{ base: 0, md: "lg" }}
        shadow={{ base: "none", md: "sm" }}
        mt={{ base: 0, md: 4 }}
        mb={{ base: 0, md: 4 }}
      >
        {children}
      </Box>

      {/* Footer */}
      {showFooter && <Footer />}
    </Flex>
  );
};

export default MainLayout;