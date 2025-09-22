# FamilyTreeApp - Full Stack

This is a full-stack web application for creating, visualizing, and managing family trees. The frontend is built with React and D3.js, and the backend is a Node.js/Express server with a SQLite database.

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

## Project Structure

- `/` (Root): Contains the React frontend application and configuration files.
- `/server`: Contains the Node.js/Express backend application, including the database.

## How to Run

You will need two separate terminal windows to run both the backend server and the frontend development server.

### 1. Backend Server Setup

First, navigate to the server directory and install its dependencies.

```bash
# Go into the server directory
cd server

# Install server-specific dependencies
npm install

# Start the backend server
# The server will run on http://localhost:3001
# It will also create and initialize the familytree.db file on first run.
npm start
```

### 2. Frontend Client Setup

Open a **new terminal window**, navigate to the root project directory, and install the frontend dependencies.

```bash
# Make sure you are in the root directory of the project
# (If you are in the /server directory, run `cd ..`)

# Install frontend dependencies
npm install

# Start the frontend development server
# Your browser should automatically open to http://localhost:5173
npm run dev
```

The application should now be running in your browser, connected to your local backend server.

### Development Scripts

- **`npm run dev`** (in root): Starts the Vite development server for the React app.
- **`npm start`** (in `/server`): Starts the Node.js/Express server using `ts-node-dev` for automatic restarts on file changes.
