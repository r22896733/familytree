import React, { useState, useRef } from 'react';
import { Person, Gender } from '../types';
import { CloseIcon } from './Icons';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

type SpouseData = Omit<Person, 'children' | 'spouse'>;

interface EditPersonModalProps {
  person: Person;
  onClose: () => void;
  onSave: (updatedData: Omit<Person, 'id' | 'children' | '_children'>) => void;
}

const EditPersonModal: React.FC<EditPersonModalProps> = ({ person, onClose, onSave }) => {
  const { t } = useLanguage();
  const [name, setName] = useState(person.name);
  const [gender, setGender] = useState<Gender>(person.gender);
  const [birthDate, setBirthDate] = useState(person.birthDate);
  const [deathDate, setDeathDate] = useState(person.deathDate || '');
  const [photoUrl, setPhotoUrl] = useState(person.photoUrl);
  const [bio, setBio] = useState(person.bio);
  const [location, setLocation] = useState(person.location || '');
  
  const [spouse, setSpouse] = useState<SpouseData | undefined | null>(person.spouse);

  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const debounceTimeoutRef = useRef<number | null>(null);

  const handleSpouseChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (!spouse) return;
    const { name, value } = e.target;
    setSpouse(prev => prev ? ({ ...prev, [name]: value }) : null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isSpouse: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (isSpouse && spouse) {
            setSpouse(prev => prev ? { ...prev, photoUrl: result } : null);
        } else {
            setPhotoUrl(result);
        }
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
    if (!name || !birthDate || !gender) {
      alert(t('editPersonModal.fillAllFields'));
      return;
    }
    
    if (spouse && (!spouse.name || !spouse.birthDate || !spouse.gender)) {
       alert(t('editPersonModal.fillSpouseFields'));
       return;
    }

    const finalSpouseData = spouse ? {
      ...spouse,
      deathDate: spouse.deathDate || undefined,
    } : undefined;

    onSave({
      name,
      gender,
      birthDate,
      deathDate: deathDate || undefined,
      photoUrl: photoUrl || `https://picsum.photos/seed/${name.replace(/\s/g, '')}/200/200`,
      bio,
      location,
      spouse: finalSpouseData,
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm" aria-modal="true" role="dialog">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">{t('editPersonModal.title', { name: person.name })}</h2>
            <p className="text-gray-400">{t('editPersonModal.subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700" aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">{t('editPersonModal.fullName')}</label>
              <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
            </div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-300">{t('editPersonModal.gender')}</label>
              <select id="gender" value={gender} onChange={(e) => setGender(e.target.value as Gender)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm">
                <option value={Gender.Male}>{t('gender.MALE')}</option>
                <option value={Gender.Female}>{t('gender.FEMALE')}</option>
                <option value={Gender.Other}>{t('gender.OTHER')}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="birthDate" className="block text-sm font-medium text-gray-300">{t('editPersonModal.birthDate')}</label>
                <input type="date" id="birthDate" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="deathDate" className="block text-sm font-medium text-gray-300">{t('editPersonModal.deathDate')}</label>
                <input type="date" id="deathDate" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
              </div>
            </div>
            <div className="relative">
              <label htmlFor="location" className="block text-sm font-medium text-gray-300">{t('editPersonModal.location')}</label>
              <input type="text" id="location" value={location} onChange={handleLocationChange} autoComplete="off" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
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
              <label className="block text-sm font-medium text-gray-300">{t('editPersonModal.photo')}</label>
              <div className="mt-1 flex items-center gap-4">
                <img src={photoUrl} alt="Preview" className="w-16 h-16 rounded-md object-cover bg-gray-700" />
                <input id="photo-upload" type="file" accept="image/*" onChange={(e) => handleImageUpload(e)} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"/>
              </div>
            </div>
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-300">{t('editPersonModal.biography')}</label>
              <textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
            </div>

            {spouse && (
              <>
                <div className="border-t border-gray-700 my-6"></div>
                <h3 className="text-xl font-bold text-white">{t('editPersonModal.spouseDetails')}</h3>
                
                <div>
                  <label htmlFor="spouseName" className="block text-sm font-medium text-gray-300">{t('editPersonModal.fullName')}</label>
                  <input type="text" id="spouseName" name="name" value={spouse.name} onChange={handleSpouseChange} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
                </div>
                 <div>
                  <label htmlFor="spouseGender" className="block text-sm font-medium text-gray-300">{t('editPersonModal.gender')}</label>
                  <select id="spouseGender" name="gender" value={spouse.gender} onChange={handleSpouseChange} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm">
                    <option value={Gender.Male}>{t('gender.MALE')}</option>
                    <option value={Gender.Female}>{t('gender.FEMALE')}</option>
                    <option value={Gender.Other}>{t('gender.OTHER')}</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="spouseBirthDate" className="block text-sm font-medium text-gray-300">{t('editPersonModal.birthDate')}</label>
                    <input type="date" id="spouseBirthDate" name="birthDate" value={spouse.birthDate} onChange={handleSpouseChange} required className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
                  </div>
                  <div>
                    <label htmlFor="spouseDeathDate" className="block text-sm font-medium text-gray-300">{t('editPersonModal.deathDate')}</label>
                    <input type="date" id="spouseDeathDate" name="deathDate" value={spouse.deathDate || ''} onChange={handleSpouseChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
                  </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">{t('editPersonModal.photo')}</label>
                    <div className="mt-1 flex items-center gap-4">
                        <img src={spouse.photoUrl} alt="Spouse Preview" className="w-16 h-16 rounded-md object-cover bg-gray-700" />
                        <input id="spouse-photo-upload" type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"/>
                    </div>
                </div>
                <div>
                  <label htmlFor="spouseBio" className="block text-sm font-medium text-gray-300">{t('editPersonModal.biography')}</label>
                  <textarea id="spouseBio" name="bio" value={spouse.bio} onChange={handleSpouseChange} rows={3} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm" />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-end gap-4 p-6 bg-gray-800 border-t border-gray-700 rounded-b-lg">
            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg shadow-md transition duration-300">{t('editPersonModal.cancel')}</button>
            <button type="submit" className="py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition duration-300">{t('editPersonModal.save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPersonModal;
