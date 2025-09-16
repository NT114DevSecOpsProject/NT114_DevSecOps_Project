/**
 * Image optimization và caching utilities
 * Giúp tối ưu hóa loading và caching images
 */

interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpg' | 'png' | 'avif';
  lazy?: boolean;
  placeholder?: string;
  fallback?: string;
}

interface ImageCacheItem {
  src: string;
  timestamp: number;
  blob?: Blob;
  dataUrl?: string;
}

class ImageCache {
  private cache = new Map<string, ImageCacheItem>();
  private maxSize = 50; // Maximum số lượng images trong cache
  private maxAge = 30 * 60 * 1000; // 30 phút

  set(key: string, item: ImageCacheItem) {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      ...item,
      timestamp: Date.now()
    });
  }

  get(key: string): ImageCacheItem | null {
    const item = this.cache.get(key);
    
    if (!item) return null;

    // Check if item has expired
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return item;
  }

  clear() {
    this.cache.clear();
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  size() {
    return this.cache.size;
  }
}

// Global image cache instance
const imageCache = new ImageCache();

/**
 * Generate optimized image URL
 */
export const getOptimizedImageUrl = (
  src: string, 
  options: ImageOptions = {}
): string => {
  const {
    width,
    height,
    quality = 80,
    format = 'webp'
  } = options;

  // If it's already a data URL or blob URL, return as-is
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }

  // For external URLs, you might use a service like Cloudinary, ImageKit, etc.
  // Here's a generic example:
  const url = new URL(src, window.location.origin);
  
  if (width) url.searchParams.set('w', width.toString());
  if (height) url.searchParams.set('h', height.toString());
  if (quality) url.searchParams.set('q', quality.toString());
  if (format) url.searchParams.set('f', format);

  return url.toString();
};

/**
 * Preload image và cache it
 */
export const preloadImage = (src: string, options: ImageOptions = {}): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Check cache first
    const cached = imageCache.get(src);
    if (cached?.dataUrl) {
      resolve(cached.dataUrl);
      return;
    }

    const img = new Image();
    const optimizedSrc = getOptimizedImageUrl(src, options);

    img.onload = () => {
      // Convert to canvas để tạo optimized version
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(optimizedSrc);
        return;
      }

      canvas.width = options.width || img.naturalWidth;
      canvas.height = options.height || img.naturalHeight;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Convert to optimized format
      const quality = (options.quality || 80) / 100;
      const dataUrl = canvas.toDataURL(`image/${options.format || 'webp'}`, quality);

      // Cache the result
      imageCache.set(src, {
        src: optimizedSrc,
        timestamp: Date.now(),
        dataUrl
      });

      resolve(dataUrl);
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${optimizedSrc}`));
    };

    img.src = optimizedSrc;
  });
};

/**
 * Lazy load image với intersection observer
 */
export const createLazyImageObserver = (
  callback: (entry: IntersectionObserverEntry) => void
): IntersectionObserver => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry);
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: '50px 0px', // Start loading 50px before image enters viewport
      threshold: 0.01
    }
  );

  return observer;
};

/**
 * Generate srcSet cho responsive images
 */
export const generateSrcSet = (src: string, widths: number[]): string => {
  return widths
    .map(width => {
      const optimizedSrc = getOptimizedImageUrl(src, { width });
      return `${optimizedSrc} ${width}w`;
    })
    .join(', ');
};

/**
 * Generate sizes attribute cho responsive images
 */
export const generateSizes = (breakpoints: { [key: string]: string }): string => {
  return Object.entries(breakpoints)
    .map(([media, size]) => `${media} ${size}`)
    .join(', ');
};

/**
 * Convert file to optimized data URL
 */
export const fileToOptimizedDataUrl = (
  file: File,
  options: ImageOptions = {}
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Calculate dimensions
        const maxWidth = options.width || 1920;
        const maxHeight = options.height || 1080;
        
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw và optimize
        ctx.drawImage(img, 0, 0, width, height);
        
        const quality = (options.quality || 80) / 100;
        const dataUrl = canvas.toDataURL(`image/${options.format || 'webp'}`, quality);
        
        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = event.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Check if browser supports WebP
 */
export const supportsWebP = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webP = new Image();
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2);
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  });
};

/**
 * Check if browser supports AVIF
 */
export const supportsAVIF = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const avif = new Image();
    avif.onload = avif.onerror = () => {
      resolve(avif.height === 2);
    };
    avif.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';
  });
};

/**
 * Get optimal image format based on browser support
 */
export const getOptimalFormat = async (): Promise<'avif' | 'webp' | 'jpg'> => {
  if (await supportsAVIF()) return 'avif';
  if (await supportsWebP()) return 'webp';
  return 'jpg';
};

/**
 * Cache management utilities
 */
export const imageCacheUtils = {
  clear: () => imageCache.clear(),
  delete: (src: string) => imageCache.delete(src),
  size: () => imageCache.size(),
  
  // Clear old entries
  cleanup: () => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    for (const [key, item] of imageCache['cache'].entries()) {
      if (now - item.timestamp > maxAge) {
        imageCache.delete(key);
      }
    }
  }
};

// Auto cleanup every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    imageCacheUtils.cleanup();
  }, 10 * 60 * 1000);
}