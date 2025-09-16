import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  Text,
} from '@chakra-ui/react';
import LoadingSpinner from './LoadingSpinner';

interface LazyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
}

/**
 * Wrapper component cho lazy-loaded modals
 * Hiển thị loading state khi modal đang được load
 */
export const LazyModalWrapper: React.FC<LazyModalProps> = ({
  isOpen,
  onClose,
  title = 'Đang tải...',
  children
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {children || <LazyModalFallback />}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

/**
 * Fallback component cho modals đang loading
 */
export const LazyModalFallback: React.FC = () => (
  <VStack spacing={4} py={8}>
    <LoadingSpinner />
    <Text fontSize="sm" color="text.muted">
      Đang tải nội dung...
    </Text>
  </VStack>
);

/**
 * Higher-order component để wrap modal components với lazy loading
 */
export const withLazyModal = <P extends { isOpen: boolean; onClose: () => void }>(
  ModalComponent: React.ComponentType<P>,
  fallbackTitle?: string
) => {
  return (props: P) => {
    // Chỉ render modal component khi modal được mở
    if (!props.isOpen) {
      return null;
    }

    // Hiển thị fallback trong khi component đang load
    return (
      <React.Suspense 
        fallback={
          <LazyModalWrapper 
            isOpen={props.isOpen} 
            onClose={props.onClose}
            title={fallbackTitle}
          />
        }
      >
        <ModalComponent {...props} />
      </React.Suspense>
    );
  };
};