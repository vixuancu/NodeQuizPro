import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import StudentLayout from '@/components/layout/student-layout';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BookOpen, 
  CheckSquare,
  ChevronRight,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function StudentDashboard() {
  const { user } = useAuth();
  
  // Fetch upcoming exams for student
  const { 
    data: upcomingExams, 
    isLoading: isLoadingExams 
  } = useQuery({
    queryKey: ['/api/exams'],
  });
  
  // Fetch student's recent submissions
  const { 
    data: submissions, 
    isLoading: isLoadingSubmissions 
  } = useQuery({
    queryKey: ['/api/submissions/student'],
  });
  
  // Filter exams that are upcoming only
  const filteredUpcomingExams = upcomingExams?.filter((exam: any) => 
    exam.status === 'upcoming' || exam.status === 'active'
  ).slice(0, 3) || [];
  
  // Get recent completed submissions
  const recentSubmissions = submissions?.filter((sub: any) => 
    sub.status === 'completed'
  ).slice(0, 3) || [];
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };
  
  return (
    <StudentLayout>
      <div className="px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Welcome, {user?.fullName}</h2>
          <p className="text-gray-600">Class {user?.class} • {user?.studentId}</p>
        </div>
        
        {/* Upcoming Exams */}
        <Card className="bg-white shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-800">Upcoming Exams</h3>
            <Link href="/student/exams">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark">
                View all
              </Button>
            </Link>
          </div>
          <div className="p-6">
            {isLoadingExams ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                      <Skeleton className="h-5 w-40 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-9 w-32 mt-2 md:mt-0" />
                  </div>
                ))}
              </div>
            ) : filteredUpcomingExams.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No upcoming exams scheduled for your class</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredUpcomingExams.map((exam: any) => {
                  const examDate = new Date(exam.startTime);
                  const now = new Date();
                  const isActive = examDate <= now && new Date(exam.endTime) >= now;
                  
                  return (
                    <li key={exam.id} className="py-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">{exam.title}</p>
                            {isActive && (
                              <Badge className="ml-2 bg-green-100 text-green-800">Live Now</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{exam.duration} minutes • {formatDate(exam.startTime)}</p>
                        </div>
                        <div className="mt-2 md:mt-0">
                          <Link href={isActive ? `/student/exam-taking/${exam.id}` : `/student/exams`}>
                            <Button 
                              variant={isActive ? "default" : "outline"} 
                              size="sm"
                              className={isActive ? "flex items-center" : ""}
                            >
                              {isActive && <Clock className="mr-1 h-4 w-4" />}
                              {isActive ? 'Start Exam' : 'View Details'}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
        
        {/* Recent Results */}
        <Card className="bg-white shadow">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-800">Recent Results</h3>
            <Link href="/student/results">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark">
                View all
              </Button>
            </Link>
          </div>
          <div className="p-6">
            {isLoadingSubmissions ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex flex-col md:flex-row md:items-center">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-40 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex-1 mt-2 md:mt-0 md:text-center">
                      <Skeleton className="h-6 w-16 mx-auto md:mx-auto" />
                    </div>
                    <Skeleton className="h-9 w-32 mt-2 md:mt-0" />
                  </div>
                ))}
              </div>
            ) : recentSubmissions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">You haven't completed any exams yet</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {recentSubmissions.map((submission: any) => {
                  return (
                    <li key={submission.id} className="py-4">
                      <div className="flex flex-col md:flex-row md:items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{submission.exam.title}</p>
                          <p className="text-xs text-gray-500 mt-1">Completed: {formatDate(submission.endTime || submission.createdAt)}</p>
                        </div>
                        <div className="flex-1 mt-2 md:mt-0 md:text-center">
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            submission.score >= 8 
                              ? 'bg-green-100 text-green-800' 
                              : submission.score >= 5
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}>
                            Score: {submission.score}/{submission.exam.questions?.length || 10}
                          </div>
                        </div>
                        <div className="mt-2 md:mt-0">
                          <Link href={`/student/results?submissionId=${submission.id}`}>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
        
        {/* Quick Access */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Quick Access</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/student/exams">
              <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex justify-between items-center">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-full text-primary mr-3">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className="font-medium">My Exams</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
            
            <Link href="/student/results">
              <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex justify-between items-center">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-full text-green-600 mr-3">
                    <CheckSquare className="h-5 w-5" />
                  </div>
                  <span className="font-medium">My Results</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
            
            <Link href="/student/profile">
              <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex justify-between items-center">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-full text-purple-600 mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="font-medium">My Profile</span>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
