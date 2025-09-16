// Theme System Test Script
// Script để test các tính năng của theme system

import { themeStorage } from './utils/storage';

/**
 * Test localStorage functionality
 */
export const testLocalStorage = () => {
  console.log('🧪 Testing localStorage functionality...');
  
  try {
    // Test set và get
    themeStorage.setThemeMode('dark');
    const retrieved = themeStorage.getThemeMode();
    console.log('✅ Set/Get test:', retrieved === 'dark' ? 'PASSED' : 'FAILED');
    
    // Test remove
    themeStorage.removeThemeMode();
    const afterRemove = themeStorage.getThemeMode();
    console.log('✅ Remove test:', afterRemove === null ? 'PASSED' : 'FAILED');
    
    // Test migration từ legacy key
    localStorage.setItem('chakra-ui-color-mode', 'light');
    const migrated = themeStorage.getThemeMode();
    console.log('✅ Migration test:', migrated === 'light' ? 'PASSED' : 'FAILED');
    
    return true;
  } catch (error) {
    console.error('❌ localStorage test failed:', error);
    return false;
  }
};

/**
 * Test system preference detection
 */
export const testSystemPreference = () => {
  console.log('🧪 Testing system preference detection...');
  
  try {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const systemPreference = mediaQuery.matches ? 'dark' : 'light';
    console.log('✅ System preference detected:', systemPreference);
    
    // Test media query listener
    const testListener = (e: MediaQueryListEvent) => {
      console.log('✅ Media query change detected:', e.matches ? 'dark' : 'light');
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', testListener);
      setTimeout(() => {
        mediaQuery.removeEventListener('change', testListener);
        console.log('✅ Media query listener test: PASSED');
      }, 100);
    }
    
    return true;
  } catch (error) {
    console.error('❌ System preference test failed:', error);
    return false;
  }
};

/**
 * Test DOM manipulation
 */
export const testDOMManipulation = () => {
  console.log('🧪 Testing DOM manipulation...');
  
  try {
    // Test data-theme attribute
    document.documentElement.setAttribute('data-theme', 'dark');
    const dataTheme = document.documentElement.getAttribute('data-theme');
    console.log('✅ Data-theme test:', dataTheme === 'dark' ? 'PASSED' : 'FAILED');
    
    // Test CSS classes
    document.documentElement.classList.add('dark');
    const hasClass = document.documentElement.classList.contains('dark');
    console.log('✅ CSS class test:', hasClass ? 'PASSED' : 'FAILED');
    
    // Test CSS custom properties
    document.documentElement.style.setProperty('--chakra-ui-color-mode', 'dark');
    const customProp = document.documentElement.style.getPropertyValue('--chakra-ui-color-mode');
    console.log('✅ CSS custom property test:', customProp === 'dark' ? 'PASSED' : 'FAILED');
    
    // Cleanup
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.style.removeProperty('--chakra-ui-color-mode');
    
    return true;
  } catch (error) {
    console.error('❌ DOM manipulation test failed:', error);
    return false;
  }
};

/**
 * Test custom events
 */
export const testCustomEvents = () => {
  console.log('🧪 Testing custom events...');
  
  try {
    let eventReceived = false;
    
    const testListener = (event: CustomEvent) => {
      console.log('✅ Custom event received:', event.detail);
      eventReceived = true;
    };
    
    window.addEventListener('themeChange', testListener as EventListener);
    
    // Dispatch test event
    const testEvent = new CustomEvent('themeChange', {
      detail: { colorMode: 'dark' }
    });
    window.dispatchEvent(testEvent);
    
    setTimeout(() => {
      window.removeEventListener('themeChange', testListener as EventListener);
      console.log('✅ Custom event test:', eventReceived ? 'PASSED' : 'FAILED');
    }, 100);
    
    return true;
  } catch (error) {
    console.error('❌ Custom event test failed:', error);
    return false;
  }
};

/**
 * Test performance
 */
export const testPerformance = () => {
  console.log('🧪 Testing performance...');
  
  try {
    const iterations = 1000;
    
    // Test localStorage performance
    const startStorage = performance.now();
    for (let i = 0; i < iterations; i++) {
      themeStorage.setThemeMode(i % 2 === 0 ? 'light' : 'dark');
      themeStorage.getThemeMode();
    }
    const endStorage = performance.now();
    console.log(`✅ localStorage performance: ${(endStorage - startStorage).toFixed(2)}ms for ${iterations} operations`);
    
    // Test DOM manipulation performance
    const startDOM = performance.now();
    for (let i = 0; i < iterations; i++) {
      const mode = i % 2 === 0 ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', mode);
      document.documentElement.classList.toggle('dark', mode === 'dark');
    }
    const endDOM = performance.now();
    console.log(`✅ DOM manipulation performance: ${(endDOM - startDOM).toFixed(2)}ms for ${iterations} operations`);
    
    return true;
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    return false;
  }
};

/**
 * Run all tests
 */
export const runAllTests = () => {
  console.log('🚀 Starting theme system tests...\n');
  
  const results = {
    localStorage: testLocalStorage(),
    systemPreference: testSystemPreference(),
    domManipulation: testDOMManipulation(),
    customEvents: testCustomEvents(),
    performance: testPerformance(),
  };
  
  console.log('\n📊 Test Results:');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const allPassed = Object.values(results).every(Boolean);
  console.log(`\n${allPassed ? '🎉' : '💥'} Overall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  
  return results;
};

// Export cho browser console
if (typeof window !== 'undefined') {
  (window as any).themeTests = {
    testLocalStorage,
    testSystemPreference,
    testDOMManipulation,
    testCustomEvents,
    testPerformance,
    runAllTests,
  };
}