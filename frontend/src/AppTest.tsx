// App Test Component
// Component để test theme system

import { ChakraProvider } from '@chakra-ui/react';
import { Box, VStack, HStack, Text, Button } from '@chakra-ui/react';
import theme from './theme';
import ThemeProvider from './components/layout/ThemeProvider';
import ThemeToggle from './components/layout/ThemeToggle';
import { useThemeContext } from './components/layout/ThemeProvider';
import './test-theme';

function ThemeTestSimple() {
  const { colorMode, setColorMode } = useThemeContext();

  return (
    <Box bg="bg.canvas" minH="100vh" p={8}>
      <VStack gap={6} align="stretch" maxW="600px" mx="auto">
        {/* Header */}
        <Box>
          <Text fontSize="2xl" fontWeight="bold" color="text.primary" mb={2}>
            Theme System Test
          </Text>
          <Text color="text.secondary">
            Test theme switching và persistence functionality
          </Text>
        </Box>

        {/* Theme Controls */}
        <Box bg="bg.surface" p={6} borderRadius="lg" border="1px solid" borderColor="border.default">
          <VStack gap={4} align="stretch">
            <Text fontSize="lg" fontWeight="semibold" color="text.primary">
              Theme Controls
            </Text>
            
            <HStack gap={4} wrap="wrap">
              <ThemeToggle size="sm" variant="outline" showLabel />
              <ThemeToggle size="md" variant="solid" />
              <ThemeToggle size="lg" variant="ghost" />
            </HStack>

            <HStack gap={4}>
              <Button 
                size="sm" 
                onClick={() => setColorMode('light')}
                colorScheme={colorMode === 'light' ? 'blue' : 'gray'}
              >
                Light Mode
              </Button>
              <Button 
                size="sm" 
                onClick={() => setColorMode('dark')}
                colorScheme={colorMode === 'dark' ? 'blue' : 'gray'}
              >
                Dark Mode
              </Button>
            </HStack>

            <Text fontSize="sm" color="text.muted">
              Current Mode: {colorMode}
            </Text>
          </VStack>
        </Box>

        {/* Color Showcase */}
        <Box bg="bg.surface" p={6} borderRadius="lg" border="1px solid" borderColor="border.default">
          <VStack gap={4} align="stretch">
            <Text fontSize="lg" fontWeight="semibold" color="text.primary">
              Color Showcase
            </Text>

            <VStack gap={3} align="start">
              <Text color="text.primary">Primary Text (text.primary)</Text>
              <Text color="text.secondary">Secondary Text (text.secondary)</Text>
              <Text color="text.muted">Muted Text (text.muted)</Text>
            </VStack>

            <HStack gap={2} wrap="wrap">
              <Button bg="interactive.default" color="white" size="sm">
                Default
              </Button>
              <Button bg="interactive.hover" color="white" size="sm">
                Hover
              </Button>
              <Button bg="interactive.active" color="white" size="sm">
                Active
              </Button>
            </HStack>
          </VStack>
        </Box>

        {/* Persistence Test */}
        <Box bg="bg.surface" p={6} borderRadius="lg" border="1px solid" borderColor="border.default">
          <VStack gap={4} align="stretch">
            <Text fontSize="lg" fontWeight="semibold" color="text.primary">
              Persistence Test
            </Text>
            
            <Text fontSize="sm" color="text.secondary">
              Thay đổi theme và refresh trang để kiểm tra persistence.
            </Text>

            <HStack gap={3}>
              <Button 
                onClick={() => window.location.reload()} 
                size="sm" 
                colorScheme="green"
              >
                Refresh Page
              </Button>
              <Button 
                onClick={() => {
                  localStorage.removeItem('codeland_theme_mode');
                  window.location.reload();
                }}
                size="sm" 
                colorScheme="red"
                variant="outline"
              >
                Clear Storage
              </Button>
            </HStack>

            <Text fontSize="xs" color="text.muted">
              LocalStorage: {localStorage.getItem('codeland_theme_mode') || 'null'}
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Box>
  );
}

function AppTest() {
  return (
    <ThemeProvider>
      <ChakraProvider theme={theme}>
        <ThemeTestSimple />
      </ChakraProvider>
    </ThemeProvider>
  );
}

export default AppTest;