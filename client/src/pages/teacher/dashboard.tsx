import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import TeacherLayout from '@/components/layout/teacher-layout';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  BookOpen, 
  CheckSquare,
  CalendarClock, 
  ChevronRight,
  Edit,
  Trash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  // Fetch exams created by this teacher
  const { 
    data: exams, 
    isLoading: isLoadingExams 
  } = useQuery({
    queryKey: ['/api/exams'],
  });

  // Fetch submissions for teacher's exams
  const { 
    data: submissions, 
    isLoading: isLoadingSubmissions 
  } = useQuery({
    queryKey: ['/api/submissions'],
  });

  // Fetch students for classes taught by this teacher
  const { 
    data: students, 
    isLoading: isLoadingStudents 
  } = useQuery({
    queryKey: ['/api/users/students'],
  });
  
  // Calculate stats
  const totalExams = exams?.length || 0;
  
  // Get total students count from all classes
  const totalStudents = students ? 
    Object.values(students).reduce((acc: number, classStudents: any[]) => 
      acc + classStudents.length, 0) : 0;
  
  // Get completed exams count
  const completedExams = exams ? 
    exams.filter((exam: any) => exam.status === 'completed').length : 0;
  
  // Get upcoming exams
  const upcomingExams = exams ? 
    exams.filter((exam: any) => exam.status === 'upcoming')
      .sort((a: any, b: any) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )
      .slice(0, 3) : [];

  return (
    <TeacherLayout>
      <div className="px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Welcome, {user?.fullName}</h2>
          <p className="text-gray-600">Manage your classes, exams, and view student progress</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Stats Cards */}
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-primary">
                  <BookOpen className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Exams</p>
                  {isLoadingExams ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    <p className="text-2xl font-semibold text-gray-800">{totalExams}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-success">
                  <Users className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Students</p>
                  {isLoadingStudents ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    <p className="text-2xl font-semibold text-gray-800">{totalStudents}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-yellow-100 text-warning">
                  <CheckSquare className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Exams Completed</p>
                  {isLoadingExams ? (
                    <Skeleton className="h-6 w-16" />
                  ) : (
                    <p className="text-2xl font-semibold text-gray-800">{completedExams}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Upcoming Exams */}
        <Card className="bg-white shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-800">Upcoming Exams</h3>
            <Link href="/teacher/exams">
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark">
                View all
              </Button>
            </Link>
          </div>
          <div className="p-6">
            {isLoadingExams ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center">
                    <div className="flex-1">
                      <Skeleton className="h-5 w-40 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex-1 text-center">
                      <Skeleton className="h-5 w-32 mx-auto" />
                    </div>
                    <div className="flex space-x-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : upcomingExams.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No upcoming exams scheduled</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {upcomingExams.map((exam: any) => {
                  const examDate = new Date(exam.startTime);
                  const formattedDate = examDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  });
                  
                  return (
                    <li key={exam.id} className="py-4">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{exam.title}</p>
                          <p className="text-sm text-gray-500">Class {exam.class} • {exam.duration} minutes</p>
                        </div>
                        <div className="flex-1 text-center">
                          <p className="text-sm text-gray-900">{formattedDate}</p>
                        </div>
                        <div className="flex space-x-2">
                          <Link href={`/teacher/exams?edit=${exam.id}`}>
                            <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-800" title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/teacher/exams?delete=${exam.id}`}>
                            <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-800" title="Delete">
                              <Trash className="h-4 w-4" />
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

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-white">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-800">Quick Actions</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <Link href="/teacher/exams">
                  <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-full text-primary mr-3">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <span className="font-medium">Create New Exam</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
                
                <Link href="/teacher/questions">
                  <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-full text-purple-600 mr-3">
                        <CalendarClock className="h-5 w-5" />
                      </div>
                      <span className="font-medium">Manage Questions</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
                
                <Link href="/teacher/students">
                  <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-full text-green-600 mr-3">
                        <Users className="h-5 w-5" />
                      </div>
                      <span className="font-medium">Manage Students</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
              </div>
            </div>
          </Card>
          
          <Card className="bg-white">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-800">Recent Activity</h3>
            </div>
            <div className="p-6">
              {isLoadingSubmissions ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="ml-4 flex-1">
                        <Skeleton className="h-5 w-48 mb-1" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : recentActivity.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No recent activity</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {recentActivity.map((activity, index) => (
                    <li key={index} className="py-4">
                      <div className="flex items-center">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <CheckSquare className="text-primary text-sm" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-500">{activity.description}</p>
                        </div>
                        <div className="ml-auto">
                          <p className="text-sm text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </TeacherLayout>
  );
}
