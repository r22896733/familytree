import React from 'react';
import { Person } from '../types';
import { CloseIcon, TrashIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';

interface DeleteConfirmationModalProps {
  person: Person;
  onClose: () => void;
  onConfirm: (personId: string) => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ person, onClose, onConfirm }) => {
  const { t } = useLanguage();
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm" aria-modal="true" role="dialog">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-red-500 flex items-center gap-2">
              <TrashIcon className="w-6 h-6" />
              {t('deleteModal.title')}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700" aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-gray-300">
            {t('deleteModal.areYouSure')} <strong className="font-bold text-white">{person.name}</strong>?
          </p>
          <p className="text-sm text-gray-400 mt-2">
            {t('deleteModal.warning')}
          </p>
        </div>
        <div className="flex justify-end gap-4 p-6 bg-gray-800 border-t border-gray-700 rounded-b-lg">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg shadow-md transition duration-300">
            {t('deleteModal.cancel')}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(person.id)}
            className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition duration-300"
          >
            {t('deleteModal.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
