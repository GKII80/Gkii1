import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ImagePlus,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ChurchLetter, LetterType, SiteTextContent } from '../types';
import { formatIndonesianDate } from '../lib/dateAndFormat';
import { generateChurchLetterPdf } from '../lib/letterDocumentPdf';
import { DEFAULT_SITE_CONTENT } from '../lib/siteContentDefaults';

const LETTER_TYPES: LetterType[] = [
  'Surat Masuk',
  'Surat Keluar',
  'Surat Keputusan',
  'Surat Nikah',
  'Surat Baptis',
  'Surat Persembahan Anak',
];

const LETTER_TYPE_CODES: Record<LetterType, string> = {
  'Surat Masuk': 'SM',
  'Surat Keluar': 'SKel',
  'Surat Keputusan': 'SK',
  'Surat Nikah': 'SN',
  'Surat Baptis': 'SB',
  'Surat Persembahan Anak': 'SPA',
};

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function todayYMD(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
}

function suggestLetterNumber(type: LetterType, existingCount: number): string {
  const now = new Date();
  const seq = String(existingCount + 1).padStart(3, '0');
  const code = LETTER_TYPE_CODES[type];
  const monthRoman = ROMAN_MONTHS[now.getMonth()] || 'XI';
  return `${seq}/GKII-SB/${code}/${monthRoman}/${now.getFullYear()}`;
}

