import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AuthPage from './pages/AuthPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import InterviewSetupPage from './pages/InterviewSetupPage.jsx'
import LiveInterviewPage from './pages/LiveInterviewPage.jsx'
import InterviewResultPage from './pages/InterviewResultPage.jsx'
import OnlineAssessmentPage from './pages/OnlineAssessmentPage.jsx'
import ProfileCompletionPage from './pages/ProfileCompletionPage.jsx'
import TechQAPage from './pages/TechQAPage.jsx'
import AboutMePage from './pages/AboutMePage.jsx'

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/profile/complete"
          element={
            <ProtectedRoute>
              <ProfileCompletionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessment/tech-qa"
          element={
            <ProtectedRoute>
              <TechQAPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/assessment/online"
          element={
            <ProtectedRoute>
              <OnlineAssessmentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/about"
          element={
            <ProtectedRoute>
              <AboutMePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview/setup"
          element={
            <ProtectedRoute>
              <InterviewSetupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview/:sessionId"
          element={
            <ProtectedRoute>
              <LiveInterviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interview/:sessionId/result"
          element={
            <ProtectedRoute>
              <InterviewResultPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  )
}

export default App
