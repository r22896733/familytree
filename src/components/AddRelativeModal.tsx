import React, { useState, useMemo, useRef } from 'react';
import { Person, Gender, RelationshipType } from '../types';
import { CloseIcon } from './Icons';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

interface AddRelativeModalProps {
  targetPerson: Person;
  isRoot: boolean;
  onClose: () => void;
  onSave: (newPerson: Omit<Person, 'id' | 'children' | '_children' | 'spouse'>, relationship: RelationshipType) => void;
}

const AddRelativeModal: React.FC<AddRelativeModalProps> = ({ targetPerson, isRoot, onClose, onSave }) => {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>(Gender.Other);
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [location, setLocation] = useState('');
  
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const debounceTimeoutRef = useRef<number | null>(null);
  
  const relationshipOptions = useMemo(() => {
    const options = [{ value: RelationshipType.Child, label: t('addRelativeModal.child') }];
    if (!targetPerson.spouse) {
        options.push({ value: RelationshipType.Spouse, label: t('addRelativeModal.spouse') });
    }
    if (!isRoot) {
        options.push({ value: RelationshipType.Sibling, label: t('addRelativeModal.sibling') });
    }
    if (isRoot) {
        options.push({ value: RelationshipType.Parent, label: t('addRelativeModal.parent') });
    }
    return options;
  }, [targetPerson, isRoot, t]);

  const [relationship, setRelationship] = useState<RelationshipType>(relationshipOptions[0].value);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchLocationSuggestions = async (query: string) => {
    if (query.length < 3) {
      setLocationSuggestions([]);
      return;
    }
    setIsLocationLoading(true);
    try {
      const suggestions = await api.getLocationSuggestions(query);
      setLocationSuggestions(suggestions);
    } catch (error) {
      console.error("Error fetching location suggestions:", error);
      setLocationSuggestions([]);
    } finally {
      setIsLocationLoading(false);
    }
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocation(value);
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = window.setTimeout(() => {
      fetchLocationSuggestions(value);
    }, 500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setLocation(suggestion);
    setLocationSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !birthDate || !gender || !relationship) {
      alert(t('addRelativeModal.fillAllFields'));
      return;
    }
    onSave({
      name,
      gender,
      birthDate,
      deathDate: deathDate || undefined,
      photoUrl: photoUrl || `https://picsum.photos/seed/${name.replace(/\s/g, '')}/200/200`,
      bio: '', // Bio can be added later
      location,
    }, relationship);
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm" aria-modal="true" role="dialog">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-white">{t('addRelativeModal.title')}</h2>
              <p className="text-gray-400">{t('addRelativeModal.to', { name: targetPerson.name })}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700" aria-label="Close">
              <CloseIcon className="w-6 h-6" />
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label htmlFor="relationship" className="block text-sm font-medium text-gray-300">{t('addRelativeModal.relationship')}</label>
            <select id="relationship" value={relationship} onChange={(e) => setRelationship(e.target.value as RelationshipType)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm">
                {relationshipOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
          </div>
           <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">{t('addRelativeModal.fullName')}</label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-300">{t('addRelativeModal.gender')}</label>
            <select id="gender" value={gender} onChange={(e) => setGender(e.target.value as Gender)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm">
              <option value={Gender.Other}>{t('gender.OTHER')}</option>
              <option value={Gender.Male}>{t('gender.MALE')}</option>
              <option value={Gender.Female}>{t('gender.FEMALE')}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="birthDate" className="block text-sm font-medium text-gray-300">{t('addRelativeModal.birthDate')}</label>
              <input type="date" id="birthDate" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="deathDate" className="block text-sm font-medium text-gray-300">{t('addRelativeModal.deathDate')}</label>
              <input type="date" id="deathDate" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
            </div>
          </div>
          <div className="relative">
              <label htmlFor="location" className="block text-sm font-medium text-gray-300">{t('addRelativeModal.location')}</label>
              <input type="text" id="location" value={location} onChange={handleLocationChange} autoComplete="off" placeholder={t('addRelativeModal.locationPlaceholder')} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
              {isLocationLoading && <div className="absolute right-3 top-9 text-xs text-gray-400">Loading...</div>}
              {locationSuggestions.length > 0 && (
                <ul className="absolute z-10 w-full bg-gray-600 border border-gray-500 rounded-md mt-1 shadow-lg max-h-40 overflow-auto">
                  {locationSuggestions.map((s, i) => (
                    <li key={i} onClick={() => handleSuggestionClick(s)} className="px-3 py-2 text-white cursor-pointer hover:bg-cyan-600">
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">{t('addRelativeModal.photo')}</label>
              <div className="mt-1 flex items-center gap-4">
                <img src={photoUrl || 'https://via.placeholder.com/64'} alt="Preview" className="w-16 h-16 rounded-md object-cover bg-gray-700" />
                <input id="photo-upload" type="file" accept="image/*" onChange={handleImageUpload} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"/>
              </div>
            </div>
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-700 mt-4">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg shadow-md transition duration-300">{t('addRelativeModal.cancel')}</button>
            <button type="submit" className="py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition duration-300">{t('addRelativeModal.save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRelativeModal;
