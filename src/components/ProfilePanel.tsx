import React from 'react';
import { Person } from '../types';
import { CloseIcon, TrashIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

interface ProfilePanelProps {
  person: Person | null;
  onClose: () => void;
  onEdit: (person: Person) => void;
  onDelete: (person: Person) => void;
  onSetAsRoot: (personId: string) => void;
  isRoot: boolean;
  canEdit?: boolean;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ person, onClose, onEdit, onDelete, onSetAsRoot, isRoot, canEdit }) => {
  const { t } = useLanguage();
  
  if (!person) {
    return null;
  }

  const lifeSpan = `${person.birthDate} to ${person.deathDate || t('profilePanel.present')}`;

  const handleEditClick = () => {
    onEdit(person);
  };

  const handleDeleteClick = () => {
    onDelete(person);
  };

  const handleSetAsRootClick = () => {
    onSetAsRoot(person.id);
  }

  return (
    <div className={`absolute top-0 ltr:right-0 rtl:left-0 h-full w-96 bg-gray-800/80 backdrop-blur-sm ltr:border-l rtl:border-r border-gray-700 shadow-2xl z-30 transition-transform duration-500 ease-in-out ${person ? 'translate-x-0' : 'ltr:translate-x-full rtl:-translate-x-full'}`}>
      <div className="flex flex-col h-full p-6">
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-2xl font-bold text-white">{person.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-700 rounded-full p-2 transition-colors"
            aria-label={t('profilePanel.closeProfile')}
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-shrink-0">
            <img
            src={person.photoUrl}
            alt={person.name}
            className="w-full h-56 object-cover rounded-lg shadow-lg border-2 border-gray-600"
            />
        </div>

        <div className="mt-6 flex-grow overflow-y-auto pe-2">
            <div className="space-y-4 text-gray-300">
                <div>
                    <h3 className="font-semibold text-cyan-400 text-sm uppercase tracking-wider">{t('profilePanel.lifeSpan')}</h3>
                    <p>{lifeSpan}</p>
                </div>
                {person.spouse && (
                    <div>
                        <h3 className="font-semibold text-cyan-400 text-sm uppercase tracking-wider">{t('profilePanel.spouse')}</h3>
                        <p>{person.spouse.name}</p>
                    </div>
                )}
                 <div>
                    <h3 className="font-semibold text-cyan-400 text-sm uppercase tracking-wider">{t('profilePanel.biography')}</h3>
                    <p className="text-gray-300 leading-relaxed text-sm">
                        {person.bio}
                    </p>
                </div>
            </div>
        </div>
        
        <div className="mt-6 flex-shrink-0 space-y-3">
            {!isRoot && canEdit && (
                <button
                    onClick={handleSetAsRootClick}
                    className="w-full bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
                >
                    {t('profilePanel.setAsRoot')}
                </button>
            )}
            {canEdit && (
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleEditClick} className="w-full bg-cyan-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-cyan-700 transition-colors">
                    {t('profilePanel.editProfile')}
                    </button>
                    <button
                        onClick={handleDeleteClick}
                        disabled={isRoot}
                        className="w-full bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:bg-gray-600 disabled:cursor-not-allowed"
                        aria-label={`Delete ${person.name}`}
                    >
                        <TrashIcon className="w-5 h-5" />
                        {t('profilePanel.delete')}
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePanel;
