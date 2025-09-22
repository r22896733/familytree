import { Person, RelationshipType, User, LogEntry, ContributorData } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

interface Coords {
    lat: number;
    lng: number;
}

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Server error');
    }
    return response.json();
};

const api = {
    login: async (password: string): Promise<User> => {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password }),
        });
        return handleResponse(response);
    },

    getLogs: async (userId: string): Promise<LogEntry[]> => {
        const response = await fetch(`${API_BASE_URL}/logs`, {
            method: 'POST', // Using POST to send body, could be GET with query params
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });
        return handleResponse(response);
    },
    
    getVisitorCount: async (): Promise<{ count: number }> => {
        const response = await fetch(`${API_BASE_URL}/visitors/count`);
        return handleResponse(response);
    },

    // --- User Management ---
    getContributors: async (owner: User): Promise<User[]> => {
        const response = await fetch(`${API_BASE_URL}/contributors/list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: owner }),
        });
        return handleResponse(response);
    },

    addContributor: async (data: ContributorData, owner: User): Promise<User> => {
        const response = await fetch(`${API_BASE_URL}/contributors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, user: owner }),
        });
        return handleResponse(response);
    },
    
    updateContributor: async (contributorId: string, data: ContributorData, owner: User): Promise<User> => {
        const response = await fetch(`${API_BASE_URL}/contributors/${contributorId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, user: owner }),
        });
        return handleResponse(response);
    },

    deleteContributor: async (contributorId: string, owner: User): Promise<{ message: string }> => {
        const response = await fetch(`${API_BASE_URL}/contributors/${contributorId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: owner }),
        });
        return handleResponse(response);
    },
    
    // --- Family Tree Data ---
    getFamilyTree: async (rootId?: string): Promise<Person> => {
        const url = rootId ? `${API_BASE_URL}/tree?rootId=${rootId}` : `${API_BASE_URL}/tree`;
        const response = await fetch(url);
        return handleResponse(response);
    },

    getAllPeople: async (): Promise<Omit<Person, 'children' | 'spouse' | '_children'>[]> => {
        const response = await fetch(`${API_BASE_URL}/persons`);
        return handleResponse(response);
    },
    
    addPerson: async (data: {
        relativeToId: string;
        relationship: RelationshipType;
        personData: Omit<Person, 'id' | 'children' | '_children' | 'spouse'>;
    }, user: User): Promise<Person> => {
        const response = await fetch(`${API_BASE_URL}/persons/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, user }),
        });
        return handleResponse(response);
    },

    updatePerson: async (personId: string, data: Omit<Person, 'id' | 'children' | '_children'>, user: User): Promise<Person> => {
        const response = await fetch(`${API_BASE_URL}/persons/${personId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...data, user }),
        });
        return handleResponse(response);
    },

    deletePerson: async (personId: string, user: User): Promise<{ message: string }> => {
        const response = await fetch(`${API_BASE_URL}/persons/${personId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user }),
        });
        return handleResponse(response);
    },

    geocodeLocation: async (location: string): Promise<Coords | null> => {
        try {
            const response = await fetch(`${API_BASE_URL}/geocode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location }),
            });
            if (!response.ok) { 
                console.error(`Geocoding failed for ${location} with status ${response.status}`);
                return null;
            }
            return response.json();
        } catch (error) {
            console.error(`Error calling geocode API for ${location}:`, error);
            return null;
        }
    },

    getLocationSuggestions: async (query: string): Promise<string[]> => {
        const response = await fetch(`${API_BASE_URL}/location-suggestions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        });
        return handleResponse(response);
    },

    findRelationshipPath: async (person1Id: string, person2Id: string, language: string): Promise<{ path: string | null }> => {
        const response = await fetch(`${API_BASE_URL}/relationship-path`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ person1Id, person2Id, language }),
        });
        return handleResponse(response);
    }
};

export default api;