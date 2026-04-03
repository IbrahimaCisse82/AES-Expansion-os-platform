import { useEffect, useState } from 'react';

function getInitialTheme(): boolean {
  if (typeof window === 'undefined') return false;

  const stored = localStorage.getItem('theme-mode');
  if (stored !== null) {
    return stored === 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(isDark: boolean) {
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function useTheme() {
  const [isDark, setIsDark] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(prev => {
      const newValue = !prev;
      localStorage.setItem('theme-mode', newValue ? 'dark' : 'light');
      applyTheme(newValue);
      return newValue;
    });
  };

  return { isDark, toggleTheme };
}
