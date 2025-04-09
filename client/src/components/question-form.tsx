import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { insertQuestionSchema } from '@shared/schema';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MathFormula, { renderTextWithMath } from './math-formula';

// Extend the schema with client-side validations
const questionFormSchema = z.object({
  examId: z.number().optional(),
  content: z.string().min(1, "Question content is required"),
  optionA: z.string().min(1, "Option A is required"),
  optionB: z.string().min(1, "Option B is required"),
  optionC: z.string().min(1, "Option C is required"),
  optionD: z.string().min(1, "Option D is required"),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  points: z.number().min(1, "Points must be at least 1").max(10, "Points cannot exceed 10"),
  difficulty: z.string().min(1, "Difficulty is required"),
  topic: z.string().optional(),
});

type QuestionFormData = z.infer<typeof questionFormSchema>;

interface QuestionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: any;
  examId?: number;
  isLoading?: boolean;
}

export default function QuestionForm({ 
  open,
  onClose,
  onSubmit,
  initialData,
  examId,
  isLoading = false 
}: QuestionFormProps) {
  const isEditing = !!initialData;
  const [previewContent, setPreviewContent] = useState('');
  const [previewOptions, setPreviewOptions] = useState({
    A: '',
    B: '',
    C: '',
    D: '',
  });
  
  // Set up the form with default values
  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      optionA: initialData.options?.A || '',
      optionB: initialData.options?.B || '',
      optionC: initialData.options?.C || '',
      optionD: initialData.options?.D || '',
    } : {
      examId: examId,
      content: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: 'A',
      points: 1,
      difficulty: 'medium',
      topic: '',
    },
  });

  // Difficulty options
  const difficultyOptions = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
  ];

  // Update previews when content or options change
  useEffect(() => {
    setPreviewContent(form.watch('content'));
    setPreviewOptions({
      A: form.watch('optionA'),
      B: form.watch('optionB'),
      C: form.watch('optionC'),
      D: form.watch('optionD'),
    });
  }, [
    form.watch('content'),
    form.watch('optionA'),
    form.watch('optionB'),
    form.watch('optionC'),
    form.watch('optionD'),
  ]);

  const handlePreviewMath = () => {
    // Force re-render of math content
    setPreviewContent(form.watch('content') + ' ');
    setPreviewOptions({
      A: form.watch('optionA') + ' ',
      B: form.watch('optionB') + ' ',
      C: form.watch('optionC') + ' ',
      D: form.watch('optionD') + ' ',
    });
  };

  const handleSubmit = (values: QuestionFormData) => {
    // Format the data for API
    const questionData = {
      examId: values.examId || examId,
      content: values.content,
      options: {
        A: values.optionA,
        B: values.optionB,
        C: values.optionC,
        D: values.optionD,
      },
      correctAnswer: values.correctAnswer,
      points: values.points,
      difficulty: values.difficulty,
      topic: values.topic,
    };

    onSubmit(questionData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Question' : 'Create New Question'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the details for this question. You can use LaTeX for math expressions (e.g., $x^2 + y^2 = z^2$).'
              : 'Fill out the form below to create a new question. You can use LaTeX for math expressions (e.g., $x^2 + y^2 = z^2$).'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {difficultyOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Algebra, Mechanics" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="points"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Points</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        max="10"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question Content (Supports LaTeX)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter your question here... Use LaTeX for math expressions, e.g. $x^2 + y^2 = z^2$" 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <div className="flex justify-end">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handlePreviewMath}
                      className="mt-1"
                    >
                      Preview Math
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {previewContent && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Preview:</h4>
                <div className="text-lg font-medium text-gray-900">
                  {renderTextWithMath(previewContent)}
                </div>
              </div>
            )}

            <div>
              <FormLabel className="block mb-2">Answer Options</FormLabel>
              <div className="space-y-2">
                <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                  <div className="w-8 text-center">A.</div>
                  <FormField
                    control={form.control}
                    name="optionA"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input 
                            placeholder="Option A (supports LaTeX, e.g. $x = 2$)" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="correctAnswer"
                    render={({ field }) => (
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex-shrink-0"
                      >
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="A" />
                          </FormControl>
                        </FormItem>
                      </RadioGroup>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                  <div className="w-8 text-center">B.</div>
                  <FormField
                    control={form.control}
                    name="optionB"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input 
                            placeholder="Option B" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="correctAnswer"
                    render={({ field }) => (
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex-shrink-0"
                      >
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="B" />
                          </FormControl>
                        </FormItem>
                      </RadioGroup>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                  <div className="w-8 text-center">C.</div>
                  <FormField
                    control={form.control}
                    name="optionC"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input 
                            placeholder="Option C" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="correctAnswer"
                    render={({ field }) => (
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex-shrink-0"
                      >
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="C" />
                          </FormControl>
                        </FormItem>
                      </RadioGroup>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
                  <div className="w-8 text-center">D.</div>
                  <FormField
                    control={form.control}
                    name="optionD"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input 
                            placeholder="Option D" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="correctAnswer"
                    render={({ field }) => (
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex-shrink-0"
                      >
                        <FormItem className="flex items-center space-x-1 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="D" />
                          </FormControl>
                        </FormItem>
                      </RadioGroup>
                    )}
                  />
                </div>
              </div>
            </div>

            {previewOptions.A && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-500 mb-2">Options Preview:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-md bg-gray-100">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-2">A.</div>
                      <div className="text-sm font-medium text-gray-700">
                        {renderTextWithMath(previewOptions.A)}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-gray-100">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-2">B.</div>
                      <div className="text-sm font-medium text-gray-700">
                        {renderTextWithMath(previewOptions.B)}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-gray-100">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-2">C.</div>
                      <div className="text-sm font-medium text-gray-700">
                        {renderTextWithMath(previewOptions.C)}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-md bg-gray-100">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mr-2">D.</div>
                      <div className="text-sm font-medium text-gray-700">
                        {renderTextWithMath(previewOptions.D)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : isEditing ? 'Update Question' : 'Save Question'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