function compressDocumentImageToJpeg(
  source: HTMLVideoElement | HTMLImageElement,
  width: number,
  height: number,
  maxDim = 1600,
  quality = 0.86
): string {
  const ratio = Math.min(1, maxDim / Math.max(width, height, 1));
  const targetW = Math.max(1, Math.round(width * ratio));
  const targetH = Math.max(1, Math.round(height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Perangkat tidak mendukung pemrosesan kanvas.');
  ctx.drawImage(source, 0, 0, targetW, targetH);
  return canvas.toDataURL('image/jpeg', quality);
}

interface PendingPhotoDraft {
  tempId: string;
  label: string;
  imageDataUrl: string;
}

interface SecretaryLettersSectionProps {
  letters: ChurchLetter[];
  siteContent?: SiteTextContent;
  loadingLetters: boolean;
  canEditAdmin: boolean;
  secretaryName?: string;
  logoUrl?: string;
  onOpenSecretaryLogin: () => void;
  onAddLetter: (
    payload: Omit<ChurchLetter, 'id' | 'physicalPhotos' | 'recordedBy' | 'createdAt'> & {
      initialPhotos?: { label: string; imageDataUrl: string }[];
    }
  ) => Promise<void>;
  onUpdateLetter: (
    id: string,
    payload: Partial<ChurchLetter>
  ) => Promise<void>;
  onDeleteLetter: (id: string) => Promise<void>;
  onAddLetterPhoto: (
    letterId: string,
    payload: { label: string; imageDataUrl: string }
  ) => Promise<void>;
  onDeleteLetterPhoto: (letterId: string, photoId: string) => Promise<void>;
}

interface LetterFormState {
  letterType: LetterType;
  letterNumber: string;
  letterDate: string;
  subject: string;
  status: 'Arsip Aktif' | 'Ditindaklanjuti' | 'Selesai';
  notes: string;
  sender: string;
  receivedDate: string;
  disposition: string;
  recipient: string;
  signer: string;
  effectiveDate: string;
  validityPeriod: string;
  groomName: string;
  brideName: string;
  officiant: string;
  ceremonyLocation: string;
  witnesses: string;
  baptizedName: string;
  birthInfo: string;
  parentsName: string;
  childName: string;
  fatherName: string;
  motherName: string;
}

function createEmptyForm(type: LetterType, existingCount: number): LetterFormState {
  const today = todayYMD();
  return {
    letterType: type,
    letterNumber: suggestLetterNumber(type, existingCount),
    letterDate: today,
    subject:
      type === 'Surat Nikah'
        ? 'Surat Keterangan Pemberkatan Nikah Kudus'
        : type === 'Surat Baptis'
          ? 'Piagam Baptisan Air Kudus'
          : type === 'Surat Persembahan Anak'
            ? 'Surat Penyerahan / Persembahan Anak Kepada Tuhan'
            : '',
    status: type === 'Surat Masuk' ? 'Ditindaklanjuti' : 'Arsip Aktif',
    notes: '',
    sender: '',
    receivedDate: today,
    disposition: '',
    recipient: '',
    signer: 'Pdt. Lukas H. Bangun, M.Th. & Ibu Martha Simanjuntak',
    effectiveDate: today,
    validityPeriod: '',
    groomName: '',
    brideName: '',
    officiant: 'Pdt. Lukas H. Bangun, M.Th.',
    ceremonyLocation: 'Gedung Gereja Utama GKII Jemaat Sungai Barang',
    witnesses: '',
    baptizedName: '',
    birthInfo: '',
    parentsName: '',
    childName: '',
    fatherName: '',
    motherName: '',
  };
}

export const SecretaryLettersSection: React.FC<SecretaryLettersSectionProps> = ({
  letters,
  siteContent,
  loadingLetters,
  canEditAdmin,
  secretaryName,
  logoUrl,
  onOpenSecretaryLogin,
  onAddLetter,
  onUpdateLetter,
  onDeleteLetter,
  onAddLetterPhoto,
  onDeleteLetterPhoto,
}) => {
  const [selectedType, setSelectedType] = useState<'Semua' | LetterType>('Semua');
  const [statusFilter, setStatusFilter] = useState<'Semua' | ChurchLetter['status']>('Semua');
  const [search, setSearch] = useState('');

  // Create / Edit Letter Modal
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingLetter, setEditingLetter] = useState<ChurchLetter | null>(null);
  const [form, setForm] = useState<LetterFormState>(() => createEmptyForm('Surat Masuk', 0));
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhotoDraft[]>([]);
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmDeleteLetterId, setConfirmDeleteLetterId] = useState<string | null>(null);

  // Camera / Physical Photo Capture Modal (used both inside Form OR directly on an existing letter)
  const [photoCaptureTargetLetter, setPhotoCaptureTargetLetter] = useState<ChurchLetter | null>(
    null
  );
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoSourceTab, setPhotoSourceTab] = useState<'kamera' | 'berkas'>('kamera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [photoLabel, setPhotoLabel] = useState('Halaman 1');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Lightbox Viewer for Physical Letter Photos
  const [lightboxState, setLightboxState] = useState<{
    letter: ChurchLetter;
    index: number;
  } | null>(null);
  const [confirmDeletePhotoId, setConfirmDeletePhotoId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileCamRef = useRef<HTMLInputElement | null>(null);
  const filePickRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraStarting(false);
  }, []);

  const startCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      stopCamera();
      setCameraError(null);
      setCameraStarting(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStarting(false);
        setCameraError(
          'Browser tidak mendukung akses kamera langsung. Gunakan tombol "Kamera Perangkat / Pilih Foto".'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1600 },
            height: { ideal: 1200 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraActive(true);
      } catch (err) {
        setCameraError(
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Izin kamera ditolak oleh browser. Aktifkan izin kamera atau gunakan unggah berkas di bawah.'
            : 'Kamera perangkat tidak terdeteksi. Gunakan kamera bawaan ponsel atau pilih berkas foto surat fisik.'
        );
      } finally {
        setCameraStarting(false);
      }
    },
    [stopCamera]
  );

  useEffect(() => {
    if (photoModalOpen && photoSourceTab === 'kamera' && !capturedPreviewUrl) {
      void startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [photoModalOpen, photoSourceTab, facingMode, capturedPreviewUrl, startCamera, stopCamera]);

  // Keep lightbox photo state synced when letters list updates
  useEffect(() => {
    if (!lightboxState) return;
    const updated = letters.find((l) => l.id === lightboxState.letter.id);
    if (!updated || updated.physicalPhotos.length === 0) {
      setLightboxState(null);
      return;
    }
    const clampedIdx = Math.min(lightboxState.index, updated.physicalPhotos.length - 1);
    if (updated !== lightboxState.letter || clampedIdx !== lightboxState.index) {
      setLightboxState({ letter: updated, index: clampedIdx });
    }
  }, [letters, lightboxState]);

  const filteredLetters = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/\bbabtis\b/g, 'baptis');
    return letters.filter((item) => {
      const matchType = selectedType === 'Semua' || item.letterType === selectedType;
      const matchStatus = statusFilter === 'Semua' || item.status === statusFilter;
      if (!matchType || !matchStatus) return false;
      if (!q) return true;
      const haystack = [
        item.letterType,
        item.letterNumber,
        item.subject,
        item.notes,
        item.sender,
        item.recipient,
        item.disposition,
        item.groomName,
        item.brideName,
        item.baptizedName,
        item.parentsName,
        item.childName,
        item.fatherName,
        item.motherName,
        item.officiant,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [letters, selectedType, statusFilter, search]);

  const openCreateModal = (defaultType?: LetterType) => {
    const initialType =
      defaultType || (selectedType === 'Semua' ? 'Surat Masuk' : selectedType);
    setEditingLetter(null);
    setForm(createEmptyForm(initialType, letters.length));
    setPendingPhotos([]);
    setFormError(null);
    setFormModalOpen(true);
  };

  const openEditModal = (letter: ChurchLetter) => {
    setEditingLetter(letter);
    setForm({
      letterType: letter.letterType,
      letterNumber: letter.letterNumber,
      letterDate: letter.letterDate,
      subject: letter.subject,
      status: letter.status,
      notes: letter.notes || '',
      sender: letter.sender || '',
      receivedDate: letter.receivedDate || letter.letterDate,
      disposition: letter.disposition || '',
      recipient: letter.recipient || '',
      signer: letter.signer || '',
      effectiveDate: letter.effectiveDate || letter.letterDate,
      validityPeriod: letter.validityPeriod || '',
      groomName: letter.groomName || '',
      brideName: letter.brideName || '',
      officiant: letter.officiant || '',
      ceremonyLocation: letter.ceremonyLocation || '',
      witnesses: letter.witnesses || '',
      baptizedName: letter.baptizedName || '',
      birthInfo: letter.birthInfo || '',
      parentsName: letter.parentsName || '',
      childName: letter.childName || '',
      fatherName: letter.fatherName || '',
      motherName: letter.motherName || '',
    });
    setPendingPhotos([]);
    setFormError(null);
    setFormModalOpen(true);
  };

  const openPhotoCaptureModal = (existingLetter: ChurchLetter | null) => {
    const nextPageNum = existingLetter
      ? existingLetter.physicalPhotos.length + 1
      : pendingPhotos.length + 1;
    setPhotoCaptureTargetLetter(existingLetter);
    setPhotoLabel(`Halaman ${nextPageNum}`);
    setCapturedPreviewUrl(null);
    setPhotoError(null);
    setCameraError(null);
    setPhotoSourceTab('kamera');
    setPhotoModalOpen(true);
  };

  const closePhotoCaptureModal = () => {
    stopCamera();
    setPhotoModalOpen(false);
    setCapturedPreviewUrl(null);
    setPhotoError(null);
  };

  const handleCaptureSnapshot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setPhotoError('Pratinjau kamera belum siap. Tunggu sesaat lalu coba lagi.');
      return;
    }
    try {
      const dataUrl = compressDocumentImageToJpeg(video, video.videoWidth, video.videoHeight);
      setCapturedPreviewUrl(dataUrl);
      setPhotoError(null);
      stopCamera();
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Gagal menangkap foto surat.');
    }
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Pilih berkas gambar berformat JPEG, PNG, atau WebP.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const dataUrl = compressDocumentImageToJpeg(img, img.naturalWidth, img.naturalHeight);
          setCapturedPreviewUrl(dataUrl);
          setPhotoError(null);
          stopCamera();
        } catch (err) {
          setPhotoError(err instanceof Error ? err.message : 'Gagal memproses foto surat.');
        }
      };
      img.onerror = () => setPhotoError('Foto surat tidak dapat dibaca.');
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCapturedPhoto = async () => {
    if (!capturedPreviewUrl) {
      setPhotoError('Ambil atau pilih foto fisik surat terlebih dahulu.');
      return;
    }
    const cleanLabel = photoLabel.trim() || 'Halaman Surat';

    if (photoCaptureTargetLetter) {
      setUploadingPhoto(true);
      setPhotoError(null);
      try {
        await onAddLetterPhoto(photoCaptureTargetLetter.id, {
          label: cleanLabel,
          imageDataUrl: capturedPreviewUrl,
        });
        closePhotoCaptureModal();
      } catch (err) {
        setPhotoError(err instanceof Error ? err.message : 'Gagal menyimpan foto fisik surat.');
      } finally {
        setUploadingPhoto(false);
      }
    } else {
      // Queued for new letter form
      setPendingPhotos((prev) => [
        ...prev,
        {
          tempId: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          label: cleanLabel,
          imageDataUrl: capturedPreviewUrl,
        },
      ]);
      closePhotoCaptureModal();
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.letterNumber.trim() || !form.subject.trim()) {
      setFormError('Nomor surat dan perihal/judul surat wajib diisi.');
      return;
    }
    setSubmittingForm(true);
    setFormError(null);
    try {
      const payload = {
        letterType: form.letterType,
        letterNumber: form.letterNumber.trim(),
        letterDate: form.letterDate,
        subject: form.subject.trim(),
        status: form.status,
        notes: form.notes.trim(),
        sender: form.sender.trim() || undefined,
        receivedDate: form.receivedDate || undefined,
        disposition: form.disposition.trim() || undefined,
        recipient: form.recipient.trim() || undefined,
        signer: form.signer.trim() || undefined,
        effectiveDate: form.effectiveDate || undefined,
        validityPeriod: form.validityPeriod.trim() || undefined,
        groomName: form.groomName.trim() || undefined,
        brideName: form.brideName.trim() || undefined,
        officiant: form.officiant.trim() || undefined,
        ceremonyLocation: form.ceremonyLocation.trim() || undefined,
        witnesses: form.witnesses.trim() || undefined,
        baptizedName: form.baptizedName.trim() || undefined,
        birthInfo: form.birthInfo.trim() || undefined,
        parentsName: form.parentsName.trim() || undefined,
        childName: form.childName.trim() || undefined,
        fatherName: form.fatherName.trim() || undefined,
        motherName: form.motherName.trim() || undefined,
      };

      if (editingLetter) {
        await onUpdateLetter(editingLetter.id, payload);
      } else {
        await onAddLetter({
          ...payload,
          initialPhotos: pendingPhotos.map((p) => ({
            label: p.label,
            imageDataUrl: p.imageDataUrl,
          })),
        });
      }
      setFormModalOpen(false);
      setEditingLetter(null);
      setPendingPhotos([]);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan arsip surat.');
    } finally {
      setSubmittingForm(false);
    }
  };

  if (!canEditAdmin) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[#D4E4D8] bg-white p-8 sm:p-10 text-center max-w-2xl mx-auto space-y-5">
          <div className="w-12 h-12 rounded-xl bg-[#EAF3EC] border border-[#BFE0C9] flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-[#146C43]" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#146C43]">
              Akses Terbatas · Administrasi Jemaat
            </p>
            <h1 className="text-2xl font-bold text-[#0F2419]">
              Arsip Persuratan & Foto Fisik Surat
            </h1>
            <p className="text-sm text-[#456051] leading-relaxed">
              Pengelolaan <strong>Surat Masuk</strong>, <strong>Surat Keluar</strong>,{' '}
              <strong>Surat Keputusan</strong>, <strong>Surat Nikah</strong>,{' '}
              <strong>Surat Baptis</strong>, <strong>Surat Persembahan Anak</strong>, serta
              pemotretan <strong>Foto Fisik Surat</strong> hanya dapat diakses setelah masuk
              menggunakan akun berwenang.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSecretaryLogin}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Masuk Akun</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#146C43]">
            Arsip Administrasi GKII Jemaat Sungai Barang
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F2419] tracking-tight mt-0.5">
            {siteContent?.sections.suratTitle ||
              DEFAULT_SITE_CONTENT.sections.suratTitle}
          </h1>
          <p className="text-sm text-[#456051] mt-1">
            {siteContent?.sections.suratSubtitle ||
              DEFAULT_SITE_CONTENT.sections.suratSubtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openCreateModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Catat / Buat Surat</span>
        </button>
      </div>

      {/* Category Summary & Filter Tabs */}
      <section className="rounded-2xl border border-[#D4E4D8] bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedType('Semua')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              selectedType === 'Semua'
                ? 'bg-[#146C43] text-white'
                : 'bg-[#F5F9F6] border border-[#D4E4D8] text-[#456051] hover:text-[#0F2419]'
            }`}
          >
            Semua Surat ({letters.length})
          </button>
          {LETTER_TYPES.map((type) => {
            const count = letters.filter((l) => l.letterType === type).length;
            const active = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#146C43] text-white'
                    : 'bg-[#F5F9F6] border border-[#D4E4D8] text-[#456051] hover:text-[#0F2419]'
                }`}
              >
                {type} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-[#E6EFE8]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#456051] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor surat, perihal, nama mempelai, nama baptis/anak, pengirim..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419] placeholder:text-[#6B8576] focus:outline-none focus:border-[#146C43]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-sm text-[#0F2419] focus:outline-none focus:border-[#146C43]"
          >
            <option value="Semua">Semua Status</option>
            <option value="Arsip Aktif">Arsip Aktif</option>
            <option value="Ditindaklanjuti">Ditindaklanjuti</option>
            <option value="Selesai">Selesai</option>
          </select>
        </div>
      </section>

      {/* Letter List */}
      {loadingLetters ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl border border-[#D4E4D8] bg-white animate-pulse"
            />
          ))}
        </div>
      ) : filteredLetters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#D4E4D8] bg-white p-10 text-center space-y-3">
          <FileText className="w-8 h-8 text-[#146C43] mx-auto" />
          <p className="text-base font-bold text-[#0F2419]">
            Belum ada arsip surat yang cocok
          </p>
          <p className="text-sm text-[#456051]">
            Gunakan tombol “Catat / Buat Surat” untuk mengarsipkan surat baru dan memotret dokumen fisik surat.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLetters.map((letter) => (
            <article
              key={letter.id}
              className="rounded-2xl border border-[#D4E4D8] bg-white p-5 sm:p-6 space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#456051]">
                    <span className="font-bold text-[#146C43]">{letter.letterType}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono font-semibold text-[#0F2419]">
                      {letter.letterNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatIndonesianDate(letter.letterDate)}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`font-semibold ${
                        letter.status === 'Selesai'
                          ? 'text-[#146C43]'
                          : letter.status === 'Ditindaklanjuti'
                            ? 'text-[#B45309]'
                            : 'text-[#0F5132]'
                      }`}
                    >
                      {letter.status}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-[#0F2419] leading-snug">
                    {letter.subject}
                  </h2>

                  {/* Specific Metadata Lines */}
                  <div className="text-sm text-[#2D4D3B] space-y-1 pt-1">
                    {letter.letterType === 'Surat Masuk' && (
                      <>
                        {letter.sender && (
                          <p>
                            <span className="font-semibold">Pengirim:</span> {letter.sender}
                            {letter.receivedDate
                              ? ` · Diterima ${formatIndonesianDate(letter.receivedDate)}`
                              : ''}
                          </p>
                        )}
                        {letter.disposition && (
                          <p>
                            <span className="font-semibold">Disposisi:</span> {letter.disposition}
                          </p>
                        )}
                      </>
                    )}

                    {letter.letterType === 'Surat Keluar' && (
                      <>
                        {letter.recipient && (
                          <p>
                            <span className="font-semibold">Tujuan / Penerima:</span>{' '}
                            {letter.recipient}
                          </p>
                        )}
                        {letter.signer && (
                          <p>
                            <span className="font-semibold">Penandatangan:</span> {letter.signer}
                          </p>
                        )}
                      </>
                    )}

                    {letter.letterType === 'Surat Keputusan' && (
                      <>
                        <p>
                          {letter.effectiveDate && (
                            <>
                              <span className="font-semibold">Berlaku Sejak:</span>{' '}
                              {formatIndonesianDate(letter.effectiveDate)}
                            </>
                          )}
                          {letter.validityPeriod && ` · Masa Berlaku: ${letter.validityPeriod}`}
                        </p>
                        {letter.signer && (
                          <p>
                            <span className="font-semibold">Penandatangan SK:</span> {letter.signer}
                          </p>
                        )}
                      </>
                    )}

                    {letter.letterType === 'Surat Nikah' && (
                      <>
                        <p>
                          <span className="font-semibold">Mempelai:</span>{' '}
                          {letter.groomName || '—'} &amp; {letter.brideName || '—'}
                        </p>
                        <p>
                          {letter.ceremonyLocation && (
                            <>
                              <span className="font-semibold">Tempat:</span>{' '}
                              {letter.ceremonyLocation}
                            </>
                          )}
                          {letter.officiant && ` · Pendeta: ${letter.officiant}`}
                        </p>
                        {letter.witnesses && (
                          <p>
                            <span className="font-semibold">Saksi:</span> {letter.witnesses}
                          </p>
                        )}
                      </>
                    )}

                    {letter.letterType === 'Surat Baptis' && (
                      <>
                        <p>
                          <span className="font-semibold">Nama yang Dibaptis:</span>{' '}
                          {letter.baptizedName || '—'}
                          {letter.birthInfo ? ` (${letter.birthInfo})` : ''}
                        </p>
                        <p>
                          {letter.parentsName && (
                            <>
                              <span className="font-semibold">Orang Tua:</span> {letter.parentsName}
                            </>
                          )}
                          {letter.officiant && ` · Dilayani: ${letter.officiant}`}
                        </p>
                      </>
                    )}

                    {letter.letterType === 'Surat Persembahan Anak' && (
                      <>
                        <p>
                          <span className="font-semibold">Nama Anak:</span>{' '}
                          {letter.childName || '—'}
                          {letter.birthInfo ? ` (${letter.birthInfo})` : ''}
                        </p>
                        <p>
                          <span className="font-semibold">Orang Tua:</span>{' '}
                          {[letter.fatherName, letter.motherName].filter(Boolean).join(' & ') ||
                            '—'}
                          {letter.officiant ? ` · Didoakan: ${letter.officiant}` : ''}
                        </p>
                      </>
                    )}

                    {letter.notes && (
                      <p className="text-xs text-[#456051] pt-0.5">{letter.notes}</p>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => openPhotoCaptureModal(letter)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#EAF3EC] hover:bg-[#DCECE1] border border-[#BFE0C9] text-xs font-semibold text-[#0F5132] whitespace-nowrap cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#146C43]" />
                    <span>Foto Fisik Surat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void generateChurchLetterPdf(letter, logoUrl, {
                        kopAddressLine: siteContent?.kopAddressLine,
                        kopRegionLine: siteContent?.kopRegionLine,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4E4D8] bg-[#F5F9F6] hover:bg-[#EAF3EC] text-xs font-semibold text-[#0F2419] whitespace-nowrap cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#146C43]" />
                    <span>Unduh PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditModal(letter)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#F5F9F6] text-xs font-semibold text-[#0F2419] whitespace-nowrap cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#146C43]" />
                    <span>Ubah</span>
                  </button>

                  {confirmDeleteLetterId === letter.id ? (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteLetter(letter.id);
                          setConfirmDeleteLetterId(null);
                        }}
                        className="px-2.5 py-2 rounded-lg bg-[#B91C1C] text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                      >
                        Ya, Hapus
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteLetterId(null)}
                        className="px-2.5 py-2 rounded-lg border border-[#D4E4D8] text-xs text-[#456051] whitespace-nowrap cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteLetterId(letter.id)}
                      className="p-2 rounded-lg text-[#6B8576] hover:text-[#B91C1C] hover:bg-red-50 transition-colors cursor-pointer"
                      aria-label={`Hapus surat ${letter.letterNumber}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Physical Letter Photo Strip */}
              <div className="pt-3 border-t border-[#E6EFE8]">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <p className="text-xs font-semibold text-[#456051]">
                    Arsip Foto Fisik Surat ({letter.physicalPhotos.length} halaman)
                  </p>
                </div>

                {letter.physicalPhotos.length === 0 ? (
                  <p className="text-xs text-[#6B8576]">
                    Belum ada foto fisik surat dilampirkan. Klik “Foto Fisik Surat” untuk memotret lembar dokumen asli dari kamera perangkat.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {letter.physicalPhotos.map((photo, idx) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => {
                          setConfirmDeletePhotoId(null);
                          setLightboxState({ letter, index: idx });
                        }}
                        className="group relative w-28 rounded-lg border border-[#D4E4D8] bg-[#F5F9F6] overflow-hidden text-left hover:border-[#146C43] transition-colors cursor-pointer"
                      >
                        <div className="aspect-[4/3] w-full bg-[#EAF3EC] overflow-hidden">
                          <img
                            src={photo.imageUrl}
                            alt={`${letter.subject} - ${photo.label}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <p className="px-2 py-1 text-[11px] font-medium text-[#0F2419] truncate">
                          {photo.label}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Create / Edit Letter Modal */}
      {formModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#D4E4D8] w-full max-w-3xl overflow-hidden shadow-xl my-auto">
            <div className="px-6 py-4 border-b border-[#E6EFE8] bg-[#F5F9F6] flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#0F2419]">
                  {editingLetter ? 'Ubah Arsip Surat' : 'Catat / Buat Surat Baru'}
                </h2>
                <p className="text-xs text-[#456051]">
                  Sekretariat GKII Jemaat Sungai Barang
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormModalOpen(false)}
                className="p-2 rounded-lg text-[#456051] hover:bg-[#EAF3EC] cursor-pointer"
                aria-label="Tutup formulir surat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-[#0F2419]">Jenis Surat *</span>
                  <select
                    value={form.letterType}
                    onChange={(e) => {
                      const nextType = e.target.value as LetterType;
                      if (!editingLetter) {
                        const base = createEmptyForm(nextType, letters.length);
                        setForm({
                          ...base,
                          notes: form.notes,
                        });
                      } else {
                        setForm({ ...form, letterType: nextType });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-sm text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  >
                    {LETTER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-[#0F2419]">Nomor Surat *</span>
                  <input
                    required
                    type="text"
                    value={form.letterNumber}
                    onChange={(e) => setForm({ ...form, letterNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] font-mono text-sm text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-[#0F2419]">Tanggal Surat *</span>
                  <input
                    required
                    type="date"
                    value={form.letterDate}
                    onChange={(e) => setForm({ ...form, letterDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-[#0F2419]">Status Arsip</span>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as ChurchLetter['status'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-sm text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  >
                    <option value="Arsip Aktif">Arsip Aktif</option>
                    <option value="Ditindaklanjuti">Ditindaklanjuti</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </label>

                <label className="space-y-1.5 text-sm sm:col-span-2">
                  <span className="font-semibold text-[#0F2419]">Perihal / Judul Surat *</span>
                  <input
                    required
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Contoh: Undangan Rapat Kerja / Pemberkatan Nikah / Penetapan Panitia"
                    className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>

                {/* Dynamic Specific Fields by Letter Type */}
                {form.letterType === 'Surat Masuk' && (
                  <>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Pengirim / Instansi Asal</span>
                      <input
                        type="text"
                        value={form.sender}
                        onChange={(e) => setForm({ ...form, sender: e.target.value })}
                        placeholder="Contoh: Pengurus Daerah GKII / Kepala Desa"
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Tanggal Diterima</span>
                      <input
                        type="date"
                        value={form.receivedDate}
                        onChange={(e) => setForm({ ...form, receivedDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm sm:col-span-2">
                      <span className="font-semibold text-[#0F2419]">Disposisi / Tindak Lanjut</span>
                      <input
                        type="text"
                        value={form.disposition}
                        onChange={(e) => setForm({ ...form, disposition: e.target.value })}
                        placeholder="Contoh: Diteruskan ke Gembala Sidang & Majelis Sektor"
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                  </>
                )}

                {form.letterType === 'Surat Keluar' && (
                  <>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Tujuan / Penerima Surat</span>
                      <input
                        type="text"
                        value={form.recipient}
                        onChange={(e) => setForm({ ...form, recipient: e.target.value })}
                        placeholder="Contoh: Pengurus Wilayah GKII / Pemerintah Desa"
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Penandatangan</span>
                      <input
                        type="text"
                        value={form.signer}
                        onChange={(e) => setForm({ ...form, signer: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                  </>
                )}

                {form.letterType === 'Surat Keputusan' && (
                  <>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Tanggal Mulai Berlaku</span>
                      <input
                        type="date"
                        value={form.effectiveDate}
                        onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Masa Berlaku / Periode</span>
                      <input
                        type="text"
                        value={form.validityPeriod}
                        onChange={(e) => setForm({ ...form, validityPeriod: e.target.value })}
                        placeholder="Contoh: Periode 2026 – 2028"
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm sm:col-span-2">
                      <span className="font-semibold text-[#0F2419]">Penandatangan SK</span>
                      <input
                        type="text"
                        value={form.signer}
                        onChange={(e) => setForm({ ...form, signer: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                  </>
                )}

                {form.letterType === 'Surat Nikah' && (
                  <>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Nama Mempelai Pria</span>
                      <input
                        type="text"
                        value={form.groomName}
                        onChange={(e) => setForm({ ...form, groomName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Nama Mempelai Wanita</span>
                      <input
                        type="text"
                        value={form.brideName}
                        onChange={(e) => setForm({ ...form, brideName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Tempat Pemberkatan</span>
                      <input
                        type="text"
                        value={form.ceremonyLocation}
                        onChange={(e) => setForm({ ...form, ceremonyLocation: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Pendeta yang Memberkati</span>
                      <input
                        type="text"
                        value={form.officiant}
                        onChange={(e) => setForm({ ...form, officiant: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm sm:col-span-2">
                      <span className="font-semibold text-[#0F2419]">Saksi-Saksi</span>
                      <input
                        type="text"
                        value={form.witnesses}
                        onChange={(e) => setForm({ ...form, witnesses: e.target.value })}
                        placeholder="Contoh: Bpk. Yohanes Kiding & Ibu Martha Simanjuntak"
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                  </>
                )}

                {form.letterType === 'Surat Baptis' && (
                  <>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Nama yang Dibaptis</span>
                      <input
                        type="text"
                        value={form.baptizedName}
                        onChange={(e) => setForm({ ...form, baptizedName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Tempat, Tanggal Lahir</span>
                      <input
                        type="text"
                        value={form.birthInfo}
                        onChange={(e) => setForm({ ...form, birthInfo: e.target.value })}
                        placeholder="Contoh: Sungai Barang, 12 April 2005"
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Nama Orang Tua</span>
                      <input
                        type="text"
                        value={form.parentsName}
                        onChange={(e) => setForm({ ...form, parentsName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Pendeta yang Membaptis</span>
                      <input
                        type="text"
                        value={form.officiant}
                        onChange={(e) => setForm({ ...form, officiant: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm sm:col-span-2">
                      <span className="font-semibold text-[#0F2419]">Tempat Pembaptisan</span>
                      <input
                        type="text"
                        value={form.ceremonyLocation}
                        onChange={(e) => setForm({ ...form, ceremonyLocation: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                  </>
                )}

                {form.letterType === 'Surat Persembahan Anak' && (
                  <>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Nama Anak</span>
                      <input
                        type="text"
                        value={form.childName}
                        onChange={(e) => setForm({ ...form, childName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Tempat, Tanggal Lahir Anak</span>
                      <input
                        type="text"
                        value={form.birthInfo}
                        onChange={(e) => setForm({ ...form, birthInfo: e.target.value })}
                        placeholder="Contoh: Sungai Barang, 14 Mei 2026"
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Nama Ayah</span>
                      <input
                        type="text"
                        value={form.fatherName}
                        onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Nama Ibu</span>
                      <input
                        type="text"
                        value={form.motherName}
                        onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Tempat Ibadah</span>
                      <input
                        type="text"
                        value={form.ceremonyLocation}
                        onChange={(e) => setForm({ ...form, ceremonyLocation: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                    <label className="space-y-1.5 text-sm">
                      <span className="font-semibold text-[#0F2419]">Pendeta yang Mendoakan</span>
                      <input
                        type="text"
                        value={form.officiant}
                        onChange={(e) => setForm({ ...form, officiant: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                      />
                    </label>
                  </>
                )}

                <label className="space-y-1.5 text-sm sm:col-span-2">
                  <span className="font-semibold text-[#0F2419]">Keterangan / Isi Ringkas Surat</span>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Catatan penting, isi ringkas surat, atau keterangan lampiran..."
                    className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                  />
                </label>
              </div>

              {/* Built-in Foto Fisik Surat Attachment Section for New Letters */}
              {!editingLetter && (
                <div className="rounded-xl border border-[#BFE0C9] bg-[#F5F9F6] p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[#0F2419]">
                        Foto Fisik Surat ({pendingPhotos.length} halaman siap dilampirkan)
                      </p>
                      <p className="text-xs text-[#456051]">
                        Potret dokumen kertas asli dengan kamera perangkat atau unggah foto arsip fisik.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openPhotoCaptureModal(null)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Ambil / Tambah Foto Fisik</span>
                    </button>
                  </div>

                  {pendingPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {pendingPhotos.map((p) => (
                        <div
                          key={p.tempId}
                          className="relative w-28 rounded-lg border border-[#D4E4D8] bg-white overflow-hidden"
                        >
                          <img
                            src={p.imageDataUrl}
                            alt={p.label}
                            className="w-full aspect-[4/3] object-cover"
                          />
                          <div className="px-2 py-1 flex items-center justify-between gap-1">
                            <span className="text-[11px] font-medium text-[#0F2419] truncate">
                              {p.label}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setPendingPhotos((prev) =>
                                  prev.filter((item) => item.tempId !== p.tempId)
                                )
                              }
                              className="text-[#B91C1C] hover:text-red-800 cursor-pointer"
                              aria-label={`Hapus ${p.label}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E6EFE8]">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#D4E4D8] text-sm font-medium text-[#456051] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-5 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] disabled:opacity-50 text-white text-sm font-semibold cursor-pointer"
                >
                  {submittingForm
                    ? 'Menyimpan...'
                    : editingLetter
                      ? 'Simpan Perubahan'
                      : 'Simpan Arsip Surat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Physical Letter Photo Capture Modal */}
      {photoModalOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/55 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl border border-[#D4E4D8] w-full max-w-xl overflow-hidden shadow-2xl my-auto">
            <div className="px-6 py-4 border-b border-[#E6EFE8] bg-[#F5F9F6] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#0F2419]">
                  Foto Fisik Surat
                </h3>
                <p className="text-xs text-[#456051]">
                  {photoCaptureTargetLetter
                    ? `${photoCaptureTargetLetter.letterType} · ${photoCaptureTargetLetter.letterNumber}`
                    : 'Lampirkan foto halaman surat fisik ke catatan surat baru'}
                </p>
              </div>
              <button
                type="button"
                onClick={closePhotoCaptureModal}
                className="p-2 rounded-lg text-[#456051] hover:bg-[#EAF3EC] cursor-pointer"
                aria-label="Tutup jendela kamera surat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[84vh] overflow-y-auto">
              {!capturedPreviewUrl ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F5F9F6] border border-[#D4E4D8]">
                    <button
                      type="button"
                      onClick={() => setPhotoSourceTab('kamera')}
                      className={`inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                        photoSourceTab === 'kamera'
                          ? 'bg-[#146C43] text-white'
                          : 'text-[#456051] hover:text-[#0F2419]'
                      }`}
                    >
                      <Camera className="w-4 h-4" />
                      <span>Kamera Langsung</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoSourceTab('berkas')}
                      className={`inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold cursor-pointer ${
                        photoSourceTab === 'berkas'
                          ? 'bg-[#146C43] text-white'
                          : 'text-[#456051] hover:text-[#0F2419]'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>Kamera HP / Pilih Berkas</span>
                    </button>
                  </div>

                  {photoSourceTab === 'kamera' ? (
                    <div className="space-y-3">
                      <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-[#0F2419] border border-[#D4E4D8] flex items-center justify-center">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                        />
                        {cameraStarting && (
                          <div className="text-center text-white/90 space-y-2">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto" />
                            <p className="text-xs">Mengaktifkan kamera dokumen...</p>
                          </div>
                        )}
                        {!cameraStarting && !cameraActive && (
                          <div className="text-center text-white/90 px-6 space-y-3">
                            <Camera className="w-8 h-8 mx-auto text-[#A7CEB3]" />
                            <p className="text-xs leading-relaxed">
                              {cameraError || 'Siapkan lembaran fisik surat di depan kamera.'}
                            </p>
                            <div className="flex flex-wrap justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => void startCamera(facingMode)}
                                className="px-3.5 py-2 rounded-lg bg-[#146C43] text-white text-xs font-semibold cursor-pointer"
                              >
                                Aktifkan Kamera
                              </button>
                              <button
                                type="button"
                                onClick={() => fileCamRef.current?.click()}
                                className="px-3.5 py-2 rounded-lg bg-white text-[#0F2419] text-xs font-semibold cursor-pointer"
                              >
                                Kamera Perangkat / File
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {cameraActive && (
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4E4D8] bg-[#F5F9F6] text-xs font-semibold text-[#0F2419] cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-[#146C43]" />
                            <span>
                              Kamera {facingMode === 'environment' ? 'Belakang' : 'Depan'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCaptureSnapshot}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Potret Lembar Surat</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#146C43] bg-[#F5F9F6] p-8 text-center space-y-3">
                      <ImagePlus className="w-9 h-9 text-[#146C43] mx-auto" />
                      <p className="text-sm font-semibold text-[#0F2419]">
                        Potret Fisik Surat atau Pilih Hasil Scan
                      </p>
                      <div className="flex flex-wrap justify-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => fileCamRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C43] text-white text-xs font-semibold cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Kamera Perangkat</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => filePickRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#D4E4D8] bg-white text-xs font-semibold text-[#0F2419] cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-[#146C43]" />
                          <span>Pilih Berkas Foto</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <input
                    ref={fileCamRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFilePicked}
                    className="hidden"
                  />
                  <input
                    ref={filePickRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFilePicked}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="aspect-[4/3] w-full rounded-xl overflow-hidden border border-[#D4E4D8] bg-[#EAF3EC]">
                    <img
                      src={capturedPreviewUrl}
                      alt="Pratinjau foto fisik surat"
                      className="w-full h-full object-contain bg-[#0F2419]"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setCapturedPreviewUrl(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4E4D8] text-xs font-semibold text-[#0F2419] cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#146C43]" />
                      <span>Potret / Pilih Ulang</span>
                    </button>
                  </div>
                </div>
              )}

              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold text-[#0F2419]">Keterangan Halaman</span>
                <input
                  type="text"
                  value={photoLabel}
                  onChange={(e) => setPhotoLabel(e.target.value)}
                  placeholder="Contoh: Halaman 1 / Lampiran Tanda Tangan"
                  className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419]"
                />
              </label>

              {photoError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-[#B91C1C]">
                  {photoError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E6EFE8]">
                <button
                  type="button"
                  onClick={closePhotoCaptureModal}
                  className="px-4 py-2 rounded-lg border border-[#D4E4D8] text-sm font-medium text-[#456051] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={!capturedPreviewUrl || uploadingPhoto}
                  onClick={() => void handleSaveCapturedPhoto()}
                  className="px-5 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] disabled:opacity-50 text-white text-sm font-semibold cursor-pointer"
                >
                  {uploadingPhoto ? 'Mengunggah...' : 'Simpan Foto Fisik Surat'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Physical Letter Photo Lightbox Modal */}
      {lightboxState && lightboxState.letter.physicalPhotos[lightboxState.index] && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxState(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#D4E4D8] w-full max-w-4xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-[#0F2419] flex items-center justify-center max-h-[70vh]">
              <img
                src={lightboxState.letter.physicalPhotos[lightboxState.index].imageUrl}
                alt={lightboxState.letter.physicalPhotos[lightboxState.index].label}
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
              <button
                type="button"
                onClick={() => setLightboxState(null)}
                className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white cursor-pointer"
                aria-label="Tutup tampilan foto fisik"
              >
                <X className="w-5 h-5" />
              </button>

              {lightboxState.letter.physicalPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxState((prev) =>
                        prev
                          ? {
                              ...prev,
                              index:
                                (prev.index - 1 + prev.letter.physicalPhotos.length) %
                                prev.letter.physicalPhotos.length,
                            }
                          : null
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white cursor-pointer"
                    aria-label="Halaman sebelumnya"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxState((prev) =>
                        prev
                          ? {
                              ...prev,
                              index: (prev.index + 1) % prev.letter.physicalPhotos.length,
                            }
                          : null
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white cursor-pointer"
                    aria-label="Halaman berikutnya"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
              <div>
                <p className="text-xs font-semibold text-[#146C43]">
                  {lightboxState.letter.letterType} · {lightboxState.letter.letterNumber}
                </p>
                <h4 className="text-base font-bold text-[#0F2419]">
                  {lightboxState.letter.subject} —{' '}
                  {lightboxState.letter.physicalPhotos[lightboxState.index].label}
                </h4>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={lightboxState.letter.physicalPhotos[lightboxState.index].imageUrl}
                  download={`${lightboxState.letter.letterNumber.replace(/[^a-zA-Z0-9-]+/g, '-')}-${
                    lightboxState.index + 1
                  }.jpg`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4E4D8] bg-[#F5F9F6] text-xs font-semibold text-[#0F2419]"
                >
                  <Download className="w-3.5 h-3.5 text-[#146C43]" />
                  <span>Unduh Foto</span>
                </a>

                {(() => {
                  const activePhoto =
                    lightboxState.letter.physicalPhotos[lightboxState.index];
                  return confirmDeletePhotoId === activePhoto.id ? (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteLetterPhoto(
                            lightboxState.letter.id,
                            activePhoto.id
                          );
                          setConfirmDeletePhotoId(null);
                        }}
                        className="px-3 py-2 rounded-lg bg-[#B91C1C] text-white text-xs font-semibold cursor-pointer"
                      >
                        Ya, Hapus
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeletePhotoId(null)}
                        className="px-3 py-2 rounded-lg border border-[#D4E4D8] text-xs text-[#456051] cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeletePhotoId(activePhoto.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-xs font-semibold text-[#B91C1C] hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Foto</span>
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
