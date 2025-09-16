// Theme Toggle Component
// Component để chuyển đổi giữa light và dark mode
import { Button, useColorMode } from '@chakra-ui/react';

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'ghost';
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  size = 'md', 
  variant = 'ghost',
  showLabel = false
}) => {
  const { colorMode, toggleColorMode } = useColorMode();

  const themeIcon = colorMode === 'light' ? '🌙' : '☀️';
  const themeLabel = colorMode === 'light' ? 'Chế độ tối' : 'Chế độ sáng';
  const ariaLabel = `Chuyển sang ${colorMode === 'light' ? 'chế độ tối' : 'chế độ sáng'}`;

  return (
    <Button
      onClick={toggleColorMode}
      size={size}
      variant={variant}
      aria-label={ariaLabel}
      title={ariaLabel}
      borderRadius="md"
      _hover={{
        transform: 'scale(1.05)',
        transition: 'all 0.2s ease-in-out',
        bg: colorMode === 'light' ? 'gray.100' : 'gray.700',
      }}
      _active={{
        transform: 'scale(0.95)',
        transition: 'all 0.1s ease-in-out',
      }}
      transition="all 0.2s ease-in-out"
      display="flex"
      alignItems="center"
      gap={showLabel ? 2 : 0}
    >
      <span role="img" aria-hidden="true" style={{ fontSize: '1.2em' }}>
        {themeIcon}
      </span>
      {showLabel && (
        <span style={{ fontSize: '0.875rem' }}>
          {themeLabel}
        </span>
      )}
    </Button>
  );
};

export default ThemeToggle;