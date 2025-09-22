import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Person, RelationshipType, Role } from './types';
import FamilyTree from './components/FamilyTree';
import ProfilePanel from './components/ProfilePanel';
import AddRelativeModal from './components/AddRelativeModal';
import EditPersonModal from './components/EditPersonModal';
import GenerationControls from './components/GenerationControls';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import MapView from './components/MapView';
import LoginModal from './components/LoginModal';
import ViewLogsModal from './components/ViewLogsModal';
import SearchRelationshipModal from './components/SearchRelationshipModal';
import UserManagementModal from './components/UserManagementModal';
import { MapIcon, TreeIcon, RefreshIcon, SearchIcon, ClipboardIcon, UsersIcon, EyeIcon } from './components/Icons';
import { useAuth } from './contexts/AuthContext';
import { useLanguage } from './contexts/LanguageContext';
import api from './services/api';

const App: React.FC = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [data, setData] = useState<Person | null>(null);
  const [allPeople, setAllPeople] = useState<Omit<Person, 'children' | 'spouse' | '_children'>[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [addingRelativeTo, setAddingRelativeTo] = useState<Person | null>(null);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<Person | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isUserManagementModalOpen, setIsUserManagementModalOpen] = useState(false);
  const [collapsedLevels, setCollapsedLevels] = useState<Set<number>>(new Set());
  const [view, setView] = useState<'TREE' | 'MAP'>('TREE');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDefaultRoot, setIsDefaultRoot] = useState(true);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  const canEdit = user && user.role !== Role.Observer;

  useEffect(() => {
    if (language === 'fa') {
        document.documentElement.setAttribute('dir', 'rtl');
        document.documentElement.setAttribute('lang', 'fa');
    } else {
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', 'en');
    }
  }, [language]);
  
  const fetchVisitorCount = useCallback(async () => {
    try {
      const data = await api.getVisitorCount();
      setVisitorCount(data.count);
    } catch (error) {
      console.error("Failed to fetch visitor count:", error);
    }
  }, []);

  useEffect(() => {
    fetchVisitorCount(); // Fetch immediately on mount
    const intervalId = setInterval(fetchVisitorCount, 10000); // Poll every 10 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [fetchVisitorCount]);

  const toggleLanguage = () => {
    setLanguage(current => current === 'en' ? 'fa' : 'en');
  };

  const fetchTreeData = useCallback(async (rootId?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const [treeData, allPeopleData] = await Promise.all([
        api.getFamilyTree(rootId),
        api.getAllPeople()
      ]);
      setData(treeData);
      setAllPeople(allPeopleData);
      setIsDefaultRoot(!rootId);
    } catch (err) {
      setError(t('app.errorBody'));
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const refreshAllData = useCallback(async (currentRootId?: string) => {
    try {
      const [treeData, allPeopleData] = await Promise.all([
        api.getFamilyTree(currentRootId),
        api.getAllPeople()
      ]);
      setData(treeData);
      setAllPeople(allPeopleData);
    } catch (error) {
       console.error("Failed to refresh data:", error);
    }
  }, []);

  useEffect(() => {
    fetchTreeData();
  }, [fetchTreeData]);

  const handleNodeClick = useCallback((person: Person) => {
    setSelectedPerson(person);
  }, []);
  
  const handleSpouseClick = useCallback((spouse: Omit<Person, 'children' | 'spouse'>) => {
    // We can cast here because ProfilePanel doesn't need children/spouse properties
    setSelectedPerson(spouse as Person);
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedPerson(null);
  }, []);

  const handleOpenAddRelativeModal = useCallback((target: Person) => {
    if (!canEdit) return;
    setAddingRelativeTo(target);
  }, [canEdit]);

  const handleCloseAddRelativeModal = useCallback(() => {
    setAddingRelativeTo(null);
  }, []);

  const handleSaveRelative = useCallback(async (newPersonData: Omit<Person, 'id' | 'children' | '_children' | 'spouse'>, relationship: RelationshipType) => {
    if (!addingRelativeTo || !canEdit || !user) return;

    try {
      await api.addPerson({
        relativeToId: addingRelativeTo.id,
        relationship,
        personData: newPersonData
      }, user);
      await refreshAllData(data?.id); // Refresh data from server, keeping current root
    } catch (error) {
      console.error("Failed to save relative:", error);
      alert("Error: Could not save the new relative.");
    }
    
    handleCloseAddRelativeModal();
  }, [addingRelativeTo, handleCloseAddRelativeModal, canEdit, refreshAllData, data, user]);

  const handleOpenEditModal = useCallback((person: Person) => {
    if (!canEdit) return;
    setEditingPerson(person);
  }, [canEdit]);

  const handleCloseEditModal = useCallback(() => {
    setEditingPerson(null);
  }, []);

  const handleUpdatePerson = useCallback(async (updatedData: Omit<Person, 'id' | 'children' | '_children'>) => {
    if (!editingPerson || !canEdit || !user) return;
    try {
      await api.updatePerson(editingPerson.id, updatedData, user);
      await refreshAllData(data?.id); // Refresh data from server, keeping current root

      if (selectedPerson && selectedPerson.id === editingPerson.id) {
          // Find the updated person data from the refreshed list
          const refreshedPeople = await api.getAllPeople();
          const updatedSelectedPerson = refreshedPeople.find(p => p.id === editingPerson.id);
          if (updatedSelectedPerson) {
             // Create a Person object for the profile panel
             const personForPanel: Person = {
                ...updatedSelectedPerson,
                // These might be stale, but are needed for the type.
                // A full refresh of the selected person would be better.
                children: selectedPerson.children, 
                spouse: selectedPerson.spouse
             };
             setSelectedPerson(personForPanel);
          }
      }
    } catch (error) {
       console.error("Failed to update person:", error);
       alert("Error: Could not update person's details.");
    }
    handleCloseEditModal();
  }, [editingPerson, selectedPerson, handleCloseEditModal, canEdit, refreshAllData, data, user]);

  const handleOpenDeleteModal = useCallback((person: Person) => {
    if (!canEdit) return;
    setDeletingPerson(person);
  }, [canEdit]);

  const handleCloseDeleteModal = useCallback(() => {
    setDeletingPerson(null);
  }, []);

  const handleDeletePerson = useCallback(async (personId: string) => {
    if (!canEdit || !data || !user) return;
    if (personId === data.id && isDefaultRoot) {
      alert(t('app.deleteRootError'));
      handleCloseDeleteModal();
      return;
    }

    try {
      await api.deletePerson(personId, user);
      setSelectedPerson(null);
      // If we deleted the current root, reset to the default tree
      const rootIdToFetch = personId === data.id ? undefined : data.id;
      await fetchTreeData(rootIdToFetch); // Full refresh
    } catch (error) {
      console.error("Failed to delete person:", error);
      alert("Error: Could not delete the person.");
    }
    handleCloseDeleteModal();
  }, [data, handleCloseDeleteModal, canEdit, fetchTreeData, isDefaultRoot, t, user]);
  
  const handleSetAsRoot = useCallback(async (personId: string) => {
    await fetchTreeData(personId);
    setSelectedPerson(null);
    setCollapsedLevels(new Set());
  }, [fetchTreeData]);

  const handleResetTree = useCallback(async () => {
    await fetchTreeData();
    setSelectedPerson(null);
    setCollapsedLevels(new Set());
  }, [fetchTreeData]);


  const { maxDepth } = useMemo(() => {
    if (!data) return { maxDepth: 0 };
    let max = 0;
    const findDepth = (node: Person, depth: number) => {
      if (depth > max) max = depth;
      if (node.children) node.children.forEach(child => findDepth(child, depth + 1));
      if (node._children) node._children.forEach(child => findDepth(child, depth + 1));
    };
    findDepth(data, 0);
    return { maxDepth: max };
  }, [data]);

  const handleToggleGeneration = useCallback((level: number) => {
    if (!data) return;
    setCollapsedLevels(prev => {
        const newSet = new Set(prev);
        if (newSet.has(level)) {
            newSet.delete(level);
        } else {
            newSet.add(level);
        }
        return newSet;
    });

    const isCollapsing = !collapsedLevels.has(level);
    
    const traverse = (node: Person, depth: number): Person => {
        const newNode = {...node};
        if (depth === level - 1) { 
            if(isCollapsing) {
                if (newNode.children) {
                    newNode._children = [...(newNode._children || []), ...newNode.children];
                    delete newNode.children;
                }
            } else {
                if (newNode._children) {
                    newNode.children = [...(newNode.children || []), ...newNode._children];
                    delete newNode._children;
                }
            }
        }

        if (newNode.children) {
            newNode.children = newNode.children.map(child => traverse(child, depth + 1));
        }
        if (newNode._children) {
            newNode._children = newNode._children.map(child => traverse(child, depth + 1));
        }

        return newNode;
    };

    setData(currentData => traverse(currentData!, 0));
}, [collapsedLevels, data]);

  const handleNodeToggleById = useCallback((nodeId: string) => {
    if (!data) return;

    const traverseAndToggle = (person: Person): Person => {
      // Create a shallow copy to maintain immutability
      const newPerson = { ...person };

      if (newPerson.id === nodeId) {
        if (newPerson.children) {
          newPerson._children = newPerson.children;
          delete newPerson.children;
        } else if (newPerson._children) {
          newPerson.children = newPerson._children;
          delete newPerson._children;
        }
        return newPerson;
      }

      // Recursively process children and _children
      if (newPerson.children) {
        newPerson.children = newPerson.children.map(traverseAndToggle);
      }
      if (newPerson._children) {
        newPerson._children = newPerson._children.map(traverseAndToggle);
      }

      return newPerson;
    };

    // Set the state with the new, transformed data structure
    setData(currentData => traverseAndToggle(currentData!));
  }, [data]);

  const toggleView = () => {
    setSelectedPerson(null);
    setView(currentView => currentView === 'TREE' ? 'MAP' : 'TREE');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-lg">{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
     return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center bg-gray-800 p-8 rounded-lg border border-red-500">
          <h2 className="text-2xl font-bold text-red-500 mb-4">{t('app.errorTitle')}</h2>
          <p>{error}</p>
          <button onClick={() => fetchTreeData()} className="mt-6 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg shadow-md hover:bg-cyan-700 transition-colors">
            {t('app.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dark flex flex-col h-screen bg-gray-900 text-gray-200 font-sans">
      <header className="bg-gray-800 border-b border-gray-700 shadow-md p-4 z-20 flex justify-between items-center">
        <div className="flex items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-wider">{t('header.title')}</h1>
                <p className="text-sm text-gray-400">{t('header.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2 bg-gray-700 text-sm text-cyan-400 font-semibold px-3 py-1 rounded-full" title={t('header.totalVisitorsTooltip')}>
                <EyeIcon className="w-5 h-5" />
                <span>{visitorCount !== null ? visitorCount : '...'}</span>
            </div>
        </div>
        <div className="flex items-center gap-4">
            <button
                onClick={toggleLanguage}
                className="px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-cyan-600 transition-colors"
            >
                {t('header.language')}
            </button>
            {!isDefaultRoot && (
                <button
                    onClick={handleResetTree}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-700 transition-colors"
                    aria-label="Reset Tree to default view"
                >
                    <RefreshIcon className="w-5 h-5" />
                    <span>{t('header.resetTree')}</span>
                </button>
            )}
            <button
                onClick={() => setIsSearchModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-cyan-600 transition-colors"
                aria-label={t('header.searchRelationship')}
            >
                <SearchIcon className="w-5 h-5" />
                <span>{t('header.search')}</span>
            </button>
            <button
                onClick={toggleView}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-cyan-600 transition-colors"
                aria-label={`Switch to ${view === 'TREE' ? 'Map' : 'Tree'} View`}
            >
                {view === 'TREE' ? <MapIcon className="w-5 h-5" /> : <TreeIcon className="w-5 h-5" />}
                <span>{view === 'TREE' ? t('header.mapView') : t('header.treeView')}</span>
            </button>

            {user.role === Role.Owner && (
              <>
                <button 
                    onClick={() => setIsUserManagementModalOpen(true)} 
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors"
                >
                    <UsersIcon className="w-5 h-5" />
                    <span>{t('header.userManagement')}</span>
                </button>
                <button 
                    onClick={() => setIsLogsModalOpen(true)} 
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors"
                >
                    <ClipboardIcon className="w-5 h-5" />
                    <span>{t('header.viewLogs')}</span>
                </button>
              </>
            )}

            <div className="h-8 border-l border-gray-600"></div>

            <div className="bg-gray-700 text-sm text-cyan-400 font-semibold px-3 py-1.5 rounded-full">
                {user.name}
            </div>

            {user.role === Role.Observer ? (
                <button onClick={() => setIsLoginModalOpen(true)} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors">
                    {t('header.login')}
                </button>
            ) : (
                <button onClick={logout} className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors">
                    {t('header.logout')}
                </button>
            )}
        </div>
      </header>
      <main className="flex-grow relative overflow-hidden">
        {data && view === 'TREE' ? (
          <>
            <FamilyTree data={data} onNodeClick={handleNodeClick} onSpouseClick={handleSpouseClick} onAddRelative={handleOpenAddRelativeModal} canEdit={canEdit} onNodeToggle={handleNodeToggleById} />
            <GenerationControls maxDepth={maxDepth} collapsedLevels={collapsedLevels} onToggle={handleToggleGeneration} />
          </>
        ) : data && (
          <MapView data={data} onMarkerClick={handleNodeClick}/>
        )}
        <ProfilePanel 
            person={selectedPerson} 
            onClose={handleClosePanel} 
            onEdit={handleOpenEditModal}
            onDelete={handleOpenDeleteModal}
            onSetAsRoot={handleSetAsRoot}
            isRoot={selectedPerson?.id === data?.id}
            canEdit={canEdit}
        />
        {addingRelativeTo && data && (
            <AddRelativeModal 
                targetPerson={addingRelativeTo}
                isRoot={addingRelativeTo.id === data.id}
                onClose={handleCloseAddRelativeModal}
                onSave={handleSaveRelative}
            />
        )}
        {editingPerson && (
            <EditPersonModal
                person={editingPerson}
                onClose={handleCloseEditModal}
                onSave={handleUpdatePerson}
            />
        )}
        {deletingPerson && (
            <DeleteConfirmationModal
                person={deletingPerson}
                onClose={handleCloseDeleteModal}
                onConfirm={handleDeletePerson}
            />
        )}
        {isSearchModalOpen && (
            <SearchRelationshipModal
                people={allPeople}
                onClose={() => setIsSearchModalOpen(false)}
            />
        )}
        {isLoginModalOpen && (
            <LoginModal
                onClose={() => setIsLoginModalOpen(false)}
            />
        )}
        {isLogsModalOpen && user.role === Role.Owner && (
            <ViewLogsModal
                userId={user.id}
                onClose={() => setIsLogsModalOpen(false)}
            />
        )}
        {isUserManagementModalOpen && user.role === Role.Owner && (
            <UserManagementModal
                owner={user}
                onClose={() => setIsUserManagementModalOpen(false)}
            />
        )}
      </main>
    </div>
  );
};

export default App;