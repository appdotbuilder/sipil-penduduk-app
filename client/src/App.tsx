
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';
import type { User } from '../../server/src/schema';
import { LoginForm } from '@/components/LoginForm';
import { Dashboard } from '@/components/Dashboard';
import { PopulationManagement } from '@/components/PopulationManagement';
import { ApplicationManagement } from '@/components/ApplicationManagement';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  Home,
  Shield,
  User as UserIcon
} from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'population' | 'applications' | 'profile'>('dashboard');

  // Load user from localStorage and validate token on app start
  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const userData = await trpc.validateToken.query(token);
        if (userData) {
          setUser(userData);
        } else {
          localStorage.removeItem('auth_token');
        }
      }
    } catch (error) {
      console.error('Failed to validate token:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleLogin = async (username: string, password: string) => {
    try {
      const response = await trpc.login.mutate({ username, password });
      setUser(response.user);
      localStorage.setItem('auth_token', response.token);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await trpc.logout.mutate(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('auth_token');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-red-100 text-red-800';
      case 'ADMIN': return 'bg-blue-100 text-blue-800';
      case 'PETUGAS': return 'bg-green-100 text-green-800';
      case 'PENDUDUK': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin';
      case 'ADMIN': return 'Administrator';
      case 'PETUGAS': return 'Petugas';
      case 'PENDUDUK': return 'Penduduk';
      default: return role;
    }
  };

  const canAccessPopulation = user && ['SUPER_ADMIN', 'ADMIN', 'PETUGAS'].includes(user.role);
  const canAccessAllApplications = user && ['SUPER_ADMIN', 'ADMIN', 'PETUGAS'].includes(user.role);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-96">
          <CardContent className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Memuat aplikasi...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-12 w-12 text-blue-600 mr-2" />
              <h1 className="text-3xl font-bold text-gray-900">SiPenduk</h1>
            </div>
            <p className="text-gray-600">Sistem Informasi Pendaftaran Penduduk</p>
            <p className="text-sm text-gray-500 mt-1">Pencatatan Sipil & Dokumen Kependudukan</p>
          </div>
          <LoginForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">SiPenduk</h1>
                <p className="text-xs text-gray-500">Sistem Informasi Pendaftaran Penduduk</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{user.username}</span>
                <Badge className={getRoleColor(user.role)}>
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-gray-700">Menu Utama</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <nav className="space-y-1">
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className={`w-full flex items-center px-4 py-2 text-sm text-left hover:bg-gray-50 ${
                      currentView === 'dashboard' ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <Home className="h-4 w-4 mr-3" />
                    Dashboard
                  </button>
                  
                  {canAccessPopulation && (
                    <button
                      onClick={() => setCurrentView('population')}
                      className={`w-full flex items-center px-4 py-2 text-sm text-left hover:bg-gray-50 ${
                        currentView === 'population' ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <Users className="h-4 w-4 mr-3" />
                      Data Penduduk
                    </button>
                  )}
                  
                  <button
                    onClick={() => setCurrentView('applications')}
                    className={`w-full flex items-center px-4 py-2 text-sm text-left hover:bg-gray-50 ${
                      currentView === 'applications' ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <FileText className="h-4 w-4 mr-3" />
                    {canAccessAllApplications ? 'Kelola Permohonan' : 'Permohonan Saya'}
                  </button>
                  
                  <Separator className="my-2" />
                  
                  <button
                    onClick={() => setCurrentView('profile')}
                    className={`w-full flex items-center px-4 py-2 text-sm text-left hover:bg-gray-50 ${
                      currentView === 'profile' ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Profil Saya
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {currentView === 'dashboard' && <Dashboard user={user} />}
            {currentView === 'population' && canAccessPopulation && <PopulationManagement />}
            {currentView === 'applications' && (
              <ApplicationManagement 
                user={user} 
                canAccessAll={!!canAccessAllApplications} 
              />
            )}
            {currentView === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle>Profil Pengguna</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                      </label>
                      <p className="text-gray-900">{user.username}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <p className="text-gray-900">{user.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <Badge className={getRoleColor(user.role)}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <Badge className={user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {user.is_active ? 'Aktif' : 'Tidak Aktif'}
                      </Badge>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bergabung pada
                      </label>
                      <p className="text-gray-900">{user.created_at.toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
