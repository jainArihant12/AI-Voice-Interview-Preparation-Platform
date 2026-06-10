/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const InterviewContext = createContext(null)

export function InterviewProvider({ children }) {
  const [sessionId, setSessionId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState([])
  const [transcript, setTranscript] = useState('')

  const addAnswer = (answer) => setAnswers((prev) => [...prev, answer])
  const nextQuestion = useCallback(() => {
    setCurrentQuestionIndex((prev) => {
      const maxIndex = Math.max(0, questions.length - 1)
      return Math.min(prev + 1, maxIndex)
    })
  }, [questions])

  const resetInterviewState = () => {
    setQuestions([])
    setCurrentQuestionIndex(0)
    setAnswers([])
    setTranscript('')
  }

  const value = useMemo(
    () => ({
      sessionId,
      setSessionId,
      questions,
      setQuestions,
      currentQuestionIndex,
      setCurrentQuestionIndex,
      answers,
      addAnswer,
      transcript,
      setTranscript,
      nextQuestion,
      resetInterviewState,
    }),
    [sessionId, questions, currentQuestionIndex, answers, transcript, nextQuestion]
  )

  return (
    <InterviewContext.Provider value={value}>{children}</InterviewContext.Provider>
  )
}

export const useInterview = () => useContext(InterviewContext)
