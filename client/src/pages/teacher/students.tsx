import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import TeacherLayout from '@/components/layout/teacher-layout';
import StudentForm from '@/components/student-form';
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
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  PlusCircle, 
  Edit, 
  Trash,
  Filter,
  Loader2,
  Search,
  Download,
  FileText,
  UserPlus,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherStudents() {
  const { toast } = useToast();
  const { registerStudentMutation } = useAuth();
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<number | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Fetch students grouped by class
  const { 
    data: studentsData,
    isLoading: isLoadingStudents,
    isError: isErrorStudents
  } = useQuery({
    queryKey: ['/api/users/students'],
  });
  
  // Fetch all classes
  const { 
    data: classes,
    isLoading: isLoadingClasses,
  } = useQuery({
    queryKey: ['/api/classes'],
  });
  
  // Delete student mutation (would need to be implemented in the API)
  const deleteStudentMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/users/students/${id}`);
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/users/students'] });
      toast({
        title: 'Success',
        description: 'Student deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete student: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Filter and group students
  const getFilteredStudents = () => {
    if (!studentsData) return {};
    
    const filtered: Record<string, any[]> = {};
    
    Object.entries(studentsData).forEach(([className, students]) => {
      if (selectedClass && className !== selectedClass) {
        return;
      }
      
      const filteredStudents = (students as any[]).filter(student => {
        if (!searchTerm) return true;
        
        const searchLower = searchTerm.toLowerCase();
        return (
          student.fullName.toLowerCase().includes(searchLower) ||
          student.studentId.toLowerCase().includes(searchLower) ||
          student.username.toLowerCase().includes(searchLower)
        );
      });
      
      if (filteredStudents.length > 0) {
        filtered[className] = filteredStudents;
      }
    });
    
    return filtered;
  };
  
  const filteredStudents = getFilteredStudents();
  
  // Handle add student
  const handleAddStudent = (data: any) => {
    registerStudentMutation.mutate(data);
    setAddStudentOpen(false);
  };
  
  // Handle delete student
  const handleDeleteStudent = (id: number) => {
    setStudentToDelete(id);
    setIsDeleteDialogOpen(true);
  };
  
  // Confirm delete student
  const confirmDeleteStudent = () => {
    if (studentToDelete !== null) {
      deleteStudentMutation.mutate(studentToDelete);
    }
  };
  
  // Handle search change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  // Handle class filter change
  const handleClassChange = (value: string) => {
    setSelectedClass(value);
  };
  
  // Reset filters
  const handleResetFilters = () => {
    setSelectedClass('');
    setSearchTerm('');
  };
  
  // Export student data to CSV
  const exportToCSV = () => {
    if (!studentsData) return;
    
    // Prepare data
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student ID,Full Name,Username,Class\n";
    
    Object.entries(filteredStudents).forEach(([className, students]) => {
      (students as any[]).forEach(student => {
        csvContent += `${student.studentId},${student.fullName},${student.username},${className}\n`;
      });
    });
    
    // Create download link
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "students.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <TeacherLayout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Student Management</h2>
          <div className="flex space-x-2">
            <Button 
              variant="outline"
              onClick={exportToCSV}
              className="flex items-center"
              disabled={!studentsData || Object.keys(filteredStudents).length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button 
              onClick={() => setAddStudentOpen(true)}
              className="flex items-center"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <Card className="bg-white mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, ID or username..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <Select value={selectedClass} onValueChange={handleClassChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-classes">All Classes</SelectItem>
                    {isLoadingClasses ? (
                      <SelectItem value="loading-classes" disabled>
                        Loading classes...
                      </SelectItem>
                    ) : classes?.length > 0 ? (
                      classes.map((className: string) => (
                        <SelectItem key={className} value={className}>
                          {className}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-classes" disabled>
                        No classes available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  onClick={handleResetFilters}
                  className="w-full"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Students Data */}
        {isLoadingStudents ? (
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-48 mb-6" />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                      <TableHead><Skeleton className="h-5 w-32" /></TableHead>
                      <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                      <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : isErrorStudents ? (
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="text-center text-red-500 py-4">
                Error loading students. Please try again.
              </div>
            </CardContent>
          </Card>
        ) : Object.keys(filteredStudents).length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="text-center text-gray-500 py-4">
                No students found. {searchTerm || selectedClass ? 'Try adjusting your filters.' : 'Add a student to get started.'}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={Object.keys(filteredStudents)[0]}>
            <TabsList className="mb-4">
              {Object.keys(filteredStudents).map(className => (
                <TabsTrigger key={className} value={className}>
                  Class {className}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {Object.entries(filteredStudents).map(([className, students]) => (
              <TabsContent key={className} value={className}>
                <Card className="bg-white">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Full Name</TableHead>
                          <TableHead>Username</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(students as any[]).map(student => (
                          <TableRow key={student.id}>
                            <TableCell className="font-medium">{student.studentId}</TableCell>
                            <TableCell>{student.fullName}</TableCell>
                            <TableCell>{student.username}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-blue-600 hover:text-blue-900"
                                  title="View Results"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-600 hover:text-red-900"
                                  onClick={() => handleDeleteStudent(student.id)}
                                  title="Delete"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
      
      {/* Add Student Modal */}
      <StudentForm
        open={addStudentOpen}
        onClose={() => setAddStudentOpen(false)}
        onSubmit={handleAddStudent}
        isLoading={registerStudentMutation.isPending}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the student and all their exam submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteStudent}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteStudentMutation.isPending ? (
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
