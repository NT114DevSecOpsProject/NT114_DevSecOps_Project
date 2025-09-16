/**
 * Optimized Chakra UI imports cho tree-shaking
 * 
 * Thay vì import toàn bộ từ '@chakra-ui/react', 
 * ta import trực tiếp từ các subpackages để giảm bundle size
 */

// Core theme và provider exports
export {
  ChakraProvider,
  ColorModeScript,
  useColorMode,
  useColorModeValue,
  useTheme,
  extendTheme,
  withDefaultColorScheme,
  withDefaultSize,
  withDefaultVariant,
  withDefaultProps
} from '@chakra-ui/react';

// Layout components - thường xuyên sử dụng
export {
  Box,
  Container,
  Flex,
  Grid,
  GridItem,
  HStack,
  VStack,
  Stack,
  Spacer,
  Center,
  Square,
  Circle,
  Wrap,
  WrapItem,
  AspectRatio,
  Divider
} from '@chakra-ui/react';

// Typography components
export {
  Text,
  Heading,
  Link,
  Mark,
  Highlight,
  Kbd
} from '@chakra-ui/react';

// Form components - export riêng để có thể lazy load
export const FormComponents = {
  Button: () => import('@chakra-ui/react').then(m => m.Button),
  IconButton: () => import('@chakra-ui/react').then(m => m.IconButton),
  ButtonGroup: () => import('@chakra-ui/react').then(m => m.ButtonGroup),
  Input: () => import('@chakra-ui/react').then(m => m.Input),
  InputGroup: () => import('@chakra-ui/react').then(m => m.InputGroup),
  InputLeftElement: () => import('@chakra-ui/react').then(m => m.InputLeftElement),
  InputRightElement: () => import('@chakra-ui/react').then(m => m.InputRightElement),
  InputLeftAddon: () => import('@chakra-ui/react').then(m => m.InputLeftAddon),
  InputRightAddon: () => import('@chakra-ui/react').then(m => m.InputRightAddon),
  Textarea: () => import('@chakra-ui/react').then(m => m.Textarea),
  Select: () => import('@chakra-ui/react').then(m => m.Select),
  Checkbox: () => import('@chakra-ui/react').then(m => m.Checkbox),
  CheckboxGroup: () => import('@chakra-ui/react').then(m => m.CheckboxGroup),
  Radio: () => import('@chakra-ui/react').then(m => m.Radio),
  RadioGroup: () => import('@chakra-ui/react').then(m => m.RadioGroup),
  Switch: () => import('@chakra-ui/react').then(m => m.Switch),
  FormControl: () => import('@chakra-ui/react').then(m => m.FormControl),
  FormLabel: () => import('@chakra-ui/react').then(m => m.FormLabel),
  FormErrorMessage: () => import('@chakra-ui/react').then(m => m.FormErrorMessage),
  FormHelperText: () => import('@chakra-ui/react').then(m => m.FormHelperText),
};

// Feedback components - export riêng để lazy load
export const FeedbackComponents = {
  Alert: () => import('@chakra-ui/react').then(m => m.Alert),
  AlertIcon: () => import('@chakra-ui/react').then(m => m.AlertIcon),
  AlertTitle: () => import('@chakra-ui/react').then(m => m.AlertTitle),
  AlertDescription: () => import('@chakra-ui/react').then(m => m.AlertDescription),
  Toast: () => import('@chakra-ui/react').then(m => m.useToast),
  Spinner: () => import('@chakra-ui/react').then(m => m.Spinner),
  CircularProgress: () => import('@chakra-ui/react').then(m => m.CircularProgress),
  Progress: () => import('@chakra-ui/react').then(m => m.Progress),
  Skeleton: () => import('@chakra-ui/react').then(m => m.Skeleton),
  SkeletonText: () => import('@chakra-ui/react').then(m => m.SkeletonText),
  SkeletonCircle: () => import('@chakra-ui/react').then(m => m.SkeletonCircle),
};

