import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { Person, Gender, Role, User, RelationshipType, LogEntry } from './types';
import crypto from 'crypto';

// FIX: Use sqlite3.Statement to match the database driver type.
let db: Database<sqlite3.Database, sqlite3.Statement>;

// --- Password Hashing Utilities ---
// In a real production app, use a stronger library like bcrypt or argon2.
// Node's built-in crypto is used here for simplicity and to avoid new dependencies.
const hashPassword = (password: string, salt: string): string => {
    return crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
};

const verifyPassword = (password: string, hash: string, salt: string): boolean => {
    const hashToVerify = hashPassword(password, salt);
    return hash === hashToVerify;
};


const initialFamilyData: Omit<Person, 'children' | 'spouse'>[] = [
    { id: '1', name: 'جهانگیر اسکندری', gender: Gender.Male, birthDate: '1880-03-15', deathDate: '1955-06-20', photoUrl: 'https://picsum.photos/id/1027/200/200', bio: 'Matriarch of the Vance family...', location: 'London, UK' },
    { id: 's1', name: 'فاطمه اسکندری', gender:Gender.Female, birthDate: '1885-07-22', deathDate: '1960-11-30', photoUrl: 'https://picsum.photos/id/1025/200/200', bio: 'Wife of جهانگیر اسکندری...', location: 'London, UK' }]

const relationships = [
    { personId: '1', spouseId: 's1' }
];

