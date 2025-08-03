
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { Population, CreatePopulationInput } from '../../../server/src/schema';
import { PopulationForm } from '@/components/PopulationForm';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  FileText,
  MapPin,
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';

export function PopulationManagement() {
  const [populations, setPopulations] = useState<Population[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPopulation, setEditingPopulation] = useState<Population | null>(null);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const loadPopulations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await trpc.getPopulations.query({
        page: currentPage,
        limit: 10,
        search: searchTerm || undefined,
        kelurahan: selectedLocation === 'all' ? undefined : selectedLocation
      });
      setPopulations(result.data);
      setTotal(result.total);
    } catch (loadError) {
      console.error('Failed to load populations:', loadError);
      setError('Gagal memuat data penduduk');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchTerm, selectedLocation]);

  useEffect(() => {
    loadPopulations();
  }, [loadPopulations]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadPopulations();
  };

  const handleAddPopulation = async (data: CreatePopulationInput) => {
    try {
      const newPopulation = await trpc.createPopulation.mutate(data);
      setPopulations(prev => [newPopulation, ...prev]);
      setShowAddForm(false);
      setTotal(prev => prev + 1);
    } catch (addError) {
      console.error('Failed to create population:', addError);
      throw new Error('Gagal menambahkan data penduduk');
    }
  };

  const handleEditPopulation = async (data: CreatePopulationInput & { id: number }) => {
    try {
      const updatedPopulation = await trpc.updatePopulation.mutate(data);
      setPopulations(prev => prev.map(p => p.id === data.id ? updatedPopulation : p));
      setEditingPopulation(null);
    } catch (editError) {
      console.error('Failed to update population:', editError);
      throw new Error('Gagal mengupdate data penduduk');
    }
  };

  const handleDeletePopulation = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus data penduduk ini?')) {
      return;
    }

    try {
      await trpc.deletePopulation.mutate(id);
      setPopulations(prev => prev.filter(p => p.id !== id));
      setTotal(prev => prev - 1);
    } catch (deleteError) {
      console.error('Failed to delete population:', deleteError);
      setError('Gagal menghapus data penduduk');
    }
  };

  const getGenderLabel = (gender: string) => {
    return gender === 'LAKI_LAKI' ? 'Laki-laki' : 'Perempuan';
  };

  const getReligionLabel = (religion: string) => {
    const labels: Record<string, string> = {
      'ISLAM': 'Islam',
      'KRISTEN': 'Kristen',
      'KATOLIK': 'Katolik',
      'HINDU': 'Hindu',
      'BUDDHA': 'Buddha',
      'KONGHUCU': 'Konghucu'
    };
    return labels[religion] || religion;
  };

  const getMaritalStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'BELUM_KAWIN': 'Belum Kawin',
      'KAWIN': 'Kawin',
      'CERAI_HIDUP': 'Cerai Hidup',
      'CERAI_MATI': 'Cerai Mati'
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Data Penduduk</h1>
          <p className="text-gray-600">Kelola data kependudukan dan informasi pribadi</p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Penduduk
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
                  placeholder="Cari berdasarkan nama atau NIK..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter Kelurahan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelurahan</SelectItem>
                <SelectItem value="kelurahan1">Kelurahan 1</SelectItem>
                <SelectItem value="kelurahan2">Kelurahan 2</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Cari
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Daftar Penduduk ({total.toLocaleString('id-ID')} orang)</span>
            <Badge variant="secondary">{populations.length} dari {total}</Badge>
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
          ) : populations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Tidak ada data penduduk ditemukan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {populations.map((population: Population) => (
                <div key={population.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {population.nama_lengkap}
                        </h3>
                        <Badge variant="outline">{population.nik}</Badge>
                        <Badge className={
                          population.jenis_kelamin === 'LAKI_LAKI' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-pink-100 text-pink-800'
                        }>
                          {getGenderLabel(population.jenis_kelamin)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>
                            {population.tempat_lahir}, {population.tanggal_lahir.toLocaleDateString('id-ID')}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>
                            {population.kelurahan}, {population.kecamatan}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          <span>{population.pekerjaan}</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        <Badge variant="secondary">
                          {getReligionLabel(population.agama)}
                        </Badge>
                        <Badge variant="secondary">
                          {getMaritalStatusLabel(population.status_perkawinan)}
                        </Badge>
                        <Badge variant="secondary">
                          {population.kewarganegaraan}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingPopulation(population)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeletePopulation(population.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

      {/* Add Population Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Data Penduduk Baru</DialogTitle>
          </DialogHeader>
          <PopulationForm
            onSubmit={handleAddPopulation}
            onCancel={() => setShowAddForm(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Population Dialog */}
      <Dialog open={!!editingPopulation} onOpenChange={(open) => !open && setEditingPopulation(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Data Penduduk</DialogTitle>
          </DialogHeader>
          {editingPopulation && (
            <PopulationForm
              initialData={editingPopulation}
              onSubmit={(data) => handleEditPopulation({ ...data, id: editingPopulation.id })}
              onCancel={() => setEditingPopulation(null)}
              isEditing
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
