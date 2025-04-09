import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import TeacherLayout from '@/components/layout/teacher-layout';
import QuestionForm from '@/components/question-form';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  PlusCircle, 
  Edit, 
  Trash,
  Filter,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import MathFormula, { renderTextWithMath } from '@/components/math-formula';

export default function TeacherQuestions() {
  const { toast } = useToast();
  const [createQuestionOpen, setCreateQuestionOpen] = useState(false);
  const [editQuestionData, setEditQuestionData] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<number | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  
  // Filters
  const [subjectFilter, setSubjectFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 5;
  
  // Get exam ID from URL query parameter if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const examId = params.get('examId');
    
    if (examId) {
      setSelectedExamId(parseInt(examId));
    }
  }, []);
  
  // Fetch exams
  const { 
    data: exams,
    isLoading: isLoadingExams,
  } = useQuery({
    queryKey: ['/api/exams'],
  });

  // Fetch questions for selected exam
  const { 
    data: questions,
    isLoading: isLoadingQuestions,
    isError: isErrorQuestions,
    refetch: refetchQuestions
  } = useQuery({
    queryKey: ['/api/exams', selectedExamId, 'questions'],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const res = await fetch(`/api/exams/${selectedExamId}/questions`, {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch questions');
      }
      
      return await res.json();
    },
    enabled: !!selectedExamId,
  });
  
  // Create question mutation
  const createQuestionMutation = useMutation({
    mutationFn: async (questionData: any) => {
      const res = await apiRequest('POST', `/api/exams/${selectedExamId}/questions`, questionData);
      return await res.json();
    },
    onSuccess: () => {
      setCreateQuestionOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/exams', selectedExamId, 'questions'] });
      toast({
        title: 'Success',
        description: 'Question created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create question: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Update question mutation
  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const res = await apiRequest('PUT', `/api/questions/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      setEditQuestionData(null);
      queryClient.invalidateQueries({ queryKey: ['/api/exams', selectedExamId, 'questions'] });
      toast({
        title: 'Success',
        description: 'Question updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update question: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/questions/${id}`);
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/exams', selectedExamId, 'questions'] });
      toast({
        title: 'Success',
        description: 'Question deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete question: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Filter questions
  const filteredQuestions = questions ? questions.filter((question: any) => {
    let matches = true;
    
    if (difficultyFilter && question.difficulty !== difficultyFilter) {
      matches = false;
    }
    
    if (topicFilter && question.topic !== topicFilter) {
      matches = false;
    }
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const contentLower = question.content.toLowerCase();
      
      if (!contentLower.includes(searchLower)) {
        // Check options as well
        const options = question.options;
        const optionsMatch = Object.values(options).some(
          (option: any) => option.toLowerCase().includes(searchLower)
        );
        
        if (!optionsMatch) {
          matches = false;
        }
      }
    }
    
    return matches;
  }) : [];
  
  // Calculate pagination
  const totalPages = Math.ceil((filteredQuestions?.length || 0) / questionsPerPage);
  const indexOfLastQuestion = currentPage * questionsPerPage;
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;
  const currentQuestions = filteredQuestions?.slice(indexOfFirstQuestion, indexOfLastQuestion) || [];
  
  // Difficulty options
  const difficultyOptions = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
  ];
  
  // Get unique topics from questions
  const topics = questions 
    ? [...new Set(questions.map((q: any) => q.topic).filter(Boolean))]
    : [];
  
  // Handle exam selection
  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId ? parseInt(examId) : null);
    setCurrentPage(1);
  };
  
  // Handle create question
  const handleCreateQuestion = (data: any) => {
    if (!selectedExamId) {
      toast({
        title: 'Error',
        description: 'Please select an exam first',
        variant: 'destructive',
      });
      return;
    }
    
    createQuestionMutation.mutate(data);
  };
  
  // Handle edit question
  const handleEditQuestion = (question: any) => {
    // Transform the question data for the form
    const formattedQuestion = {
      ...question,
      optionA: question.options.A,
      optionB: question.options.B,
      optionC: question.options.C,
      optionD: question.options.D,
    };
    
    setEditQuestionData(formattedQuestion);
  };
  
  // Handle update question
  const handleUpdateQuestion = (data: any) => {
    if (editQuestionData?.id) {
      updateQuestionMutation.mutate({ id: editQuestionData.id, data });
    }
  };
  
  // Handle delete question
  const handleDeleteQuestion = (id: number) => {
    setQuestionToDelete(id);
    setIsDeleteDialogOpen(true);
  };
  
  // Confirm delete question
  const confirmDeleteQuestion = () => {
    if (questionToDelete !== null) {
      deleteQuestionMutation.mutate(questionToDelete);
    }
  };
  
  // Apply filters
  const handleApplyFilters = () => {
    // Filters are already applied through the state
    setCurrentPage(1); // Reset to first page when filters change
  };
  
  // Reset filters
  const handleResetFilters = () => {
    setDifficultyFilter('');
    setTopicFilter('');
    setSearchTerm('');
    setCurrentPage(1);
  };
  
  // Handle pagination
  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <TeacherLayout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Question Management</h2>
          <Button 
            onClick={() => setCreateQuestionOpen(true)}
            className="flex items-center"
            disabled={!selectedExamId}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
        
        {/* Exam Selection */}
        <Card className="bg-white mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Exam</label>
                <Select value={selectedExamId?.toString() || ''} onValueChange={handleExamChange}>
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
            </div>
          </CardContent>
        </Card>
        
        {selectedExamId && (
          <>
            {/* Filters */}
            <Card className="bg-white mb-6">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search questions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                    <Select value={topicFilter} onValueChange={setTopicFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Topics" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Topics</SelectItem>
                        {topics.map((topic: string) => (
                          <SelectItem key={topic} value={topic}>
                            {topic}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                    <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Difficulties" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Difficulties</SelectItem>
                        {difficultyOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
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
            
            {/* Questions List */}
            <div className="space-y-6">
              {isLoadingQuestions ? (
                // Loading skeleton
                Array.from({ length: 3 }).map((_, index) => (
                  <Card key={index} className="bg-white shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Skeleton className="h-6 w-16 rounded-full" />
                        <Skeleton className="h-6 w-24 rounded-full" />
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </div>
                      <div className="flex space-x-2">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <Skeleton className="h-9 w-9 rounded-full" />
                      </div>
                    </div>
                    <div className="px-6 py-4">
                      <Skeleton className="h-6 w-3/4 mb-4" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-12 rounded-md" />
                        <Skeleton className="h-12 rounded-md" />
                        <Skeleton className="h-12 rounded-md" />
                        <Skeleton className="h-12 rounded-md" />
                      </div>
                    </div>
                  </Card>
                ))
              ) : isErrorQuestions ? (
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-6">
                    <div className="text-center text-red-500 py-4">
                      Error loading questions. Please try again.
                    </div>
                  </CardContent>
                </Card>
              ) : filteredQuestions.length === 0 ? (
                <Card className="bg-white shadow-sm">
                  <CardContent className="p-6">
                    <div className="text-center text-gray-500 py-4">
                      No questions found. {searchTerm || difficultyFilter || topicFilter ? 'Try adjusting your filters.' : 'Add a question to get started.'}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                currentQuestions.map((question: any) => (
                  <Card key={question.id} className="bg-white shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                      <div className="flex items-center flex-wrap gap-2">
                        {question.subject && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800">
                            {question.subject.charAt(0).toUpperCase() + question.subject.slice(1)}
                          </Badge>
                        )}
                        
                        {question.topic && (
                          <Badge variant="outline" className="bg-gray-100 text-gray-800">
                            {question.topic}
                          </Badge>
                        )}
                        
                        <Badge 
                          variant="outline" 
                          className={
                            question.difficulty === 'easy' 
                              ? 'bg-green-100 text-green-800' 
                              : question.difficulty === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }
                        >
                          {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
                        </Badge>
                        
                        <Badge variant="outline" className="bg-purple-100 text-purple-800">
                          {question.points} {question.points === 1 ? 'point' : 'points'}
                        </Badge>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-blue-600 hover:text-blue-900"
                          onClick={() => handleEditQuestion(question)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDeleteQuestion(question.id)}
                          title="Delete"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="px-6 py-4">
                      <div className="text-lg font-medium text-gray-900 mb-4">
                        {renderTextWithMath(question.content)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`p-3 rounded-md ${question.correctAnswer === 'A' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                          <div className="flex items-start">
                            <RadioGroup defaultValue={question.correctAnswer} disabled>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="A" id={`option-a-${question.id}`} />
                                <Label htmlFor={`option-a-${question.id}`} className="font-medium text-gray-700">
                                  A. {renderTextWithMath(question.options.A)}
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        </div>
                        
                        <div className={`p-3 rounded-md ${question.correctAnswer === 'B' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                          <div className="flex items-start">
                            <RadioGroup defaultValue={question.correctAnswer} disabled>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="B" id={`option-b-${question.id}`} />
                                <Label htmlFor={`option-b-${question.id}`} className="font-medium text-gray-700">
                                  B. {renderTextWithMath(question.options.B)}
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        </div>
                        
                        <div className={`p-3 rounded-md ${question.correctAnswer === 'C' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                          <div className="flex items-start">
                            <RadioGroup defaultValue={question.correctAnswer} disabled>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="C" id={`option-c-${question.id}`} />
                                <Label htmlFor={`option-c-${question.id}`} className="font-medium text-gray-700">
                                  C. {renderTextWithMath(question.options.C)}
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        </div>
                        
                        <div className={`p-3 rounded-md ${question.correctAnswer === 'D' ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                          <div className="flex items-start">
                            <RadioGroup defaultValue={question.correctAnswer} disabled>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="D" id={`option-d-${question.id}`} />
                                <Label htmlFor={`option-d-${question.id}`} className="font-medium text-gray-700">
                                  D. {renderTextWithMath(question.options.D)}
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
            
            {/* Pagination */}
            {filteredQuestions.length > 0 && (
              <div className="mt-6 flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex space-x-2">
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <Button
                      key={index}
                      variant={currentPage === index + 1 ? "default" : "outline"}
                      onClick={() => paginate(index + 1)}
                      className="w-10 h-10 p-0"
                    >
                      {index + 1}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center"
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Create Question Modal */}
      <QuestionForm
        open={createQuestionOpen}
        onClose={() => setCreateQuestionOpen(false)}
        onSubmit={handleCreateQuestion}
        examId={selectedExamId || undefined}
        isLoading={createQuestionMutation.isPending}
      />
      
      {/* Edit Question Modal */}
      {editQuestionData && (
        <QuestionForm
          open={!!editQuestionData}
          onClose={() => setEditQuestionData(null)}
          onSubmit={handleUpdateQuestion}
          initialData={editQuestionData}
          examId={selectedExamId || undefined}
          isLoading={updateQuestionMutation.isPending}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the question.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteQuestion}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleteQuestionMutation.isPending ? (
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
