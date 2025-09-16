import React from 'react';
import { ColorModeScript } from '@chakra-ui/react';
import theme from '../../theme';

interface ColorModeProviderProps {
  children: React.ReactNode;
}

export const ColorModeProvider: React.FC<ColorModeProviderProps> = ({ children }) => {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      {children}
    </>
  );
};

export default ColorModeProvider;