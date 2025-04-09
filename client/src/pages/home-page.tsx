import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  // Redirect based on user role
  if (user.role === 'teacher') {
    return <Redirect to="/teacher/dashboard" />;
  } else if (user.role === 'student') {
    return <Redirect to="/student/dashboard" />;
  }
  
  // Fallback (shouldn't reach this)
  return <Redirect to="/auth" />;
}
