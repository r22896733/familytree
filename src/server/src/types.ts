export enum Gender {
  Male = 'MALE',
  Female = 'FEMALE',
  Other = 'OTHER',
}

export enum RelationshipType {
    Child = 'CHILD',
    Spouse = 'SPOUSE',
    Sibling = 'SIBLING',
    Parent = 'PARENT',
}

export interface Person {
  id: string;
  name: string;
  gender: Gender;
  birthDate: string;
  deathDate?: string;
  photoUrl: string;
  bio: string;
  location?: string;
  spouse?: Omit<Person, 'children' | 'spouse'>;
  children?: Person[];
  _children?: Person[]; // Used to store collapsed children
}

export enum Role {
  Owner = 'OWNER',
  Contributor = 'CONTRIBUTOR',
  Observer = 'OBSERVER',
}

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface ContributorData {
  name: string;
  password?: string;
}

export interface LogEntry {
  id: number;
  timestamp: string;
  ip_address: string;
  user_id?: string;
  user_name?: string;
  action: string;
  details: string;
  city?: string;
  browser?: string;
}