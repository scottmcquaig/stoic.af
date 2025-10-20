import { useCallback } from 'react';

interface ScrollToTopOptions {
  behavior?: 'smooth' | 'instant';
  offset?: number;
}

export const useScrollToTop = (options: ScrollToTopOptions = {}) => {
  const { behavior = 'smooth', offset = 0 } = options;

  const scrollToTop = useCallback(() => {
    // Scroll to top of the page or to a specific offset
    window.scrollTo({
      top: offset,
      left: 0,
      behavior: behavior
    });
  }, [behavior, offset]);

  const scrollToElement = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({
        behavior: behavior,
        block: 'start'
      });
    }
  }, [behavior]);

  return {
    scrollToTop,
    scrollToElement
  };
};

export default useScrollToTop;