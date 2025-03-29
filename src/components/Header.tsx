'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { LogOut, Menu, ShieldCheck, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Header() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;
  
  const isAdmin = user.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo and brand */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <div className="relative w-[100px] h-[30px] sm:w-[140px] sm:h-[42px] lg:w-[160px] lg:h-[48px]">
              <Image
                src="/watchrx-logo-new.png"
                alt="WatchRX Logo"
                fill
                style={{ objectFit: 'contain' }}
                priority
                className="dark:brightness-200"
              />
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserDropdownMenu user={user} onLogout={logout} isAdmin={isAdmin} />
          
          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9 md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
          
          {/* Mobile menu */}
          {isOpen && (
            <div className="absolute top-16 right-0 w-64 p-2 bg-background border rounded-lg shadow-lg md:hidden">
              <nav className="space-y-1">
                <Link href="/">
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Home className="mr-2 h-4 w-4" />
                    Home
                  </Button>
                </Link>
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Admin
                    </Button>
                  </Link>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full justify-start"
                  onClick={logout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function UserDropdownMenu({
  user,
  onLogout,
  isAdmin
}: {
  user: { name?: string | null; email: string };
  onLogout: () => void;
  isAdmin: boolean;
}) {
  const initial = (user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="relative h-8 w-8 rounded-full"
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-primary-foreground">
            <span className="text-sm font-medium">{initial}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-48" align="end">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">{user?.name || user?.email}</p>
          {isAdmin && (
            <span className="inline-block px-1.5 py-0.5 mt-1 text-xs font-medium bg-primary/10 text-primary rounded-sm">
              Admin
            </span>
          )}
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href="/" className="flex items-center">
            <Home className="mr-2 h-4 w-4" />
            <span>Home</span>
          </Link>
        </DropdownMenuItem>
        
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center">
              <ShieldCheck className="mr-2 h-4 w-4" />
              <span>Admin</span>
            </Link>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={onLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
