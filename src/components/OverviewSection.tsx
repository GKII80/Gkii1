import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BellRing,
  BookOpen,
  Calendar,
  Compass,
  Download,
  HeartHandshake,
  MessageCircle,
  Pencil,
  RotateCcw,
  Shield,
  Upload,
  Users,
  Wallet,
} from 'lucide-react';
import {
  ChurchDatabase,
  ChurchIdentity,
  FourfoldSymbolInfo,
  GalleryCategory,
  LiveNotification,
  OrganPelayanan,
  SiteTextContent,
  VisionMission,
} from '../types';
import {
  formatIndonesianDate,
  formatRupiah,
  toWhatsAppUrl,
} from '../lib/dateAndFormat';
import { mergeSiteContent } from '../lib/siteContentDefaults';
import { ChurchGalleryModule } from './ChurchGalleryModule';
import type { SiteTextEditorTab } from './SiteTextEditorModal';
import {
  FOURFOLD_GOSPEL_SYMBOLS,
  GKII_OFFICIAL_LOGO_URL,
  GkiiLogo,
} from './GkiiLogo';

export type NavTabId =
  | 'beranda'
  | 'ibadah'
  | 'renungan'
  | 'kas'
  | 'jemaat'
  | 'pertumbuhan'
  | 'pengurus'
  | 'kepanitiaan'
  | 'surat';

