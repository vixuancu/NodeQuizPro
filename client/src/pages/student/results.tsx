import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/student-layout';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  BarChart as BarChartIcon, 
  ChevronLeft,
  FileText,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import MathFormula, { renderTextWithMath } from '@/components/math-formula';

export default function StudentResults() {
  const { user } = useAuth();
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<number | null>(null);
  
  // Get submission ID from URL query parameter if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const submissionId = params.get('submissionId');
    
    if (submissionId) {
      setSelectedSubmissionId(parseInt(submissionId));
    }
  }, []);
  
  // Fetch student's submissions
  const { 
    data: submissions,
    isLoading: isLoadingSubmissions
  } = useQuery({
    queryKey: ['/api/submissions/student'],
  });
  
  // Fetch answers for selected submission
  const { 
    data: answers,
    isLoading: isLoadingAnswers
  } = useQuery({
    queryKey: ['/api/submissions', selectedSubmissionId, 'answers'],
    queryFn: async () => {
      if (!selectedSubmissionId) return null;
      
      const res = await fetch(`/api/submissions/${selectedSubmissionId}/answers`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch answers');
      }
      
      return res.json();
    },
    enabled: !!selectedSubmissionId,
  });
  
  // Find selected submission
  const selectedSubmission = submissions?.find((sub: any) => sub.id === selectedSubmissionId);
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Calculate time spent
  const calculateTimeSpent = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 'N/A';
    
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const diffMs = end - start;
    
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  };
  
  // Calculate percentage score
  const calculatePercentage = (score: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((score / total) * 100);
  };
  
  // Generate data for pie chart
  const generatePieData = () => {
    if (!answers) return [];
    
    const correct = answers.filter((answer: any) => answer.isCorrect).length;
    const incorrect = answers.filter((answer: any) => !answer.isCorrect).length;
    
    return [
      { name: 'Correct', value: correct },
      { name: 'Incorrect', value: incorrect }
    ];
  };
  
  const pieData = generatePieData();
  const COLORS = ['#10b981', '#ef4444'];
  
  // Handle submission selection
  const handleSelectSubmission = (submissionId: number) => {
    setSelectedSubmissionId(submissionId);
    
    // Update URL query parameter
    const url = new URL(window.location.href);
    url.searchParams.set('submissionId', submissionId.toString());
    window.history.pushState({}, '', url);
  };
  
  // Clear selected submission
  const handleClearSelection = () => {
    setSelectedSubmissionId(null);
    
    // Remove URL query parameter
    const url = new URL(window.location.href);
    url.searchParams.delete('submissionId');
    window.history.pushState({}, '', url);
  };

  return (
    <StudentLayout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Results</h2>
        </div>
        
        {selectedSubmissionId && selectedSubmission ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={handleClearSelection}
                className="flex items-center"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to All Results
              </Button>
              
              <Badge className={
                selectedSubmission.score >= 8 
                  ? 'bg-green-100 text-green-800 px-3 py-1 text-sm' 
                  : selectedSubmission.score >= 5
                    ? 'bg-yellow-100 text-yellow-800 px-3 py-1 text-sm'
                    : 'bg-red-100 text-red-800 px-3 py-1 text-sm'
              }>
                Score: {selectedSubmission.score} / {answers?.length || 10} 
                ({calculatePercentage(selectedSubmission.score, answers?.length || 10)}%)
              </Badge>
            </div>
            
            <Card className="bg-white">
              <CardContent className="p-6">
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  {selectedSubmission.exam?.title}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Subject</h4>
                    <p className="text-sm font-medium">{selectedSubmission.exam?.subject}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Completed On</h4>
                    <p className="text-sm font-medium">{formatDate(selectedSubmission.endTime || selectedSubmission.createdAt)}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Time Spent</h4>
                    <p className="text-sm font-medium">{calculateTimeSpent(selectedSubmission.startTime, selectedSubmission.endTime)}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Score Analysis</h4>
                    {isLoadingAnswers ? (
                      <Skeleton className="h-40 w-full" />
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-md">
                        <div className="flex flex-col space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Total Questions:</span>
                            <span className="text-sm font-medium">{answers?.length || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Correct Answers:</span>
                            <span className="text-sm font-medium text-green-600">
                              {answers?.filter((a: any) => a.isCorrect).length || 0}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Incorrect Answers:</span>
                            <span className="text-sm font-medium text-red-600">
                              {answers?.filter((a: any) => !a.isCorrect).length || 0}
                            </span>
                          </div>
                          <Separator className="my-1" />
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Score:</span>
                            <span className="text-sm font-medium">
                              {selectedSubmission.score} / {answers?.length || 0} 
                              ({calculatePercentage(selectedSubmission.score, answers?.length || 0)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Answer Distribution</h4>
                    {isLoadingAnswers ? (
                      <Skeleton className="h-40 w-full" />
                    ) : pieData.length > 0 ? (
                      <div className="bg-gray-50 p-4 rounded-md">
                        <ResponsiveContainer width="100%" height={160}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={60}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} answers`, ""]} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-md flex items-center justify-center h-40">
                        <p className="text-gray-500">No answer data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <h3 className="text-lg font-medium text-gray-800 mt-6">Question Review</h3>
            
            {isLoadingAnswers ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="bg-white">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-center mb-4">
                        <Skeleton className="h-6 w-24" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <Skeleton className="h-6 w-full mb-4" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-12 rounded-md" />
                        <Skeleton className="h-12 rounded-md" />
                        <Skeleton className="h-12 rounded-md" />
                        <Skeleton className="h-12 rounded-md" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : answers?.length === 0 ? (
              <Card className="bg-white">
                <CardContent className="p-6">
                  <div className="text-center text-gray-500 py-4">
                    No question data available
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {answers.map((answer: any, index: number) => (
                  <Card key={answer.id} className="bg-white">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center">
                          <span className="bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center mr-2">
                            {index + 1}
                          </span>
                          <h4 className="text-md font-medium">Question {index + 1}</h4>
                        </div>
                        {answer.isCorrect ? (
                          <Badge className="bg-green-100 text-green-800 flex items-center">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Correct
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 flex items-center">
                            <XCircle className="mr-1 h-3 w-3" />
                            Incorrect
                          </Badge>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        {renderTextWithMath(answer.question?.content)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {['A', 'B', 'C', 'D'].map((option) => {
                          const isCorrectOption = answer.question?.correctAnswer === option;
                          const isSelectedOption = answer.answer === option;
                          
                          let optionClass = 'bg-gray-50';
                          if (isCorrectOption) optionClass = 'bg-green-50 border border-green-200';
                          if (isSelectedOption && !isCorrectOption) optionClass = 'bg-red-50 border border-red-200';
                          
                          return (
                            <div key={option} className={`p-3 rounded-md ${optionClass}`}>
                              <div className="flex items-start">
                                <div className={`flex-shrink-0 mr-2 ${
                                  isCorrectOption 
                                    ? 'text-green-600' 
                                    : isSelectedOption 
                                      ? 'text-red-600' 
                                      : 'text-gray-500'
                                }`}>
                                  {option}.
                                </div>
                                <div className="text-sm font-medium text-gray-700">
                                  {renderTextWithMath(answer.question?.options[option])}
                                </div>
                                {isSelectedOption && (
                                  <div className="ml-auto">
                                    <Badge variant="outline" className={
                                      isCorrectOption 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }>
                                      Your Answer
                                    </Badge>
                                  </div>
                                )}
                                {isCorrectOption && !isSelectedOption && (
                                  <div className="ml-auto">
                                    <Badge variant="outline" className="bg-green-100 text-green-800">
                                      Correct Answer
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Card className="bg-white">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Completion Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingSubmissions ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : !submissions || submissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                        No exam results available
                      </TableCell>
                    </TableRow>
                  ) : (
                    submissions.map((submission: any) => (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">{submission.exam?.title}</TableCell>
                        <TableCell>{submission.exam?.subject}</TableCell>
                        <TableCell>{formatDate(submission.endTime || submission.createdAt)}</TableCell>
                        <TableCell>
                          <Badge className={
                            submission.score >= 8 
                              ? 'bg-green-100 text-green-800' 
                              : submission.score >= 5
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }>
                            {submission.score || 0} / 10
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost"
                            className="flex items-center space-x-1"
                            onClick={() => handleSelectSubmission(submission.id)}
                          >
                            <FileText className="h-4 w-4" />
                            <span>View Results</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  );
}
