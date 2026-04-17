import React, { createContext, useContext, useEffect, useState } from 'react';

export type ColorTheme = 'emerald' | 'ocean' | 'sunset';

interface AppContextType {
  sidebarOpen: boolean;
  colorTheme: ColorTheme;
  toggleSidebar: () => void;
  cycleColorTheme: () => void;
}

const defaultAppContext: AppContextType = {
  sidebarOpen: false,
  colorTheme: 'emerald',
  toggleSidebar: () => {},
  cycleColorTheme: () => {},
};

const AppContext = createContext<AppContextType>(defaultAppContext);

export const useAppContext = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [colorTheme, setColorTheme] = useState<ColorTheme>('emerald');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('color-theme', 'emerald');
      window.document.documentElement.setAttribute('data-color-theme', colorTheme);
    }
  }, [colorTheme]);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  const cycleColorTheme = () => {
    setColorTheme('emerald');
  };

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        colorTheme,
        toggleSidebar,
        cycleColorTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
