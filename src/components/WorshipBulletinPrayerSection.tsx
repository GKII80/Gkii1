import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Clock,
  HandHeart,
  Heart,
  KeyRound,
  MapPin,
  Mic,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
  Wallet,
} from 'lucide-react';
import {
  ChurchAnnouncement,
  ChurchDatabase,
  DailyPrayer,
  SiteTextContent,
  WorshipSchedule,
} from '../types';
import { formatIndonesianDate } from '../lib/dateAndFormat';
import { DEFAULT_SITE_CONTENT } from '../lib/siteContentDefaults';

interface WorshipBulletinPrayerSectionProps {
  data: ChurchDatabase;
  siteContent?: SiteTextContent;
  canEditAdmin: boolean;
  onOpenLogin: () => void;
  onAddSchedule: (item: Omit<WorshipSchedule, 'id'>) => Promise<void>;
  onUpdateSchedule: (id: string, item: Omit<WorshipSchedule, 'id'>) => Promise<void>;
  onDeleteSchedule: (id: string) => Promise<void>;
  onAddAnnouncement: (item: Omit<ChurchAnnouncement, 'id'>) => Promise<void>;
  onUpdateAnnouncement: (id: string, item: Omit<ChurchAnnouncement, 'id'>) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  onAddPrayer: (item: Omit<DailyPrayer, 'id' | 'prayedCount'>) => Promise<void>;
  onUpdatePrayer: (
    id: string,
    item: Omit<DailyPrayer, 'id' | 'prayedCount'>
  ) => Promise<void>;
  onPrayIncrement: (id: string) => Promise<void>;
  onDeletePrayer: (id: string) => Promise<void>;
}

type SubTab = 'jadwal' | 'warta' | 'doa';

