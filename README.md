# Restaurant AI - Vite + React + Material UI + Firebase

A modern restaurant management platform built with Vite, React, Material UI, and Firebase.

## Features

- 🚀 **Fast Development** - Powered by Vite for lightning-fast HMR
- 🎨 **Modern UI** - Beautiful interface built with Material UI
- 📊 **Analytics Dashboard** - Real-time sales and performance tracking
- 👥 **Staff Management** - Employee performance and scheduling
- 📦 **Inventory Control** - Smart inventory optimization
- 🔥 **Firebase Integration** - Real-time database and analytics

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **UI Library**: Material UI
- **Routing**: React Router
- **Charts**: Recharts
- **Backend**: Firebase (Firestore, Analytics)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository
\`\`\`bash
git clone <repository-url>
cd restaurant-ai
\`\`\`

2. Install dependencies
\`\`\`bash
npm install
\`\`\`

3. Configure Firebase
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Firestore Database
   - Copy your Firebase config and update `src/firebase/config.ts`

4. Start the development server
\`\`\`bash
npm run dev
\`\`\`

5. Open http://localhost:3000 in your browser

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable Firestore Database
4. Go to Project Settings > General > Your apps
5. Add a web app and copy the config
6. Replace the config in `src/firebase/config.ts`

## Project Structure

\`\`\`
src/
├── components/          # Reusable UI components
├── pages/              # Page components
├── firebase/           # Firebase configuration and utilities
├── theme.ts           # Material UI theme configuration
├── App.tsx            # Main app component
└── main.tsx           # App entry point
\`\`\`

## Deployment

### Build for production
\`\`\`bash
npm run build
\`\`\`

### Deploy to Firebase Hosting
\`\`\`bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see LICENSE file for details
