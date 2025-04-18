import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Menu, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const isTeacher = user?.role === 'teacher';
  const isStudent = user?.role === 'student';

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-gray-800">
            <Link href="/" className="cursor-pointer">
              <span className="text-primary">Quiz</span> System
            </Link>
          </h1>
        </div>
        
        {/* Navigation */}
        <nav className="hidden md:flex space-x-8">
          {/* Teacher Navigation */}
          {isTeacher && (
            <div className="flex space-x-4">
              <Link 
                href="/teacher/dashboard"
                className={`text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                  location === '/teacher/dashboard' ? 'text-primary' : ''
                }`}
              >
                Dashboard
              </Link>
              <Link 
                href="/teacher/exams"
                className={`text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                  location === '/teacher/exams' ? 'text-primary' : ''
                }`}
              >
                Exams
              </Link>
              <Link 
                href="/teacher/questions"
                className={`text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                  location === '/teacher/questions' ? 'text-primary' : ''
                }`}
              >
                Questions
              </Link>
              <Link 
                href="/teacher/students"
                className={`text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                  location === '/teacher/students' ? 'text-primary' : ''
                }`}
              >
                Students
              </Link>
              <Link 
                href="/teacher/results"
                className={`text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                  location === '/teacher/results' ? 'text-primary' : ''
                }`}
              >
                Results
              </Link>
            </div>
          )}
          
          {/* Student Navigation */}
          {isStudent && (
            <div className="flex space-x-4">
              <Link 
                href="/student/dashboard"
                className={`text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                  location === '/student/dashboard' ? 'text-primary' : ''
                }`}
              >
                Dashboard
              </Link>
              <Link 
                href="/student/exams"
                className={`text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                  location === '/student/exams' ? 'text-primary' : ''
                }`}
              >
                My Exams
              </Link>
              <Link 
                href="/student/results"
                className={`text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                  location === '/student/results' ? 'text-primary' : ''
                }`}
              >
                My Results
              </Link>
              <Link 
                href="/student/profile"
                className={`text-gray-600 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                  location === '/student/profile' ? 'text-primary' : ''
                }`}
              >
                Profile
              </Link>
            </div>
          )}
        </nav>
        
        {/* User Menu */}
        {user && (
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center focus:outline-none">
                  <span className="hidden md:block mr-2 text-sm font-medium text-gray-700">
                    {user.fullName}
                  </span>
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                    <User className="h-4 w-4" />
                  </div>
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isStudent && (
                  <DropdownMenuItem className="cursor-pointer" asChild>
                    <Link href="/student/profile">
                      Your Profile
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        
        {/* Mobile menu button */}
        <div className="md:hidden">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-gray-500 hover:text-gray-600 focus:outline-none"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {/* Teacher Mobile Nav */}
            {isTeacher && (
              <div>
                <Link 
                  href="/teacher/dashboard"
                  className={`block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary ${
                    location === '/teacher/dashboard' ? 'text-primary' : ''
                  }`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/teacher/exams"
                  className={`block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary ${
                    location === '/teacher/exams' ? 'text-primary' : ''
                  }`}
                >
                  Exams
                </Link>
                <Link 
                  href="/teacher/questions"
                  className={`block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary ${
                    location === '/teacher/questions' ? 'text-primary' : ''
                  }`}
                >
                  Questions
                </Link>
                <Link 
                  href="/teacher/students"
                  className={`block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary ${
                    location === '/teacher/students' ? 'text-primary' : ''
                  }`}
                >
                  Students
                </Link>
                <Link 
                  href="/teacher/results"
                  className={`block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary ${
                    location === '/teacher/results' ? 'text-primary' : ''
                  }`}
                >
                  Results
                </Link>
              </div>
            )}
            
            {/* Student Mobile Nav */}
            {isStudent && (
              <div>
                <Link 
                  href="/student/dashboard"
                  className={`block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary ${
                    location === '/student/dashboard' ? 'text-primary' : ''
                  }`}
                >
                  Dashboard
                </Link>
                <Link 
                  href="/student/exams"
                  className={`block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary ${
                    location === '/student/exams' ? 'text-primary' : ''
                  }`}
                >
                  My Exams
                </Link>
                <Link 
                  href="/student/results"
                  className={`block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary ${
                    location === '/student/results' ? 'text-primary' : ''
                  }`}
                >
                  My Results
                </Link>
                <Link 
                  href="/student/profile"
                  className={`block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary ${
                    location === '/student/profile' ? 'text-primary' : ''
                  }`}
                >
                  Profile
                </Link>
              </div>
            )}
            
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                  <User className="h-4 w-4" />
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user?.fullName}</div>
                  <div className="text-sm font-medium text-gray-500">
                    {isStudent ? `Class ${user?.class}` : 'Teacher'}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1 px-2">
                {isStudent && (
                  <Link 
                    href="/student/profile"
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary"
                  >
                    Your Profile
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:bg-gray-50 hover:text-primary"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
