
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { Application, User, CreateApplicationInput, ApplicationStatus, ApplicationType } from '../../../server/src/schema';
import { ApplicationForm } from '@/components/ApplicationForm';
import { 
  Search, 
  Plus, 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  AlertCircle,
  Calendar
} from 'lucide-react';

interface ApplicationManagementProps {
  user: User;
  canAccessAll: boolean;
}

export function ApplicationManagement({ user, canAccessAll }: ApplicationManagementProps) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ApplicationType | 'all'>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const query = {
        page: currentPage,
        limit: 10,
        status: statusFilter === 'all' ? undefined : statusFilter,
        application_type: typeFilter === 'all' ? undefined : typeFilter,
        ...(canAccessAll ? {} : { applicant_id: user.id })
      };

      const result = canAccessAll 
        ? await trpc.getApplications.query(query)
        : await trpc.getMyApplications.query(query);
        
      setApplications(result.data);
      setTotal(result.total);
    } catch (loadError) {
      console.error('Failed to load applications:', loadError);
      setError('Gagal memuat data permohonan');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, typeFilter, canAccessAll, user.id]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleCreateApplication = async (data: CreateApplicationInput) => {
    try {
      const newApplication = await trpc.createApplication.mutate(data);
      setApplications(prev => [newApplication, ...prev]);
      setShowCreateForm(false);
      setTotal(prev => prev + 1);
    } catch (createError) {
      console.error('Failed to create application:', createError);
      throw new Error('Gagal membuat permohonan');
    }
  };

  const handleUpdateStatus = async (applicationId: number, status: string, notes?: string) => {
    try {
      const updatedApplication = await trpc.updateApplicationStatus.mutate({
        application_id: applicationId,
        status: status as ApplicationStatus,
        notes: notes || null
      });
      setApplications(prev => 
        prev.map(app => app.id === applicationId ? updatedApplication : app)
      );
    } catch (updateError) {
      console.error('Failed to update application status:', updateError);
      setError('Gagal mengupdate status permohonan');
    }
  };

  const handleSubmitApplication = async (applicationId: number) => {
    try {
      const updatedApplication = await trpc.submitApplication.mutate(applicationId);
      setApplications(prev => 
        prev.map(app => app.id === applicationId ? updatedApplication : app)
      );
    } catch (submitError) {
      console.error('Failed to submit application:', submitError);
      setError('Gagal mengajukan permohonan');
    }
  };

  const handleCancelApplication = async (applicationId: number) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan permohonan ini?')) {
      return;
    }

    try {
      await trpc.cancelApplication.mutate(applicationId);
      setApplications(prev => prev.filter(app => app.id !== applicationId));
      setTotal(prev => prev - 1);
    } catch (cancelError) {
      console.error('Failed to cancel application:', cancelError);
      setError('Gagal membatalkan permohonan');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
      case 'PROCESSING': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Draft';
      case 'SUBMITTED': return 'Diajukan';
      case 'PROCESSING': return 'Diproses';
      case 'APPROVED': return 'Disetujui';
      case 'REJECTED': return 'Ditolak';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return <FileText className="h-4 w-4" />;
      case 'SUBMITTED': return <Clock className="h-4 w-4" />;
      case 'PROCESSING': return <Clock className="h-4 w-4" />;
      case 'APPROVED': return <CheckCircle className="h-4 w-4" />;
      case 'REJECTED': return <XCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {canAccessAll ? 'Kelola Permohonan' : 'Permohonan Saya'}
          </h1>
          <p className="text-gray-600">
            {canAccessAll 
              ? 'Kelola dan proses permohonan layanan kependudukan'
              : 'Lihat status dan ajukan permohonan baru'
            }
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Buat Permohonan
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Cari berdasarkan nomor permohonan..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select 
              value={statusFilter} 
              onValueChange={(value: ApplicationStatus | 'all') => setStatusFilter(value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SUBMITTED">Diajukan</SelectItem>
                <SelectItem value="PROCESSING">Diproses</SelectItem>
                <SelectItem value="APPROVED">Disetujui</SelectItem>
                <SelectItem value="REJECTED">Ditolak</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={typeFilter} 
              onValueChange={(value: ApplicationType | 'all') => setTypeFilter(value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter Jenis" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Jenis</SelectItem>
                <SelectItem value="AKTA_KELAHIRAN">Akta Kelahiran</SelectItem>
                <SelectItem value="AKTA_KEMATIAN">Akta Kematian</SelectItem>
                <SelectItem value="PERUBAHAN_DATA">Perubahan Data</SelectItem>
                <SelectItem value="PINDAH_DATANG">Pindah/Datang</SelectItem>
                <SelectItem value="KK_BARU">KK Baru</SelectItem>
                <SelectItem value="KTP_BARU">KTP Baru</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Daftar Permohonan ({total.toLocaleString('id-ID')})</span>
            <Badge variant="secondary">{applications.length} dari {total}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-gray-200 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Tidak ada permohonan ditemukan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application: Application) => (
                <div key={application.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {application.application_number}
                        </h3>
                        <Badge variant="outline">
                          {getApplicationTypeLabel(application.application_type)}
                        </Badge>
                        <Badge className={getStatusColor(application.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(application.status)}
                            {getStatusLabel(application.status)}
                          </div>
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>
                            Dibuat: {application.created_at.toLocaleDateString('id-ID')}
                          </span>
                        </div>
                        {application.processed_at && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            <span>
                              Diproses: {application.processed_at.toLocaleDateString('id-ID')}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {application.notes && (
                        <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 mb-3">
                          <strong>Catatan:</strong> {application.notes}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedApplication(application)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      {application.status === 'DRAFT' && (
                        <Button 
                          size="sm"
                          onClick={() => handleSubmitApplication(application.id)}
                        >
                          Ajukan
                        </Button>
                      )}
                      
                      {canAccessAll && application.status === 'SUBMITTED' && (
                        <>
                          <Button 
                            size="sm"
                            onClick={() => handleUpdateStatus(application.id, 'PROCESSING')}
                          >
                            Proses
                          </Button>
                          <Button 
                            variant="destructive"
                            size="sm"
                            onClick={() => handleUpdateStatus(application.id, 'REJECTED', 'Permohonan ditolak')}
                          >
                            Tolak
                          </Button>
                        </>
                      )}
                      
                      {canAccessAll && application.status === 'PROCESSING' && (
                        <Button 
                          size="sm"
                          onClick={() => handleUpdateStatus(application.id, 'APPROVED')}
                        >
                          Setujui
                        </Button>
                      )}
                      
                      {(application.status === 'DRAFT' || application.status === 'SUBMITTED') && 
                       (!canAccessAll || application.applicant_id === user.id) && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => handleCancelApplication(application.id)}
                        >
                          Batal
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 10 && (
        <div className="flex justify-center gap-2">
          <Button 
            variant="outline" 
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          >
            Sebelumnya
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Halaman {currentPage} dari {Math.ceil(total / 10)}
          </span>
          <Button 
            variant="outline" 
            disabled={currentPage >= Math.ceil(total / 10)}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Selanjutnya
          </Button>
        </div>
      )}

      {/* Create Application Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Permohonan Baru</DialogTitle>
          </DialogHeader>
          <ApplicationForm
            onSubmit={handleCreateApplication}
            onCancel={() => setShowCreateForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* View Application Dialog */}
      <Dialog open={!!selectedApplication} onOpenChange={(open) => !open && setSelectedApplication(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Permohonan</DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nomor Permohonan
                  </label>
                  <p className="text-gray-900">{selectedApplication.application_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jenis Permohonan
                  </label>
                  <p className="text-gray-900">{getApplicationTypeLabel(selectedApplication.application_type)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <Badge className={getStatusColor(selectedApplication.status)}>
                    {getStatusLabel(selectedApplication.status)}
                  </Badge>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dibuat pada
                  </label>
                  <p className="text-gray-900">{selectedApplication.created_at.toLocaleDateString('id-ID')}</p>
                </div>
              </div>
              
              {selectedApplication.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catatan
                  </label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded">{selectedApplication.notes}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Permohonan
                </label>
                <pre className="text-sm bg-gray-50 p-3 rounded overflow-auto">
                  {JSON.stringify(selectedApplication.application_data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
