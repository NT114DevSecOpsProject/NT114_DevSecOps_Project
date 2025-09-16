import React from 'react';
import {
  Box,
  Button,
  Text,
  Stack,
} from '@chakra-ui/react';

interface QueryErrorBoundaryProps {
  error: Error;
  onRetry?: () => void;
  message?: string;
}

const QueryErrorBoundary: React.FC<QueryErrorBoundaryProps> = ({
  error,
  onRetry,
  message,
}) => {
  // Xử lý các loại lỗi khác nhau
  const getErrorMessage = (error: Error) => {
    // Network errors
    if (error.message.includes('Network Error') || error.message.includes('fetch')) {
      return 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet.';
    }

    // API errors
    if ('status' in error) {
      const status = (error as any).status;
      switch (status) {
        case 401:
          return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        case 403:
          return 'Bạn không có quyền truy cập tài nguyên này.';
        case 404:
          return 'Không tìm thấy dữ liệu yêu cầu.';
        case 500:
          return 'Server đang gặp sự cố. Vui lòng thử lại sau.';
        default:
          return `Lỗi server (${status}). Vui lòng thử lại sau.`;
      }
    }

    // Default message
    return message || 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.';
  };

  const getAlertStatus = (error: Error) => {
    if ('status' in error) {
      const status = (error as any).status;
      if (status === 401 || status === 403) {
        return 'warning';
      }
    }
    return 'error';
  };

  return (
    <Box
      minH="200px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={6}
    >
      <Stack gap={4} maxW="md" textAlign="center">
        <Box
          p={4}
          bg={getAlertStatus(error) === 'warning' ? 'orange.50' : 'red.50'}
          borderRadius="md"
          border="1px solid"
          borderColor={getAlertStatus(error) === 'warning' ? 'orange.200' : 'red.200'}
        >
          <Text fontSize="md" fontWeight="bold" color={getAlertStatus(error) === 'warning' ? 'orange.600' : 'red.600'} mb={2}>
            {getAlertStatus(error) === 'warning' ? 'Cần xác thực' : 'Lỗi tải dữ liệu'}
          </Text>
          <Text fontSize="sm" color={getAlertStatus(error) === 'warning' ? 'orange.600' : 'red.600'}>
            {getErrorMessage(error)}
          </Text>
        </Box>

        {onRetry && (
          <Button
            colorScheme="blue"
            size="sm"
            onClick={onRetry}
            color="white"
            bg="blue.500"
            _hover={{
              bg: "blue.600",
            }}
          >
            Thử lại
          </Button>
        )}

        {/* Debug info trong development */}
        {process.env.NODE_ENV === 'development' && (
          <Text fontSize="xs" color="gray.500" fontFamily="mono">
            {error.message}
          </Text>
        )}
      </Stack>
    </Box>
  );
};

export default QueryErrorBoundary;