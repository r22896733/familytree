import React, { useState, useMemo } from 'react';
import { Person } from '../types';
import { CloseIcon, SearchIcon } from './Icons';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../services/api';

type SimplePerson = Omit<Person, 'children' | 'spouse' | '_children'>;

interface SearchRelationshipModalProps {
  people: SimplePerson[];
  onClose: () => void;
}

const AutocompleteInput: React.FC<{
  id: string;
  label: string;
  people: SimplePerson[];
  selectedValue: SimplePerson | null;
  onSelect: (person: SimplePerson) => void;
}> = ({ id, label, people, selectedValue, onSelect }) => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredPeople = useMemo(() => {
    if (!query) return [];
    return people.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  }, [query, people]);

  const handleSelect = (person: SimplePerson) => {
    onSelect(person);
    setQuery(person.name);
    setShowSuggestions(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!e.target.value) {
        // Clear selection if input is cleared
        onSelect({} as SimplePerson); 
    }
    setShowSuggestions(true);
  };
  
  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-gray-300">{label}</label>
      <input
        type="text"
        id={id}
        value={selectedValue?.name && !showSuggestions ? selectedValue.name : query}
        onChange={handleChange}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        autoComplete="off"
        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
      />
      {showSuggestions && filteredPeople.length > 0 && (
        <ul className="absolute z-10 w-full bg-gray-600 border border-gray-500 rounded-md mt-1 shadow-lg max-h-40 overflow-auto">
          {filteredPeople.map(person => (
            <li
              key={person.id}
              onClick={() => handleSelect(person)}
              className="px-3 py-2 text-white cursor-pointer hover:bg-cyan-600"
            >
              {person.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const SearchRelationshipModal: React.FC<SearchRelationshipModalProps> = ({ people, onClose }) => {
  const { t, language } = useLanguage();
  const [person1, setPerson1] = useState<SimplePerson | null>(null);
  const [person2, setPerson2] = useState<SimplePerson | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFindPath = async () => {
    if (!person1?.id || !person2?.id) {
      setError(t('searchRelationshipModal.selectTwoPeople'));
      return;
    }
    if(person1.id === person2.id) {
      setError(t('searchRelationshipModal.selectDifferentPeople'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.findRelationshipPath(person1.id, person2.id, language);
      if (response.path) {
        setResult(response.path);
      } else {
        setResult(t('searchRelationshipModal.error'));
      }
    } catch (err) {
      setError(t('searchRelationshipModal.error'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm" aria-modal="true" role="dialog">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <SearchIcon className="w-6 h-6" />
                {t('searchRelationshipModal.title')}
            </h2>
            <p className="text-gray-400">{t('searchRelationshipModal.subtitle')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700" aria-label="Close">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
            <AutocompleteInput 
                id="person1"
                label={t('searchRelationshipModal.person1')}
                people={people}
                selectedValue={person1}
                onSelect={(p) => setPerson1(p)}
            />
            <AutocompleteInput 
                id="person2"
                label={t('searchRelationshipModal.person2')}
                people={people}
                selectedValue={person2}
                onSelect={(p) => setPerson2(p)}
            />

            {(isLoading || error || result) && (
                <div className="mt-4 p-4 rounded-lg bg-gray-700 border border-gray-600 min-h-[6rem] flex items-center justify-center">
                    {isLoading && (
                         <div className="text-center">
                            <svg className="animate-spin h-6 w-6 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-2 text-sm text-gray-300">{t('searchRelationshipModal.searching')}</p>
                        </div>
                    )}
                    {error && <p className="text-red-400 text-center">{error}</p>}
                    {result && <p className="text-cyan-400 text-center font-semibold text-lg">{result}</p>}
                </div>
            )}
        </div>
        <div className="flex justify-end gap-4 p-6 bg-gray-800 border-t border-gray-700 rounded-b-lg">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg shadow-md transition duration-300">
            {t('searchRelationshipModal.close')}
          </button>
          <button
            type="button"
            onClick={handleFindPath}
            disabled={!person1?.id || !person2?.id || isLoading}
            className="py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition duration-300 disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {t('searchRelationshipModal.findPath')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchRelationshipModal;