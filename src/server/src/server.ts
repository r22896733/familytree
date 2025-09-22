// FIX: Rename imported Request, Response, and NextFunction types to avoid collision with global types (e.g., from DOM).
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { 
    initializeDatabase, 
    getUserById, 
    getFamilyTree, 
    getAllPersonsFlat, 
    addPerson, 
    updatePerson, 
    deletePerson, 
    findRelationshipPath,
    logActivity,
    getLogs,
    findUserByPassword,
    getContributors,
    addContributor,
    updateContributor,
    deleteContributor,
    getVisitorCount
} from './database';
import { GoogleGenAI, Type } from '@google/genai';
import { Role, User } from './types';

// --- API Key Check ---
// Check for the API key at startup and provide a clear error message if it's missing.
if (!process.env.API_KEY) {
  console.error("\n\n\x1b[31m%s\x1b[0m", "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("\x1b[31m%s\x1b[0m", "!! ERROR: Google AI API key is not configured.      !!");
  console.error("\x1b[31m%s\x1b[0m", "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
  console.error("\x1b[33m%s\x1b[0m", "The AI-powered features of this application will not work without the API key.");
  console.error("\x1b[33m%s\x1b[0m", "Please set the API_KEY environment variable before starting the server.");
  console.error("\nExample (macOS/Linux):");
  console.error("  \x1b[36m%s\x1b[0m", "API_KEY=your_api_key_here npm start");
  console.error("\nExample (Windows Command Prompt):");
  console.error("  \x1b[36m%s\x1b[0m", "set API_KEY=your_api_key_here && npm start");
  console.error("\nExample (Windows PowerShell):");
  console.error("  \x1b[36m%s\x1b[0m", "$env:API_KEY=\"your_api_key_here\"; npm start\n");
  process.exit(1); // Exit the process with an error code
}

const app = express();
const port = 3001;

// Enable trusting proxy headers for IP address
app.set('trust proxy', true);

// Initialize GenAI client, assuming API_KEY is in the server's environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow larger payloads for base64 images

const getCityFromIp = async (ip: string): Promise<string | undefined> => {
    if (ip === '::1' || ip === '127.0.0.1') return 'Localhost';
    try {
        const prompt = `What city is the IP address ${ip} located in? Respond with only the city and country name, for example: "Mountain View, USA". If you cannot determine the city, respond with "Unknown".`;
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        const city = response.text.trim();
        return city !== "Unknown" ? city : undefined;
    } catch (error) {
        console.error(`Error getting city from IP ${ip}:`, error);
        return undefined;
    }
};

// --- Logging Middleware ---
// FIX: Add explicit types for req, res, and next to resolve middleware type errors.
app.use(async (req: Request, res: Response, next: NextFunction) => {
    // We only log GET requests that are likely page loads, not API calls from the client itself
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        try {
            const browser = req.headers['user-agent'] || 'Unknown';
            const city = await getCityFromIp(req.ip);
            await logActivity(req.ip, 'VISIT', `Visited ${req.path}`, undefined, city, browser);
        } catch (error) {
            console.error("Error in visitor logging middleware:", error);
        }
    }
    next();
});

// --- Auth Middleware ---
const isOwner = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { user } = req.body;
        if (!user || !user.id) {
            return res.status(401).json({ message: 'Authentication required.' });
        }
        const requestingUser = await getUserById(user.id);
        if (!requestingUser || requestingUser.role !== Role.Owner) {
            return res.status(403).json({ message: 'Forbidden: Owner access required.' });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: 'Internal server error during authorization.' });
    }
}


// --- API Routes ---

// POST /api/login - Authenticate a user with a password
app.post('/api/login', async (req: Request, res: Response) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ message: 'Password is required' });
    }

    try {
        const user = await findUserByPassword(password);
        if (user) {
            logActivity(req.ip, 'LOGIN_SUCCESS', `Logged in as ${user.role}`, user);
            res.json(user);
        } else {
            logActivity(req.ip, 'LOGIN_FAILURE', `Failed login attempt`);
            res.status(401).json({ message: 'Invalid password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error during login' });
    }
});


// POST /api/logs - Get all activity logs (Owner only)
app.post('/api/logs', async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        const user = await getUserById(userId);

        if (!user || user.role !== Role.Owner) {
            return res.status(403).json({ message: 'Forbidden: Access denied' });
        }

        const logs = await getLogs();
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get logs', error });
    }
});

// GET /api/visitors/count - Get the total number of unique visitors
app.get('/api/visitors/count', async (req: Request, res: Response) => {
    try {
        const count = await getVisitorCount();
        res.json({ count });
    } catch (error) {
        res.status(500).json({ message: 'Failed to get visitor count', error });
    }
});


// --- User Management Routes (Owner Only) ---

const userRouter = express.Router();
userRouter.use(isOwner);

// POST /api/contributors/list - Get a list of contributors (uses POST to send auth body)
userRouter.post('/list', async (req: Request, res: Response) => {
    try {
        const contributors = await getContributors();
        res.json(contributors);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get contributors', error });
    }
});

// POST /api/contributors - Add a new contributor
userRouter.post('/', async (req: Request, res: Response) => {
    try {
        const { name, password, user } = req.body;
        if (!name || !password) {
            return res.status(400).json({ message: 'Name and password are required.' });
        }
        const newContributor = await addContributor(name, password);
        logActivity(req.ip, 'ADD_CONTRIBUTOR', `Created contributor: ${name}`, user);
        res.status(201).json(newContributor);
    } catch (error) {
        res.status(500).json({ message: 'Failed to add contributor', error });
    }
});

// PUT /api/contributors/:id - Update an existing contributor
userRouter.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, password, user } = req.body;
         if (!name) {
            return res.status(400).json({ message: 'Name is required.' });
        }
        const updatedContributor = await updateContributor(id, name, password);
        logActivity(req.ip, 'UPDATE_CONTRIBUTOR', `Updated contributor: ${name}`, user);
        res.json(updatedContributor);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update contributor', error });
    }
});

// DELETE /api/contributors/:id - Delete a contributor
userRouter.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { user } = req.body;
        const result = await deleteContributor(id);
        logActivity(req.ip, 'DELETE_CONTRIBUTOR', `Deleted contributor ID: ${id}`, user);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete contributor', error });
    }
});

app.use('/api/contributors', userRouter);


// --- Family Tree Routes ---

// GET /api/tree - Get the full family tree
app.get('/api/tree', async (req: Request, res: Response) => {
    try {
        const { rootId } = req.query;
        const tree = await getFamilyTree(rootId as string | undefined);
        res.json(tree);
    } catch (error) {
        const err = error as Error;
        console.error('Error fetching family tree:', err.message);
        res.status(500).json({ message: err.message || 'Failed to get family tree' });
    }
});

// GET /api/persons - Get a flat list of all people
app.get('/api/persons', async (req: Request, res: Response) => {
    try {
        const people = await getAllPersonsFlat();
        res.json(people);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get all people', error });
    }
});

// POST /api/persons/add - Add a new person
app.post('/api/persons/add', async (req: Request, res: Response) => {
    try {
        const { personData, relationship, relativeToId, user } = req.body;
        if (!personData || !relationship || !relativeToId || !user) {
            return res.status(400).json({ message: 'Missing required fields for adding a person.' });
        }
        const newPerson = await addPerson(personData, relationship, relativeToId);
        logActivity(req.ip, 'CREATE_PERSON', `Added new person: ${newPerson.name}`, user);
        res.status(201).json(newPerson);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to add person', error });
    }
});

// PUT /api/persons/:id - Update an existing person
app.put('/api/persons/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { user, ...personData } = req.body;
        const updatedPerson = await updatePerson(id, personData);
        logActivity(req.ip, 'UPDATE_PERSON', `Updated details for: ${updatedPerson.name}`, user);
        res.json(updatedPerson);
    } catch (error) {
        res.status(500).json({ message: 'Failed to update person', error });
    }
});

// DELETE /api/persons/:id - Delete a person
app.delete('/api/persons/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { user } = req.body;
        const result = await deletePerson(id);
        logActivity(req.ip, 'DELETE_PERSON', `Deleted person: ${result.personName}`, user);
        res.json({ message: result.message });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete person', error });
    }
});

// --- AI-Powered Routes ---

// POST /api/relationship-path - Find the relationship between two people
app.post('/api/relationship-path', async (req: Request, res: Response) => {
    const { person1Id, person2Id, language } = req.body;
    if (!person1Id || !person2Id) {
        return res.status(400).json({ message: 'Two person IDs are required.' });
    }

    try {
        const path = await findRelationshipPath(person1Id, person2Id);
        if (!path) {
            return res.json({ path: null });
        }
        
        // Convert the structured path to a natural language string using Gemini
        const pathDescription = path.map(p => `${p.personName} (${p.relationship})`).join(' -> ');
        let prompt = `Convert the following family tree path into a simple, natural language sentence describing the relationship between the first and last person. For example, "A (start) -> B (parent) -> C (parent)" should become "C is the grandparent of A". Path: ${pathDescription}`;

        if (language === 'fa') {
            prompt += "\n\nPlease provide the response in Persian.";
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        
        res.json({ path: response.text });

    } catch (error) {
        console.error("Error finding relationship path:", error);
        res.status(500).json({ message: 'Failed to find relationship path' });
    }
});


// POST /api/geocode - Get coordinates for a location
app.post('/api/geocode', async (req: Request, res: Response) => {
    const { location } = req.body;
    if (!location) {
        return res.status(400).json({ message: 'Location is required.' });
    }
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Provide the latitude and longitude for "${location}". Respond with only a JSON object with "lat" and "lng" keys. For example: {"lat": 48.8566, "lng": 2.3522}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        lat: { type: Type.NUMBER },
                        lng: { type: Type.NUMBER }
                    },
                    required: ['lat', 'lng']
                }
            }
        });
        res.json(JSON.parse(response.text));
    } catch (error) {
        console.error(`Could not geocode location "${location}":`, error);
        res.status(500).json({ message: `Failed to geocode location: ${location}` });
    }
});


// POST /api/location-suggestions - Get location suggestions
app.post('/api/location-suggestions', async (req: Request, res: Response) => {
    const { query } = req.body;
    if (!query) {
        return res.status(400).json({ message: 'Query is required.' });
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Provide up to 5 location suggestions for the query "${query}". The locations should be real places. Respond with only a JSON array of strings, for example: ["San Francisco, CA, USA", "San Diego, CA, USA"]`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
      });
      res.json(JSON.parse(response.text));
    } catch (error) {
        console.error("Error fetching location suggestions:", error);
        res.status(500).json({ message: 'Failed to fetch location suggestions' });
    }
});


// --- Server Initialization ---
initializeDatabase().then(() => {
    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
}).catch(error => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
});
