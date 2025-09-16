// Simple Layout Component
// Layout đơn giản chỉ có header, không có footer

import React from 'react';
import {
  Flex,
  Container,
  useColorModeValue,
} from '@chakra-ui/react';
import type { ReactNode } from 'react';
import AppHeader from './AppHeader';

interface SimpleLayoutProps {
  children: ReactNode;
  maxWidth?: string;
  px?: number | string;
  py?: number | string;
  centerContent?: boolean;
}

/**
 * Simple Layout component chỉ có header, phù hợp cho auth pages
 * @param children - Nội dung chính của trang
 * @param maxWidth - Max width của container (mặc định: "md")
 * @param px - Horizontal padding (mặc định: 4)
 * @param py - Vertical padding (mặc định: 8)
 * @param centerContent - Có center content theo chiều dọc hay không (mặc định: true)
 */
const SimpleLayout: React.FC<SimpleLayoutProps> = ({
  children,
  maxWidth = "md",
  px = 4,
  py = 8,
  centerContent = true,
}) => {
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  return (
    <Flex direction="column" minH="100vh" bg={bgColor}>
      {/* Header */}
      <AppHeader />

      {/* Main Content Area */}
      <Flex
        as="main"
        flex="1"
        align={centerContent ? "center" : "flex-start"}
        justify="center"
        w="full"
        px={px}
        py={py}
      >
        <Container
          maxW={maxWidth}
          w="full"
        >
          {children}
        </Container>
      </Flex>
    </Flex>
  );
};

export default SimpleLayout;