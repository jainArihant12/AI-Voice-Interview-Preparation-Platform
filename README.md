# 🎤 AI Voice Interview Preparation Platform

An AI-powered voice interview preparation platform that helps candidates practice real interview scenarios through interactive voice conversations. The platform uses Google's Gemini AI to conduct interviews, evaluate responses, provide feedback, and generate personalized improvement suggestions.

---

## 🚀 Features

### 🤖 AI-Powered Interviewer
- Conducts realistic interview sessions using Gemini AI
- Supports technical, behavioral, HR, and domain-specific interviews
- Dynamic follow-up questions based on candidate responses

### 🎙️ Voice-Based Interaction
- Speech-to-Text (STT) for candidate responses
- Text-to-Speech (TTS) for AI interviewer questions
- Real-time conversational experience

### 📊 Performance Analysis
- AI-generated feedback on answers
- Communication and confidence assessment
- Technical knowledge evaluation
- Strengths and weaknesses identification

### 📈 Interview Reports
- Detailed performance reports
- Answer quality scoring
- Improvement recommendations
- Historical interview tracking

### 👤 User Management
- User authentication and authorization
- Profile management
- Interview history dashboard

### 💼 Multiple Interview Types
- Software Engineering
- Frontend Developer
- Backend Developer
- Full Stack Developer
- Data Science
- Product Management
- HR & Behavioral Interviews

---

# 🛠️ Tech Stack

## Frontend
- React.js
- Redux Toolkit
- React Router
- Tailwind CSS
- Axios

## Backend
- Node.js
- Express.js

## Database
- MongoDB
- Mongoose ODM

## AI Integration
- Google Gemini AI API
- Prompt Engineering

## Voice Processing
- Web Speech API
- Speech Recognition API
- Text-to-Speech API

## Authentication
- JWT (JSON Web Tokens)
- bcrypt.js

## Deployment
- Frontend: Vercel / Netlify
- Backend: Render / Railway
- Database: MongoDB Atlas

---

# 📁 Project Structure

```bash
ai-voice-interview-platform/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── redux/
│   │   └── utils/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   ├── services/
│   ├── utils/
│   └── config/
│
├── docs/
├── .env
├── package.json
└── README.md
```

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/yourusername/ai-voice-interview-platform.git

cd ai-voice-interview-platform
```

## Install Frontend Dependencies

```bash
cd frontend

npm install
```

## Install Backend Dependencies

```bash
cd ../backend

npm install
```

---

# 🔑 Environment Variables

Create a `.env` file inside the server directory.

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

GEMINI_API_KEY=your_gemini_api_key

CLIENT_URL=http://localhost:3000
```

---

# ▶️ Running the Application

## Start Backend

```bash
cd server

npm run dev
```

## Start Frontend

```bash
cd client

npm start
```

Application will run at:

```bash
Frontend: http://localhost:3000

Backend: http://localhost:5000
```

---

# 🔄 Application Workflow

1. User registers or logs in.
2. User selects interview type and difficulty.
3. Gemini AI generates interview questions.
4. AI asks questions through voice output.
5. User answers via microphone.
6. Speech is converted to text.
7. Gemini AI evaluates responses.
8. AI generates scores and feedback.
9. Performance report is stored in MongoDB.
10. User reviews interview analytics.

---

# 🧠 AI Evaluation Metrics

The platform evaluates candidates based on:

- Technical Knowledge
- Problem Solving Ability
- Communication Skills
- Confidence Level
- Response Clarity
- Domain Expertise
- Behavioral Competency

---

# 🔒 Security Features

- JWT Authentication
- Password Hashing using bcrypt
- Protected Routes
- API Validation
- Rate Limiting
- Environment Variable Protection

---

# 📊 Future Enhancements

- Video Interview Support
- Resume-Based Question Generation
- AI Mock Group Discussions
- Real-Time Emotion Analysis
- Company-Specific Interview Sets
- Coding Interview Environment
- AI Career Guidance

---

# 🧪 Testing

```bash
npm run test
```

---


## Database

- MongoDB Atlas

---

# 🤝 Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit changes.
4. Push to your branch.
5. Create a Pull Request.

---

# 📄 License

This project is licensed under the MIT License.

---

# 👨‍💻 Author

Developed with ❤️ using MERN Stack and Google Gemini AI.
