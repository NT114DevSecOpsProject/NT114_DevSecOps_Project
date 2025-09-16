import { lazyLoad } from '../../utils/lazyLoad';
import { Box, VStack, Text } from '@chakra-ui/react';
import LoadingSpinner from './LoadingSpinner';

// Lazy load Monaco Editor để giảm bundle size
const CodeEditor = lazyLoad(
  () => import('./CodeEditor'),
  {
    fallback: <CodeEditorFallback />,
    displayName: 'LazyCodeEditor'
  }
);

/**
 * Custom fallback cho CodeEditor loading
 */
function CodeEditorFallback() {
  return (
    <Box
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      minHeight="300px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="gray.50"
      _dark={{ bg: 'gray.800' }}
    >
      <VStack spacing={3}>
        <LoadingSpinner />
        <Text fontSize="sm" color="text.muted">
          Đang tải code editor...
        </Text>
        <Text fontSize="xs" color="text.muted" textAlign="center">
          Editor sẽ sẵn sàng trong giây lát
        </Text>
      </VStack>
    </Box>
  );
}

export default CodeEditor;