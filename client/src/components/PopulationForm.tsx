
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { CreatePopulationInput, Population, Gender, Religion, MaritalStatus } from '../../../server/src/schema';
import { AlertCircle, Calendar } from 'lucide-react';

interface PopulationFormProps {
  initialData?: Population;
  onSubmit: (data: CreatePopulationInput) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
}

export function PopulationForm({ initialData, onSubmit, onCancel, isEditing = false }: PopulationFormProps) {
  const [formData, setFormData] = useState<CreatePopulationInput>({
    nik: initialData?.nik || '',
    nama_lengkap: initialData?.nama_lengkap || '',
    tempat_lahir: initialData?.tempat_lahir || '',
    tanggal_lahir: initialData?.tanggal_lahir || new Date(),
    jenis_kelamin: initialData?.jenis_kelamin || 'LAKI_LAKI',
    agama: initialData?.agama || 'ISLAM',
    status_perkawinan: initialData?.status_perkawinan || 'BELUM_KAWIN',
    pekerjaan: initialData?.pekerjaan || '',
    kewarganegaraan: initialData?.kewarganegaraan || 'INDONESIA',
    alamat: initialData?.alamat || '',
    rt: initialData?.rt || '',
    rw: initialData?.rw || '',
    kelurahan: initialData?.kelurahan || '',
    kecamatan: initialData?.kecamatan || '',
    kabupaten: initialData?.kabupaten || '',
    provinsi: initialData?.provinsi || '',
    kode_pos: initialData?.kode_pos || '',
    nomor_kk: initialData?.nomor_kk || null,
    nama_ayah: initialData?.nama_ayah || null,
    nama_ibu: initialData?.nama_ibu || null
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Personal Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Informasi Pribadi</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nik">NIK *</Label>
            <Input
              id="nik"
              type="text"
              maxLength={16}
              placeholder="1234567890123456"
              value={formData.nik}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, nik: e.target.value }))
              }
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nama_lengkap">Nama Lengkap *</Label>
            <Input
              id="nama_lengkap"
              type="text"
              placeholder="Nama lengkap sesuai KTP"
              value={formData.nama_lengkap}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, nama_lengkap: e.target.value }))
              }
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tempat_lahir">Tempat Lahir *</Label>
            <Input
              id="tempat_lahir"
              type="text"
              placeholder="Kota/Kabupaten kelahiran"
              value={formData.tempat_lahir}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, tempat_lahir: e.target.value }))
              }
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tanggal_lahir">Tanggal Lahir *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="tanggal_lahir"
                type="date"
                value={formData.tanggal_lahir.toISOString().split('T')[0]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData(prev => ({ ...prev, tanggal_lahir: new Date(e.target.value) }))
                }
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="jenis_kelamin">Jenis Kelamin *</Label>
            <Select 
              value={formData.jenis_kelamin || 'LAKI_LAKI'} 
              onValueChange={(value: Gender) => 
                setFormData(prev => ({ ...prev, jenis_kelamin: value }))
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LAKI_LAKI">Laki-laki</SelectItem>
                <SelectItem value="PEREMPUAN">Perempuan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="agama">Agama *</Label>
            <Select 
              value={formData.agama || 'ISLAM'} 
              onValueChange={(value: Religion) => 
                setFormData(prev => ({ ...prev, agama: value }))
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ISLAM">Islam</SelectItem>
                <SelectItem value="KRISTEN">Kristen</SelectItem>
                <SelectItem value="KATOLIK">Katolik</SelectItem>
                <SelectItem value="HINDU">Hindu</SelectItem>
                <SelectItem value="BUDDHA">Buddha</SelectItem>
                <SelectItem value="KONGHUCU">Konghucu</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="status_perkawinan">Status Perkawinan *</Label>
            <Select 
              value={formData.status_perkawinan || 'BELUM_KAWIN'} 
              onValueChange={(value: MaritalStatus) => 
                setFormData(prev => ({ ...prev, status_perkawinan: value }))
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BELUM_KAWIN">Belum Kawin</SelectItem>
                <SelectItem value="KAWIN">Kawin</SelectItem>
                <SelectItem value="CERAI_HIDUP">Cerai Hidup</SelectItem>
                <SelectItem value="CERAI_MATI">Cerai Mati</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="pekerjaan">Pekerjaan *</Label>
            <Input
              id="pekerjaan"
              type="text"
              placeholder="Pekerjaan/Profesi"
              value={formData.pekerjaan}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, pekerjaan: e.target.value }))
              }
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="kewarganegaraan">Kewarganegaraan *</Label>
            <Input
              id="kewarganegaraan"
              type="text"
              value={formData.kewarganegaraan}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, kewarganegaraan: e.target.value }))
              }
              required
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Informasi Alamat</h3>
        
        <div className="space-y-2">
          <Label htmlFor="alamat">Alamat Lengkap *</Label>
          <Textarea
            id="alamat"
            placeholder="Jalan, nomor rumah, dan alamat lengkap"
            value={formData.alamat}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData(prev => ({ ...prev, alamat: e.target.value }))
            }
            required
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rt">RT *</Label>
            <Input
              id="rt"
              type="text"
              maxLength={3}
              placeholder="001"
              value={formData.rt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, rt: e.target.value }))
              }
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="rw">RW *</Label>
            <Input
              id="rw"
              type="text"
              maxLength={3}
              placeholder="001"
              value={formData.rw}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, rw: e.target.value }))
              }
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="kode_pos">Kode Pos *</Label>
            <Input
              id="kode_pos"
              type="text"
              maxLength={5}
              placeholder="12345"
              value={formData.kode_pos}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, kode_pos: e.target.value }))
              }
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nomor_kk">Nomor KK</Label>
            <Input
              id="nomor_kk"
              type="text"
              maxLength={16}
              placeholder="1234567890123456"
              value={formData.nomor_kk || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, nomor_kk: e.target.value || null }))
              }
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="kelurahan">Kelurahan *</Label>
            <Input
              id="kelurahan"
              type="text"
              placeholder="Nama Kelurahan"
              value={formData.kelurahan}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, kelurahan: e.target.value }))
              }
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="kecamatan">Kecamatan *</Label>
            <Input
              id="kecamatan"
              type="text"
              placeholder="Nama Kecamatan"
              value={formData.kecamatan}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, kecamatan: e.target.value }))
              }
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="kabupaten">Kabupaten *</Label>
            <Input
              id="kabupaten"
              type="text"
              placeholder="Nama Kabupaten"
              value={formData.kabupaten}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, kabupaten: e.target.value }))
              }
              required
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="provinsi">Provinsi *</Label>
            <Input
              id="provinsi"
              type="text"
              placeholder="Nama Provinsi"
              value={formData.provinsi}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, provinsi: e.target.value }))
              }
              required
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Family Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Informasi Keluarga</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nama_ayah">Nama Ayah</Label>
            <Input
              id="nama_ayah"
              type="text"
              placeholder="Nama lengkap ayah"
              value={formData.nama_ayah || ''}
              
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, nama_ayah: e.target.value || null }))
              }
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="nama_ibu">Nama Ibu</Label>
            <Input
              id="nama_ibu"
              type="text"
              placeholder="Nama lengkap ibu"
              value={formData.nama_ibu || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData(prev => ({ ...prev, nama_ibu: e.target.value || null }))
              }
              disabled={isLoading}
            />
          </div>
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
              {isEditing ? 'Mengupdate...' : 'Menyimpan...'}
            </>
          ) : (
            isEditing ? 'Update Data' : 'Simpan Data'
          )}
        </Button>
      </div>
    </form>
  );
}
