import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Lock,
  Pencil,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { GalleryCategory, GalleryPhoto, SiteTextContent } from '../types';
import { formatIndonesianDate } from '../lib/dateAndFormat';
import { DEFAULT_SITE_CONTENT } from '../lib/siteContentDefaults';

const GALLERY_CATEGORIES: GalleryCategory[] = [
  'Ibadah Raya',
  'Sekolah Minggu & Remaja',
  'Pemuda',
  'Perkawan & Perkaria',
  'Diakonia & Baksos',
  'Gotong Royong & Panitia',
];

interface ChurchGalleryModuleProps {
  gallery: GalleryPhoto[];
  siteContent?: SiteTextContent;
  canEditAdmin?: boolean;
  canUploadGallery: boolean;
  uploaderName?: string;
  onOpenLogin: () => void;
  onAddPhoto: (payload: {
    title: string;
    category: GalleryCategory;
    date: string;
    caption: string;
    imageDataUrl: string;
  }) => Promise<void>;
  onUpdatePhoto?: (
    id: string,
    payload: {
      title: string;
      category: GalleryCategory;
      date: string;
      caption: string;
    }
  ) => Promise<void>;
  onDeletePhoto: (id: string) => Promise<void>;
}

function todayYMD(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function compressImageToJpegDataUrl(
  source: HTMLVideoElement | HTMLImageElement,
  sourceWidth: number,
  sourceHeight: number,
  maxDimension = 1280,
  quality = 0.84
): string {
  const ratio = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight, 1));
  const targetWidth = Math.max(1, Math.round(sourceWidth * ratio));
  const targetHeight = Math.max(1, Math.round(sourceHeight * ratio));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Perangkat tidak mendukung pemrosesan gambar kanvas.');
  }
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', quality);
}

