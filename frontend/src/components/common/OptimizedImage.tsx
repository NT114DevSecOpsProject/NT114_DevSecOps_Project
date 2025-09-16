import React, { useState, useRef, useEffect } from 'react';
import { Box, Image, Skeleton, Alert, AlertIcon } from '@chakra-ui/react';
import { 
  preloadImage, 
  createLazyImageObserver, 
  generateSrcSet, 
  generateSizes,
  getOptimalFormat
} from '../../utils/imageOptimization';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png' | 'avif' | undefined;
  lazy?: boolean;
  placeholder?: string;
  fallback?: string;
  sizes?: { [key: string]: string };
  responsiveWidths?: number[];
  onLoad?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean; // High priority images (above fold)
}

/**
 * Optimized Image component với lazy loading, caching, và format optimization
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  quality = 80,
  format,
  lazy = true,
  placeholder,
  fallback,
  sizes,
  responsiveWidths = [640, 768, 1024, 1280, 1920],
  onLoad,
  onError,
  className,
  style,
  priority = false,
  ...props
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [imageSrc, setImageSrc] = useState<string>('');
  const [optimalFormat, setOptimalFormat] = useState<'webp' | 'jpg' | 'png' | 'avif' | undefined>(format);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine optimal format if not specified
  useEffect(() => {
    if (!format) {
      getOptimalFormat().then(setOptimalFormat);
    }
  }, [format]);

  // Preload high priority images immediately
  useEffect(() => {
    if (priority && optimalFormat) {
      preloadImage(src, { 
        width, 
        height, 
        quality, 
        format: optimalFormat
      })
        .then((optimizedSrc) => {
          setImageSrc(optimizedSrc);
          setImageState('loaded');
          onLoad?.();
        })
        .catch((error) => {
          setImageState('error');
          onError?.(error);
        });
    }
  }, [priority, src, width, height, quality, optimalFormat, onLoad, onError]);

  // Lazy loading setup
  useEffect(() => {
    if (!lazy || priority || !containerRef.current || !optimalFormat) return;

    const observer = createLazyImageObserver((entry) => {
      if (entry.target === containerRef.current) {
        preloadImage(src, { 
          width, 
          height, 
          quality, 
          format: optimalFormat
        })
          .then((optimizedSrc) => {
            setImageSrc(optimizedSrc);
            setImageState('loaded');
            onLoad?.();
          })
          .catch((error) => {
            setImageState('error');
            onError?.(error);
          });
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [lazy, priority, src, width, height, quality, optimalFormat, onLoad, onError]);

  // Generate responsive attributes
  const srcSet = responsiveWidths && optimalFormat ? 
    generateSrcSet(src, responsiveWidths) : undefined;
  
  const sizesAttr = sizes ? 
    generateSizes(sizes) : undefined;

  // Loading state
  if (imageState === 'loading') {
    if (placeholder) {
      return (
        <Box ref={containerRef} className={className} style={style}>
          <Image src={placeholder} alt={alt} {...props} />
        </Box>
      );
    }

    return (
      <Box ref={containerRef} className={className} style={style}>
        <Skeleton
          width={width || '100%'}
          height={height || '200px'}
          borderRadius="md"
        />
      </Box>
    );
  }

  // Error state
  if (imageState === 'error') {
    if (fallback) {
      return (
        <Box ref={containerRef} className={className} style={style}>
          <Image src={fallback} alt={alt} {...props} />
        </Box>
      );
    }

    return (
      <Box ref={containerRef} className={className} style={style}>
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          Không thể tải hình ảnh
        </Alert>
      </Box>
    );
  }

  // Success state
  return (
    <Box ref={containerRef} className={className} style={style}>
      <Image
        ref={imgRef}
        src={imageSrc}
        srcSet={srcSet}
        sizes={sizesAttr}
        alt={alt}
        width={width}
        height={height}
        loading={lazy && !priority ? 'lazy' : 'eager'}
        onLoad={() => {
          setImageState('loaded');
          onLoad?.();
        }}
        onError={() => {
          setImageState('error');
          onError?.(new Error(`Failed to load image: ${src}`));
        }}
        {...props}
      />
    </Box>
  );
};

/**
 * Avatar component với optimization
 */
export const OptimizedAvatar: React.FC<OptimizedImageProps & {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  name?: string;
}> = ({
  size = 'md',
  name,
  ...props
}) => {
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
    '2xl': 128
  };

  const avatarSize = sizeMap[size];

  return (
    <OptimizedImage
      {...props}
      width={avatarSize}
      height={avatarSize}
      quality={90}
      style={{
        borderRadius: '50%',
        ...props.style
      }}
      fallback={`https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&size=${avatarSize}&background=random`}
    />
  );
};

/**
 * Hero image component với optimization
 */
export const OptimizedHeroImage: React.FC<OptimizedImageProps> = (props) => {
  return (
    <OptimizedImage
      {...props}
      priority={true}
      lazy={false}
      quality={90}
      responsiveWidths={[640, 768, 1024, 1280, 1920, 2560]}
      sizes={{
        '(max-width: 640px)': '100vw',
        '(max-width: 1024px)': '100vw',
        '(max-width: 1280px)': '100vw',
        '(max-width: 1920px)': '100vw'
      }}
    />
  );
};

export default OptimizedImage;