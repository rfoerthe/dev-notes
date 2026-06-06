import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export const RouteScrollReset = () => {
  const { hash, pathname, search } = useLocation();

  useLayoutEffect(() => {
    if (hash) {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [hash, pathname, search]);

  return null;
};