export const ChurchGalleryModule: React.FC<ChurchGalleryModuleProps> = ({
  gallery,
  siteContent,
  canEditAdmin,
  canUploadGallery,
  uploaderName,
  onOpenLogin,
  onAddPhoto,
  onUpdatePhoto,
  onDeletePhoto,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'Semua' | GalleryCategory>('Semua');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Edit photo modal states
  const [editingPhoto, setEditingPhoto] = useState<GalleryPhoto | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<GalleryCategory>('Ibadah Raya');
  const [editDate, setEditDate] = useState(todayYMD);
  const [editCaption, setEditCaption] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Camera & Upload modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [captureTab, setCaptureTab] = useState<'kamera' | 'berkas'>('kamera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [capturedImageDataUrl, setCapturedImageDataUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GalleryCategory>('Ibadah Raya');
  const [date, setDate] = useState(todayYMD);
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileCameraInputRef = useRef<HTMLInputElement | null>(null);
  const fileGalleryInputRef = useRef<HTMLInputElement | null>(null);

  const filteredPhotos = useMemo(() => {
    const items =
      selectedCategory === 'Semua'
        ? gallery
        : gallery.filter((g) => g.category === selectedCategory);
    return [...items].sort((a, b) => b.date.localeCompare(a.date));
  }, [gallery, selectedCategory]);

  const stopCameraStream = useCallback(() => {
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

  const startCameraStream = useCallback(
    async (mode: 'environment' | 'user') => {
      stopCameraStream();
      setCameraError(null);
      setCameraStarting(true);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStarting(false);
        setCameraError(
          'Browser atau perangkat ini tidak mendukung akses kamera langsung. Silakan gunakan tombol "Buka Kamera Perangkat / Pilih Foto".'
        );
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {
            // AutoPlay fallback handled by user interaction
          });
        }
        setCameraActive(true);
      } catch (err) {
        const msg =
          err instanceof Error && err.name === 'NotAllowedError'
            ? 'Izin kamera ditolak oleh browser. Izinkan akses kamera atau gunakan tombol unggah foto dari perangkat di bawah.'
            : 'Kamera perangkat tidak terdeteksi atau sedang dipakai aplikasi lain. Gunakan pilihan unggah foto atau kamera bawaan di bawah.';
        setCameraError(msg);
      } finally {
        setCameraStarting(false);
      }
    },
    [stopCameraStream]
  );

  useEffect(() => {
    if (uploadModalOpen && captureTab === 'kamera' && !capturedImageDataUrl) {
      void startCameraStream(facingMode);
    } else {
      stopCameraStream();
    }
    return () => {
      stopCameraStream();
    };
  }, [uploadModalOpen, captureTab, facingMode, capturedImageDataUrl, startCameraStream, stopCameraStream]);

  // Lightbox keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev === null || filteredPhotos.length === 0
            ? null
            : (prev - 1 + filteredPhotos.length) % filteredPhotos.length
        );
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) =>
          prev === null || filteredPhotos.length === 0
            ? null
            : (prev + 1) % filteredPhotos.length
        );
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, filteredPhotos.length]);

  const resetModal = () => {
    stopCameraStream();
    setCapturedImageDataUrl(null);
    setTitle('');
    setCategory('Ibadah Raya');
    setDate(todayYMD());
    setCaption('');
    setFormError(null);
    setCameraError(null);
    setCaptureTab('kamera');
  };

  const closeUploadModal = () => {
    resetModal();
    setUploadModalOpen(false);
  };

  const handleCaptureSnapshot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setFormError('Pratinjau kamera belum siap. Tunggu sesaat lalu coba ambil foto kembali.');
      return;
    }
    try {
      const dataUrl = compressImageToJpegDataUrl(video, video.videoWidth, video.videoHeight);
      setCapturedImageDataUrl(dataUrl);
      setFormError(null);
      stopCameraStream();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal mengambil gambar dari kamera.');
    }
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Pilih berkas foto berformat JPEG, PNG, atau WebP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const dataUrl = compressImageToJpegDataUrl(img, img.naturalWidth, img.naturalHeight);
          setCapturedImageDataUrl(dataUrl);
          setFormError(null);
          stopCameraStream();
        } catch (err) {
          setFormError(err instanceof Error ? err.message : 'Gagal memproses foto.');
        }
      };
      img.onerror = () => {
        setFormError('Foto tidak dapat dibaca. Coba ambil ulang atau pilih foto lain.');
      };
      img.src = String(reader.result || '');
    };
    reader.onerror = () => {
      setFormError('Gagal membaca berkas gambar dari perangkat.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capturedImageDataUrl) {
      setFormError('Silakan ambil foto dari kamera atau pilih foto kegiatan terlebih dahulu.');
      return;
    }
    if (!title.trim()) {
      setFormError('Judul kegiatan wajib diisi.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await onAddPhoto({
        title: title.trim(),
        category,
        date: date || todayYMD(),
        caption: caption.trim(),
        imageDataUrl: capturedImageDataUrl,
      });
      closeUploadModal();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal mempublikasikan foto kegiatan.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeletePhoto(id);
      setConfirmDeleteId(null);
      if (lightboxIndex !== null) {
        setLightboxIndex(null);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const activeLightboxPhoto =
    lightboxIndex !== null && filteredPhotos[lightboxIndex] ? filteredPhotos[lightboxIndex] : null;

  return (
    <section className="rounded-2xl border border-[#D4E4D8] bg-white p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E6EFE8] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#146C43]">
            <Camera className="w-4 h-4" />
            <span>{siteContent?.galleryKicker || DEFAULT_SITE_CONTENT.galleryKicker}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-[#0F5132]">
              {gallery.length} Foto Kegiatan
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F2419]">
            {siteContent?.galleryTitle || DEFAULT_SITE_CONTENT.galleryTitle}
          </h2>
          <p className="text-sm text-[#456051]">
            {siteContent?.gallerySubtitle || DEFAULT_SITE_CONTENT.gallerySubtitle}
          </p>
        </div>

        <div className="shrink-0">
          {canUploadGallery ? (
            <button
              type="button"
              onClick={() => {
                resetModal();
                setUploadModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Ambil Foto / Unggah Kegiatan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#D4E4D8] bg-[#F5F9F6] hover:bg-[#EAF3EC] text-sm font-semibold text-[#0F2419] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Lock className="w-4 h-4 text-[#146C43]" />
              <span>Masuk Pengurus untuk Unggah Foto</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {(['Semua', ...GALLERY_CATEGORIES] as const).map((cat) => {
          const isActive = selectedCategory === cat;
          const count =
            cat === 'Semua'
              ? gallery.length
              : gallery.filter((g) => g.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setLightboxIndex(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#146C43] text-white'
                  : 'bg-[#F5F9F6] border border-[#D4E4D8] text-[#456051] hover:text-[#0F2419] hover:border-[#146C43]'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Gallery Grid */}
      {filteredPhotos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#D4E4D8] bg-[#F5F9F6] p-10 text-center space-y-2">
          <ImagePlus className="w-8 h-8 text-[#146C43] mx-auto" />
          <p className="text-sm font-semibold text-[#0F2419]">
            Belum ada foto kegiatan untuk kategori ini.
          </p>
          <p className="text-xs text-[#456051]">
            Pengurus gereja dapat mengambil foto langsung menggunakan kamera perangkat untuk mendokumentasikan kegiatan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPhotos.map((photo, index) => (
            <article
              key={photo.id}
              className="rounded-xl border border-[#D4E4D8] bg-[#F5F9F6] overflow-hidden flex flex-col justify-between transition-colors hover:border-[#146C43]"
            >
              <div>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="block w-full aspect-[4/3] bg-[#EAF3EC] overflow-hidden relative group cursor-pointer focus:outline-none"
                  aria-label={`Perbesar foto ${photo.title}`}
                >
                  <img
                    src={photo.imageUrl}
                    alt={photo.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="sr-only">Perbesar Dokumentasi</span>
                </button>

                <div className="p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-[#456051]">
                    <span className="font-semibold text-[#146C43]">{photo.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatIndonesianDate(photo.date)}</span>
                  </div>
                  <h3 className="text-base font-bold text-[#0F2419] leading-snug">
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(index)}
                      className="text-left hover:text-[#146C43] transition-colors cursor-pointer"
                    >
                      {photo.title}
                    </button>
                  </h3>
                  <p className="text-xs text-[#456051] leading-relaxed line-clamp-2">
                    {photo.caption}
                  </p>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-[#E6EFE8] bg-white flex items-center justify-between gap-2 text-xs">
                <span className="text-[#456051] truncate">Oleh {photo.capturedBy}</span>

                {(canUploadGallery || (canEditAdmin && onUpdatePhoto)) && (
                  <div className="shrink-0 flex items-center gap-2">
                    {canEditAdmin && onUpdatePhoto && confirmDeleteId !== photo.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPhoto(photo);
                          setEditTitle(photo.title);
                          setEditCategory(photo.category);
                          setEditDate(photo.date);
                          setEditCaption(photo.caption);
                          setEditError(null);
                        }}
                        className="inline-flex items-center gap-1 text-[#456051] hover:text-[#146C43] font-medium whitespace-nowrap cursor-pointer"
                        aria-label={`Ubah keterangan foto ${photo.title}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Ubah</span>
                      </button>
                    )}

                    {canUploadGallery && (
                      confirmDeleteId === photo.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={deletingId === photo.id}
                            onClick={() => void handleConfirmDelete(photo.id)}
                            className="px-2 py-1 rounded bg-[#B91C1C] text-white font-semibold hover:bg-red-800 whitespace-nowrap cursor-pointer disabled:opacity-60"
                          >
                            {deletingId === photo.id ? 'Menghapus...' : 'Ya, Hapus'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded border border-[#D4E4D8] text-[#456051] hover:text-[#0F2419] whitespace-nowrap cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(photo.id)}
                          className="inline-flex items-center gap-1 text-[#456051] hover:text-[#B91C1C] font-medium whitespace-nowrap cursor-pointer"
                          aria-label={`Hapus foto ${photo.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Camera & Upload Modal */}
      {uploadModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gallery-upload-modal-title"
        >
          <div className="bg-white rounded-2xl border border-[#D4E4D8] w-full max-w-2xl overflow-hidden shadow-xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6EFE8] bg-[#F5F9F6]">
              <div>
                <h3
                  id="gallery-upload-modal-title"
                  className="text-lg font-bold text-[#0F2419]"
                >
                  Unggah Foto Kegiatan Gereja
                </h3>
                <p className="text-xs text-[#456051]">
                  Pengunggah: {uploaderName || 'Pengurus GKII Sungai Barang'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeUploadModal}
                className="p-2 rounded-lg text-[#456051] hover:bg-[#EAF3EC] hover:text-[#0F2419] cursor-pointer"
                aria-label="Tutup jendela unggah foto"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
              {/* Source Mode Selector (only shown before photo is captured) */}
              {!capturedImageDataUrl && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#F5F9F6] border border-[#D4E4D8]">
                    <button
                      type="button"
                      onClick={() => setCaptureTab('kamera')}
                      className={`inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        captureTab === 'kamera'
                          ? 'bg-[#146C43] text-white'
                          : 'text-[#456051] hover:text-[#0F2419]'
                      }`}
                    >
                      <Camera className="w-4 h-4" />
                      <span>Kamera Langsung</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptureTab('berkas')}
                      className={`inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        captureTab === 'berkas'
                          ? 'bg-[#146C43] text-white'
                          : 'text-[#456051] hover:text-[#0F2419]'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>Pilih Foto / Kamera HP</span>
                    </button>
                  </div>

                  {captureTab === 'kamera' ? (
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
                          <div className="text-center text-white/90 px-6 space-y-2">
                            <RefreshCw className="w-7 h-7 animate-spin mx-auto" />
                            <p className="text-xs">Mengaktifkan kamera perangkat...</p>
                          </div>
                        )}
                        {!cameraStarting && !cameraActive && (
                          <div className="text-center text-white/90 px-6 space-y-3 max-w-md">
                            <Camera className="w-9 h-9 mx-auto text-[#A7CEB3]" />
                            <p className="text-xs leading-relaxed">
                              {cameraError ||
                                'Kamera siap diaktifkan untuk mengambil dokumentasi kegiatan gereja.'}
                            </p>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => void startCameraStream(facingMode)}
                                className="px-3.5 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold cursor-pointer"
                              >
                                Coba Aktifkan Kamera
                              </button>
                              <button
                                type="button"
                                onClick={() => fileCameraInputRef.current?.click()}
                                className="px-3.5 py-2 rounded-lg bg-white text-[#0F2419] hover:bg-[#F5F9F6] text-xs font-semibold cursor-pointer"
                              >
                                Buka Kamera Bawaan / Pilih Foto
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {cameraActive && (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))
                            }
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#D4E4D8] bg-[#F5F9F6] hover:bg-[#EAF3EC] text-xs font-semibold text-[#0F2419] cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-[#146C43]" />
                            <span>
                              Ganti Kamera ({facingMode === 'environment' ? 'Belakang' : 'Depan'})
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCaptureSnapshot}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold cursor-pointer"
                          >
                            <Camera className="w-4 h-4" />
                            <span>Ambil Foto Sekarang</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-[#146C43] bg-[#F5F9F6] p-8 text-center space-y-4">
                      <ImagePlus className="w-10 h-10 text-[#146C43] mx-auto" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-[#0F2419]">
                          Ambil dari Kamera Bawaan atau Galeri Perangkat
                        </p>
                        <p className="text-xs text-[#456051]">
                          Cocok untuk ponsel Android/iOS maupun memilih foto dokumentasi yang sudah tersimpan.
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={() => fileCameraInputRef.current?.click()}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Kamera Perangkat</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => fileGalleryInputRef.current?.click()}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#EAF3EC] text-[#0F2419] text-xs font-semibold cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-[#146C43]" />
                          <span>Pilih dari Penyimpanan</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Hidden Native Inputs */}
                  <input
                    ref={fileCameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFilePicked}
                    className="hidden"
                  />
                  <input
                    ref={fileGalleryInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFilePicked}
                    className="hidden"
                  />
                </div>
              )}

              {/* Captured / Selected Image Preview */}
              {capturedImageDataUrl && (
                <div className="space-y-3">
                  <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden border border-[#D4E4D8] bg-[#EAF3EC]">
                    <img
                      src={capturedImageDataUrl}
                      alt="Pratinjau foto kegiatan"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setCapturedImageDataUrl(null)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4E4D8] bg-[#F5F9F6] hover:bg-[#EAF3EC] text-xs font-semibold text-[#0F2419] cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#146C43]" />
                      <span>Ambil / Pilih Foto Ulang</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1.5 text-sm sm:col-span-2">
                  <span className="font-semibold text-[#0F2419]">Judul Kegiatan *</span>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Ibadah Padang Pemuda di Sungai Barang"
                    className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-sm text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-[#0F2419]">Kategori Pelayanan</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as GalleryCategory)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-sm text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  >
                    {GALLERY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-[#0F2419]">Tanggal Kegiatan</span>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-sm text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>

                <label className="space-y-1.5 text-sm sm:col-span-2">
                  <span className="font-semibold text-[#0F2419]">Keterangan Singkat</span>
                  <textarea
                    rows={3}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Tuliskan deskripsi singkat suasana pelayanan, tempat, atau jemaat yang terlibat..."
                    className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-sm text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>
              </div>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-[#B91C1C]">
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E6EFE8]">
                <button
                  type="button"
                  onClick={closeUploadModal}
                  className="px-4 py-2 rounded-lg border border-[#D4E4D8] text-sm font-medium text-[#456051] hover:text-[#0F2419] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || !capturedImageDataUrl}
                  className="px-5 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] disabled:opacity-50 text-white text-sm font-semibold cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Publikasikan ke Galeri'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Preview Modal */}
      {activeLightboxPhoto && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={activeLightboxPhoto.title}
          onClick={() => setLightboxIndex(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#D4E4D8] w-full max-w-4xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-[#0F2419] flex items-center justify-center max-h-[68vh]">
              <img
                src={activeLightboxPhoto.imageUrl}
                alt={activeLightboxPhoto.title}
                className="max-h-[68vh] w-auto max-w-full object-contain"
              />

              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white cursor-pointer"
                aria-label="Tutup tampilan foto"
              >
                <X className="w-5 h-5" />
              </button>

              {filteredPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxIndex(
                        (lightboxIndex - 1 + filteredPhotos.length) % filteredPhotos.length
                      )
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white cursor-pointer"
                    aria-label="Foto sebelumnya"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxIndex((lightboxIndex + 1) % filteredPhotos.length)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white cursor-pointer"
                    aria-label="Foto berikutnya"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            <div className="p-5 sm:p-6 space-y-2 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#456051]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#146C43]">
                    {activeLightboxPhoto.category}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">
                    {formatIndonesianDate(activeLightboxPhoto.date)}
                  </span>
                </div>
                <span className="font-mono tabular-nums">
                  {lightboxIndex + 1} / {filteredPhotos.length}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F2419]">
                {activeLightboxPhoto.title}
              </h3>
              <p className="text-sm text-[#456051] leading-relaxed">
                {activeLightboxPhoto.caption}
              </p>
              <p className="text-xs text-[#456051] pt-1">
                Didokumentasikan oleh: <span className="font-medium text-[#0F2419]">{activeLightboxPhoto.capturedBy}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Photo Details Modal (Admin) */}
      {editingPhoto && onUpdatePhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gallery-edit-modal-title"
        >
          <div className="bg-white rounded-2xl border border-[#D4E4D8] w-full max-w-lg overflow-hidden shadow-xl my-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6EFE8] bg-[#F5F9F6]">
              <h3
                id="gallery-edit-modal-title"
                className="text-base font-bold text-[#0F2419]"
              >
                Ubah Keterangan Foto Kegiatan
              </h3>
              <button
                type="button"
                onClick={() => setEditingPhoto(null)}
                className="p-1.5 rounded-lg text-[#456051] hover:bg-white cursor-pointer"
                aria-label="Tutup editor foto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editTitle.trim()) {
                  setEditError('Judul kegiatan wajib diisi.');
                  return;
                }
                setSavingEdit(true);
                setEditError(null);
                try {
                  await onUpdatePhoto(editingPhoto.id, {
                    title: editTitle.trim(),
                    category: editCategory,
                    date: editDate || todayYMD(),
                    caption: editCaption.trim(),
                  });
                  setEditingPhoto(null);
                } catch (err) {
                  setEditError(
                    err instanceof Error ? err.message : 'Gagal memperbarui keterangan foto.'
                  );
                } finally {
                  setSavingEdit(false);
                }
              }}
              className="p-6 space-y-4"
            >
              {editError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-medium text-[#B91C1C]">
                  {editError}
                </div>
              )}

              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold text-[#0F2419]">Judul Kegiatan</span>
                <input
                  required
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block space-y-1.5 text-sm">
                  <span className="font-semibold text-[#0F2419]">Kategori Pelayanan</span>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as GalleryCategory)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-sm text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  >
                    {GALLERY_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5 text-sm">
                  <span className="font-semibold text-[#0F2419]">Tanggal Kegiatan</span>
                  <input
                    required
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>
              </div>

              <label className="block space-y-1.5 text-sm">
                <span className="font-semibold text-[#0F2419]">Keterangan Singkat</span>
                <textarea
                  rows={3}
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-sm text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E6EFE8]">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setEditingPhoto(null)}
                  className="px-4 py-2 rounded-lg border border-[#D4E4D8] text-xs font-semibold text-[#456051] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                >
                  {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
