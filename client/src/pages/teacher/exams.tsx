import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import TeacherLayout from '@/components/layout/teacher-layout';
import ExamForm from '@/components/exam-form';
import { apiRequest, queryClient } from '@/lib/queryClient';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  PlusCircle, 
  Edit, 
  Trash,
  FileText,
  BarChart,
  Filter,
  Loader2,
  Database
} from 'lucide-react';
import { Link } from 'wouter';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function TeacherExams() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [createExamOpen, setCreateExamOpen] = useState(false);
  const [editExamData, setEditExamData] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<number | null>(null);
  
  // Filters
  const [subjectFilter, setSubjectFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Create sample data mutation
  const createSampleDataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/sample-data');
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/exams'] });
      toast({
        title: 'Success',
        description: `Sample data created successfully (${data.exams.length} exams with questions)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create sample data: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Handle create sample data
  const handleCreateSampleData = () => {
    createSampleDataMutation.mutate();
  };
  // Fetch exams
  const { 
    data: examsData,
    isLoading: isLoadingExams,
    isError: isErrorExams
  } = useQuery({
    queryKey: ['/api/exams'],
  });
  
  // Ensure exams is an array for filtering
  const exams = Array.isArray(examsData) ? examsData : [];
  
  // Create exam mutation
  const createExamMutation = useMutation({
    mutationFn: async (examData: any) => {
      const res = await apiRequest('POST', '/api/exams', examData);
      return await res.json();
    },
    onSuccess: () => {
      setCreateExamOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/exams'] });
      toast({
        title: 'Success',
        description: 'Exam created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create exam: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Update exam mutation
  const updateExamMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await apiRequest('PUT', `/api/exams/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      setEditExamData(null);
      queryClient.invalidateQueries({ queryKey: ['/api/exams'] });
      toast({
        title: 'Success',
        description: 'Exam updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update exam: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Delete exam mutation
  const deleteExamMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/exams/${id}`);
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/exams'] });
      toast({
        title: 'Success',
        description: 'Exam deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete exam: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Filter exams
  const filteredExams = exams ? exams.filter((exam: any) => {
    let matches = true;
    
    if (subjectFilter && exam.subject !== subjectFilter) {
      matches = false;
    }
    
    if (classFilter && exam.class !== classFilter) {
      matches = false;
    }
    
    if (statusFilter && exam.status !== statusFilter) {
      matches = false;
    }
    
    return matches;
  }) : [];
  
  // Handle create exam
  const handleCreateExam = (data: any) => {
    createExamMutation.mutate(data);
  };
  
  // Handle edit exam
  const handleEditExam = (exam: any) => {
    setEditExamData(exam);
  };
  
  // Handle update exam
  const handleUpdateExam = (data: any) => {
    if (editExamData?.id) {
      updateExamMutation.mutate({ id: editExamData.id, data });
    }
  };
  
  // Handle delete exam
  const handleDeleteExam = (id: number) => {
    setExamToDelete(id);
    setIsDeleteDialogOpen(true);
  };
  
  // Confirm delete exam
  const confirmDeleteExam = () => {
    if (examToDelete !== null) {
      deleteExamMutation.mutate(examToDelete);
    }
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
  
  // Status options
  const statuses = [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'draft', label: 'Draft' },
  ];
  
  // Classes available
  const classes = [
    { value: '10A1', label: '10A1' },
    { value: '10A2', label: '10A2' },
    { value: '11B1', label: '11B1' },
    { value: '11B2', label: '11B2' },
    { value: '12C1', label: '12C1' },
    { value: '12C2', label: '12C2' },
  ];
  
  // Apply filters
  const handleApplyFilters = () => {
    // Filters are already applied through the state
  };
  
  // Reset filters
  const handleResetFilters = () => {
    setSubjectFilter('');
    setClassFilter('');
    setStatusFilter('');
  };
  
  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Upcoming</Badge>;
      case 'active':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Active</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Completed</Badge>;
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <TeacherLayout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Exams Management</h2>
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={handleCreateSampleData}
              className="flex items-center"
              disabled={createSampleDataMutation.isPending}
            >
              <Database className="mr-2 h-4 w-4" />
              {createSampleDataMutation.isPending ? 'Creating...' : 'Create Sample Data'}
            </Button>
            <Button 
              onClick={() => setCreateExamOpen(true)}
              className="flex items-center"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Exam
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <Card className="bg-white mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <Select value={classFilter} onValueChange={setClassFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-classes">All Classes</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls.value} value={cls.value}>
                        {cls.label}
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
                    {statuses.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <div className="flex space-x-2 w-full">
                  <Button 
                    variant="outline" 
                    onClick={handleApplyFilters}
                    className="flex items-center flex-1"
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    Apply Filters
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={handleResetFilters}
                    className="flex-shrink-0"
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Exams Table */}
        <Card className="bg-white">
          <div className="rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingExams ? (
                  // Loading skeleton
                  Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-9 w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : isErrorExams ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-red-500">
                      Error loading exams. Please try again.
                    </TableCell>
                  </TableRow>
                ) : filteredExams.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                      No exams found. Create one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExams.map((exam: any) => {
                    const startDate = new Date(exam.startTime);
                    const formattedDate = startDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });
                    
                    const formattedTime = startDate.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    });
                    
                    return (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium">{exam.title}</TableCell>
                        <TableCell>{exam.subject}</TableCell>
                        <TableCell>{exam.class}</TableCell>
                        <TableCell>{exam.duration} minutes</TableCell>
                        <TableCell>{formattedDate} ({formattedTime})</TableCell>
                        <TableCell>{getStatusBadge(exam.status)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-blue-600 hover:text-blue-900"
                              onClick={() => handleEditExam(exam)}
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Link href={`/teacher/questions?examId=${exam.id}`}>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-purple-600 hover:text-purple-900"
                                title="Questions"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/teacher/results?examId=${exam.id}`}>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-green-600 hover:text-green-900"
                                title="Results"
                              >
                                <BarChart className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-red-600 hover:text-red-900"
                              onClick={() => handleDeleteExam(exam.id)}
                              title="Delete"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
      
      {/* Create Exam Modal */}
      <ExamForm
        open={createExamOpen}
        onClose={() => setCreateExamOpen(false)}
        onSubmit={handleCreateExam}
        isLoading={createExamMutation.isPending}
      />
      
      {/* Edit Exam Modal */}
      {editExamData && (
        <ExamForm
          open={!!editExamData}
          onClose={() => setEditExamData(null)}
          onSubmit={handleUpdateExam}
          initialData={editExamData}
          isLoading={updateExamMutation.isPending}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the exam and all associated questions and submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteExam}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteExamMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TeacherLayout>
  );
}
