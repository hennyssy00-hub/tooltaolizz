'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { PlatformCategory } from '@/types';

interface PlatformContextType {
  category: PlatformCategory;
  setCategory: (c: PlatformCategory) => void;
  isCasino: boolean;
  isSports: boolean;
}

const PlatformContext = createContext<PlatformContextType>({
  category: 'all',
  setCategory: () => {},
  isCasino: true,
  isSports: true,
});

export function PlatformProvider({ children }: { children: React.ReactNode }) {
  const [category, setCategoryState] = useState<PlatformCategory>('all');

  useEffect(() => {
    const saved = localStorage.getItem('betguard_category') as PlatformCategory;
    if (saved && ['all', 'casino', 'sports'].includes(saved)) {
      setCategoryState(saved);
    }
  }, []);

  const setCategory = (c: PlatformCategory) => {
    setCategoryState(c);
    localStorage.setItem('betguard_category', c);
  };

  return (
    <PlatformContext.Provider
      value={{
        category,
        setCategory,
        isCasino: category === 'all' || category === 'casino',
        isSports: category === 'all' || category === 'sports',
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  return useContext(PlatformContext);
}
