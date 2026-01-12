# Lokah — The Video Downloader

> "From link to usable content in seconds."

A modern, professional video utility web app for downloading and repurposing public videos from YouTube, TikTok, and Instagram.

![Lokah](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎬 Features

- **Multi-Platform Support**: YouTube, TikTok, Instagram
- **Quality Selection**: 4K Ultra, Full HD, Standard, Audio Only
- **AI Insights**: Smart recommendations for optimal formats
- **No Signup Required**: Instant access, privacy-focused
- **Real-time Progress**: Live tracking of download/processing
- **Auto Cleanup**: Temporary files automatically removed

## 📁 Project Structure

```
LOKAH/
├── frontend/                    # Next.js 16 Frontend
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── page.tsx        # Landing page
│   │   │   └── analyze/[jobId] # Analysis dashboard
│   │   ├── components/         # UI components
│   │   │   └── ui/            # Shadcn components
│   │   ├── services/          # API client
│   │   └── lib/               # Utilities
│   └── ...
│
├── backend/                     # Express.js Backend
│   ├── config/                 # Environment config
│   ├── controllers/            # Request handlers
│   ├── routes/                 # API routes
│   ├── services/              # Business logic
│   │   ├── jobStore.js        # Job management
│   │   ├── videoEngine.js     # yt-dlp/ffmpeg wrapper
│   │   ├── platformDetector.js # URL parsing
│   │   └── cleanupService.js  # Auto cleanup
│   ├── workers/               # Background processors
│   ├── utils/                 # Helpers
│   ├── temp/                  # Temporary downloads
│   └── index.js               # Server entry
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+**
- **yt-dlp** - Video extraction engine
- **ffmpeg** - Video processing

#### Install yt-dlp & ffmpeg

**Windows (using Chocolatey):**
```bash
choco install yt-dlp ffmpeg
```

**macOS (using Homebrew):**
```bash
brew install yt-dlp ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg
pip install yt-dlp
```

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

Server starts at `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

App starts at `http://localhost:3000`

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check with engine status |
| POST | `/api/analyze` | Analyze video URL |
| POST | `/api/process` | Start download/processing |
| GET | `/api/progress/:jobId` | Get job progress |
| GET | `/api/download/:jobId` | Download processed file |
| DELETE | `/api/cleanup/:jobId` | Cancel and cleanup job |

### Example: Analyze Video

```bash
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

## ⚙️ Environment Variables

### Backend (.env)

```env
# Server
PORT=5000
APP_ENV=development

# Engines (must be in PATH or provide full path)
YTDLP_PATH=yt-dlp
FFMPEG_PATH=ffmpeg

# File Handling
TEMP_DIR=./temp
MAX_FILE_SIZE=1024
JOB_EXPIRY_MINUTES=15

# AI (optional)
OPENAI_API_KEY=

# Security
MAX_JOBS_PER_IP=10
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## 🛠 Tech Stack

### Frontend
- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Shadcn UI** - Component library
- **Lucide Icons** - Icons

### Backend
- **Express.js** - Web framework
- **yt-dlp** - Video extraction
- **ffmpeg** - Video processing
- **node-cron** - Scheduled cleanup

## 📋 Processing Pipeline

1. **Validate** - Check URL format and platform
2. **Detect** - Identify platform (YouTube/TikTok/Instagram)
3. **Metadata** - Fetch video info via yt-dlp
4. **Download** - Download selected quality
5. **Process** - Convert/extract via ffmpeg
6. **Ready** - Expose secure download endpoint
7. **Cleanup** - Auto-delete after expiry

## 🔒 Security

- Rate limiting per IP
- Input sanitization
- Temporary file isolation
- Auto cleanup
- No permanent storage
- Safe file naming

## 🚢 Deployment

### Backend (Railway/Render/Fly.io)

```bash
# Build
npm install

# Start
npm start
```

Required env vars: `PORT`, `YTDLP_PATH`, `FFMPEG_PATH`

### Frontend (Vercel/Netlify)

```bash
npm run build
```

Required env vars: `NEXT_PUBLIC_API_URL`

## 📝 Scripts

### Backend
```bash
npm start      # Production server
npm run dev    # Development with hot reload
```

### Frontend
```bash
npm run dev    # Development server
npm run build  # Production build
npm run lint   # ESLint check
```

## 🗺 Roadmap

- [ ] Clip & Trim functionality
- [ ] Auto captions/subtitles
- [ ] AI summaries
- [ ] Batch downloads
- [ ] User library (optional accounts)
- [ ] Browser extension

---

Built with ❤️ for creators.

**Lokah — From link to usable content in seconds.**
