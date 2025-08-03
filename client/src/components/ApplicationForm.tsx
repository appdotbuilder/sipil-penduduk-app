
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import type { CreateApplicationInput, Population, ApplicationType } from '../../../server/src/schema';
import { AlertCircle, Search, User } from 'lucide-react';

interface ApplicationFormProps {
  onSubmit: (data: CreateApplicationInput) => Promise<void>;
  onCancel: () => void;
}

export function ApplicationForm({ onSubmit, onCancel }: ApplicationFormProps) {
  const [formData, setFormData] = useState<CreateApplicationInput>({
    application_type: 'AKTA_KELAHIRAN',
    population_id: null,
    application_data: {},
    notes: null
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchNik, setSearchNik] = useState('');
  const [searchedPopulation, setSearchedPopulation] = useState<Population | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchNik = async () => {
    if (!searchNik.trim()) {
      setError('NIK harus diisi untuk pencarian');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const population = await trpc.searchPopulationByNIK.query(searchNik);
      if (population) {
        setSearchedPopulation(population);
        setFormData(prev => ({ ...prev, population_id: population.id }));
      } else {
        setError('Penduduk dengan NIK tersebut tidak ditemukan');
        setSearchedPopulation(null);
        setFormData(prev => ({ ...prev, population_id: null }));
      }
    } catch (searchError) {
      console.error('Search failed:', searchError);
      setError('Gagal mencari data penduduk');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Terjadi kesalahan');
    } finally {
      setIsLoading(false);
    }
  };

  const getApplicationTypeLabel = (type: string) => {
    switch (type) {
      case 'AKTA_KELAHIRAN': return 'Akta Kelahiran';
      case 'AKTA_KEMATIAN': return 'Akta Kematian';
      case 'PERUBAHAN_DATA': return 'Perubahan Data';
      case 'PINDAH_DATANG': return 'Pindah/Datang';
      case 'KK_BARU': return 'Kartu Keluarga Baru';
      case 'KTP_BARU': return 'KTP Baru';
      default: return type;
    }
  };

  const renderApplicationFields = () => {
    switch (formData.application_type) {
      case 'AKTA_KELAHIRAN':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nama_bayi">Nama Bayi *</Label>
                <Input
                  id="nama_bayi"
                  placeholder="Nama lengkap bayi"
                  value={formData.application_data.nama_bayi || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData(prev => ({
                      ...prev,
                      application_data: { ...prev.application_data, nama_bayi: e.target.value }
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggal_lahir">Tanggal Lahir *</Label>
                <Input
                  id="tanggal_lahir"
                  type="date"
                  value={formData.application_data.tanggal_lahir || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData(prev => ({
                      ...prev,
                      application_data: { ...prev.application_data, tanggal_lahir: e.target.value }
                    }))
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tempat_lahir">Tempat Lahir *</Label>
              <Input
                id="tempat_lahir"
                placeholder="RS/Klinik/Rumah tempat lahir"
                value={formData.application_data.tempat_lahir || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({
                    ...prev,
                    application_data: { ...prev.application_data, tempat_lahir: e.target.value }
                  }))
                }
                required
              />
            </div>
          </div>
        );

      case 'AKTA_KEMATIAN':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tanggal_meninggal">Tanggal Meninggal *</Label>
                <Input
                  id="tanggal_meninggal"
                  type="date"
                  value={formData.application_data.tanggal_meninggal || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData(prev => ({
                      ...prev,
                      application_data: { ...prev.application_data, tanggal_meninggal: e.target.value }
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tempat_meninggal">Tempat Meninggal *</Label>
                <Input
                  id="tempat_meninggal"
                  placeholder="RS/Rumah/tempat meninggal"
                  value={formData.application_data.tempat_meninggal || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData(prev => ({
                      ...prev,
                      application_data: { ...prev.application_data, tempat_meninggal: e.target.value }
                    }))
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sebab_meninggal">Sebab Meninggal *</Label>
              <Input
                id="sebab_meninggal"
                placeholder="Penyebab kematian"
                value={formData.application_data.sebab_meninggal || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({
                    ...prev,
                    application_data: { ...prev.application_data, sebab_meninggal: e.target.value }
                  }))
                }
                required
              />
            </div>
          </div>
        );

      case 'PERUBAHAN_DATA':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jenis_perubahan">Jenis Perubahan *</Label>
              <Select
                value={formData.application_data.jenis_perubahan || 'none'}
                onValueChange={(value: string) =>
                  setFormData(prev => ({
                    ...prev,
                    application_data: { 
                      ...prev.application_data, 
                      jenis_perubahan: value === 'none' ? '' : value 
                    }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis perubahan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pilih jenis perubahan</SelectItem>
                  <SelectItem value="nama">Perubahan Nama</SelectItem>
                  <SelectItem value="alamat">Perubahan Alamat</SelectItem>
                  <SelectItem value="status_perkawinan">Perubahan Status Perkawinan</SelectItem>
                  <SelectItem value="pekerjaan">Perubahan Pekerjaan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_lama">Data Lama</Label>
              <Input
                id="data_lama"
                placeholder="Data yang akan diubah"
                value={formData.application_data.data_lama || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({
                    ...prev,
                    application_data: { ...prev.application_data, data_lama: e.target.value }
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data_baru">Data Baru *</Label>
              <Input
                id="data_baru"
                placeholder="Data pengganti"
                value={formData.application_data.data_baru || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({
                    ...prev,
                    application_data: { ...prev.application_data, data_baru: e.target.value }
                  }))
                }
                required
              />
            </div>
          </div>
        );

      case 'PINDAH_DATANG':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jenis_pindah">Jenis Perpindahan *</Label>
              <Select
                value={formData.application_data.jenis_pindah || 'none'}
                onValueChange={(value: string) =>
                  setFormData(prev => ({
                    ...prev,
                    application_data: { 
                      ...prev.application_data, 
                      jenis_pindah: value === 'none' ? '' : value 
                    }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis perpindahan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pilih jenis perpindahan</SelectItem>
                  <SelectItem value="pindah_keluar">Pindah Keluar</SelectItem>
                  <SelectItem value="pindah_masuk">Pindah Masuk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="alamat_asal">Alamat Asal</Label>
              <Textarea
                id="alamat_asal"
                placeholder="Alamat sebelumnya"
                value={formData.application_data.alamat_asal || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData(prev => ({
                    ...prev,
                    application_data: { ...prev.application_data, alamat_asal: e.target.value }
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alamat_tujuan">Alamat Tujuan *</Label>
              <Textarea
                id="alamat_tujuan"
                placeholder="Alamat baru"
                value={formData.application_data.alamat_tujuan || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData(prev => ({
                    ...prev,
                    application_data: { ...prev.application_data, alamat_tujuan: e.target.value }
                  }))
                }
                required
              />
            </div>
          </div>
        );

      case 'KK_BARU':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alasan_kk_baru">Alasan Pembuatan KK Baru *</Label>
              <Select
                value={formData.application_data.alasan_kk_baru || 'none'}
                onValueChange={(value: string) =>
                  setFormData(prev => ({
                    ...prev,
                    application_data: { 
                      ...prev.application_data, 
                      alasan_kk_baru: value === 'none' ? '' : value 
                    }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih alasan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pilih alasan</SelectItem>
                  <SelectItem value="pisah_kk">Pisah Kartu Keluarga</SelectItem>
                  <SelectItem value="kk_hilang">KK Hilang</SelectItem>
                  <SelectItem value="kk_rusak">KK Rusak</SelectItem>
                  <SelectItem value="perubahan_data">Perubahan Data Keluarga</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jumlah_anggota">Jumlah Anggota Keluarga *</Label>
              <Input
                id="jumlah_anggota"
                type="number"
                min="1"
                placeholder="Jumlah anggota keluarga"
                value={formData.application_data.jumlah_anggota || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({
                    ...prev,
                    application_data: { ...prev.application_data, jumlah_anggota: parseInt(e.target.value) || 0 }
                  }))
                }
                required
              />
            </div>
          </div>
        );

      case 'KTP_BARU':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alasan_ktp_baru">Alasan Pembuatan KTP Baru *</Label>
              <Select
                value={formData.application_data.alasan_ktp_baru || 'none'}
                onValueChange={(value: string) =>
                  setFormData(prev => ({
                    ...prev,
                    application_data: { 
                      ...prev.application_data, 
                      alasan_ktp_baru: value === 'none' ? '' : value 
                    }
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih alasan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pilih alasan</SelectItem>
                  <SelectItem value="baru_17_tahun">Baru Berusia 17 Tahun</SelectItem>
                  <SelectItem value="ktp_hilang">KTP Hilang</SelectItem>
                  <SelectItem value="ktp_rusak">KTP Rusak</SelectItem>
                  <SelectItem value="perubahan_data">Perubahan Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Application Type */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Jenis Permohonan</h3>
        <div className="space-y-2">
          <Label htmlFor="application_type">Pilih Jenis Permohonan *</Label>
          <Select
            value={formData.application_type || 'AKTA_KELAHIRAN'}
            onValueChange={(value: ApplicationType) =>
              setFormData(prev => ({ ...prev, application_type: value, application_data: {} }))
            }
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AKTA_KELAHIRAN">Akta Kelahiran</SelectItem>
              <SelectItem value="AKTA_KEMATIAN">Akta Kematian</SelectItem>
              <SelectItem value="PERUBAHAN_DATA">Perubahan Data</SelectItem>
              <SelectItem value="PINDAH_DATANG">Pindah/Datang</SelectItem>
              <SelectItem value="KK_BARU">Kartu Keluarga Baru</SelectItem>
              <SelectItem value="KTP_BARU">KTP Baru</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Population Search */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Data Penduduk</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="search_nik">Cari berdasarkan NIK</Label>
            <Input
              id="search_nik"
              type="text"
              maxLength={16}
              placeholder="Masukkan NIK (16 digit)"
              value={searchNik}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchNik(e.target.value)}
              disabled={isLoading || isSearching}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleSearchNik}
              disabled={isLoading || isSearching}
            >
              {isSearching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Mencari...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Cari
                </>
              )}
            </Button>
          </div>
        </div>

        {searchedPopulation && (
          <Card className="bg-green-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-sm text-green-800 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Data Penduduk Ditemukan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Nama:</strong> {searchedPopulation.nama_lengkap}
                </div>
                <div>
                  <strong>NIK:</strong> {searchedPopulation.nik}
                </div>
                <div>
                  <strong>Tempat, Tanggal Lahir:</strong> {searchedPopulation.tempat_lahir}, {searchedPopulation.tanggal_lahir.toLocaleDateString('id-ID')}
                </div>
                <div>
                  <strong>Alamat:</strong> {searchedPopulation.alamat}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Application Data */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          Detail {getApplicationTypeLabel(formData.application_type)}
        </h3>
        {renderApplicationFields()}
      </div>

      {/* Notes */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Catatan Tambahan</h3>
        <div className="space-y-2">
          <Label htmlFor="notes">Catatan (Opsional)</Label>
          <Textarea
            id="notes"
            placeholder="Tambahkan catatan atau keterangan khusus..."
            value={formData.notes || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData(prev => ({ ...prev, notes: e.target.value || null }))
            }
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Batal
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Menyimpan...
            </>
          ) : (
            'Simpan Permohonan'
          )}
        </Button>
      </div>
    </form>
  );
}
