# AI Voice Interview Preparation Platform

A full-stack interview practice application that combines AI-powered question generation, voice-driven interview recording, resume-aware personalization, and online assessment support.

## Key Features

- User authentication and profile management
- Resume upload with AI resume analysis for customized interview questions
- Real-time interview sessions with audio transcription and answer recording
- AI-generated technical QA practice and online assessment sessions
- Session history, feedback storage, and interview result tracking
- Backend powered by Express, MongoDB, Google Gemini, and Whisper-based transcription
- Frontend built with React, Vite, Tailwind CSS and React Router

## Architecture

- `backend/` - Express server, MongoDB models, AI service integrations, authentication, resume parsing, and transcription endpoints
- `frontend/` - React app with protected routes, interview UI, assessment pages, profile flow, and voice recording components

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB database
- Google Gemini API key

### Setup

1. Clone the repository

```bash
git clone <repository-url> "AI Voice Interview Preparation Platform"
cd "AI Voice Interview Preparation Platform"
```

2. Install backend dependencies

```bash
cd backend
npm install
```

3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

4. Create backend environment file

Copy `backend/.env.example` to `backend/.env` and update the values:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/ai-mock-interview
DB_NAME=ai-mock-interview
JWT_SECRET=change_me_to_a_long_random_string
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-1.5-flash
CLIENT_URL=http://localhost:5173
```

## Running the App

### Start the backend

```bash
cd backend
npm run dev
```

### Start the frontend

```bash
cd frontend
npm run dev
```

The frontend should be available at `http://localhost:5173` and the backend at `http://localhost:5000`.

## API Overview

### Authentication

- `POST /api/auth/signup` - Create a user account
- `POST /api/auth/login` - Log in and receive authentication cookies
- `POST /api/auth/logout` - Log out
- `GET /api/auth/me` - Get current user profile
- `PATCH /api/auth/profile` - Update profile fields
- `POST /api/auth/profile/resume` - Upload a resume PDF

### Interview Practice

- `GET /api/interview/history` - Fetch user interview sessions
- `POST /api/interview/session` - Create a new interview session
- `DELETE /api/interview/:sessionId` - Delete an interview session
- `POST /api/interview/:sessionId/questions` - Generate interview questions
- `POST /api/interview/:sessionId/answer` - Submit an answer for a question
- `POST /api/interview/tech-qa` - Generate technical Q&A pairs

### Assessment

- `GET /api/assessment/history` - Get online assessment history
- `POST /api/assessment/session` - Start an assessment session
- `POST /api/assessment/:sessionId/submit` - Submit assessment answers
- `DELETE /api/assessment/:sessionId` - Delete an assessment session

### Speech-to-Text

- `GET /api/stt/warmup` - Load Whisper pipeline before transcription
- `POST /api/stt/transcribe` - Transcribe raw audio data

### Feedback

- `POST /api/feedback/:sessionId` - Save feedback for a session
- `GET /api/feedback/:sessionId` - Retrieve session feedback

## Project Structure

- `backend/`
  - `controllers/` - Request handlers
  - `routes/` - API routes
  - `models/` - MongoDB schemas
  - `services/` - AI and speech services
  - `middleware/` - Authentication middleware
  - `uploads/` - Uploaded resumes and files

- `frontend/`
  - `src/pages/` - Application views
  - `src/components/` - Shared UI components
  - `src/context/` - Auth and interview context providers
  - `src/hooks/` - Speech and recorder hooks
  - `src/services/` - API client helpers

## Notes

- Resume-based interview sessions parse uploaded PDF resumes and use AI to personalize questions
- Audio is expected as 16 kHz mono float32 PCM for transcription
- The app currently relies on Google Gemini for AI question generation and analysis

## Contribution

Feel free to add new interview modes, improve feedback scoring, or integrate additional AI models for richer assessment.

---

If you want, I can also add a shorter `frontend/README.md` or generate `docker-compose` support for this project.