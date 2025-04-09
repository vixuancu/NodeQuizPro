import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/student-layout';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Flag,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import MathFormula, { renderTextWithMath } from '@/components/math-formula';

export default function ExamTaking() {
  const { examId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<number[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false);
  const [submissionState, setSubmissionState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  
  const intervalRef = useRef<number | null>(null);
  
  // Fetch exam details
  const { 
    data: exam,
    isLoading: isLoadingExam,
    isError: isErrorExam,
  } = useQuery({
    queryKey: ['/api/exams', examId],
    queryFn: async () => {
      const res = await fetch(`/api/exams/${examId}`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch exam details');
      }
      
      return res.json();
    },
  });
  
  // Fetch exam questions
  const { 
    data: questions,
    isLoading: isLoadingQuestions,
    isError: isErrorQuestions,
  } = useQuery({
    queryKey: ['/api/exams', examId, 'questions'],
    queryFn: async () => {
      const res = await fetch(`/api/exams/${examId}/questions`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch questions');
      }
      
      return res.json();
    },
    enabled: !!examId,
  });
  
  // Fetch existing submission if any
  const { 
    data: existingSubmission,
    isLoading: isLoadingSubmission,
  } = useQuery({
    queryKey: ['/api/submissions/student'],
    queryFn: async () => {
      const res = await fetch('/api/submissions/student', {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch submissions');
      }
      
      const submissions = await res.json();
      return submissions.find((sub: any) => 
        sub.examId === parseInt(examId as string) && 
        sub.status === 'in_progress'
      );
    },
  });
  
  // Submit exam mutation
  const submitExamMutation = useMutation({
    mutationFn: async (answers: { questionId: number, answer: string }[]) => {
      const res = await apiRequest('POST', `/api/exams/${examId}/submit`, { answers });
      return await res.json();
    },
    onSuccess: (data) => {
      setSubmissionState('success');
      queryClient.invalidateQueries({ queryKey: ['/api/submissions/student'] });
      // Redirect to results page after a short delay
      setTimeout(() => {
        navigate(`/student/results?submissionId=${data.id}`);
      }, 1500);
    },
    onError: (error: Error) => {
      setSubmissionState('error');
      toast({
        title: 'Submission failed',
        description: error.message || 'Failed to submit exam. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Initialize timer when exam data is available
  useEffect(() => {
    if (exam && !timeRemaining) {
      const endTime = new Date(exam.endTime).getTime();
      const now = new Date().getTime();
      const initialTimeRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
      
      setTimeRemaining(initialTimeRemaining);
    }
  }, [exam, timeRemaining]);
  
  // Set up timer
  useEffect(() => {
    if (timeRemaining !== null && intervalRef.current === null) {
      intervalRef.current = window.setInterval(() => {
        setTimeRemaining((prevTime) => {
          if (prevTime === null || prevTime <= 0) {
            clearInterval(intervalRef.current as number);
            intervalRef.current = null;
            setShowTimeUpDialog(true);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timeRemaining]);
  
  // Load existing answers if there is an in-progress submission
  useEffect(() => {
    if (existingSubmission && questions) {
      // Assuming we get the answers with the submission
      const answers: Record<number, string> = {};
      if (existingSubmission.answers) {
        existingSubmission.answers.forEach((answer: any) => {
          answers[answer.questionId] = answer.answer;
        });
        setUserAnswers(answers);
      }
    }
  }, [existingSubmission, questions]);
  
  // Check if the current question has been answered
  const isCurrentQuestionAnswered = () => {
    if (!questions) return false;
    const questionId = questions[currentQuestionIndex]?.id;
    return questionId in userAnswers;
  };
  
  // Check if the current question is flagged
  const isCurrentQuestionFlagged = () => {
    return flaggedQuestions.includes(currentQuestionIndex);
  };
  
  // Format time remaining
  const formatTimeRemaining = () => {
    if (timeRemaining === null) return '00:00';
    
    const hours = Math.floor(timeRemaining / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;
    
    return `${hours > 0 ? `${hours.toString().padStart(2, '0')}:` : ''}${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    if (!questions) return;
    
    const questionId = questions[currentQuestionIndex].id;
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };
  
  // Handle navigation to next question
  const handleNextQuestion = () => {
    if (!questions) return;
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  // Handle navigation to previous question
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  // Handle direct navigation to a specific question
  const handleGoToQuestion = (index: number) => {
    if (!questions) return;
    
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };
  
  // Handle flagging/unflagging a question
  const handleToggleFlag = () => {
    if (isCurrentQuestionFlagged()) {
      setFlaggedQuestions(flaggedQuestions.filter(i => i !== currentQuestionIndex));
    } else {
      setFlaggedQuestions([...flaggedQuestions, currentQuestionIndex]);
    }
  };
  
  // Handle exam submission
  const handleSubmitExam = () => {
    if (!questions) return;
    
    // Check if all questions are answered
    const totalQuestions = questions.length;
    const answeredQuestions = Object.keys(userAnswers).length;
    
    if (answeredQuestions < totalQuestions) {
      // Not all questions are answered, show warning dialog
      setShowSubmitDialog(true);
    } else {
      // All questions are answered, submit directly
      submitExam();
    }
  };
  
  // Submit the exam
  const submitExam = () => {
    if (!questions) return;
    
    setSubmissionState('submitting');
    
    // Format answers for API
    const formattedAnswers = Object.entries(userAnswers).map(([questionId, answer]) => ({
      questionId: parseInt(questionId),
      answer,
    }));
    
    submitExamMutation.mutate(formattedAnswers);
  };
  
  // Check if exam is available to take
  const isExamAvailable = () => {
    if (!exam) return false;
    
    const now = new Date();
    const startTime = new Date(exam.startTime);
    const endTime = new Date(exam.endTime);
    
    return startTime <= now && endTime >= now;
  };
  
  // If exam is not available and is not loading, redirect to exams page
  useEffect(() => {
    if (!isLoadingExam && exam && !isExamAvailable() && submissionState === 'idle') {
      toast({
        title: 'Exam not available',
        description: 'This exam is not currently available to take.',
        variant: 'destructive',
      });
      navigate('/student/exams');
    }
  }, [exam, isLoadingExam, submissionState]);
  
  const currentQuestion = questions?.[currentQuestionIndex];
  
  // Calculate the total number of answered questions
  const answeredQuestionsCount = Object.keys(userAnswers).length;
  const totalQuestions = questions?.length || 0;
  
  return (
    <StudentLayout>
      <div className="px-4 py-6">
        {isLoadingExam || isLoadingQuestions ? (
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Card className="bg-white shadow-lg">
              <CardContent className="p-6">
                <div className="flex justify-between items-center pb-4 border-b">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <div className="mt-6">
                  <Skeleton className="h-8 w-3/4 mb-6" />
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : isErrorExam || isErrorQuestions ? (
          <div className="max-w-4xl mx-auto text-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Exam</h2>
            <p className="text-gray-600 mb-6">There was a problem loading the exam. Please try again later.</p>
            <Button onClick={() => navigate('/student/exams')}>
              Return to Exams
            </Button>
          </div>
        ) : submissionState === 'success' ? (
          <div className="max-w-4xl mx-auto text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Submitted!</h2>
            <p className="text-gray-600 mb-6">Your answers have been successfully submitted. Redirecting to results page...</p>
            <div className="animate-pulse">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{exam?.title}</h2>
                <p className="text-gray-600">
                  {exam?.subject} • {exam?.class}
                </p>
              </div>
              <div className="bg-blue-100 text-primary px-4 py-2 rounded-lg font-medium flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                Time Remaining: <span className="ml-1">{formatTimeRemaining()}</span>
              </div>
            </div>
            
            <Card className="bg-white shadow-lg">
              {/* Exam Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col md:flex-row justify-between">
                  <div>
                    <div className="text-sm text-gray-600">
                      Question {currentQuestionIndex + 1} of {questions?.length}
                    </div>
                  </div>
                  <div className="mt-2 md:mt-0 flex items-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handlePrevQuestion}
                      disabled={currentQuestionIndex === 0}
                      className="flex items-center"
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleNextQuestion}
                      disabled={currentQuestionIndex === (questions?.length || 0) - 1}
                      className="flex items-center"
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Question Content */}
              <CardContent className="p-6">
                <div className="text-lg font-medium text-gray-900 mb-6">
                  {currentQuestion && renderTextWithMath(currentQuestion.content)}
                </div>
                
                {/* Answer Options */}
                <div className="space-y-4">
                  {currentQuestion && ['A', 'B', 'C', 'D'].map((option) => {
                    const questionId = currentQuestion.id;
                    return (
                      <div 
                        key={option} 
                        className={`p-4 rounded-md border ${
                          userAnswers[questionId] === option 
                            ? 'border-primary bg-primary/5' 
                            : 'border-gray-200 hover:bg-gray-50'
                        } cursor-pointer transition-colors`}
                        onClick={() => handleAnswerSelect(option)}
                      >
                        <RadioGroup 
                          value={userAnswers[questionId] || ''} 
                          onValueChange={handleAnswerSelect}
                        >
                          <div className="flex items-start">
                            <div className="flex items-center h-5">
                              <RadioGroupItem value={option} id={`option-${option}`} />
                            </div>
                            <Label 
                              htmlFor={`option-${option}`}
                              className="ml-3 text-sm cursor-pointer flex-1"
                            >
                              <span className="font-medium mr-2">{option}.</span>
                              {renderTextWithMath(currentQuestion.options[option])}
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
              
              {/* Question Navigation */}
              <div className="p-6 border-t border-gray-200">
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Question Overview:</h4>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {questions && Array.from({ length: questions.length }).map((_, i) => {
                      const questionId = questions[i]?.id;
                      const isAnswered = questionId in userAnswers;
                      const isFlagged = flaggedQuestions.includes(i);
                      
                      let buttonClass = 'bg-gray-100 text-gray-700 hover:bg-gray-200';
                      
                      if (i === currentQuestionIndex) {
                        buttonClass = 'bg-primary text-white';
                      } else if (isAnswered) {
                        buttonClass = 'bg-blue-100 text-blue-700 hover:bg-blue-200';
                      }
                      
                      return (
                        <div key={i} className="relative">
                          {isFlagged && (
                            <div className="absolute -top-1 -right-1 z-10">
                              <Flag className="h-3 w-3 text-yellow-500" />
                            </div>
                          )}
                          <button 
                            type="button" 
                            onClick={() => handleGoToQuestion(i)}
                            className={`h-8 w-8 flex items-center justify-center rounded-full ${buttonClass} text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary`}
                          >
                            {i + 1}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row justify-between items-center">
                  <div className="mb-2 sm:mb-0">
                    <Button 
                      variant={isCurrentQuestionFlagged() ? "default" : "outline"} 
                      onClick={handleToggleFlag}
                      className="flex items-center"
                    >
                      <Flag className="mr-2 h-4 w-4" />
                      {isCurrentQuestionFlagged() ? 'Unflag Question' : 'Flag for Review'}
                    </Button>
                  </div>
                  <div className="flex items-center">
                    <p className="text-sm text-gray-600 mr-4">
                      {answeredQuestionsCount} of {totalQuestions} questions answered
                    </p>
                    <Button 
                      onClick={handleSubmitExam}
                      disabled={submissionState === 'submitting'}
                      className="flex items-center"
                    >
                      {submissionState === 'submitting' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : 'Submit Exam'}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
      
      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have only answered {answeredQuestionsCount} out of {totalQuestions} questions. 
              {flaggedQuestions.length > 0 && ` You also have ${flaggedQuestions.length} flagged question(s).`}
              <br /><br />
              Are you sure you want to submit your exam? Once submitted, you cannot change your answers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitExam}>
              Submit Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Time's Up Dialog */}
      <AlertDialog open={showTimeUpDialog} onOpenChange={setShowTimeUpDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Time's Up!</AlertDialogTitle>
            <AlertDialogDescription>
              Your time for this exam has expired. Your answers will be automatically submitted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={submitExam}>
              Submit Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </StudentLayout>
  );
}