interface OverviewSectionProps {
  data: ChurchDatabase;
  siteContent?: SiteTextContent;
  notifications: LiveNotification[];
  canEditAdmin: boolean;
  canUploadGallery: boolean;
  uploaderName?: string;
  onOpenLogin: () => void;
  onOpenTextEditor?: (tab?: SiteTextEditorTab) => void;
  onNavigate: (tab: NavTabId) => void;
  onUpdateVisionMission: (vm: VisionMission) => Promise<void>;
  onUpdateChurchIdentity: (
    payload: Partial<ChurchIdentity> & { logoDataUrl?: string; resetLogo?: boolean }
  ) => Promise<void>;
  onAddGalleryPhoto: (payload: {
    title: string;
    category: GalleryCategory;
    date: string;
    caption: string;
    imageDataUrl: string;
  }) => Promise<void>;
  onUpdateGalleryPhoto?: (
    id: string,
    payload: {
      title: string;
      category: GalleryCategory;
      date: string;
      caption: string;
    }
  ) => Promise<void>;
  onDeleteGalleryPhoto: (id: string) => Promise<void>;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  data,
  siteContent,
  notifications,
  canEditAdmin,
  canUploadGallery,
  uploaderName,
  onOpenLogin,
  onOpenTextEditor,
  onNavigate,
  onUpdateVisionMission,
  onUpdateChurchIdentity,
  onAddGalleryPhoto,
  onUpdateGalleryPhoto,
  onDeleteGalleryPhoto,
}) => {
  const resolvedSiteContent = useMemo(
    () => mergeSiteContent(siteContent ?? data.siteContent),
    [siteContent, data.siteContent]
  );
  const [editingVision, setEditingVision] = useState(false);
  const [vmForm, setVmForm] = useState({
    period: data.visionMission.period,
    vision: data.visionMission.vision,
    missionsText: data.visionMission.missions.join('\n'),
    themeVerseRef: data.visionMission.themeVerseRef,
    themeVerseText: data.visionMission.themeVerseText,
  });

  const churchIdentity: ChurchIdentity = useMemo(() => {
    const raw = data.churchIdentity;
    return {
      kicker: raw?.kicker || 'Identitas Resmi · Injil Empat Berganda',
      heading: raw?.heading || 'Logo Gereja Kemah Injil Indonesia (GKII)',
      description:
        raw?.description ||
        'Lambang resmi GKII Jemaat Sungai Barang yang memuat empat simbol pokok Injil Empat Berganda dan dapat diunduh untuk keperluan surat, warta cetak, maupun spanduk pelayanan.',
      churchName: raw?.churchName || 'Gereja Kemah Injil Indonesia',
      subLabel: raw?.subLabel || 'Jemaat Sungai Barang · Injil Empat Berganda',
      logoUrl: raw?.logoUrl || GKII_OFFICIAL_LOGO_URL,
      symbols:
        raw?.symbols && raw.symbols.length === 4 ? raw.symbols : FOURFOLD_GOSPEL_SYMBOLS,
      updatedBy: raw?.updatedBy,
      updatedAt: raw?.updatedAt,
    };
  }, [data.churchIdentity]);

  const [editingIdentity, setEditingIdentity] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identityForm, setIdentityForm] = useState<{
    kicker: string;
    heading: string;
    description: string;
    churchName: string;
    subLabel: string;
    symbols: FourfoldSymbolInfo[];
    pendingLogoDataUrl: string | null;
    resetLogo: boolean;
  }>({
    kicker: churchIdentity.kicker,
    heading: churchIdentity.heading,
    description: churchIdentity.description,
    churchName: churchIdentity.churchName,
    subLabel: churchIdentity.subLabel,
    symbols: churchIdentity.symbols.map((s) => ({ ...s })),
    pendingLogoDataUrl: null,
    resetLogo: false,
  });

  const openIdentityEditor = () => {
    setIdentityError(null);
    setIdentityForm({
      kicker: churchIdentity.kicker,
      heading: churchIdentity.heading,
      description: churchIdentity.description,
      churchName: churchIdentity.churchName,
      subLabel: churchIdentity.subLabel,
      symbols: churchIdentity.symbols.map((s) => ({ ...s })),
      pendingLogoDataUrl: null,
      resetLogo: false,
    });
    setEditingIdentity((prev) => !prev);
  };

  const handleIdentityLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIdentityError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        setIdentityError('Gagal membaca file logo.');
        return;
      }
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 900;
          const ratio = Math.min(1, maxDim / Math.max(img.width, img.height, 1));
          const targetW = Math.max(1, Math.round(img.width * ratio));
          const targetH = Math.max(1, Math.round(img.height * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Kanvas tidak didukung.');
          ctx.drawImage(img, 0, 0, targetW, targetH);
          const pngDataUrl = canvas.toDataURL('image/png');
          setIdentityForm((prev) => ({
            ...prev,
            pendingLogoDataUrl: pngDataUrl,
            resetLogo: false,
          }));
        } catch {
          setIdentityError('Gagal memproses file gambar logo.');
        }
      };
      img.onerror = () => {
        setIdentityError('Format gambar logo tidak dapat dibaca.');
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdentityError(null);
    setSavingIdentity(true);
    try {
      await onUpdateChurchIdentity({
        kicker: identityForm.kicker.trim(),
        heading: identityForm.heading.trim(),
        description: identityForm.description.trim(),
        churchName: identityForm.churchName.trim(),
        subLabel: identityForm.subLabel.trim(),
        symbols: identityForm.symbols.map((s) => ({
          ...s,
          symbolName: s.symbolName.trim(),
          title: s.title.trim(),
          verseRef: s.verseRef.trim(),
          meaning: s.meaning.trim(),
        })),
        ...(identityForm.pendingLogoDataUrl
          ? { logoDataUrl: identityForm.pendingLogoDataUrl }
          : {}),
        ...(identityForm.resetLogo ? { resetLogo: true } : {}),
      });
      setEditingIdentity(false);
    } catch (err) {
      setIdentityError(
        err instanceof Error ? err.message : 'Gagal menyimpan Identitas Resmi gereja.'
      );
    } finally {
      setSavingIdentity(false);
    }
  };

  const handleSaveVision = async (e: React.FormEvent) => {
    e.preventDefault();
    const missions = vmForm.missionsText
      .split('\n')
      .map((m) => m.trim())
      .filter(Boolean);
    await onUpdateVisionMission({
      period: vmForm.period.trim() || '2024 – 2028',
      vision: vmForm.vision.trim(),
      missions: missions.length > 0 ? missions : data.visionMission.missions,
      themeVerseRef: vmForm.themeVerseRef.trim(),
      themeVerseText: vmForm.themeVerseText.trim(),
    });
    setEditingVision(false);
  };

  const handleDownloadOfficialLogo = () => {
    const link = document.createElement('a');
    link.href = churchIdentity.logoUrl;
    link.download = 'logo-gkii-resmi-sungai-barang.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const totalMasuk = data.ledger
    .filter((l) => l.type === 'masuk')
    .reduce((acc, item) => acc + item.amount, 0);
  const totalKeluar = data.ledger
    .filter((l) => l.type === 'keluar')
    .reduce((acc, item) => acc + item.amount, 0);
  const saldoKas = totalMasuk - totalKeluar;

  const activeMeetingsCount = data.committees.reduce(
    (sum, com) => sum + com.meetings.filter((m) => m.status !== 'Selesai').length,
    0
  );

  const latestDevotional = data.devotionals[0];
  const sundayService = data.schedules.find((s) => s.organ === 'Umum / Raya') || data.schedules[0];
  const todayCelebrations = notifications.filter(
    (n) => (n.type === 'birthday' || n.type === 'anniversary') && n.urgency === 'today'
  );
  const meetingAlerts = notifications.filter((n) => n.type === 'meeting');

  const annualSeries = data.growthSeries.filter((g) => g.granularity === 'tahunan');
  const latestGrowth = annualSeries[annualSeries.length - 1] || data.growthSeries[data.growthSeries.length - 1];

  const organOrder: { id: OrganPelayanan; subtitle: string }[] = [
    { id: 'Perkaria', subtitle: resolvedSiteContent.organSubtitles.Perkaria },
    { id: 'Perkawan', subtitle: resolvedSiteContent.organSubtitles.Perkawan },
    {
      id: 'Sekolah Minggu',
      subtitle: resolvedSiteContent.organSubtitles['Sekolah Minggu'],
    },
    { id: 'Remaja', subtitle: resolvedSiteContent.organSubtitles.Remaja },
    { id: 'Pemuda', subtitle: resolvedSiteContent.organSubtitles.Pemuda },
    { id: 'Lansia', subtitle: resolvedSiteContent.organSubtitles.Lansia },
  ];

  const liveOrganMap: Record<OrganPelayanan, number> = {
    Perkaria: 0,
    Perkawan: 0,
    'Sekolah Minggu': 0,
    Remaja: 0,
    Pemuda: 0,
    Lansia: 0,
  };
  for (const m of data.members) {
    if (m.organ in liveOrganMap) {
      liveOrganMap[m.organ] += 1;
    } else if ((m.organ as string) === 'Pemuda & Remaja') {
      if (m.ageCategory === 'Remaja (13-17)') liveOrganMap.Remaja += 1;
      else liveOrganMap.Pemuda += 1;
    }
  }

  const baptizedCount = data.members.filter(
    (m) => (m.baptismStatus || 'Belum Baptis') === 'Sudah Baptis'
  ).length;
  const unbaptizedCount = data.members.length - baptizedCount;
  const marriedCount = data.members.filter((m) => Boolean(m.weddingDate)).length;
  const unmarriedCount = data.members.length - marriedCount;

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <section className="overflow-hidden rounded-2xl border border-[#D4E4D8] bg-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-medium text-[#146C43]">
                  {resolvedSiteContent.heroEyebrow}
                </p>
                {canEditAdmin && onOpenTextEditor && (
                  <button
                    type="button"
                    onClick={() => onOpenTextEditor('beranda')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4E4D8] bg-[#F5F9F6] hover:bg-[#EAF3EC] text-xs font-semibold text-[#0F2419] whitespace-nowrap cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-[#146C43]" />
                    <span>Ubah Teks Beranda</span>
                  </button>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-[2.25rem] font-bold tracking-tight text-[#0F2419] leading-tight [text-wrap:balance]">
                {resolvedSiteContent.heroTitle}
              </h1>
              <p className="text-[15px] sm:text-base text-[#456051] leading-relaxed max-w-2xl">
                {resolvedSiteContent.heroSubtitle}
              </p>
            </div>

            {sundayService && (
              <div className="rounded-xl bg-[#F5F9F6] border border-[#D4E4D8] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-[#456051]">Ibadah Terdekat</p>
                  <p className="text-base font-semibold text-[#0F2419] mt-0.5">
                    {sundayService.title} · {sundayService.dayOfWeek}, {sundayService.time}
                  </p>
                  <p className="text-sm text-[#456051] mt-0.5">
                    Tempat Ibadah: {sundayService.location}
                  </p>
                  <p className="text-xs text-[#146C43] font-medium mt-1">
                    Penghotbah: {sundayService.speaker}
                    {sundayService.mcName ? ` · MC: ${sundayService.mcName}` : ''}
                    {sundayService.intercessoryPrayerLeader
                      ? ` · Doa Syafaat: ${sundayService.intercessoryPrayerLeader}`
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('ibadah')}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Lihat Jadwal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('renungan')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#F5F9F6] text-[#0F2419] text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[#146C43]" />
                <span>Baca & Bagikan Renungan</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('kepanitiaan')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#F5F9F6] text-[#0F2419] text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
              >
                <BellRing className="w-4 h-4 text-[#146C43]" />
                <span>Menu Kepanitiaan</span>
              </button>
            </div>
          </div>

          {/* Architectural Botanical Sanctuary SVG Illustration */}
          <div className="lg:col-span-5 bg-[#EAF3EC] border-t lg:border-t-0 lg:border-l border-[#D4E4D8] p-6 sm:p-8 flex flex-col justify-between min-h-[260px]">
            <svg
              viewBox="0 0 420 260"
              className="w-full h-48 sm:h-56 lg:h-full max-h-[260px]"
              role="img"
              aria-label="Ilustrasi Gedung Ibadah GKII Jemaat Sungai Barang"
            >
              <defs>
                <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F5F9F6" />
                  <stop offset="100%" stopColor="#DCECE1" />
                </linearGradient>
                <linearGradient id="leafGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#146C43" />
                  <stop offset="100%" stopColor="#0F5132" />
                </linearGradient>
              </defs>
              <rect x="0" y="0" width="420" height="260" rx="14" fill="url(#skyGrad)" />
              {/* Distant Sungai Barang hills */}
              <path
                d="M0 190 Q95 145 205 178 T420 165 L420 260 L0 260 Z"
                fill="#C7DFCE"
              />
              <path
                d="M0 212 Q140 185 265 208 T420 198 L420 260 L0 260 Z"
                fill="#A7CEB3"
              />
              {/* Church Sanctuary Roof & Facade */}
              <polygon points="115,120 210,55 305,120" fill="#146C43" />
              <polygon points="128,120 210,65 292,120" fill="#198754" />
              <rect x="135" y="120" width="150" height="96" fill="#FFFFFF" stroke="#B8D4C1" strokeWidth="2" />
              {/* Arched Windows */}
              <rect x="155" y="142" width="22" height="40" rx="11" fill="#E3EFE7" stroke="#146C43" strokeWidth="1.5" />
              <rect x="243" y="142" width="22" height="40" rx="11" fill="#E3EFE7" stroke="#146C43" strokeWidth="1.5" />
              {/* Sanctuary Entrance Door */}
              <path d="M192 216 V162 A18 18 0 0 1 228 162 V216 Z" fill="#146C43" />
              <line x1="210" y1="145" x2="210" y2="216" stroke="#FFFFFF" strokeWidth="1.5" />
              {/* Cross */}
              <rect x="206" y="22" width="8" height="36" rx="2" fill="#0F5132" />
              <rect x="196" y="32" width="28" height="7" rx="2" fill="#0F5132" />
              {/* Botanical Leaves Left & Right */}
              <ellipse cx="62" cy="186" rx="28" ry="42" fill="url(#leafGrad)" opacity="0.9" />
              <ellipse cx="92" cy="198" rx="22" ry="30" fill="#198754" opacity="0.85" />
              <ellipse cx="358" cy="188" rx="26" ry="38" fill="url(#leafGrad)" opacity="0.9" />
              <ellipse cx="328" cy="200" rx="20" ry="28" fill="#198754" opacity="0.85" />
              {/* River reflection line */}
              <path d="M40 236 Q150 226 240 238 T395 232" fill="none" stroke="#FFFFFF" strokeWidth="2.5" opacity="0.7" />
            </svg>
            <div className="pt-4 flex items-center justify-between text-xs text-[#2D4D3B] border-t border-[#C8DEC0]">
              <div className="flex items-center gap-2">
                <GkiiLogo variant="mark" src={churchIdentity.logoUrl} className="w-6 h-6 shrink-0" />
                <span>{resolvedSiteContent.heroLocationLabel}</span>
              </div>
              <span className="font-mono tabular-nums font-semibold">
                {resolvedSiteContent.heroBadgeCode}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Visi & Misi Gereja Beserta Periode */}
      <section className="rounded-2xl border border-[#D4E4D8] bg-white p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6EFE8] pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#146C43]">
              <Compass className="w-4 h-4" />
              <span>Arah Pelayanan GKII Jemaat Sungai Barang</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-[#0F5132]">
                Periode {data.visionMission.period}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0F2419]">
              Visi dan Misi Gereja ({data.visionMission.period})
            </h2>
          </div>

          {canEditAdmin && (
            <button
              type="button"
              onClick={() => {
                setVmForm({
                  period: data.visionMission.period,
                  vision: data.visionMission.vision,
                  missionsText: data.visionMission.missions.join('\n'),
                  themeVerseRef: data.visionMission.themeVerseRef,
                  themeVerseText: data.visionMission.themeVerseText,
                });
                setEditingVision((v) => !v);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D4E4D8] bg-[#F5F9F6] hover:bg-[#EAF3EC] text-xs font-semibold text-[#0F2419] whitespace-nowrap self-start sm:self-auto cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-[#146C43]" />
              <span>{editingVision ? 'Tutup Editor' : 'Ubah Visi & Misi'}</span>
            </button>
          )}
        </div>

        {editingVision && canEditAdmin ? (
          <form onSubmit={handleSaveVision} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-[#0F2419]">Periode Pelayanan</span>
                <input
                  required
                  type="text"
                  value={vmForm.period}
                  onChange={(e) => setVmForm({ ...vmForm, period: e.target.value })}
                  placeholder="Contoh: 2024 – 2028"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] font-mono text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>
              <label className="space-y-1.5 text-sm md:col-span-2">
                <span className="font-medium text-[#0F2419]">Ayat Tema Periode</span>
                <input
                  type="text"
                  value={vmForm.themeVerseRef}
                  onChange={(e) => setVmForm({ ...vmForm, themeVerseRef: e.target.value })}
                  placeholder="Contoh: Kolose 2:7"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>
              <label className="space-y-1.5 text-sm md:col-span-3">
                <span className="font-medium text-[#0F2419]">Visi Gereja</span>
                <textarea
                  required
                  rows={2}
                  value={vmForm.vision}
                  onChange={(e) => setVmForm({ ...vmForm, vision: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>
              <label className="space-y-1.5 text-sm md:col-span-3">
                <span className="font-medium text-[#0F2419]">
                  Misi Gereja (1 baris per poin misi)
                </span>
                <textarea
                  required
                  rows={4}
                  value={vmForm.missionsText}
                  onChange={(e) => setVmForm({ ...vmForm, missionsText: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>
              <label className="space-y-1.5 text-sm md:col-span-3">
                <span className="font-medium text-[#0F2419]">Isi Ayat Pegangan Visi</span>
                <input
                  type="text"
                  value={vmForm.themeVerseText}
                  onChange={(e) => setVmForm({ ...vmForm, themeVerseText: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold cursor-pointer"
              >
                Simpan Visi & Misi
              </button>
              <button
                type="button"
                onClick={() => setEditingVision(false)}
                className="px-5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#456051] text-sm font-medium cursor-pointer"
              >
                Batal
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 rounded-xl bg-[#EAF3EC] border border-[#BFE0C9] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-[#146C43]">
                <span>VISI GEREJA</span>
                <span className="font-mono tabular-nums">Periode {data.visionMission.period}</span>
              </div>
              <p className="text-base sm:text-lg font-bold text-[#0F2419] leading-relaxed">
                “{data.visionMission.vision}”
              </p>
              {data.visionMission.themeVerseText && (
                <div className="pt-3 border-t border-[#C7DFCE] space-y-1">
                  <p className="text-xs font-semibold text-[#146C43]">
                    Landasan Firman · {data.visionMission.themeVerseRef}
                  </p>
                  <p className="text-xs sm:text-sm text-[#2D4D3B] italic leading-relaxed">
                    “{data.visionMission.themeVerseText}”
                  </p>
                </div>
              )}
            </div>

            <div className="lg:col-span-7 space-y-3">
              <p className="text-xs font-bold text-[#146C43] tracking-wide">
                MISI GEREJA · PERIODE {data.visionMission.period}
              </p>
              <ol className="space-y-3">
                {data.visionMission.missions.map((mission, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3.5 rounded-xl bg-[#F5F9F6] border border-[#E6EFE8] p-3.5"
                  >
                    <span className="w-7 h-7 rounded-lg bg-[#146C43] text-white font-mono tabular-nums text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <p className="text-sm sm:text-[15px] text-[#0F2419] leading-relaxed">
                      {mission}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </section>

      {/* Logo Resmi & Makna Lambang Gereja Kemah Injil Indonesia (GKII) */}
      <section className="rounded-2xl border border-[#D4E4D8] bg-white p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E6EFE8] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#146C43]">
              <Shield className="w-4 h-4" />
              <span>{churchIdentity.kicker}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0F2419]">
              {churchIdentity.heading}
            </h2>
            <p className="text-sm text-[#456051]">
              {churchIdentity.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {canEditAdmin && (
              <button
                type="button"
                onClick={openIdentityEditor}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D4E4D8] bg-[#F5F9F6] hover:bg-[#EAF3EC] text-xs font-semibold text-[#0F2419] whitespace-nowrap cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-[#146C43]" />
                <span>{editingIdentity ? 'Tutup Editor' : 'Ubah Identitas Resmi'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleDownloadOfficialLogo}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Logo Resmi (PNG)</span>
            </button>
          </div>
        </div>

        {editingIdentity && canEditAdmin ? (
          <form onSubmit={handleSaveIdentity} className="space-y-5">
            {identityError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
                {identityError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-4 rounded-xl bg-[#F5F9F6] border border-[#D4E4D8] p-5 space-y-4">
                <div className="flex flex-col items-center text-center gap-3">
                  <GkiiLogo
                    variant="crest"
                    src={
                      identityForm.resetLogo
                        ? GKII_OFFICIAL_LOGO_URL
                        : identityForm.pendingLogoDataUrl || churchIdentity.logoUrl
                    }
                    className="w-32 h-32"
                  />
                  <div className="text-xs text-[#456051]">
                    Pratinjau Logo Resmi GKII
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold whitespace-nowrap cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Ganti Logo (PNG/JPG)</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleIdentityLogoFile}
                      className="hidden"
                    />
                  </label>
                  {(identityForm.pendingLogoDataUrl ||
                    (churchIdentity.logoUrl !== GKII_OFFICIAL_LOGO_URL &&
                      !identityForm.resetLogo)) && (
                    <button
                      type="button"
                      onClick={() =>
                        setIdentityForm((prev) => ({
                          ...prev,
                          pendingLogoDataUrl: null,
                          resetLogo: true,
                        }))
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#EAF3EC] text-xs font-semibold text-[#0F2419] whitespace-nowrap cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#146C43]" />
                      <span>Logo Bawaan</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[#0F2419]">Label Atas (Kicker)</span>
                  <input
                    required
                    type="text"
                    value={identityForm.kicker}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, kicker: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[#0F2419]">Judul Identitas Resmi</span>
                  <input
                    required
                    type="text"
                    value={identityForm.heading}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, heading: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[#0F2419]">Nama Gereja di Kartu Logo</span>
                  <input
                    required
                    type="text"
                    value={identityForm.churchName}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, churchName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[#0F2419]">Sub-Label Jemaat</span>
                  <input
                    required
                    type="text"
                    value={identityForm.subLabel}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, subLabel: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>
                <label className="space-y-1.5 text-sm sm:col-span-2">
                  <span className="font-medium text-[#0F2419]">Deskripsi Identitas Resmi</span>
                  <textarea
                    required
                    rows={2}
                    value={identityForm.description}
                    onChange={(e) =>
                      setIdentityForm({ ...identityForm, description: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-[#E6EFE8]">
              <p className="text-xs font-bold text-[#146C43] uppercase tracking-wider">
                Empat Simbol Injil Empat Berganda
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {identityForm.symbols.map((sym, idx) => (
                  <div
                    key={sym.id}
                    className="rounded-xl border border-[#D4E4D8] bg-[#F5F9F6] p-4 space-y-3"
                  >
                    <p className="text-xs font-bold text-[#146C43]">
                      Simbol 0{idx + 1}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="space-y-1 text-xs">
                        <span className="font-medium text-[#0F2419]">Nama Simbol</span>
                        <input
                          required
                          type="text"
                          value={sym.symbolName}
                          onChange={(e) => {
                            const next = [...identityForm.symbols];
                            next[idx] = { ...sym, symbolName: e.target.value };
                            setIdentityForm({ ...identityForm, symbols: next });
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                        />
                      </label>
                      <label className="space-y-1 text-xs">
                        <span className="font-medium text-[#0F2419]">Referensi Ayat</span>
                        <input
                          required
                          type="text"
                          value={sym.verseRef}
                          onChange={(e) => {
                            const next = [...identityForm.symbols];
                            next[idx] = { ...sym, verseRef: e.target.value };
                            setIdentityForm({ ...identityForm, symbols: next });
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white font-mono text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                        />
                      </label>
                    </div>
                    <label className="block space-y-1 text-xs">
                      <span className="font-medium text-[#0F2419]">Judul Pengakuan Iman</span>
                      <input
                        required
                        type="text"
                        value={sym.title}
                        onChange={(e) => {
                          const next = [...identityForm.symbols];
                          next[idx] = { ...sym, title: e.target.value };
                          setIdentityForm({ ...identityForm, symbols: next });
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                      />
                    </label>
                    <label className="block space-y-1 text-xs">
                      <span className="font-medium text-[#0F2419]">Makna Lambang</span>
                      <textarea
                        required
                        rows={2}
                        value={sym.meaning}
                        onChange={(e) => {
                          const next = [...identityForm.symbols];
                          next[idx] = { ...sym, meaning: e.target.value };
                          setIdentityForm({ ...identityForm, symbols: next });
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={savingIdentity}
                className="px-5 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] disabled:opacity-60 text-white text-sm font-semibold whitespace-nowrap cursor-pointer"
              >
                {savingIdentity ? 'Menyimpan...' : 'Simpan Identitas Resmi'}
              </button>
              <button
                type="button"
                disabled={savingIdentity}
                onClick={() => setEditingIdentity(false)}
                className="px-5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#456051] text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                Batal
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-4 rounded-xl bg-[#F5F9F6] border border-[#D4E4D8] p-6 flex flex-col items-center justify-center text-center space-y-3">
              <GkiiLogo
                variant="crest"
                src={churchIdentity.logoUrl}
                className="w-44 h-44 sm:w-52 sm:h-52"
              />
              <div>
                <p className="text-sm font-bold text-[#0F2419]">
                  {churchIdentity.churchName}
                </p>
                <p className="text-xs text-[#456051]">
                  {churchIdentity.subLabel}
                </p>
              </div>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {churchIdentity.symbols.map((sym, idx) => (
                <div
                  key={sym.id}
                  className="rounded-xl border border-[#D4E4D8] bg-[#F5F9F6] p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-[#146C43]">
                      0{idx + 1}. {sym.symbolName}
                    </span>
                    <span className="font-mono text-[11px] text-[#456051]">
                      {sym.verseRef}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#0F2419]">{sym.title}</h3>
                  <p className="text-xs text-[#456051] leading-relaxed">{sym.meaning}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Real-Time Special Days & Meeting Reminders */}
      {(todayCelebrations.length > 0 || meetingAlerts.length > 0) && (
        <section className="rounded-2xl border border-[#BFE0C9] bg-white p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-[#0F2419]">
                {resolvedSiteContent.notifTitle}
              </h2>
              <p className="text-sm text-[#456051]">
                {resolvedSiteContent.notifSubtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('jemaat')}
              className="text-sm font-semibold text-[#146C43] hover:text-[#0F5132] whitespace-nowrap cursor-pointer"
            >
              Kelola Semua Ucapan →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayCelebrations.map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-[#F5F9F6] border border-[#D4E4D8] p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#B45309]">
                    {item.type === 'birthday' ? 'Ulang Tahun Kelahiran' : 'Ulang Tahun Pernikahan'} · {item.dueLabel}
                  </p>
                  <p className="text-base font-semibold text-[#0F2419]">{item.targetName}</p>
                  <p className="text-sm text-[#456051]">{item.message}</p>
                </div>
                {item.whatsappText && (
                  <div className="flex items-center gap-2">
                    <a
                      href={toWhatsAppUrl(item.phone, item.whatsappText)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Kirim Ucapan WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            ))}

            {meetingAlerts.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="rounded-xl bg-[#F5F9F6] border border-[#D4E4D8] p-4 flex flex-col justify-between gap-3"
              >
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[#146C43]">
                    Pengingat Rapat Panitia · {item.dueLabel}
                  </p>
                  <p className="text-base font-semibold text-[#0F2419]">{item.title}</p>
                  <p className="text-sm text-[#456051]">{item.message}</p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => onNavigate('kepanitiaan')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#146C43] text-[#146C43] hover:bg-[#146C43] hover:text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Buka Agenda Rapat</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4-Column KPI Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigate('kas')}
          className="text-left rounded-2xl border border-[#D4E4D8] bg-white p-5 hover:border-[#146C43] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#456051]">Saldo Kas Jemaat</span>
            <Wallet className="w-4 h-4 text-[#146C43]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F2419] font-mono tabular-nums">
            {formatRupiah(saldoKas)}
          </p>
          <p className="mt-1 text-xs text-[#456051] tabular-nums">
            {data.ledger.length} transaksi tercatat
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('jemaat')}
          className="text-left rounded-2xl border border-[#D4E4D8] bg-white p-5 hover:border-[#146C43] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#456051]">Jemaat Terdata</span>
            <Users className="w-4 h-4 text-[#146C43]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F2419] font-mono tabular-nums">
            {data.members.length} Jiwa
          </p>
          <p className="mt-1 text-xs text-[#456051] tabular-nums">
            {todayCelebrations.length} hari spesial hari ini
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('ibadah')}
          className="text-left rounded-2xl border border-[#D4E4D8] bg-white p-5 hover:border-[#146C43] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#456051]">Jadwal Ibadah & Doa</span>
            <HeartHandshake className="w-4 h-4 text-[#146C43]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F2419] font-mono tabular-nums">
            {data.schedules.length} Jadwal
          </p>
          <p className="mt-1 text-xs text-[#456051] tabular-nums">
            {data.prayers.length} panduan pokok doa harian
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('kepanitiaan')}
          className="text-left rounded-2xl border border-[#D4E4D8] bg-white p-5 hover:border-[#146C43] transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#456051]">Agenda Kepanitiaan</span>
            <Calendar className="w-4 h-4 text-[#146C43]" />
          </div>
          <p className="mt-2 text-2xl font-bold text-[#0F2419] font-mono tabular-nums">
            {activeMeetingsCount} Rapat Aktif
          </p>
          <p className="mt-1 text-xs text-[#456051] tabular-nums">
            {data.committees.length} kepanitiaan berjalan
          </p>
        </button>
      </section>

      {/* Jumlah Anggota per Organ Pelayanan */}
      <section className="rounded-2xl border border-[#D4E4D8] bg-white p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[#0F2419]">
              {resolvedSiteContent.organHeading}
            </h2>
            <p className="text-xs text-[#456051]">
              {resolvedSiteContent.organSubtitle} ({latestGrowth?.period || 'Terkini'}).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('jemaat')}
              className="text-xs font-semibold text-[#146C43] hover:text-[#0F5132] cursor-pointer"
            >
              Buku Induk Jemaat →
            </button>
            <span className="text-[#D4E4D8]" aria-hidden="true">|</span>
            <button
              type="button"
              onClick={() => onNavigate('pertumbuhan')}
              className="text-xs font-semibold text-[#146C43] hover:text-[#0F5132] cursor-pointer"
            >
              Grafik Pertumbuhan →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {organOrder.map((org) => {
            const statCount = latestGrowth?.byOrgan?.[org.id] ?? 0;
            const liveCount = liveOrganMap[org.id] ?? 0;
            return (
              <button
                key={org.id}
                type="button"
                onClick={() => onNavigate('pertumbuhan')}
                className="text-left rounded-xl border border-[#D4E4D8] bg-[#F5F9F6] hover:border-[#146C43] p-4 transition-colors cursor-pointer"
              >
                <p className="text-xs font-bold text-[#146C43] truncate">{org.id}</p>
                <p className="text-2xl font-bold text-[#0F2419] font-mono tabular-nums mt-1">
                  {statCount} <span className="text-xs font-normal text-[#456051]">Jiwa</span>
                </p>
                <p className="text-[11px] text-[#456051] mt-1 truncate">
                  {org.subtitle} · {liveCount} terdata
                </p>
              </button>
            );
          })}
        </div>

        {/* Ringkasan Status Baptis & Pernikahan */}
        <div className="pt-4 border-t border-[#E6EFE8] grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('jemaat')}
            className="text-left rounded-xl border border-[#D4E4D8] bg-[#F5F9F6] hover:border-[#146C43] p-4 transition-colors cursor-pointer"
          >
            <p className="text-xs font-semibold text-[#146C43]">Sudah Baptis</p>
            <p className="text-2xl font-bold text-[#0F2419] font-mono tabular-nums mt-1">
              {baptizedCount} <span className="text-xs font-normal text-[#456051]">Jiwa</span>
            </p>
            <p className="text-[11px] text-[#456051] mt-0.5 tabular-nums">
              {data.members.length > 0 ? Math.round((baptizedCount / data.members.length) * 100) : 0}% dari {data.members.length} terdata
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('jemaat')}
            className="text-left rounded-xl border border-[#D4E4D8] bg-[#F5F9F6] hover:border-[#B45309] p-4 transition-colors cursor-pointer"
          >
            <p className="text-xs font-semibold text-[#B45309]">Belum Baptis</p>
            <p className="text-2xl font-bold text-[#0F2419] font-mono tabular-nums mt-1">
              {unbaptizedCount} <span className="text-xs font-normal text-[#456051]">Jiwa</span>
            </p>
            <p className="text-[11px] text-[#456051] mt-0.5 tabular-nums">
              {data.members.length > 0 ? Math.round((unbaptizedCount / data.members.length) * 100) : 0}% dari {data.members.length} terdata
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('jemaat')}
            className="text-left rounded-xl border border-[#D4E4D8] bg-[#F5F9F6] hover:border-[#146C43] p-4 transition-colors cursor-pointer"
          >
            <p className="text-xs font-semibold text-[#146C43]">Sudah Menikah</p>
            <p className="text-2xl font-bold text-[#0F2419] font-mono tabular-nums mt-1">
              {marriedCount} <span className="text-xs font-normal text-[#456051]">Jiwa</span>
            </p>
            <p className="text-[11px] text-[#456051] mt-0.5 tabular-nums">
              {data.members.length > 0 ? Math.round((marriedCount / data.members.length) * 100) : 0}% status menikah
            </p>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('jemaat')}
            className="text-left rounded-xl border border-[#D4E4D8] bg-[#F5F9F6] hover:border-[#146C43] p-4 transition-colors cursor-pointer"
          >
            <p className="text-xs font-semibold text-[#456051]">Belum Menikah</p>
            <p className="text-2xl font-bold text-[#0F2419] font-mono tabular-nums mt-1">
              {unmarriedCount} <span className="text-xs font-normal text-[#456051]">Jiwa</span>
            </p>
            <p className="text-[11px] text-[#456051] mt-0.5 tabular-nums">
              {data.members.length > 0 ? Math.round((unmarriedCount / data.members.length) * 100) : 0}% belum menikah
            </p>
          </button>
        </div>
      </section>

      {/* Two-Column Editorial Split: Latest Devotional & Warta Gereja */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {latestDevotional && (
          <div className="lg:col-span-6 rounded-2xl border border-[#D4E4D8] bg-white p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-[#456051]">
                <span className="font-semibold text-[#146C43]">Renungan Harian</span>
                <span aria-hidden="true">·</span>
                <span>{formatIndonesianDate(latestDevotional.date)}</span>
              </div>
              <h2 className="text-xl font-bold text-[#0F2419]">{latestDevotional.title}</h2>
              <blockquote className="rounded-xl bg-[#F5F9F6] border border-[#D4E4D8] p-4 text-sm text-[#0F2419] italic leading-relaxed">
                “{latestDevotional.verseText}” — <span className="not-italic font-semibold">{latestDevotional.verseRef}</span>
              </blockquote>
              <p className="text-sm text-[#456051] leading-relaxed line-clamp-4">
                {latestDevotional.content}
              </p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#E6EFE8]">
              <span className="text-xs text-[#456051]">Oleh {latestDevotional.author}</span>
              <button
                type="button"
                onClick={() => onNavigate('renungan')}
                className="text-sm font-semibold text-[#146C43] hover:text-[#0F5132] cursor-pointer"
              >
                Baca Lengkap & Bagikan →
              </button>
            </div>
          </div>
        )}

        <div className="lg:col-span-6 rounded-2xl border border-[#D4E4D8] bg-white p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#0F2419]">Warta Gereja Terbaru</h2>
              <button
                type="button"
                onClick={() => onNavigate('ibadah')}
                className="text-sm font-semibold text-[#146C43] hover:text-[#0F5132] cursor-pointer"
              >
                Semua Warta →
              </button>
            </div>
            <div className="divide-y divide-[#E6EFE8]">
              {data.announcements.slice(0, 3).map((item) => (
                <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[#456051]">
                    <span className="font-medium text-[#146C43]">{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatIndonesianDate(item.date)}</span>
                  </div>
                  <h3 className="text-base font-semibold text-[#0F2419]">{item.title}</h3>
                  <p className="text-sm text-[#456051] leading-relaxed">{item.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Galeri Kegiatan Gereja */}
      <ChurchGalleryModule
        gallery={data.gallery || []}
        siteContent={resolvedSiteContent}
        canEditAdmin={canEditAdmin}
        canUploadGallery={canUploadGallery}
        uploaderName={uploaderName}
        onOpenLogin={onOpenLogin}
        onAddPhoto={onAddGalleryPhoto}
        onUpdatePhoto={onUpdateGalleryPhoto}
        onDeletePhoto={onDeleteGalleryPhoto}
      />
    </div>
  );
};