// Overlay components - thường ít sử dụng, nên lazy load
export const OverlayComponents = {
  Modal: () => import('@chakra-ui/react').then(m => m.Modal),
  ModalOverlay: () => import('@chakra-ui/react').then(m => m.ModalOverlay),
  ModalContent: () => import('@chakra-ui/react').then(m => m.ModalContent),
  ModalHeader: () => import('@chakra-ui/react').then(m => m.ModalHeader),
  ModalFooter: () => import('@chakra-ui/react').then(m => m.ModalFooter),
  ModalBody: () => import('@chakra-ui/react').then(m => m.ModalBody),
  ModalCloseButton: () => import('@chakra-ui/react').then(m => m.ModalCloseButton),
  Drawer: () => import('@chakra-ui/react').then(m => m.Drawer),
  DrawerOverlay: () => import('@chakra-ui/react').then(m => m.DrawerOverlay),
  DrawerContent: () => import('@chakra-ui/react').then(m => m.DrawerContent),
  DrawerHeader: () => import('@chakra-ui/react').then(m => m.DrawerHeader),
  DrawerFooter: () => import('@chakra-ui/react').then(m => m.DrawerFooter),
  DrawerBody: () => import('@chakra-ui/react').then(m => m.DrawerBody),
  DrawerCloseButton: () => import('@chakra-ui/react').then(m => m.DrawerCloseButton),
  Popover: () => import('@chakra-ui/react').then(m => m.Popover),
  PopoverTrigger: () => import('@chakra-ui/react').then(m => m.PopoverTrigger),
  PopoverContent: () => import('@chakra-ui/react').then(m => m.PopoverContent),
  PopoverHeader: () => import('@chakra-ui/react').then(m => m.PopoverHeader),
  PopoverBody: () => import('@chakra-ui/react').then(m => m.PopoverBody),
  PopoverFooter: () => import('@chakra-ui/react').then(m => m.PopoverFooter),
  PopoverArrow: () => import('@chakra-ui/react').then(m => m.PopoverArrow),
  PopoverCloseButton: () => import('@chakra-ui/react').then(m => m.PopoverCloseButton),
  Tooltip: () => import('@chakra-ui/react').then(m => m.Tooltip),
};

// Data Display components
export const DataDisplayComponents = {
  Table: () => import('@chakra-ui/react').then(m => m.Table),
  Thead: () => import('@chakra-ui/react').then(m => m.Thead),
  Tbody: () => import('@chakra-ui/react').then(m => m.Tbody),
  Tfoot: () => import('@chakra-ui/react').then(m => m.Tfoot),
  Tr: () => import('@chakra-ui/react').then(m => m.Tr),
  Th: () => import('@chakra-ui/react').then(m => m.Th),
  Td: () => import('@chakra-ui/react').then(m => m.Td),
  TableContainer: () => import('@chakra-ui/react').then(m => m.TableContainer),
  Badge: () => import('@chakra-ui/react').then(m => m.Badge),
  Card: () => import('@chakra-ui/react').then(m => m.Card),
  CardHeader: () => import('@chakra-ui/react').then(m => m.CardHeader),
  CardBody: () => import('@chakra-ui/react').then(m => m.CardBody),
  CardFooter: () => import('@chakra-ui/react').then(m => m.CardFooter),
  List: () => import('@chakra-ui/react').then(m => m.List),
  ListItem: () => import('@chakra-ui/react').then(m => m.ListItem),
  ListIcon: () => import('@chakra-ui/react').then(m => m.ListIcon),
  OrderedList: () => import('@chakra-ui/react').then(m => m.OrderedList),
  UnorderedList: () => import('@chakra-ui/react').then(m => m.UnorderedList),
  Stat: () => import('@chakra-ui/react').then(m => m.Stat),
  StatLabel: () => import('@chakra-ui/react').then(m => m.StatLabel),
  StatNumber: () => import('@chakra-ui/react').then(m => m.StatNumber),
  StatHelpText: () => import('@chakra-ui/react').then(m => m.StatHelpText),
  StatArrow: () => import('@chakra-ui/react').then(m => m.StatArrow),
  StatGroup: () => import('@chakra-ui/react').then(m => m.StatGroup),
  Tag: () => import('@chakra-ui/react').then(m => m.Tag),
  TagLabel: () => import('@chakra-ui/react').then(m => m.TagLabel),
  TagLeftIcon: () => import('@chakra-ui/react').then(m => m.TagLeftIcon),
  TagRightIcon: () => import('@chakra-ui/react').then(m => m.TagRightIcon),
  TagCloseButton: () => import('@chakra-ui/react').then(m => m.TagCloseButton),
};

