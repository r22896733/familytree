import React, { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { CloseIcon, UsersIcon, EditIcon, TrashIcon, UserPlusIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../services/api';

interface UserManagementModalProps {
  owner: User;
  onClose: () => void;
}

const UserManagementModal: React.FC<UserManagementModalProps> = ({ owner, onClose }) => {
  const { t } = useLanguage();
  const [contributors, setContributors] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingContributor, setEditingContributor] = useState<User | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchContributors = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedContributors = await api.getContributors(owner);
      setContributors(fetchedContributors);
    } catch (err) {
      setError(t('userManagement.error'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [owner, t]);

  useEffect(() => {
    fetchContributors();
  }, [fetchContributors]);

  const handleShowAddForm = () => {
    setEditingContributor(null);
    setName('');
    setPassword('');
    setView('form');
  };

  const handleShowEditForm = (contributor: User) => {
    setEditingContributor(contributor);
    setName(contributor.name);
    setPassword('');
    setView('form');
  };

  const handleBackToList = () => {
    setView('list');
    setEditingContributor(null);
  };
  
  const handleDelete = async (contributor: User) => {
    if (window.confirm(t('userManagement.confirmDelete', { name: contributor.name }))) {
        try {
            await api.deleteContributor(contributor.id, owner);
            // alert(t('userManagement.successDelete'));
            await fetchContributors();
        } catch (err) {
            alert(t('userManagement.errorAction'));
            console.error(err);
        }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        if (editingContributor) { // Update
            await api.updateContributor(editingContributor.id, { name, password: password || undefined }, owner);
            // alert(t('userManagement.successUpdate'));
        } else { // Add
            if (!password) {
                alert('Password is required for a new contributor.');
                setIsSubmitting(false);
                return;
            }
            await api.addContributor({ name, password }, owner);
            // alert(t('userManagement.successAdd'));
        }
        await fetchContributors();
        handleBackToList();
    } catch (err) {
         alert(t('userManagement.errorAction'));
         console.error(err);
    } finally {
        setIsSubmitting(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm" aria-modal="true" role="dialog">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl h-[70vh] flex flex-col border border-gray-700">
        <div className="flex justify-between items-center p-6 border-b border-gray-700 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <UsersIcon className="w-6 h-6" />
              {t('userManagement.title')}
            </h2>
            <p className="text-gray-400">{t('userManagement.subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700" aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex-grow overflow-y-auto">
          {view === 'list' ? (
             <>
              <div className="flex justify-end mb-4">
                  <button onClick={handleShowAddForm} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">
                      <UserPlusIcon className="w-5 h-5"/>
                      {t('userManagement.add')}
                  </button>
              </div>
               {isLoading && <p className="text-center text-gray-300">{t('userManagement.loading')}</p>}
               {error && <p className="text-center text-red-400">{error}</p>}
               {!isLoading && !error && contributors.length === 0 && <p className="text-center text-gray-400">{t('userManagement.empty')}</p>}
               {!isLoading && !error && contributors.length > 0 && (
                 <ul className="divide-y divide-gray-700">
                   {contributors.map(c => (
                     <li key={c.id} className="flex items-center justify-between p-3">
                       <span className="font-semibold text-white">{c.name}</span>
                       <div className="flex items-center gap-3">
                         <button onClick={() => handleShowEditForm(c)} className="flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300">
                            <EditIcon className="w-4 h-4" />
                            {t('userManagement.edit')}
                         </button>
                         <button onClick={() => handleDelete(c)} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-400">
                            <TrashIcon className="w-4 h-4" />
                            {t('userManagement.delete')}
                         </button>
                       </div>
                     </li>
                   ))}
                 </ul>
               )}
             </>
          ) : (
            <div>
                 <h3 className="text-xl font-bold text-white mb-4">
                    {editingContributor ? t('userManagement.editTitle') : t('userManagement.addTitle')}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300">{t('userManagement.name')}</label>
                        <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
                    </div>
                     <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                            {editingContributor ? t('userManagement.passwordOptional') : t('userManagement.password')}
                        </label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!editingContributor} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
                    </div>
                    <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
                        <button type="button" onClick={handleBackToList} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg shadow-md transition duration-300">{t('userManagement.cancel')}</button>
                        <button type="submit" disabled={isSubmitting} className="py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition duration-300 disabled:bg-gray-500 disabled:cursor-wait">{t('userManagement.save')}</button>
                    </div>
                </form>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-4 p-6 bg-gray-800 border-t border-gray-700 rounded-b-lg flex-shrink-0">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg shadow-md transition duration-300">
            {t('logsModal.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagementModal; 