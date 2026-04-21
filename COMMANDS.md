# Project Commands Reference

This document contains all development and build commands for the 1Stop Solutions project. All commands should be run from the **project root directory** unless otherwise specified.

## 📦 Package Management

### Install Dependencies
```bash
# Install all dependencies (root + nested packages if any)
npm install
```

### Update Dependencies
```bash
# Update packages (check package.json for versions)
npm update

# Update specific package
npm install package-name@latest
```

---

## 🚀 Development Commands

### Start Development Server
```bash
# Start main development server (default port: 5173)
npm run dev

# Access at: http://localhost:5173
# Supports hot module replacement (HMR) for fast development
```

---

## 🔨 Build Commands

### Type Checking
```bash
# TypeScript type checking only (no build)
npm run tsc
# Note: This is automatically included in build commands
```

### Build for Production

```bash
# Build main application (TypeScript check + Vite build - all sections)
npm run build
# OR explicitly:
npm run build:main

# Build specific sections individually:
npm run build:app          # Build App section (/App routes)
npm run build:admin        # Build Admin section (/Admin routes)
npm run build:mobile       # Build Mobile/ESS section (/Mobile routes)
npm run build:main-site    # Build Main Site section (marketing site)

# Build all sections sequentially
npm run build:all
```

**Build Output:**
- All builds output to: `dist/` directory
- Each section build uses its own config file:
  - `vite.config.app.ts` - App section
  - `vite.config.admin.ts` - Admin section
  - `vite.config.mobile.ts` - Mobile section
  - `vite.config.main-site.ts` - Main Site section

---

## 🧪 Testing & Quality

### Linting
```bash
# Run ESLint on all TypeScript/TSX files
npm run lint

# Lint checks:
# - TypeScript files (.ts, .tsx)
# - Reports unused disable directives
# - Max warnings: 0 (fails on warnings)
```

### Preview Production Build
```bash
# Preview production build locally
npm run preview
# Serves the dist/ folder on a local server
```

---

## 🚢 Deployment Commands

### Firebase Deployment

```bash
# Deploy everything (build + Firebase)
npm run deploy

# Deploy main build only
npm run deploy:main

# Deploy app build only
npm run deploy:app

# Deploy all builds
npm run deploy:all
```

### Manual Firebase Commands
```bash
# Build then deploy (manual)
npm run build && npx firebase deploy

# Deploy specific services
npx firebase deploy --only hosting
npx firebase deploy --only functions
npx firebase deploy --only database

# Login to Firebase
npx firebase login

# Check Firebase status
npx firebase projects:list
```

---

## 📁 Project Structure & Config Files

### Main Configuration Files
- **Build Config**: `vite.config.ts` (main), `vite.config.app.ts` (app-specific)
- **TypeScript Config**: `tsconfig.json`, `tsconfig.node.json`
- **Firebase Config**: `firebase.json`
- **Package Config**: `package.json` (root)

### Key Directories
```
/                    # Project root - run commands from here
├── admin/           # Admin panel application
├── app/             # Main application
├── mobile/          # Mobile/ESS application  
├── main-site/       # Marketing/main site
├── dist/            # Build output (generated)
└── node_modules/    # Dependencies (generated)
```

---

## 🔧 Common Workflows

### Full Development Workflow
```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Make changes (HMR will auto-reload)

# 4. Lint before committing
npm run lint

# 5. Build to test production
npm run build

# 6. Preview production build
npm run preview
```

### Deployment Workflow
```bash
# 1. Ensure all changes are committed
git status

# 2. Build for production
npm run build
# OR for all builds:
npm run build:all

# 3. Test build locally
npm run preview

# 4. Deploy to Firebase
npm run deploy
# OR manually:
npx firebase deploy
```

### Clean Build (Fresh Start)
```bash
# Remove build artifacts and dependencies
rm -rf dist node_modules

# Reinstall dependencies
npm install

# Fresh build
npm run build
```

---

## 📋 Scripts Summary

| Command | Description | Output |
|---------|-------------|--------|
| `npm run dev` | Start development server | Dev server on :5173 |
| `npm run build` | Build for production (all sections) | `dist/` directory |
| `npm run build:main` | Build main app (all sections) | `dist/` directory |
| `npm run build:app` | Build App section only | `dist/` directory |
| `npm run build:admin` | Build Admin section only | `dist/` directory |
| `npm run build:mobile` | Build Mobile/ESS section only | `dist/` directory |
| `npm run build:main-site` | Build Main Site section only | `dist/` directory |
| `npm run build:all` | Build all sections sequentially | `dist/` directory |
| `npm run lint` | Run ESLint | Console output |
| `npm run preview` | Preview production build | Preview server |
| `npm run deploy` | Build + deploy to Firebase | Deployed to Firebase |
| `npm run deploy:main` | Deploy main build (all sections) | Firebase hosting |
| `npm run deploy:app` | Build & deploy App section | Firebase hosting |
| `npm run deploy:admin` | Build & deploy Admin section | Firebase hosting |
| `npm run deploy:mobile` | Build & deploy Mobile section | Firebase hosting |
| `npm run deploy:main-site` | Build & deploy Main Site section | Firebase hosting |
| `npm run deploy:all` | Build & deploy all sections | Firebase hosting |

---

## ⚙️ Technology Stack & Versions

### Core Technologies
- **React**: ^18.3.1
- **TypeScript**: ^5.8.3
- **Vite**: ^6.3.5 (build tool)
- **Firebase**: ^11.9.1 (backend)
- **Material UI**: ^5.17.1 (UI library)
- **React Router**: ^7.6.2 (routing)

### Development Tools
- **ESLint**: ^9.28.0 (linting)
- **TypeScript ESLint**: ^8.34.0 (TypeScript linting)
- **Firebase Tools**: ^12.9.1 (Firebase CLI)

### Node.js Version
- **Required**: Node.js 18+ (check with `node --version`)

---

## 🔍 Troubleshooting

### Build Fails
```bash
# Check TypeScript errors
npx tsc --noEmit

# Clear cache and rebuild
rm -rf dist node_modules/.vite
npm run build
```

### Lint Errors
```bash
# View all lint issues
npm run lint

# Auto-fix some issues (if eslint --fix is available)
npx eslint . --ext ts,tsx --fix
```

### Firebase Deployment Issues
```bash
# Check Firebase login
npx firebase login

# View Firebase project
npx firebase projects:list

# Check deployment status
npx firebase deploy --only hosting --dry-run
```

---

## 📝 Notes

- **All commands must be run from project root** unless specified otherwise
- **Type checking is included in build commands** (`tsc && vite build`)
- **Development server uses Vite HMR** for instant updates
- **Firebase tools are run via npx** (no global install needed)
- **Build outputs go to `dist/`** directory (excluded from git)

---

## 🔄 Updating Dependencies

To update packages in the future:

1. **Check current versions**: Review `package.json`
2. **Update packages**: 
   ```bash
   npm update
   # OR for specific package:
   npm install package-name@latest
   ```
3. **Test after update**:
   ```bash
   npm run build
   npm run lint
   ```
4. **Update this document** if new scripts are added

---

**Last Updated**: Based on package.json from project root
**Main Package File**: `package.json`
**Build Tool**: Vite 6.3.5
**Type Checker**: TypeScript 5.8.3
