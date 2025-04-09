import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { AuthProvider } from "@/hooks/use-auth";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import { ProtectedRoute, TeacherRoute, StudentRoute } from "./lib/protected-route";

// Teacher pages
import TeacherDashboard from "@/pages/teacher/dashboard";
import TeacherExams from "@/pages/teacher/exams";
import TeacherQuestions from "@/pages/teacher/questions";
import TeacherStudents from "@/pages/teacher/students";
import TeacherResults from "@/pages/teacher/results";

// Student pages
import StudentDashboard from "@/pages/student/dashboard";
import StudentExams from "@/pages/student/exams";
import StudentResults from "@/pages/student/results";
import StudentProfile from "@/pages/student/profile";
import ExamTaking from "@/pages/student/exam-taking";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage}/>
      <Route path="/auth" component={AuthPage} />

      {/* Teacher Routes */}
      <TeacherRoute path="/teacher/dashboard" component={TeacherDashboard} />
      <TeacherRoute path="/teacher/exams" component={TeacherExams} />
      <TeacherRoute path="/teacher/questions" component={TeacherQuestions} />
      <TeacherRoute path="/teacher/students" component={TeacherStudents} />
      <TeacherRoute path="/teacher/results" component={TeacherResults} />

      {/* Student Routes */}
      <StudentRoute path="/student/dashboard" component={StudentDashboard} />
      <StudentRoute path="/student/exams" component={StudentExams} />
      <StudentRoute path="/student/results" component={StudentResults} />
      <StudentRoute path="/student/profile" component={StudentProfile} />
      <StudentRoute path="/student/exam-taking/:examId" component={ExamTaking} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