// Navigation components
export const NavigationComponents = {
  Breadcrumb: () => import('@chakra-ui/react').then(m => m.Breadcrumb),
  BreadcrumbItem: () => import('@chakra-ui/react').then(m => m.BreadcrumbItem),
  BreadcrumbLink: () => import('@chakra-ui/react').then(m => m.BreadcrumbLink),
  BreadcrumbSeparator: () => import('@chakra-ui/react').then(m => m.BreadcrumbSeparator),
  LinkBox: () => import('@chakra-ui/react').then(m => m.LinkBox),
  LinkOverlay: () => import('@chakra-ui/react').then(m => m.LinkOverlay),
  Tabs: () => import('@chakra-ui/react').then(m => m.Tabs),
  TabList: () => import('@chakra-ui/react').then(m => m.TabList),
  TabPanels: () => import('@chakra-ui/react').then(m => m.TabPanels),
  Tab: () => import('@chakra-ui/react').then(m => m.Tab),
  TabPanel: () => import('@chakra-ui/react').then(m => m.TabPanel),
  TabIndicator: () => import('@chakra-ui/react').then(m => m.TabIndicator),
};

// Disclosure components
export const DisclosureComponents = {
  Accordion: () => import('@chakra-ui/react').then(m => m.Accordion),
  AccordionItem: () => import('@chakra-ui/react').then(m => m.AccordionItem),
  AccordionButton: () => import('@chakra-ui/react').then(m => m.AccordionButton),
  AccordionPanel: () => import('@chakra-ui/react').then(m => m.AccordionPanel),
  AccordionIcon: () => import('@chakra-ui/react').then(m => m.AccordionIcon),
  VisuallyHidden: () => import('@chakra-ui/react').then(m => m.VisuallyHidden),
  VisuallyHiddenInput: () => import('@chakra-ui/react').then(m => m.VisuallyHiddenInput),
};

// Hooks - import trực tiếp
export {
  useDisclosure,
  useBoolean,
  useBreakpointValue,
  useClipboard,
  useConst,
  useControllableState,
  useCounter,
  useEventListener,
  useFocusOnShow,
  useMediaQuery,
  useMergeRefs,
  useOutsideClick,
  usePrevious,
  useRadio,
  useRadioGroup,
  useRangeSlider,
  useSlider,
  useSteps,
  useTab,
  useTabs,
  useToast,
  useUpdateEffect
} from '@chakra-ui/react';

/**
 * Utility function để load components on demand
 */
export const loadChakraComponent = async <T>(
  componentLoader: () => Promise<T>
): Promise<T> => {
  return await componentLoader();
};

/**
 * Hook để load và cache Chakra components
 */
export const useChakraComponent = <T>(
  componentLoader: () => Promise<T>
) => {
  const [Component, setComponent] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const loadComponent = React.useCallback(async () => {
    if (Component) return Component;

    setLoading(true);
    setError(null);

    try {
      const LoadedComponent = await componentLoader();
      setComponent(LoadedComponent);
      return LoadedComponent;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [componentLoader, Component]);

  return {
    Component,
    loading,
    error,
    loadComponent
  };
};

// React import cho hooks
import React from 'react';