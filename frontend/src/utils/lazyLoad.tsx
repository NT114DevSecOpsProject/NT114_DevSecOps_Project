import React, { Suspense } from 'react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { Box, Text, VStack } from '@chakra-ui/react';

interface LazyLoadOptions {
  fallback?: React.ReactNode;
  errorBoundary?: boolean;
  displayName?: string;
}

/**
 * Utility function để tạo lazy-loaded components với Suspense wrapper
 */
export const lazyLoad = <T extends React.ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
) => {
  const {
    fallback = <LazyLoadFallback />,
    errorBoundary = true,
    displayName
  } = options;

  const LazyComponent = React.lazy(componentImport);

  const WrappedComponent = (props: React.ComponentProps<T>) => {
    const componentContent = (
      <Suspense fallback={fallback}>
        <LazyComponent {...props} />
      </Suspense>
    );

    if (errorBoundary) {
      return (
        <LazyErrorBoundary>
          {componentContent}
        </LazyErrorBoundary>
      );
    }

    return componentContent;
  };

  if (displayName) {
    WrappedComponent.displayName = displayName;
  }

  return WrappedComponent;
};

/**
 * Default fallback component cho lazy loading
 */
const LazyLoadFallback: React.FC = () => (
  <Box 
    display="flex" 
    alignItems="center" 
    justifyContent="center" 
    minHeight="200px"
    width="100%"
  >
    <VStack spacing={3}>
      <LoadingSpinner />
      <Text fontSize="sm" color="text.muted">
        Đang tải component...
      </Text>
    </VStack>
  </Box>
);

/**
 * Error boundary cho lazy-loaded components
 */
class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy load error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box 
          p={4} 
          border="1px" 
          borderColor="red.200" 
          borderRadius="md"
          bg="red.50"
          _dark={{ bg: 'red.900', borderColor: 'red.700' }}
        >
          <VStack spacing={2}>
            <Text fontWeight="bold" color="red.600" _dark={{ color: 'red.300' }}>
              Lỗi tải component
            </Text>
            <Text fontSize="sm" color="red.500" _dark={{ color: 'red.400' }}>
              {this.state.error?.message || 'Component không thể được tải'}
            </Text>
            <button
              onClick={() => this.setState({ hasError: false })}
              style={{
                padding: '8px 16px',
                backgroundColor: '#E53E3E',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Thử lại
            </button>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

/**
 * Preload utility để prefetch lazy components
 */
export const preloadComponent = (componentImport: () => Promise<any>) => {
  const componentImportPromise = componentImport();
  return componentImportPromise;
};

/**
 * Hook để preload components on hover/focus
 */
export const usePreloadComponent = (componentImport: () => Promise<any>) => {
  const preload = React.useCallback(() => {
    preloadComponent(componentImport);
  }, [componentImport]);

  return preload;
};