export const WorshipBulletinPrayerSection: React.FC<WorshipBulletinPrayerSectionProps> = ({
  data,
  siteContent,
  canEditAdmin,
  onOpenLogin,
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onAddAnnouncement,
  onUpdateAnnouncement,
  onDeleteAnnouncement,
  onAddPrayer,
  onUpdatePrayer,
  onPrayIncrement,
  onDeletePrayer,
}) => {
  const [subTab, setSubTab] = useState<SubTab>('jadwal');
  const [organFilter, setOrganFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [editingPrayerId, setEditingPrayerId] = useState<string | null>(null);

  // Schedule Form
  const emptyScheduleForm = (): Omit<WorshipSchedule, 'id'> => ({
    title: '',
    organ: 'Umum / Raya',
    dayOfWeek: 'Minggu',
    time: '09:00 WIB',
    location: 'Gedung Gereja Utama GKII Sungai Barang',
    mcName: '',
    speaker: '',
    offeringCollectors: '',
    intercessoryPrayerLeader: '',
    theme: '',
    notes: '',
  });
  const [schForm, setSchForm] = useState<Omit<WorshipSchedule, 'id'>>(emptyScheduleForm);

  // Announcement Form
  const emptyAnnouncementForm = (): Omit<ChurchAnnouncement, 'id'> => ({
    title: '',
    date: new Date().toISOString().slice(0, 10),
    category: 'Kegiatan Gereja',
    summary: '',
    content: '',
    author: 'Sekretariat BPJ',
  });
  const [annForm, setAnnForm] = useState<Omit<ChurchAnnouncement, 'id'>>(emptyAnnouncementForm);

  // Prayer Form
  const emptyPrayerForm = () => ({
    title: '',
    category: 'Pelayanan Gereja' as DailyPrayer['category'],
    verseRef: '',
    verseText: '',
    guideStepsText: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [pryForm, setPryForm] = useState(emptyPrayerForm);

  const [prayedLocal, setPrayedLocal] = useState<Record<string, boolean>>({});

  const organOptions = [
    'Semua',
    'Umum / Raya',
    'Perkaria',
    'Perkawan',
    'Sekolah Minggu',
    'Remaja',
    'Pemuda',
    'Pemuda & Remaja',
    'Lansia',
    'Doa & Sektor',
  ];

  const filteredSchedules = useMemo(() => {
    return data.schedules.filter((item) => {
      const matchesOrgan = organFilter === 'Semua' || item.organ === organFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.speaker.toLowerCase().includes(q) ||
        (item.mcName || '').toLowerCase().includes(q) ||
        (item.offeringCollectors || '').toLowerCase().includes(q) ||
        (item.intercessoryPrayerLeader || '').toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q) ||
        item.theme.toLowerCase().includes(q);
      return matchesOrgan && matchesSearch;
    });
  }, [data.schedules, organFilter, searchQuery]);

  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return data.announcements.filter(
      (a) =>
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q)
    );
  }, [data.announcements, searchQuery]);

  const filteredPrayers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return data.prayers.filter(
      (p) =>
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.verseRef.toLowerCase().includes(q)
    );
  }, [data.prayers, searchQuery]);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schForm.title.trim()) return;
    if (editingScheduleId) {
      await onUpdateSchedule(editingScheduleId, schForm);
    } else {
      await onAddSchedule(schForm);
    }
    setSchForm(emptyScheduleForm());
    setEditingScheduleId(null);
    setShowForm(false);
  };

  const handleStartEditSchedule = (item: WorshipSchedule) => {
    setSubTab('jadwal');
    setEditingScheduleId(item.id);
    setSchForm({
      title: item.title,
      organ: item.organ,
      dayOfWeek: item.dayOfWeek,
      time: item.time,
      location: item.location,
      mcName: item.mcName || '',
      speaker: item.speaker,
      offeringCollectors: item.offeringCollectors || '',
      intercessoryPrayerLeader: item.intercessoryPrayerLeader || '',
      theme: item.theme,
      notes: item.notes || '',
    });
    setShowForm(true);
  };

  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annForm.title.trim()) return;
    if (editingAnnouncementId) {
      await onUpdateAnnouncement(editingAnnouncementId, annForm);
    } else {
      await onAddAnnouncement(annForm);
    }
    setAnnForm(emptyAnnouncementForm());
    setEditingAnnouncementId(null);
    setShowForm(false);
  };

  const handleStartEditAnnouncement = (ann: ChurchAnnouncement) => {
    setSubTab('warta');
    setEditingAnnouncementId(ann.id);
    setAnnForm({
      title: ann.title,
      date: ann.date,
      category: ann.category,
      summary: ann.summary,
      content: ann.content,
      author: ann.author,
    });
    setShowForm(true);
  };

  const handlePrayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pryForm.title.trim()) return;
    const steps = pryForm.guideStepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const payload: Omit<DailyPrayer, 'id' | 'prayedCount'> = {
      title: pryForm.title,
      category: pryForm.category,
      verseRef: pryForm.verseRef || 'Filipi 4:6',
      verseText:
        pryForm.verseText ||
        'Janganlah hendaknya kamu kuatir tentang apapun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur.',
      guideSteps:
        steps.length > 0
          ? steps
          : ['Naikkan ucapan syukur dan doa permohonan bersama keluarga.'],
      date: pryForm.date,
    };
    if (editingPrayerId) {
      await onUpdatePrayer(editingPrayerId, payload);
    } else {
      await onAddPrayer(payload);
    }
    setPryForm(emptyPrayerForm());
    setEditingPrayerId(null);
    setShowForm(false);
  };

  const handleStartEditPrayer = (prayer: DailyPrayer) => {
    setSubTab('doa');
    setEditingPrayerId(prayer.id);
    setPryForm({
      title: prayer.title,
      category: prayer.category,
      verseRef: prayer.verseRef,
      verseText: prayer.verseText,
      guideStepsText: prayer.guideSteps.join('\n'),
      date: prayer.date,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2419]">
            {siteContent?.sections.ibadahTitle || DEFAULT_SITE_CONTENT.sections.ibadahTitle}
          </h1>
          <p className="text-sm text-[#456051] mt-1">
            {siteContent?.sections.ibadahSubtitle ||
              DEFAULT_SITE_CONTENT.sections.ibadahSubtitle}
          </p>
        </div>

        {canEditAdmin ? (
          <button
            type="button"
            onClick={() => {
              if (
                showForm &&
                (editingScheduleId || editingAnnouncementId || editingPrayerId)
              ) {
                setEditingScheduleId(null);
                setEditingAnnouncementId(null);
                setEditingPrayerId(null);
                setSchForm(emptyScheduleForm());
                setAnnForm(emptyAnnouncementForm());
                setPryForm(emptyPrayerForm());
              } else {
                setEditingScheduleId(null);
                setEditingAnnouncementId(null);
                setEditingPrayerId(null);
                setSchForm(emptyScheduleForm());
                setAnnForm(emptyAnnouncementForm());
                setPryForm(emptyPrayerForm());
                setShowForm((v) => !v);
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>
              {subTab === 'jadwal'
                ? 'Tambah Jadwal Ibadah'
                : subTab === 'warta'
                  ? 'Tulis Warta Baru'
                  : 'Tambah Pokok Doa'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#F5F9F6] text-[#0F2419] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-[#146C43]" />
            <span>Masuk Pengurus</span>
          </button>
        )}
      </div>

      {/* Segmented Navigation + Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="inline-flex items-center p-1 rounded-xl bg-[#EAF3EC] border border-[#D4E4D8] self-start">
          <button
            type="button"
            onClick={() => {
              setSubTab('jadwal');
              setEditingScheduleId(null);
              setEditingAnnouncementId(null);
              setEditingPrayerId(null);
              setShowForm(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'jadwal'
                ? 'bg-white text-[#0F2419] shadow-xs'
                : 'text-[#456051] hover:text-[#0F2419]'
            }`}
          >
            Jadwal Ibadah ({data.schedules.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setSubTab('warta');
              setEditingScheduleId(null);
              setEditingAnnouncementId(null);
              setEditingPrayerId(null);
              setShowForm(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'warta'
                ? 'bg-white text-[#0F2419] shadow-xs'
                : 'text-[#456051] hover:text-[#0F2419]'
            }`}
          >
            Warta Gereja ({data.announcements.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setSubTab('doa');
              setEditingScheduleId(null);
              setEditingAnnouncementId(null);
              setEditingPrayerId(null);
              setShowForm(false);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              subTab === 'doa'
                ? 'bg-white text-[#0F2419] shadow-xs'
                : 'text-[#456051] hover:text-[#0F2419]'
            }`}
          >
            Panduan Doa Harian ({data.prayers.length})
          </button>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-[#456051] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari jadwal, pengumuman, atau doa..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D4E4D8] bg-white text-sm text-[#0F2419] placeholder:text-[#6B8576] focus:outline-none focus:border-[#146C43]"
          />
        </div>
      </div>

      {/* Add / Edit Schedule Form */}
      {canEditAdmin && showForm && subTab === 'jadwal' && (
        <form
          onSubmit={handleScheduleSubmit}
          className="rounded-2xl border border-[#BFE0C9] bg-white p-6 space-y-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#0F2419]">
              {editingScheduleId ? 'Perbarui Jadwal Ibadah & Petugas Pelayanan' : 'Tambah Jadwal Ibadah & Petugas Pelayanan'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Nama Ibadah</span>
              <input
                required
                type="text"
                value={schForm.title}
                onChange={(e) => setSchForm({ ...schForm, title: e.target.value })}
                placeholder="Contoh: Ibadah Raya Minggu Pagi"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Organ / Kategori</span>
              <select
                value={schForm.organ}
                onChange={(e) =>
                  setSchForm({ ...schForm, organ: e.target.value as WorshipSchedule['organ'] })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              >
                {organOptions.filter((o) => o !== 'Semua').map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-[#0F2419]">Hari</span>
                <input
                  required
                  type="text"
                  value={schForm.dayOfWeek}
                  onChange={(e) => setSchForm({ ...schForm, dayOfWeek: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium text-[#0F2419]">Waktu</span>
                <input
                  required
                  type="text"
                  value={schForm.time}
                  onChange={(e) => setSchForm({ ...schForm, time: e.target.value })}
                  placeholder="09:00 WIB"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>
            </div>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">1. Nama MC</span>
              <input
                required
                type="text"
                value={schForm.mcName}
                onChange={(e) => setSchForm({ ...schForm, mcName: e.target.value })}
                placeholder="Contoh: Sdr. Daniel Putra"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">2. Penghotbah</span>
              <input
                required
                type="text"
                value={schForm.speaker}
                onChange={(e) => setSchForm({ ...schForm, speaker: e.target.value })}
                placeholder="Contoh: Pdt. Lukas H. Bangun, M.Th."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">3. Kantong Persembahan</span>
              <input
                required
                type="text"
                value={schForm.offeringCollectors}
                onChange={(e) => setSchForm({ ...schForm, offeringCollectors: e.target.value })}
                placeholder="Contoh: Ibu Martha & Bpk. Yohanes"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">4. Tempat Ibadah</span>
              <input
                required
                type="text"
                value={schForm.location}
                onChange={(e) => setSchForm({ ...schForm, location: e.target.value })}
                placeholder="Contoh: Gedung Gereja Utama / Rumah Jemaat"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">5. Doa Syafaat</span>
              <input
                required
                type="text"
                value={schForm.intercessoryPrayerLeader}
                onChange={(e) =>
                  setSchForm({ ...schForm, intercessoryPrayerLeader: e.target.value })
                }
                placeholder="Contoh: Bpk. Andreas Lawing"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Tema Khotbah / Ibadah</span>
              <input
                required
                type="text"
                value={schForm.theme}
                onChange={(e) => setSchForm({ ...schForm, theme: e.target.value })}
                placeholder="Contoh: Hidup dalam Penghormatan kepada Tuhan"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm md:col-span-2 lg:col-span-3">
              <span className="font-medium text-[#0F2419]">Catatan Tambahan (Opsional)</span>
              <input
                type="text"
                value={schForm.notes || ''}
                onChange={(e) => setSchForm({ ...schForm, notes: e.target.value })}
                placeholder="Contoh: Membawa Alkitab & Kidung Kemah Injil"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold cursor-pointer"
            >
              {editingScheduleId ? 'Simpan Perubahan Jadwal' : 'Simpan Jadwal'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingScheduleId(null);
                setSchForm(emptyScheduleForm());
                setShowForm(false);
              }}
              className="px-5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#456051] hover:text-[#0F2419] text-sm font-medium cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {canEditAdmin && showForm && subTab === 'warta' && (
        <form
          onSubmit={handleAnnouncementSubmit}
          className="rounded-2xl border border-[#BFE0C9] bg-white p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-[#0F2419]">
            {editingAnnouncementId ? 'Perbarui Warta Gereja' : 'Terbitkan Warta Gereja'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="space-y-1.5 text-sm md:col-span-2">
              <span className="font-medium text-[#0F2419]">Judul Warta</span>
              <input
                required
                type="text"
                value={annForm.title}
                onChange={(e) => setAnnForm({ ...annForm, title: e.target.value })}
                placeholder="Contoh: Jadwal Kunjungan Pastoral Sektor II"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Kategori</span>
              <select
                value={annForm.category}
                onChange={(e) =>
                  setAnnForm({
                    ...annForm,
                    category: e.target.value as ChurchAnnouncement['category'],
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              >
                <option value="Kegiatan Gereja">Kegiatan Gereja</option>
                <option value="Berita Jemaat">Berita Jemaat</option>
                <option value="Pelayanan">Pelayanan</option>
                <option value="Keuangan & Pembangunan">Keuangan & Pembangunan</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Tanggal</span>
              <input
                required
                type="date"
                value={annForm.date}
                onChange={(e) => setAnnForm({ ...annForm, date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Penulis / Penerbit</span>
              <input
                required
                type="text"
                value={annForm.author}
                onChange={(e) => setAnnForm({ ...annForm, author: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Ringkasan Singkat</span>
              <input
                required
                type="text"
                value={annForm.summary}
                onChange={(e) => setAnnForm({ ...annForm, summary: e.target.value })}
                placeholder="Ringkasan satu kalimat..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm md:col-span-3">
              <span className="font-medium text-[#0F2419]">Isi Lengkap Pengumuman</span>
              <textarea
                required
                rows={3}
                value={annForm.content}
                onChange={(e) => setAnnForm({ ...annForm, content: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold cursor-pointer"
            >
              {editingAnnouncementId ? 'Simpan Perubahan Warta' : 'Terbitkan Warta'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingAnnouncementId(null);
                setAnnForm(emptyAnnouncementForm());
                setShowForm(false);
              }}
              className="px-5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#456051] hover:text-[#0F2419] text-sm font-medium cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {canEditAdmin && showForm && subTab === 'doa' && (
        <form
          onSubmit={handlePrayerSubmit}
          className="rounded-2xl border border-[#BFE0C9] bg-white p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-[#0F2419]">
            {editingPrayerId ? 'Perbarui Panduan Pokok Doa Harian' : 'Tambah Panduan Pokok Doa Harian'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Judul Pokok Doa</span>
              <input
                required
                type="text"
                value={pryForm.title}
                onChange={(e) => setPryForm({ ...pryForm, title: e.target.value })}
                placeholder="Contoh: Doa bagi Keluarga Jemaat"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Kategori</span>
              <select
                value={pryForm.category}
                onChange={(e) =>
                  setPryForm({ ...pryForm, category: e.target.value as DailyPrayer['category'] })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              >
                <option value="Bangsa & Negara">Bangsa & Negara</option>
                <option value="Jemaat Sakit & Pemulihan">Jemaat Sakit & Pemulihan</option>
                <option value="Misi & Penginjilan">Misi & Penginjilan</option>
                <option value="Keluarga & Pemuda">Keluarga & Pemuda</option>
                <option value="Pelayanan Gereja">Pelayanan Gereja</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Referensi Ayat</span>
              <input
                type="text"
                value={pryForm.verseRef}
                onChange={(e) => setPryForm({ ...pryForm, verseRef: e.target.value })}
                placeholder="Contoh: Mazmur 23:1"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Tanggal Pokok Doa</span>
              <input
                required
                type="date"
                value={pryForm.date}
                onChange={(e) => setPryForm({ ...pryForm, date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm md:col-span-2">
              <span className="font-medium text-[#0F2419]">Isi Ayat Pegangan</span>
              <input
                type="text"
                value={pryForm.verseText}
                onChange={(e) => setPryForm({ ...pryForm, verseText: e.target.value })}
                placeholder="TUHAN adalah gembalaku..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm md:col-span-2">
              <span className="font-medium text-[#0F2419]">
                Langkah / Poin Doa (1 baris per poin)
              </span>
              <textarea
                rows={3}
                value={pryForm.guideStepsText}
                onChange={(e) => setPryForm({ ...pryForm, guideStepsText: e.target.value })}
                placeholder={'Syukuri pemeliharaan Tuhan hari ini.\nDoakan pergumulan jemaat yang sakit.'}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold cursor-pointer"
            >
              {editingPrayerId ? 'Simpan Perubahan Doa' : 'Simpan Pokok Doa'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingPrayerId(null);
                setPryForm(emptyPrayerForm());
                setShowForm(false);
              }}
              className="px-5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#456051] hover:text-[#0F2419] text-sm font-medium cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* SUBTAB 1: JADWAL IBADAH */}
      {subTab === 'jadwal' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {organOptions.map((organ) => (
              <button
                key={organ}
                type="button"
                onClick={() => setOrganFilter(organ)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  organFilter === organ
                    ? 'bg-[#146C43] text-white'
                    : 'bg-white border border-[#D4E4D8] text-[#456051] hover:text-[#0F2419]'
                }`}
              >
                {organ}
              </button>
            ))}
          </div>

          {filteredSchedules.length === 0 ? (
            <div className="rounded-2xl border border-[#D4E4D8] bg-white p-10 text-center space-y-2">
              <p className="text-base font-semibold text-[#0F2419]">
                Belum ada jadwal ibadah yang sesuai pencarian
              </p>
              <p className="text-sm text-[#456051]">
                Ubah pilihan kategori atau tambahkan jadwal ibadah baru.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSchedules.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#D4E4D8] bg-white p-6 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-[#146C43]">{item.organ}</p>
                        <h3 className="text-lg font-bold text-[#0F2419] mt-0.5">{item.title}</h3>
                      </div>
                      {canEditAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleStartEditSchedule(item)}
                            title="Ubah jadwal ibadah"
                            className="p-2 rounded-lg text-[#6B8576] hover:text-[#146C43] hover:bg-[#EAF3EC] transition-colors cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteSchedule(item.id)}
                            title="Hapus jadwal"
                            className="p-2 rounded-lg text-[#6B8576] hover:text-[#B91C1C] hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-[#0F2419] font-medium">
                      Tema: “{item.theme}”
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[#456051]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#146C43] shrink-0" />
                        <span>{item.dayOfWeek}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#146C43] shrink-0" />
                        <span className="font-mono tabular-nums">{item.time}</span>
                      </div>
                    </div>

                    <div className="rounded-xl bg-[#F5F9F6] border border-[#E6EFE8] p-3.5 space-y-2 text-xs text-[#456051]">
                      <p className="font-semibold text-[#146C43] uppercase tracking-wider text-[11px]">
                        Daftar Pelayanan Ibadah
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="flex items-start gap-2">
                          <Mic className="w-3.5 h-3.5 text-[#146C43] shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[11px] text-[#6B8576]">Nama MC</span>
                            <span className="font-semibold text-[#0F2419]">{item.mcName || '—'}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <User className="w-3.5 h-3.5 text-[#146C43] shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[11px] text-[#6B8576]">Penghotbah</span>
                            <span className="font-semibold text-[#0F2419]">{item.speaker || '—'}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Wallet className="w-3.5 h-3.5 text-[#146C43] shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[11px] text-[#6B8576]">Kantong Persembahan</span>
                            <span className="font-semibold text-[#0F2419]">
                              {item.offeringCollectors || '—'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <HandHeart className="w-3.5 h-3.5 text-[#146C43] shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[11px] text-[#6B8576]">Doa Syafaat</span>
                            <span className="font-semibold text-[#0F2419]">
                              {item.intercessoryPrayerLeader || '—'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 sm:col-span-2 pt-1 border-t border-[#E6EFE8]">
                          <MapPin className="w-3.5 h-3.5 text-[#146C43] shrink-0 mt-0.5" />
                          <div>
                            <span className="block text-[11px] text-[#6B8576]">Tempat Ibadah</span>
                            <span className="font-semibold text-[#0F2419]">{item.location || '—'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-[#456051] pt-3 border-t border-[#E6EFE8]">
                      Catatan: {item.notes}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: WARTA GEREJA */}
      {subTab === 'warta' && (
        <div className="space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <div className="rounded-2xl border border-[#D4E4D8] bg-white p-10 text-center">
              <p className="text-base font-semibold text-[#0F2419]">Tidak ada warta ditemukan</p>
            </div>
          ) : (
            filteredAnnouncements.map((ann) => (
              <article
                key={ann.id}
                className="rounded-2xl border border-[#D4E4D8] bg-white p-6 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#456051]">
                      <span className="font-semibold text-[#146C43]">{ann.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatIndonesianDate(ann.date)}</span>
                      <span aria-hidden="true">·</span>
                      <span>Oleh {ann.author}</span>
                    </div>
                    <h3 className="text-xl font-bold text-[#0F2419]">{ann.title}</h3>
                  </div>
                  {canEditAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditAnnouncement(ann)}
                        title="Ubah warta gereja"
                        className="p-2 rounded-lg text-[#6B8576] hover:text-[#146C43] hover:bg-[#EAF3EC] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteAnnouncement(ann.id)}
                        title="Hapus warta"
                        className="p-2 rounded-lg text-[#6B8576] hover:text-[#B91C1C] hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-[#2D4D3B]">{ann.summary}</p>
                <p className="text-[15px] text-[#456051] leading-relaxed">{ann.content}</p>
              </article>
            ))
          )}
        </div>
      )}

      {/* SUBTAB 3: PANDUAN DOA HARIAN */}
      {subTab === 'doa' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPrayers.map((prayer) => {
            const hasPrayed = Boolean(prayedLocal[prayer.id]);
            return (
              <article
                key={prayer.id}
                className="rounded-2xl border border-[#D4E4D8] bg-white p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-[#456051]">
                        <span className="font-semibold text-[#146C43]">{prayer.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatIndonesianDate(prayer.date)}</span>
                      </div>
                      <h3 className="text-lg font-bold text-[#0F2419] mt-1">{prayer.title}</h3>
                    </div>
                    {canEditAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditPrayer(prayer)}
                          title="Ubah pokok doa"
                          className="p-2 rounded-lg text-[#6B8576] hover:text-[#146C43] hover:bg-[#EAF3EC] transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePrayer(prayer.id)}
                          title="Hapus pokok doa"
                          className="p-2 rounded-lg text-[#6B8576] hover:text-[#B91C1C] hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl bg-[#F5F9F6] border border-[#D4E4D8] p-4 space-y-1">
                    <p className="text-xs font-semibold text-[#146C43]">{prayer.verseRef}</p>
                    <p className="text-sm text-[#0F2419] italic leading-relaxed">
                      “{prayer.verseText}”
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#456051]">Panduan Doa Langkah Demi Langkah:</p>
                    <ol className="space-y-2 text-sm text-[#0F2419] list-decimal list-inside leading-relaxed">
                      {prayer.guideSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#E6EFE8] flex items-center justify-between gap-3">
                  <span className="text-xs text-[#456051] tabular-nums">
                    {prayer.prayedCount} jemaat telah mendoakan
                  </span>
                  <button
                    type="button"
                    onClick={async () => {
                      setPrayedLocal((prev) => ({ ...prev, [prayer.id]: true }));
                      await onPrayIncrement(prayer.id);
                    }}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      hasPrayed
                        ? 'bg-[#EAF3EC] text-[#146C43] border border-[#BFE0C9]'
                        : 'bg-[#146C43] hover:bg-[#0F5132] text-white'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${hasPrayed ? 'fill-[#146C43]' : ''}`} />
                    <span>{hasPrayed ? 'Amin · Sudah Didoakan' : 'Amin · Ikut Berdoa'}</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