export async function initializeDatabase() {
    db = await open({
        filename: './familytree.db',
        driver: sqlite3.Database
    });

    // To apply schema changes, it's often easiest to drop and recreate in development.
    await db.exec('DROP TABLE IF EXISTS users;');
    await db.exec('DROP TABLE IF EXISTS persons;');
    await db.exec('DROP TABLE IF EXISTS activity_logs;');


    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            password_hash TEXT,
            salt TEXT
        );

        CREATE TABLE IF NOT EXISTS persons (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            gender TEXT NOT NULL,
            birthDate TEXT NOT NULL,
            deathDate TEXT,
            photoUrl TEXT,
            bio TEXT,
            location TEXT,
            parentId TEXT,
            spouseId TEXT,
            FOREIGN KEY (parentId) REFERENCES persons(id),
            FOREIGN KEY (spouseId) REFERENCES persons(id)
        );

        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            ip_address TEXT,
            user_id TEXT,
            user_name TEXT,
            action TEXT NOT NULL,
            details TEXT,
            city TEXT,
            browser TEXT
        );
    `);

    // Seed data if tables are empty
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
        // Default Owner
        const ownerSalt = crypto.randomBytes(16).toString('hex');
        const ownerHash = hashPassword('4723', ownerSalt);
        await db.run('INSERT INTO users (id, name, role, password_hash, salt) VALUES (?, ?, ?, ?, ?)',
            '1', '$$', Role.Owner, ownerHash, ownerSalt);

        // Default Contributor
        const contributorSalt = crypto.randomBytes(16).toString('hex');
        const contributorHash = hashPassword('2584', contributorSalt);
         await db.run('INSERT INTO users (id, name, role, password_hash, salt) VALUES (?, ?, ?, ?, ?)',
            '2', '(Contributor)', Role.Contributor, contributorHash, contributorSalt);
    }

    const personCount = await db.get('SELECT COUNT(*) as count FROM persons');
    if (personCount.count === 0) {
        const stmt = await db.prepare('INSERT INTO persons (id, name, gender, birthDate, deathDate, photoUrl, bio, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        for (const person of initialFamilyData) {
            await stmt.run(person.id, person.name, person.gender, person.birthDate, person.deathDate, person.photoUrl, person.bio, person.location);
        }
        await stmt.finalize();

        const updateStmt = await db.prepare('UPDATE persons SET parentId = ?, spouseId = ? WHERE id = ?');
        const personMap = new Map(relationships.map(r => [r.personId, r]));
         for (const person of initialFamilyData) {
            const rel = personMap.get(person.id);
            await updateStmt.run(rel?.parentId || null, rel?.spouseId || null, person.id);
        }
        await updateStmt.finalize();
    }
}

// --- User Management ---

export const getUserById = async (userId: string): Promise<User | undefined> => {
    return db.get('SELECT id, name, role FROM users WHERE id = ?', userId);
};

export const findUserByPassword = async (password: string): Promise<User | undefined> => {
    const users = await db.all('SELECT id, name, role, password_hash, salt FROM users');
    for (const user of users) {
        if (user.password_hash && user.salt && verifyPassword(password, user.password_hash, user.salt)) {
            // Return user without password info
            return { id: user.id, name: user.name, role: user.role };
        }
    }
    return undefined;
}

export const getContributors = async (): Promise<User[]> => {
    return db.all("SELECT id, name, role FROM users WHERE role = 'CONTRIBUTOR'");
}

export const addContributor = async (name: string, password?: string): Promise<User> => {
    const newId = `user-${Date.now()}`;
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = password ? hashPassword(password, salt) : null;
    await db.run(
        'INSERT INTO users (id, name, role, password_hash, salt) VALUES (?, ?, ?, ?, ?)',
        newId, name, Role.Contributor, hash, salt
    );
    return { id: newId, name, role: Role.Contributor };
};

export const updateContributor = async (id: string, name: string, password?: string): Promise<User> => {
    if (password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = hashPassword(password, salt);
        await db.run(
            'UPDATE users SET name = ?, password_hash = ?, salt = ? WHERE id = ? AND role = ?',
            name, hash, salt, id, Role.Contributor
        );
    } else {
        await db.run(
            'UPDATE users SET name = ? WHERE id = ? AND role = ?',
            name, id, Role.Contributor
        );
    }
    const updatedUser = await getUserById(id);
    if (!updatedUser) throw new Error("Failed to find updated contributor");
    return updatedUser;
};

export const deleteContributor = async (id: string): Promise<{ message: string }> => {
    const result = await db.run("DELETE FROM users WHERE id = ? AND role = 'CONTRIBUTOR'", id);
    if (result.changes === 0) {
        throw new Error("Contributor not found or user is not a contributor.");
    }
    return { message: "Contributor deleted successfully." };
};


// --- Person/Tree Management ---

export const getAllPersonsFlat = async (): Promise<Omit<Person, 'children' | 'spouse' | '_children'>[]> => {
    return db.all('SELECT id, name, gender, birthDate, deathDate, photoUrl, bio, location FROM persons');
}

export const getFamilyTree = async (rootId?: string): Promise<Person> => {
    const persons = await db.all('SELECT * FROM persons');
    
    if (persons.length === 0) {
        throw new Error('No persons found in the database.');
    }

    const personMap = new Map<string, Person>();
    const childIds = new Set<string>();

    // First pass: create nodes and identify all children
    persons.forEach(p => {
        personMap.set(p.id, { ...p, children: [] });
        if (p.parentId && p.parentId !== 'SPOUSE') {
            childIds.add(p.id);
        }
    });

    // Second pass: link children to parents and link spouses
    persons.forEach(p => {
        const personNode = personMap.get(p.id)!;
        
        if (p.spouseId) {
            const spouseNode = personMap.get(p.spouseId);
            if(spouseNode) {
                // To avoid circular references in JSON, we only add the spouse data, not the whole object with its own children
                personNode.spouse = {
                    id: spouseNode.id,
                    name: spouseNode.name,
                    gender: spouseNode.gender,
                    birthDate: spouseNode.birthDate,
                    deathDate: spouseNode.deathDate,
                    photoUrl: spouseNode.photoUrl,
                    bio: spouseNode.bio,
                    location: spouseNode.location,
                };
            }
        }

        if (p.parentId && p.parentId !== 'SPOUSE') {
            const parentNode = personMap.get(p.parentId);
            parentNode?.children?.push(personNode);
        }
    });
    
    // Third pass: find the root.
    let root: Person | null = null;
    if (rootId) {
        root = personMap.get(rootId);
        if (!root) {
            throw new Error(`Person with id ${rootId} not found.`);
        }
    } else {
        // Find all potential roots (nodes that are not children and not marked as spouse-only)
        const potentialRoots = persons
            .filter(p => !childIds.has(p.id) && p.parentId !== 'SPOUSE')
            .map(p => personMap.get(p.id)!);
        
        if (potentialRoots.length === 0) {
            // Fallback for corrupted tree or single-person tree
            if (personMap.size > 0) {
                root = personMap.values().next().value;
            }
        } else if (potentialRoots.length === 1) {
            root = potentialRoots[0];
        } else {
            // Multiple potential roots. This can happen if spouses without parents exist.
            // The true root is the one at the head of the largest tree fragment.
            let maxNodes = 0;
            
            const countNodes = (node: Person): number => {
                const childCount = node.children?.reduce((sum, child) => sum + countNodes(child), 0) || 0;
                return 1 + childCount;
            };

            for (const potentialRoot of potentialRoots) {
                const count = countNodes(potentialRoot);
                if (count > maxNodes) {
                    maxNodes = count;
                    root = potentialRoot;
                }
            }
        }
    }

    if (!root) throw new Error('Root person not found in the database. The tree structure may be corrupted.');
    return root;
}


export const addPerson = async (
    personData: Omit<Person, 'id' | 'children' | '_children' | 'spouse'>, 
    relationship: RelationshipType, 
    relativeToId: string
): Promise<Person> => {
    const newPersonId = `person-${Date.now()}`;
    const { name, gender, birthDate, deathDate, photoUrl, bio, location } = personData;

    await db.run(
        'INSERT INTO persons (id, name, gender, birthDate, deathDate, photoUrl, bio, location) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        newPersonId, name, gender, birthDate, deathDate, photoUrl, bio, location
    );
    
    switch (relationship) {
        case RelationshipType.Spouse:
            // Mark the new person as a non-hierarchical spouse node to prevent them from becoming a new root.
            await db.run("UPDATE persons SET parentId = 'SPOUSE' WHERE id = ?", newPersonId);
            // Link the two persons as spouses of each other.
            await db.run('UPDATE persons SET spouseId = ? WHERE id = ?', newPersonId, relativeToId);
            await db.run('UPDATE persons SET spouseId = ? WHERE id = ?', relativeToId, newPersonId);
            break;
        case RelationshipType.Child:
            await db.run('UPDATE persons SET parentId = ? WHERE id = ?', relativeToId, newPersonId);
            break;
        case RelationshipType.Sibling:
            const relative = await db.get('SELECT parentId FROM persons WHERE id = ?', relativeToId);
            if (relative && relative.parentId) {
                await db.run('UPDATE persons SET parentId = ? WHERE id = ?', relative.parentId, newPersonId);
            }
            break;
        case RelationshipType.Parent:
             // The person we are adding a relative to (e.g. the old root) gets a new parent.
            await db.run('UPDATE persons SET parentId = ? WHERE id = ?', newPersonId, relativeToId);
            break;
    }

    const newPerson = await db.get('SELECT * FROM persons WHERE id = ?', newPersonId);
    return newPerson;
};

export const updatePerson = async (
    personId: string, 
    personData: Omit<Person, 'id' | 'children' | '_children'>
) => {
    const { name, gender, birthDate, deathDate, photoUrl, bio, location, spouse } = personData;

    await db.run(
        'UPDATE persons SET name = ?, gender = ?, birthDate = ?, deathDate = ?, photoUrl = ?, bio = ?, location = ? WHERE id = ?',
        name, gender, birthDate, deathDate, photoUrl, bio, location, personId
    );

    if (spouse) {
        await db.run(
             'UPDATE persons SET name = ?, gender = ?, birthDate = ?, deathDate = ?, photoUrl = ?, bio = ?, location = ? WHERE id = ?',
             spouse.name, spouse.gender, spouse.birthDate, spouse.deathDate, spouse.photoUrl, spouse.bio, spouse.location, spouse.id
        );
    }
    
    return db.get('SELECT * FROM persons WHERE id = ?', personId);
};


export const deletePerson = async (personId: string) => {
    // This is a simplified delete. A full implementation would need to handle descendants recursively.
    // For now, we will just delete the person and orphan their children.
    // A better approach would be a recursive CTE in SQL, but for simplicity:
    const person = await db.get('SELECT * FROM persons WHERE id = ?', personId);
    if (!person) throw new Error("Person not found");

    // Unlink spouse
    if (person.spouseId) {
        await db.run('UPDATE persons SET spouseId = NULL WHERE id = ?', person.spouseId);
    }

    // A simple recursive delete would be better, but for now, we just delete the one node.
    // Real-world scenario would be: find all children, call deletePerson on them, then delete self.
    await db.run('DELETE FROM persons WHERE id = ?', personId);
    
    // Make children of deleted person orphans (new roots)
    await db.run('UPDATE persons SET parentId = NULL WHERE parentId = ?', personId);
    
    return { message: 'Person deleted successfully', personName: person.name };
};

export type PathSegment = {
  personId: string;
  personName: string;
  relationship: 'start' | 'parent' | 'child' | 'spouse';
};

export const findRelationshipPath = async (startId: string, endId: string): Promise<PathSegment[] | null> => {
    const persons = await db.all('SELECT id, name, parentId, spouseId FROM persons');
    const personMap = new Map(persons.map(p => [p.id, p]));
    const adj = new Map<string, string[]>();

    // Build adjacency list
    for (const person of persons) {
        if (!adj.has(person.id)) adj.set(person.id, []);

        // Parent-child relationship
        if (person.parentId && person.parentId !== 'SPOUSE') {
            if (!adj.has(person.parentId)) adj.set(person.parentId, []);
            adj.get(person.id)!.push(person.parentId);
            adj.get(person.parentId)!.push(person.id);
        }

        // Spouse relationship
        if (person.spouseId) {
             if (!adj.has(person.spouseId)) adj.set(person.spouseId, []);
            adj.get(person.id)!.push(person.spouseId);
            adj.get(person.spouseId)!.push(person.id);
        }
    }

    // BFS to find shortest path
    const queue: string[][] = [[startId]];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
        const path = queue.shift()!;
        const personId = path[path.length - 1];

        if (personId === endId) {
            // Path found, reconstruct with relationship types
            const detailedPath: PathSegment[] = [];
            for (let i = 0; i < path.length; i++) {
                const currentId = path[i];
                const currentPerson = personMap.get(currentId)!;
                if (i === 0) {
                    detailedPath.push({ personId: currentId, personName: currentPerson.name, relationship: 'start' });
                } else {
                    const prevId = path[i - 1];
                    const prevPerson = personMap.get(prevId)!;
                    let relationship: PathSegment['relationship'] = 'child'; // Default
                    if (prevPerson.parentId === currentId) relationship = 'parent';
                    else if (prevPerson.spouseId === currentId) relationship = 'spouse';
                    // The 'child' case is when currentPerson.parentId === prevId
                    
                    detailedPath.push({ personId: currentId, personName: currentPerson.name, relationship });
                }
            }
            return detailedPath;
        }

        const neighbors = adj.get(personId) || [];
        for (const neighborId of neighbors) {
            if (!visited.has(neighborId)) {
                visited.add(neighborId);
                const newPath = [...path, neighborId];
                queue.push(newPath);
            }
        }
    }

    return null; // No path found
};

// --- Logging Functions ---

export const logActivity = async (
    ip: string,
    action: string,
    details?: string,
    user?: { id: string, name: string },
    city?: string,
    browser?: string
) => {
    try {
        await db.run(
            'INSERT INTO activity_logs (ip_address, user_id, user_name, action, details, city, browser) VALUES (?, ?, ?, ?, ?, ?, ?)',
            ip, user?.id || null, user?.name || null, action, details || null, city || null, browser || null
        );
    } catch (error) {
        console.error("Failed to write to activity log:", error);
    }
};

export const getLogs = async (): Promise<LogEntry[]> => {
    return db.all('SELECT * FROM activity_logs ORDER BY timestamp DESC');
};

export const getVisitorCount = async (): Promise<number> => {
    const result = await db.get("SELECT COUNT(ip_address) as count FROM activity_logs WHERE action = 'VISIT'");
    return result.count || 0;
};