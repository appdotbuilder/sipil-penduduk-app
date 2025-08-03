
import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { User } from '../../../server/src/schema';
import type { DashboardStats } from '../../../server/src/handlers/dashboard';
import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Upload,
  Shield,
  TrendingUp
} from 'lucide-react';

interface DashboardProps {
  user: User;
}

export function Dashboard({ user }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [applicationStats, setApplicationStats] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [dashboardStats, appStats] = await Promise.all([
        trpc.getDashboardStats.query(),
        trpc.getApplicationStatsByType.query()
      ]);
      setStats(dashboardStats);
      setApplicationStats(appStats);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Administrator';
      case 'ADMIN': return 'Administrator';
      case 'PETUGAS': return 'Petugas';
      case 'PENDUDUK': return 'Penduduk';
      default: return role;
    }
  };

  const getApplicationTypeLabel = (type: string) => {
    switch (type) {
      case 'AKTA_KELAHIRAN': return 'Akta Kelahiran';
      case 'AKTA_KEMATIAN': return 'Akta Kematian';
      case 'PERUBAHAN_DATA': return 'Perubahan Data';
      case 'PINDAH_DATANG': return 'Pindah/Datang';
      case 'KK_BARU': return 'KK Baru';
      case 'KTP_BARU': return 'KTP Baru';
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {getGreeting()}, {user.username}! 👋
              </h2>
              <p className="text-blue-100 mb-1">
                Selamat datang di Sistem Informasi Pendaftaran Penduduk
              </p>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {getRoleLabel(user.role)}
              </Badge>
            </div>
            <Shield className="h-16 w-16 text-blue-200" />
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {['SUPER_ADMIN', 'ADMIN', 'PETUGAS'].includes(user.role) && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Penduduk</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalPopulation.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Permohonan</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalApplications.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Menunggu Proses</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.pendingApplications.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Dokumen Tervalidasi</p>
                  <p className="text-3xl font-bold text-green-600">{stats.documentsValidated.toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Statistics by Type */}
        {Object.keys(applicationStats).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Statistik Permohonan per Jenis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(applicationStats).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                      <span className="text-sm text-gray-700">{getApplicationTypeLabel(type)}</span>
                    </div>
                    <Badge variant="secondary">{count.toLocaleString('id-ID')}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.role === 'PENDUDUK' ? (
                <>
                  <button className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">Buat Permohonan Baru</p>
                        <p className="text-sm text-gray-500">Ajukan permohonan dokumen kependudukan</p>
                      </div>
                    </div>
                  </button>
                  <button className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-orange-600 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">Cek Status Permohonan</p>
                        <p className="text-sm text-gray-500">Lihat progress permohonan Anda</p>
                      </div>
                    </div>
                  </button>
                </>
              ) : (
                <>
                  <button className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                      <Users className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">Tambah Data Penduduk</p>
                        <p className="text-sm text-gray-500">Daftarkan penduduk baru</p>
                      </div>
                    </div>
                  </button>
                  <button className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">Proses Permohonan</p>
                        <p className="text-sm text-gray-500">Review dan setujui permohonan</p>
                      </div>
                    </div>
                  </button>
                  <button className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center">
                      <Upload className="h-5 w-5 text-purple-600 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">Validasi Dokumen</p>
                        <p className="text-sm text-gray-500">Verifikasi dokumen yang diunggah</p>
                      </div>
                    </div>
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Summary for Admin/Petugas */}
      {['SUPER_ADMIN', 'ADMIN', 'PETUGAS'].includes(user.role) && stats && (
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Status Permohonan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-800">Menunggu Proses</p>
                    <p className="text-2xl font-bold text-orange-900">{stats.pendingApplications}</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Disetujui</p>
                    <p className="text-2xl font-bold text-green-900">{stats.approvedApplications}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-800">Ditolak</p>
                    <p className="text-2xl font-bold text-red-900">{stats.rejectedApplications}</p>
                  </div>
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
