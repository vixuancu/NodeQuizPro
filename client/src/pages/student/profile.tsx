import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import StudentLayout from '@/components/layout/student-layout';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
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
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { User, School, Book, Key, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

// Define password change schema
const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordChangeForm = z.infer<typeof passwordChangeSchema>;

export default function StudentProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Change password form
  const form = useForm<PasswordChangeForm>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });
  
  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordChangeForm) => {
      const res = await apiRequest('POST', '/api/user/change-password', data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Password changed',
        description: 'Your password has been updated successfully',
      });
      setIsChangingPassword(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to change password',
        variant: 'destructive',
      });
    },
  });
  
  // Handle password change form submission
  const onSubmit = (data: PasswordChangeForm) => {
    changePasswordMutation.mutate(data);
  };
  
  if (!user) {
    return null; // This should never happen due to the protected route
  }

  return (
    <StudentLayout>
      <div className="px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
          <p className="text-gray-600">View and manage your account information</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-white shadow">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Your personal details and student information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Full Name
                    </h3>
                    <p className="mt-1 text-sm font-medium">{user.fullName}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center">
                      <School className="mr-2 h-4 w-4" />
                      Student ID
                    </h3>
                    <p className="mt-1 text-sm font-medium">{user.studentId}</p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center">
                      <Book className="mr-2 h-4 w-4" />
                      Class
                    </h3>
                    <div className="mt-1 flex items-center">
                      <Badge className="bg-blue-100 text-blue-800 font-medium">
                        {user.class}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Username
                    </h3>
                    <p className="mt-1 text-sm font-medium">{user.username}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow mt-6">
              <CardHeader>
                <CardTitle>Account Security</CardTitle>
                <CardDescription>Manage your password and account security settings</CardDescription>
              </CardHeader>
              <CardContent>
                {isChangingPassword ? (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter your current password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Enter your new password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Confirm your new password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsChangingPassword(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={changePasswordMutation.isPending}>
                          {changePasswordMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="p-2 rounded-full bg-gray-100">
                        <Key className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium">Password</h3>
                        <p className="text-sm text-gray-500">●●●●●●●●</p>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setIsChangingPassword(true)}>
                      Change Password
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="bg-white shadow">
              <CardHeader>
                <CardTitle>Account Status</CardTitle>
                <CardDescription>Information about your account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Account Type</h3>
                  <div className="mt-1">
                    <Badge className="bg-purple-100 text-purple-800">
                      Student
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Status</h3>
                  <div className="mt-1">
                    <Badge className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>
                </div>

                <Separator />
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Quick Links</h3>
                  <ul className="space-y-2">
                    <li>
                      <Button variant="ghost" className="w-full justify-start text-left" asChild>
                        <a href="/student/exams">
                          View Upcoming Exams
                        </a>
                      </Button>
                    </li>
                    <li>
                      <Button variant="ghost" className="w-full justify-start text-left" asChild>
                        <a href="/student/results">
                          View My Results
                        </a>
                      </Button>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow mt-6">
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
                <CardDescription>Support resources</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  If you need assistance with your account or have questions about the platform, please contact your teacher or school administrator.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
