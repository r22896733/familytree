import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface GenerationControlsProps {
  maxDepth: number;
  collapsedLevels: Set<number>;
  onToggle: (level: number) => void;
}

const GenerationControls: React.FC<GenerationControlsProps> = ({ maxDepth, collapsedLevels, onToggle }) => {
  const { t } = useLanguage();
  if (maxDepth === 0) return null;

  return (
    <div className="absolute top-4 ltr:left-4 rtl:right-4 bg-gray-800/80 backdrop-blur-sm p-3 rounded-lg border border-gray-700 shadow-lg z-20">
      <h3 className="text-sm font-bold text-white mb-2 text-center">{t('generationControls.title')}</h3>
      <div className="flex flex-col space-y-2">
        {Array.from({ length: maxDepth }, (_, i) => i + 1).map((level) => {
          const isCollapsed = collapsedLevels.has(level);
          return (
            <button
              key={level}
              onClick={() => onToggle(level)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors w-full ${
                isCollapsed
                  ? 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  : 'bg-cyan-600 text-white hover:bg-cyan-700'
              }`}
            >
              {t(isCollapsed ? 'generationControls.expand' : 'generationControls.collapse', { level: level + 1 })}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GenerationControls;
