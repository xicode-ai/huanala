# Hua Na Le 花哪了

A modern expense tracking and finance application with AI insights. Built with React and Capacitor for Web, Android, and iOS.

## Features

- **Expense tracking** — Record and manage daily expenses with an intuitive interface
- **AI insights & chat** — Get financial insights and chat with AI assistant
- **Voice input** — Speech-to-text for quick expense logging and chat (Web + Android + iOS)
- **Cross-platform** — Single codebase for web and native mobile (Capacitor)

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS
- **State:** Zustand
- **Charts:** ECharts
- **Mobile:** Capacitor 8 (Android / iOS)
- **Speech:** Web Speech API (web), `@capacitor-community/speech-recognition` (native)

## Prerequisites

- **Node.js** 18+ (recommend 20+)
- **npm** or **pnpm**
- For mobile: Android Studio (Android) / Xcode (iOS)

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/xicode-ai/huanala.git
cd huanala
npm install
# or: pnpm install
```

### 2. Environment

Copy environment template and set your API key:

```bash
cp .env.example .env.local
# Edit .env.local and set GEMINI_API_KEY=your_key
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Scripts

| Command                 | Description              |
| ----------------------- | ------------------------ |
| `npm run dev`           | Start dev server         |
| `npm run build`         | Production build         |
| `npm run preview`       | Preview production build |
| `npm run lint`          | Run ESLint               |
| `npm run lint:fix`      | Fix ESLint issues        |
| `npm run format`        | Format with Prettier     |
| `npm run test`          | Run tests                |
| `npm run test:watch`    | Run tests in watch mode  |
| `npm run test:coverage` | Run tests with coverage  |

## Mobile (Android / iOS)

The project uses [Capacitor](https://capacitorjs.com/). To run on device or emulator:

```bash
# Build web assets first
npm run build

# Add platforms (if not already)
npx cap add android
npx cap add ios

# Sync and open in IDE
npx cap sync
npx cap open android   # or: npx cap open ios
```

Then build and run from Android Studio or Xcode. On mobile, voice input uses the native speech recognition engine.

## Project Structure

```
├── components/     # Reusable UI components
├── pages/         # Route pages (Home, Chat, Login, Settings, etc.)
├── hooks/         # React hooks (e.g. useSpeechToText)
├── services/      # API and speech-to-text services
├── stores/         # Zustand stores
├── android/        # Capacitor Android project
├── ios/            # Capacitor iOS project
└── ...
```

## License

See [LICENSE](LICENSE) for details.

---

If you find this project useful, consider giving it a star on GitHub.
