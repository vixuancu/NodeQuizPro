import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import TeacherLayout from '@/components/layout/teacher-layout';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { 
  BarChart as BarChartIcon, 
  Download,
  FileText,
  ChevronRight,
  Clock,
  Users
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MathFormula, { renderTextWithMath } from '@/components/math-formula';

export default function TeacherResults() {
  const [selectedExam, setSelectedExam] = useState<number | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<number | null>(null);
  
  // Get exam ID from URL query parameter if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const examId = params.get('examId');
    
    if (examId) {
      setSelectedExam(parseInt(examId));
    }
  }, []);
  
  // Fetch exams
  const { 
    data: exams,
    isLoading: isLoadingExams,
  } = useQuery({
    queryKey: ['/api/exams'],
  });
  
  // Fetch submissions for selected exam
  const { 
    data: submissions,
    isLoading: isLoadingSubmissions,
  } = useQuery({
    queryKey: ['/api/exams', selectedExam, 'submissions'],
    queryFn: async () => {
      if (!selectedExam) return [];
      
      const res = await fetch(`/api/exams/${selectedExam}/submissions`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch submissions');
      }
      
      return res.json();
    },
    enabled: !!selectedExam,
  });
  
  // Fetch answers for selected submission
  const { 
    data: answers,
    isLoading: isLoadingAnswers,
  } = useQuery({
    queryKey: ['/api/submissions', selectedSubmission, 'answers'],
    queryFn: async () => {
      if (!selectedSubmission) return [];
      
      const res = await fetch(`/api/submissions/${selectedSubmission}/answers`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch answers');
      }
      
      return res.json();
    },
    enabled: !!selectedSubmission,
  });
  
  // Calculate stats for selected exam
  const examStats = submissions ? {
    totalSubmissions: submissions.length,
    averageScore: submissions.length > 0 
      ? submissions.reduce((sum: number, sub: any) => sum + (sub.score || 0), 0) / submissions.length
      : 0,
    highestScore: submissions.length > 0
      ? Math.max(...submissions.map((sub: any) => sub.score || 0))
      : 0,
    lowestScore: submissions.length > 0
      ? Math.min(...submissions.map((sub: any) => sub.score || 0))
      : 0,
  } : null;
  
  // Calculate score distribution for chart
  const scoreDistribution = submissions ? (() => {
    const distribution: Record<string, number> = {
      '0-20%': 0,
      '21-40%': 0,
      '41-60%': 0,
      '61-80%': 0,
      '81-100%': 0,
    };
    
    // Get total possible points from the first submission's questions
    const firstSubmissionWithAnswers = submissions.find((sub: any) => 
      sub.score !== undefined && sub.score !== null
    );
    
    if (!firstSubmissionWithAnswers) return [];
    
    const totalPossiblePoints = firstSubmissionWithAnswers.score !== undefined 
      ? firstSubmissionWithAnswers.score 
      : 0;
    
    submissions.forEach((sub: any) => {
      if (sub.score === undefined || sub.score === null) return;
      
      const percentage = totalPossiblePoints > 0 
        ? (sub.score / totalPossiblePoints) * 100 
        : 0;
      
      if (percentage <= 20) distribution['0-20%']++;
      else if (percentage <= 40) distribution['21-40%']++;
      else if (percentage <= 60) distribution['41-60%']++;
      else if (percentage <= 80) distribution['61-80%']++;
      else distribution['81-100%']++;
    });
    
    return Object.entries(distribution).map(([range, count]) => ({
      range,
      count
    }));
  })() : [];
  
  // Calculate correct/incorrect answers ratio for pie chart
  const answerRatio = answers ? (() => {
    let correct = 0;
    let incorrect = 0;
    
    answers.forEach((answer: any) => {
      if (answer.isCorrect) correct++;
      else incorrect++;
    });
    
    return [
      { name: 'Correct', value: correct },
      { name: 'Incorrect', value: incorrect }
    ];
  })() : [];
  
  // Handle exam selection
  const handleExamChange = (examId: string) => {
    setSelectedExam(examId ? parseInt(examId) : null);
    setSelectedSubmission(null);
  };
  
  // Handle submission selection
  const handleViewSubmission = (submissionId: number) => {
    setSelectedSubmission(submissionId);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Calculate time spent
  const calculateTimeSpent = (startTime: string, endTime: string) => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const diffMs = end - start;
    
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  };
  
  // Export results to CSV
  const exportResultsToCSV = () => {
    if (!submissions) return;
    
    // Prepare data
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student ID,Student Name,Score,Start Time,End Time,Time Spent\n";
    
    submissions.forEach((sub: any) => {
      const timeSpent = sub.endTime 
        ? calculateTimeSpent(sub.startTime, sub.endTime) 
        : 'In Progress';
      
      csvContent += `${sub.student.studentId},${sub.student.fullName},${sub.score || 0},${formatDate(sub.startTime)},${sub.endTime ? formatDate(sub.endTime) : 'N/A'},${timeSpent}\n`;
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "exam_results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const currentExam = exams?.find((exam: any) => exam.id === selectedExam);
  
  // Pie chart colors
  const COLORS = ['#4CAF50', '#F44336'];

  return (
    <TeacherLayout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Exam Results</h2>
          {submissions?.length > 0 && (
            <Button 
              variant="outline"
              onClick={exportResultsToCSV}
              className="flex items-center"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Results
            </Button>
          )}
        </div>
        
        {/* Exam Selection */}
        <Card className="bg-white mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Exam</label>
                <Select value={selectedExam?.toString() || ''} onValueChange={handleExamChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an exam" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="choose-exam">Choose an exam</SelectItem>
                    {isLoadingExams ? (
                      <SelectItem value="loading-exams" disabled>
                        Loading exams...
                      </SelectItem>
                    ) : exams?.length > 0 ? (
                      exams.map((exam: any) => (
                        <SelectItem key={exam.id} value={exam.id.toString()}>
                          {exam.title} - Class {exam.class}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-exams-available" disabled>
                        No exams available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedExam && currentExam && (
                <div className="flex items-center justify-end space-x-2">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{currentExam.title}</p>
                    <p className="text-xs text-gray-500">Class {currentExam.class} • {currentExam.duration} min</p>
                  </div>
                  <Badge variant="outline" className={
                    currentExam.status === 'upcoming' 
                      ? 'bg-yellow-100 text-yellow-800' 
                      : currentExam.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : currentExam.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                  }>
                    {currentExam.status.charAt(0).toUpperCase() + currentExam.status.slice(1)}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {selectedExam && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100 text-primary">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Submissions</p>
                      {isLoadingSubmissions ? (
                        <Skeleton className="h-6 w-16" />
                      ) : (
                        <p className="text-2xl font-semibold text-gray-800">
                          {examStats?.totalSubmissions || 0}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100 text-green-600">
                      <BarChartIcon className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Average Score</p>
                      {isLoadingSubmissions ? (
                        <Skeleton className="h-6 w-16" />
                      ) : (
                        <p className="text-2xl font-semibold text-gray-800">
                          {examStats?.averageScore.toFixed(1) || 0}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                      <BarChartIcon className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Highest Score</p>
                      {isLoadingSubmissions ? (
                        <Skeleton className="h-6 w-16" />
                      ) : (
                        <p className="text-2xl font-semibold text-gray-800">
                          {examStats?.highestScore || 0}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white">
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-red-100 text-red-600">
                      <BarChartIcon className="h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Lowest Score</p>
                      {isLoadingSubmissions ? (
                        <Skeleton className="h-6 w-16" />
                      ) : (
                        <p className="text-2xl font-semibold text-gray-800">
                          {examStats?.lowestScore || 0}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {!selectedSubmission && (
              <>
                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <Card className="bg-white">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Score Distribution</h3>
                      {isLoadingSubmissions ? (
                        <div className="h-64 flex items-center justify-center">
                          <Skeleton className="h-52 w-full" />
                        </div>
                      ) : scoreDistribution.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart data={scoreDistribution}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="range" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" name="Number of Students" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-gray-500">
                          No data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-medium text-gray-800 mb-4">Time Spent Analysis</h3>
                      {isLoadingSubmissions ? (
                        <div className="h-64 flex items-center justify-center">
                          <Skeleton className="h-52 w-full" />
                        </div>
                      ) : submissions?.length > 0 ? (
                        <div className="h-64 flex items-center justify-center">
                          <div className="text-gray-500 text-center">
                            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                            <p>Time spent analysis will be available soon</p>
                          </div>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-gray-500">
                          No data available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Submissions Table */}
                <Card className="bg-white">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Start Time</TableHead>
                          <TableHead>End Time</TableHead>
                          <TableHead>Time Spent</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingSubmissions ? (
                          Array.from({ length: 5 }).map((_, index) => (
                            <TableRow key={index}>
                              <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                              <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
                            </TableRow>
                          ))
                        ) : submissions?.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                              No submissions yet
                            </TableCell>
                          </TableRow>
                        ) : (
                          submissions.map((submission: any) => (
                            <TableRow key={submission.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{submission.student?.fullName}</p>
                                  <p className="text-xs text-gray-500">{submission.student?.studentId}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={
                                  submission.score >= 8 
                                    ? 'bg-green-100 text-green-800' 
                                    : submission.score >= 5
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                }>
                                  {submission.score !== undefined && submission.score !== null 
                                    ? submission.score 
                                    : 'N/A'}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatDate(submission.startTime)}</TableCell>
                              <TableCell>{submission.endTime ? formatDate(submission.endTime) : 'In Progress'}</TableCell>
                              <TableCell>
                                {submission.endTime 
                                  ? calculateTimeSpent(submission.startTime, submission.endTime)
                                  : 'In Progress'
                                }
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex items-center text-primary hover:text-primary-dark"
                                  onClick={() => handleViewSubmission(submission.id)}
                                >
                                  <FileText className="mr-1 h-4 w-4" />
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
            
            {/* Selected Submission Details */}
            {selectedSubmission && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-800">
                    Submission Details
                  </h3>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedSubmission(null)}
                    className="flex items-center"
                  >
                    Back to Results
                  </Button>
                </div>
                
                {isLoadingAnswers ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Card key={index} className="bg-white">
                        <CardContent className="p-6">
                          <Skeleton className="h-8 w-3/4 mb-4" />
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
                        No answer data available
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <Card className="bg-white">
                        <CardContent className="p-6">
                          <h3 className="text-lg font-medium text-gray-800 mb-4">Score Breakdown</h3>
                          
                          {answers ? (
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Total Questions:</span>
                                <span className="font-medium">{answers.length}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Correct Answers:</span>
                                <span className="font-medium text-green-600">
                                  {answers.filter((a: any) => a.isCorrect).length}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Incorrect Answers:</span>
                                <span className="font-medium text-red-600">
                                  {answers.filter((a: any) => !a.isCorrect).length}
                                </span>
                              </div>
                              <div className="flex justify-between pt-2 border-t">
                                <span className="text-gray-600">Total Score:</span>
                                <span className="font-medium text-lg">
                                  {answers.filter((a: any) => a.isCorrect).length}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="h-32 flex items-center justify-center text-gray-500">
                              No data available
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-white">
                        <CardContent className="p-6">
                          <h3 className="text-lg font-medium text-gray-800 mb-4">Answer Distribution</h3>
                          
                          {answerRatio.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie
                                  data={answerRatio}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="value"
                                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                >
                                  {answerRatio.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`${value} answers`, ""]} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="h-32 flex items-center justify-center text-gray-500">
                              No data available
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-gray-800">Question Responses</h3>
                      
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
                              <Badge className={answer.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                {answer.isCorrect ? 'Correct' : 'Incorrect'}
                              </Badge>
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
                                      <div className={`flex-shrink-0 mr-2 ${isCorrectOption ? 'text-green-600' : isSelectedOption ? 'text-red-600' : 'text-gray-500'}`}>
                                        {option}.
                                      </div>
                                      <div className="text-sm font-medium text-gray-700">
                                        {renderTextWithMath(answer.question?.options[option])}
                                      </div>
                                      {isSelectedOption && (
                                        <div className="ml-auto">
                                          <Badge variant="outline" className={isCorrectOption ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                            Selected
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
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </TeacherLayout>
  );
}
