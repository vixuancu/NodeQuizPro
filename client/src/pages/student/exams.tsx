import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search,
  Filter,
  Calendar,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function StudentExams() {
  const { user } = useAuth();
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [examDetailsOpen, setExamDetailsOpen] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch exams for student's class
  const { 
    data: examsData,
    isLoading: isLoadingExams,
    isError: isErrorExams
  } = useQuery({
    queryKey: ['/api/exams'],
  });
  
  // Ensure exams is an array
  const exams = Array.isArray(examsData) ? examsData : [];
  
  // Fetch student's submissions
  const { 
    data: submissionsData,
    isLoading: isLoadingSubmissions
  } = useQuery({
    queryKey: ['/api/submissions/student'],
  });
  
  // Ensure submissions is an array
  const submissions = Array.isArray(submissionsData) ? submissionsData : [];
  
  // Check if an exam is active (can be taken now)
  const isExamActive = (exam: any) => {
    const now = new Date();
    const startTime = new Date(exam.startTime);
    const endTime = new Date(exam.endTime);
    return startTime <= now && endTime >= now;
  };
  
  // Check if an exam has been completed by this student
  const hasCompletedExam = (examId: number) => {
    if (!submissions) return false;
    
    return submissions.some((submission: any) => 
      submission.examId === examId && 
      submission.status === 'completed'
    );
  };
  
  // Check if an exam has a submission in progress
  const hasInProgressSubmission = (examId: number) => {
    if (!submissions) return false;
    
    return submissions.some((submission: any) => 
      submission.examId === examId && 
      submission.status === 'in_progress'
    );
  };
  
  // Filter exams
  const filteredExams = exams ? exams.filter((exam: any) => {
    let matches = true;
    
    if (subjectFilter && exam.subject !== subjectFilter) {
      matches = false;
    }
    
    if (statusFilter) {
      if (statusFilter === 'completed' && !hasCompletedExam(exam.id)) {
        matches = false;
      } else if (statusFilter === 'upcoming' && (hasCompletedExam(exam.id) || isExamActive(exam))) {
        matches = false;
      } else if (statusFilter === 'active' && !isExamActive(exam)) {
        matches = false;
      }
    }
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!exam.title.toLowerCase().includes(searchLower) &&
          !exam.subject.toLowerCase().includes(searchLower)) {
        matches = false;
      }
    }
    
    return matches;
  }) : [];
  
  // Group exams by status
  const groupedExams = {
    active: filteredExams.filter((exam: any) => isExamActive(exam)),
    upcoming: filteredExams.filter((exam: any) => {
      const startTime = new Date(exam.startTime);
      const now = new Date();
      return startTime > now && !hasCompletedExam(exam.id);
    }),
    completed: filteredExams.filter((exam: any) => hasCompletedExam(exam.id))
  };
  
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
  
  // Calculate remaining time for active exams
  const getRemainingTime = (endTime: string) => {
    const end = new Date(endTime).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m remaining`;
  };
  
  // Handle view exam details
  const handleViewExamDetails = (exam: any) => {
    setSelectedExam(exam);
    setExamDetailsOpen(true);
  };
  
  // Get submission for a specific exam
  const getSubmissionForExam = (examId: number) => {
    if (!submissions) return null;
    
    return submissions.find((sub: any) => sub.examId === examId);
  };
  
  // Subject options
  const subjects = [
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'biology', label: 'Biology' },
    { value: 'literature', label: 'Literature' },
    { value: 'history', label: 'History' },
    { value: 'geography', label: 'Geography' },
    { value: 'english', label: 'English' },
  ];
  
  // Reset filters
  const handleResetFilters = () => {
    setSubjectFilter('');
    setStatusFilter('');
    setSearchTerm('');
  };

  return (
    <StudentLayout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Exams</h2>
        </div>
        
        {/* Filters */}
        <Card className="bg-white mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by title or subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-subjects">All Subjects</SelectItem>
                    {subjects.map(subject => (
                      <SelectItem key={subject.value} value={subject.value}>
                        {subject.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-status">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={handleResetFilters}
                  className="w-full"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Exams */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active" className="relative">
              Active Exams
              {groupedExams.active.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {groupedExams.active.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Exams</TabsTrigger>
            <TabsTrigger value="completed">Completed Exams</TabsTrigger>
          </TabsList>
          
          {/* Active Exams */}
          <TabsContent value="active">
            {isLoadingExams ? (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div>
                          <Skeleton className="h-5 w-48 mb-2" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-9 w-24" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : groupedExams.active.length === 0 ? (
              <Card>
                <CardContent className="py-10">
                  <div className="text-center">
                    <Clock className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Active Exams</h3>
                    <p className="text-sm text-gray-500">There are no exams available to take right now.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {groupedExams.active.map((exam: any) => (
                  <Card key={exam.id} className="bg-white hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                        <div>
                          <div className="flex items-center mb-1">
                            <h3 className="text-lg font-medium text-gray-900">{exam.title}</h3>
                            <Badge className="ml-2 bg-green-100 text-green-800">Active</Badge>
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Subject:</span> {exam.subject}
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Duration:</span> {exam.duration} minutes
                            </p>
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Ends at:</span> {formatDate(exam.endTime)} ({getRemainingTime(exam.endTime)})
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 md:mt-0 flex space-x-3">
                          <Button 
                            variant="outline"
                            onClick={() => handleViewExamDetails(exam)}
                          >
                            View Details
                          </Button>
                          <Link href={`/student/exam-taking/${exam.id}`}>
                            <Button>
                              {hasInProgressSubmission(exam.id) ? 'Resume Exam' : 'Start Exam'}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          {/* Upcoming Exams */}
          <TabsContent value="upcoming">
            {isLoadingExams ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exam Title</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Scheduled For</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : groupedExams.upcoming.length === 0 ? (
              <Card>
                <CardContent className="py-10">
                  <div className="text-center">
                    <Calendar className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Upcoming Exams</h3>
                    <p className="text-sm text-gray-500">You don't have any upcoming exams scheduled.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exam Title</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Scheduled For</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedExams.upcoming.map((exam: any) => (
                        <TableRow key={exam.id}>
                          <TableCell className="font-medium">{exam.title}</TableCell>
                          <TableCell>{exam.subject}</TableCell>
                          <TableCell>{formatDate(exam.startTime)}</TableCell>
                          <TableCell>{exam.duration} min</TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              onClick={() => handleViewExamDetails(exam)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* Completed Exams */}
          <TabsContent value="completed">
            {isLoadingExams || isLoadingSubmissions ? (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exam Title</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Completed On</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-9 w-24 ml-auto" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : groupedExams.completed.length === 0 ? (
              <Card>
                <CardContent className="py-10">
                  <div className="text-center">
                    <AlertCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No Completed Exams</h3>
                    <p className="text-sm text-gray-500">You haven't completed any exams yet.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exam Title</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Completed On</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedExams.completed.map((exam: any) => {
                        const submission = getSubmissionForExam(exam.id);
                        return (
                          <TableRow key={exam.id}>
                            <TableCell className="font-medium">{exam.title}</TableCell>
                            <TableCell>{exam.subject}</TableCell>
                            <TableCell>{submission ? formatDate(submission.endTime || submission.createdAt) : 'N/A'}</TableCell>
                            <TableCell>
                              {submission ? (
                                <Badge className={
                                  submission.score >= 8 
                                    ? 'bg-green-100 text-green-800' 
                                    : submission.score >= 5
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                }>
                                  {submission.score}/10
                                </Badge>
                              ) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={submission ? `/student/results?submissionId=${submission.id}` : '#'}>
                                <Button 
                                  variant="ghost"
                                  disabled={!submission}
                                >
                                  View Results
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Exam Details Dialog */}
      {selectedExam && (
        <Dialog open={examDetailsOpen} onOpenChange={setExamDetailsOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{selectedExam.title}</DialogTitle>
              <DialogDescription>
                Exam details and instructions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <h4 className="text-sm font-medium text-gray-500">Subject</h4>
                <p className="text-sm">{selectedExam.subject}</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Schedule</h4>
                <p className="text-sm">
                  Starts: {formatDate(selectedExam.startTime)}
                  <br />
                  Ends: {formatDate(selectedExam.endTime)}
                </p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-500">Duration</h4>
                <p className="text-sm">{selectedExam.duration} minutes</p>
              </div>
              
              {selectedExam.topic && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Topic</h4>
                  <p className="text-sm">{selectedExam.topic}</p>
                </div>
              )}
              
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Instructions:</h4>
                <ul className="text-sm space-y-1 text-gray-700">
                  <li>• You have {selectedExam.duration} minutes to complete this exam.</li>
                  <li>• Once you start, the timer cannot be paused.</li>
                  <li>• You can review and change your answers before submitting.</li>
                  <li>• Click "Submit Exam" when you are done or time will automatically expire.</li>
                  <li>• Results will be available immediately after submission.</li>
                </ul>
              </div>
              
              {isExamActive(selectedExam) && (
                <div className="pt-4 flex justify-end">
                  <Link href={`/student/exam-taking/${selectedExam.id}`}>
                    <Button>
                      {hasInProgressSubmission(selectedExam.id) ? 'Resume Exam' : 'Start Exam'}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </StudentLayout>
  );
}
