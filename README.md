# Research Hub

A React application for managing and analyzing research sessions, creating insights, and building a searchable repository of research nuggets.

## Features

- **Session Management**: Create new research sessions with participant details, recording URLs, and transcripts
- **Transcript Analysis**: Select text from transcripts to create research nuggets with insights and evidence
- **Repository Search**: Search through all research insights with filtering and sentiment analysis
- **Video Integration**: Link recordings with timestamp-based navigation
- **Tagging System**: Organize insights with customizable tags and categories

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run deploy` - Build and deploy to Firebase Hosting

## Usage

### Creating a New Session

1. Click "New Session" from the navigation
2. Fill in session details:
   - Title
   - Date
   - Session type (Interview, Usability Test, Feedback, Focus Group)
   - Participant name
   - Recording URL (Google Drive, YouTube, etc.)
3. Upload or paste your transcript
4. Click "Start Analysis" when ready

### Analyzing Transcripts

1. In the analysis view, select text from the transcript
2. Add your observation/insight
3. Tag the nugget with relevant categories
4. Click "Create Nugget" to save
5. Save the session when complete

### Repository Search

1. Navigate to "Repository" from the main menu
2. Use the search bar to find insights by:
   - Observation text
   - Evidence quotes
   - Session titles
   - Tags
3. View sentiment analysis and session details
4. Click "Watch" to jump to specific timestamps in recordings

## Technology Stack

- **React 18** - Frontend framework
- **Vite** - Build tool and development server
- **Tailwind CSS** - Styling framework
- **Lucide React** - Icon library

## Project Structure

```
src/
├── App.jsx          # Main application component
├── main.jsx         # Application entry point
└── index.css        # Global styles and Tailwind imports
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Deployment

This application is deployed on Firebase Hosting. See `FIREBASE_SETUP.md` for deployment instructions.

### Deploy to Firebase Hosting

1. Install Firebase CLI globally (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Build and deploy:
   ```bash
   npm run deploy
   ```

The app will be available at `https://gist-aa4c1.web.app` and `https://gist-aa4c1.firebaseapp.com`

## Firebase Configuration

This application uses Firebase Authentication and Firestore for user management and data storage. See `FIREBASE_SETUP.md` for setup instructions.

