import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import en from '../locales/en.json';
import fa from '../locales/fa.json';

type Language = 'en' | 'fa';

const translations = { en, fa };

interface LanguageContextType {
  language: Language;
  // FIX: Use React.Dispatch<React.SetStateAction<Language>> to allow functional updates.
  setLanguage: React.Dispatch<React.SetStateAction<Language>>;
  t: (key: string, replacements?: { [key: string]: string | number }) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Helper function to get nested keys
const getNestedValue = (obj: any, key: string): string | undefined => {
  return key.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: string, replacements?: { [key: string]: string | number }) => {
    const translation = getNestedValue(translations[language], key) || key;
    
    if (!replacements) {
      return translation;
    }

    return Object.entries(replacements).reduce((acc, [repKey, repValue]) => {
      return acc.replace(`{{${repKey}}}`, String(repValue));
    }, translation);

  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
