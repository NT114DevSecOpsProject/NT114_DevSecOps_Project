// Layout Demo Component
// Component để test và demo các layout components

import React from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  Button,
  useColorModeValue,
} from '@chakra-ui/react';
import MainLayout from './MainLayout';
import SimpleLayout from './SimpleLayout';

interface LayoutDemoProps {
  layoutType?: 'main' | 'simple';
}

const LayoutDemo: React.FC<LayoutDemoProps> = ({ layoutType = 'main' }) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const demoContent = (
    <VStack spacing={6} align="stretch">
      <Box
        p={6}
        bg={cardBg}
        borderRadius="lg"
        border="1px solid"
        borderColor={borderColor}
        shadow="sm"
      >
        <Heading as="h2" size="lg" mb={4} color="blue.600">
          Layout Demo
        </Heading>
        <Text mb={4}>
          Đây là demo cho {layoutType === 'main' ? 'MainLayout' : 'SimpleLayout'} component.
        </Text>
        <Text mb={4}>
          Layout này bao gồm:
        </Text>
        <VStack align="start" spacing={2} pl={4}>
          <Text>• AppHeader với responsive navigation</Text>
          <Text>• ThemeToggle được tích hợp trong header</Text>
          <Text>• User menu với dropdown</Text>
          <Text>• Mobile-friendly navigation</Text>
          {layoutType === 'main' && <Text>• Footer với thông tin ứng dụng</Text>}
          <Text>• Proper spacing và container</Text>
        </VStack>
      </Box>

      <Box
        p={6}
        bg={cardBg}
        borderRadius="lg"
        border="1px solid"
        borderColor={borderColor}
        shadow="sm"
      >
        <Heading as="h3" size="md" mb={4}>
          Tính năng chính
        </Heading>
        <VStack align="start" spacing={2}>
          <Text>✅ Responsive design cho mobile và desktop</Text>
          <Text>✅ Theme toggle với persistence</Text>
          <Text>✅ User authentication state</Text>
          <Text>✅ Navigation menu với proper routing</Text>
          <Text>✅ Proper spacing và layout</Text>
          <Text>✅ Accessibility support</Text>
        </VStack>
      </Box>

      <Box textAlign="center">
        <Button colorScheme="blue" size="lg">
          Test Button
        </Button>
      </Box>
    </VStack>
  );

  if (layoutType === 'simple') {
    return (
      <SimpleLayout>
        {demoContent}
      </SimpleLayout>
    );
  }

  return (
    <MainLayout>
      {demoContent}
    </MainLayout>
  );
};

export default LayoutDemo;