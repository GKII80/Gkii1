import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, RotateCcw, Search, X } from 'lucide-react';
import type { OrganPelayanan, SiteTextContent } from '../types';
import { DEFAULT_SITE_CONTENT, mergeSiteContent } from '../lib/siteContentDefaults';

export type SiteTextEditorTab = 'identitas' | 'beranda' | 'halaman' | 'galeri';

interface SiteTextEditorModalProps {
  open: boolean;
  initialTab?: SiteTextEditorTab;
  siteContent: SiteTextContent;
  onClose: () => void;
  onSave: (
    payload: Partial<SiteTextContent> & { resetDefault?: boolean }
  ) => Promise<void>;
}

interface FieldDescriptor {
  key: string;
  tab: SiteTextEditorTab;
  groupLabel: string;
  label: string;
  multiline?: boolean;
  getValue: (draft: SiteTextContent) => string;
  setValue: (draft: SiteTextContent, value: string) => SiteTextContent;
}

const NAV_FIELD_META: {
  id: keyof SiteTextContent['navLabels'];
  label: string;
}[] = [
  { id: 'beranda', label: 'Menu 1 · Beranda' },
  { id: 'ibadah', label: 'Menu 2 · Ibadah, Warta & Doa' },
  { id: 'renungan', label: 'Menu 3 · Renungan Harian' },
  { id: 'kas', label: 'Menu 4 · Kas & Pembukuan' },
  { id: 'jemaat', label: 'Menu 5 · Data Jemaat & HUT' },
  { id: 'pertumbuhan', label: 'Menu 6 · Pertumbuhan Jemaat' },
  { id: 'pengurus', label: 'Menu 7 · Badan Pengurus' },
  { id: 'kepanitiaan', label: 'Menu 8 · Kepanitiaan' },
  { id: 'surat', label: 'Menu 9 · Arsip & Surat' },
];

const ORGAN_SUB_KEYS: OrganPelayanan[] = [
  'Perkaria',
  'Perkawan',
  'Sekolah Minggu',
  'Remaja',
  'Pemuda',
  'Lansia',
];

const SECTION_META: {
  titleKey: keyof SiteTextContent['sections'];
  subtitleKey: keyof SiteTextContent['sections'];
  label: string;
}[] = [
  {
    titleKey: 'ibadahTitle',
    subtitleKey: 'ibadahSubtitle',
    label: 'Halaman Ibadah, Warta & Doa',
  },
  {
    titleKey: 'renunganTitle',
    subtitleKey: 'renunganSubtitle',
    label: 'Halaman Renungan Harian',
  },
  {
    titleKey: 'kasTitle',
    subtitleKey: 'kasSubtitle',
    label: 'Halaman Kas & Pembukuan',
  },
  {
    titleKey: 'jemaatTitle',
    subtitleKey: 'jemaatSubtitle',
    label: 'Halaman Data Jemaat & HUT',
  },
  {
    titleKey: 'pertumbuhanTitle',
    subtitleKey: 'pertumbuhanSubtitle',
    label: 'Halaman Pertumbuhan Jemaat',
  },
  {
    titleKey: 'pengurusTitle',
    subtitleKey: 'pengurusSubtitle',
    label: 'Halaman Badan Pengurus',
  },
  {
    titleKey: 'kepanitiaanTitle',
    subtitleKey: 'kepanitiaanSubtitle',
    label: 'Halaman Kepanitiaan',
  },
  {
    titleKey: 'suratTitle',
    subtitleKey: 'suratSubtitle',
    label: 'Halaman Arsip & Surat',
  },
];

const ALL_FIELDS: FieldDescriptor[] = [
  // Identitas & Menu
  {
    key: 'appTitle',
    tab: 'identitas',
    groupLabel: 'Identitas Aplikasi & Footer',
    label: 'Nama Aplikasi (Sidebar & Header)',
    getValue: (d) => d.appTitle,
    setValue: (d, v) => ({ ...d, appTitle: v }),
  },
  {
    key: 'appSubtitle',
    tab: 'identitas',
    groupLabel: 'Identitas Aplikasi & Footer',
    label: 'Subjudul Aplikasi (Sidebar)',
    getValue: (d) => d.appSubtitle,
    setValue: (d, v) => ({ ...d, appSubtitle: v }),
  },
  {
    key: 'footerOrg',
    tab: 'identitas',
    groupLabel: 'Identitas Aplikasi & Footer',
    label: 'Teks Organisasi di Footer',
    getValue: (d) => d.footerOrg,
    setValue: (d, v) => ({ ...d, footerOrg: v }),
  },
  {
    key: 'footerMotto',
    tab: 'identitas',
    groupLabel: 'Identitas Aplikasi & Footer',
    label: 'Semboyan / Motto Pelayanan di Footer',
    getValue: (d) => d.footerMotto,
    setValue: (d, v) => ({ ...d, footerMotto: v }),
  },
  ...NAV_FIELD_META.map<FieldDescriptor>((nav) => ({
    key: `nav.${nav.id}`,
    tab: 'identitas',
    groupLabel: 'Label Menu Navigasi Utama',
    label: nav.label,
    getValue: (d) => d.navLabels[nav.id],
    setValue: (d, v) => ({
      ...d,
      navLabels: { ...d.navLabels, [nav.id]: v },
    }),
  })),

  // Beranda & Organ
  {
    key: 'heroEyebrow',
    tab: 'beranda',
    groupLabel: 'Spanduk Utama Beranda',
    label: 'Label Atas Beranda',
    getValue: (d) => d.heroEyebrow,
    setValue: (d, v) => ({ ...d, heroEyebrow: v }),
  },
  {
    key: 'heroTitle',
    tab: 'beranda',
    groupLabel: 'Spanduk Utama Beranda',
    label: 'Judul Utama Beranda',
    getValue: (d) => d.heroTitle,
    setValue: (d, v) => ({ ...d, heroTitle: v }),
  },
  {
    key: 'heroSubtitle',
    tab: 'beranda',
    groupLabel: 'Spanduk Utama Beranda',
    label: 'Deskripsi Singkat Beranda',
    multiline: true,
    getValue: (d) => d.heroSubtitle,
    setValue: (d, v) => ({ ...d, heroSubtitle: v }),
  },
  {
    key: 'heroLocationLabel',
    tab: 'beranda',
    groupLabel: 'Spanduk Utama Beranda',
    label: 'Label Lokasi (Samping Logo Ilustrasi)',
    getValue: (d) => d.heroLocationLabel,
    setValue: (d, v) => ({ ...d, heroLocationLabel: v }),
  },
  {
    key: 'heroBadgeCode',
    tab: 'beranda',
    groupLabel: 'Spanduk Utama Beranda',
    label: 'Kode Singkat Gereja',
    getValue: (d) => d.heroBadgeCode,
    setValue: (d, v) => ({ ...d, heroBadgeCode: v }),
  },
  {
    key: 'notifTitle',
    tab: 'beranda',
    groupLabel: 'Bagian Notifikasi Otomatis',
    label: 'Judul Bagian Notifikasi',
    getValue: (d) => d.notifTitle,
    setValue: (d, v) => ({ ...d, notifTitle: v }),
  },
  {
    key: 'notifSubtitle',
    tab: 'beranda',
    groupLabel: 'Bagian Notifikasi Otomatis',
    label: 'Subjudul Bagian Notifikasi',
    multiline: true,
    getValue: (d) => d.notifSubtitle,
    setValue: (d, v) => ({ ...d, notifSubtitle: v }),
  },
  {
    key: 'organHeading',
    tab: 'beranda',
    groupLabel: 'Bagian Organ Pelayanan',
    label: 'Judul Rekap Organ Pelayanan',
    getValue: (d) => d.organHeading,
    setValue: (d, v) => ({ ...d, organHeading: v }),
  },
  {
    key: 'organSubtitle',
    tab: 'beranda',
    groupLabel: 'Bagian Organ Pelayanan',
    label: 'Keterangan Rekap Organ Pelayanan',
    multiline: true,
    getValue: (d) => d.organSubtitle,
    setValue: (d, v) => ({ ...d, organSubtitle: v }),
  },
  ...ORGAN_SUB_KEYS.map<FieldDescriptor>((org) => ({
    key: `organSub.${org}`,
    tab: 'beranda',
    groupLabel: 'Keterangan Kartu Masing-masing Organ',
    label: `Keterangan Kartu ${org}`,
    getValue: (d) => d.organSubtitles[org],
    setValue: (d, v) => ({
      ...d,
      organSubtitles: { ...d.organSubtitles, [org]: v },
    }),
  })),

  // Judul Halaman
  ...SECTION_META.flatMap<FieldDescriptor>((sec) => [
    {
      key: `sec.${sec.titleKey}`,
      tab: 'halaman',
      groupLabel: sec.label,
      label: `Judul ${sec.label}`,
      getValue: (d) => d.sections[sec.titleKey],
      setValue: (d, v) => ({
        ...d,
        sections: { ...d.sections, [sec.titleKey]: v },
      }),
    },
    {
      key: `sec.${sec.subtitleKey}`,
      tab: 'halaman',
      groupLabel: sec.label,
      label: `Keterangan ${sec.label}`,
      multiline: true,
      getValue: (d) => d.sections[sec.subtitleKey],
      setValue: (d, v) => ({
        ...d,
        sections: { ...d.sections, [sec.subtitleKey]: v },
      }),
    },
  ]),

  // Galeri & Kop Surat
  {
    key: 'galleryKicker',
    tab: 'galeri',
    groupLabel: 'Bagian Galeri Kegiatan Gereja',
    label: 'Label Atas Galeri',
    getValue: (d) => d.galleryKicker,
    setValue: (d, v) => ({ ...d, galleryKicker: v }),
  },
  {
    key: 'galleryTitle',
    tab: 'galeri',
    groupLabel: 'Bagian Galeri Kegiatan Gereja',
    label: 'Judul Bagian Galeri',
    getValue: (d) => d.galleryTitle,
    setValue: (d, v) => ({ ...d, galleryTitle: v }),
  },
  {
    key: 'gallerySubtitle',
    tab: 'galeri',
    groupLabel: 'Bagian Galeri Kegiatan Gereja',
    label: 'Keterangan Bagian Galeri',
    multiline: true,
    getValue: (d) => d.gallerySubtitle,
    setValue: (d, v) => ({ ...d, gallerySubtitle: v }),
  },
  {
    key: 'kopAddressLine',
    tab: 'galeri',
    groupLabel: 'Kop Surat & Dokumen Cetak',
    label: 'Baris Alamat Gereja pada Kop Surat',
    multiline: true,
    getValue: (d) => d.kopAddressLine,
    setValue: (d, v) => ({ ...d, kopAddressLine: v }),
  },
  {
    key: 'kopRegionLine',
    tab: 'galeri',
    groupLabel: 'Kop Surat & Dokumen Cetak',
    label: 'Baris Wilayah / Daerah pada Kop Surat',
    getValue: (d) => d.kopRegionLine,
    setValue: (d, v) => ({ ...d, kopRegionLine: v }),
  },
];

const TAB_LIST: { id: SiteTextEditorTab; label: string }[] = [
  { id: 'identitas', label: 'Identitas & Menu' },
  { id: 'beranda', label: 'Beranda & Organ' },
  { id: 'halaman', label: 'Judul Halaman' },
  { id: 'galeri', label: 'Galeri & Kop' },
];

export const SiteTextEditorModal: React.FC<SiteTextEditorModalProps> = ({
  open,
  initialTab = 'identitas',
  siteContent,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<SiteTextEditorTab>(initialTab);
  const [draft, setDraft] = useState<SiteTextContent>(() =>
    mergeSiteContent(siteContent)
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(mergeSiteContent(siteContent));
      setActiveTab(initialTab);
      setSearchQuery('');
      setConfirmReset(false);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [open, initialTab, siteContent]);

  const visibleFields = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      return ALL_FIELDS.filter(
        (f) =>
          f.label.toLowerCase().includes(q) ||
          f.groupLabel.toLowerCase().includes(q) ||
          f.getValue(draft).toLowerCase().includes(q)
      );
    }
    return ALL_FIELDS.filter((f) => f.tab === activeTab);
  }, [activeTab, searchQuery, draft]);

  const groupedFields = useMemo(() => {
    const groups: { groupLabel: string; fields: FieldDescriptor[] }[] = [];
    for (const field of visibleFields) {
      let existing = groups.find((g) => g.groupLabel === field.groupLabel);
      if (!existing) {
        existing = { groupLabel: field.groupLabel, fields: [] };
        groups.push(existing);
      }
      existing.fields.push(field);
    }
    return groups;
  }, [visibleFields]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await onSave(draft);
      setSuccessMsg('Seluruh isi teks aplikasi berhasil disimpan.');
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal menyimpan perubahan teks aplikasi.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await onSave({ resetDefault: true });
      setDraft(mergeSiteContent(DEFAULT_SITE_CONTENT));
      setConfirmReset(false);
      setSuccessMsg('Seluruh teks aplikasi berhasil dikembalikan ke bawaan awal.');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Gagal mengembalikan teks bawaan.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto print:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-text-editor-title"
    >
      <div className="bg-white rounded-2xl border border-[#D4E4D8] w-full max-w-4xl overflow-hidden shadow-2xl my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6EFE8] bg-[#F5F9F6] flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAF3EC] border border-[#BFE0C9] flex items-center justify-center shrink-0 mt-0.5">
              <Pencil className="w-4 h-4 text-[#146C43]" />
            </div>
            <div>
              <h2
                id="site-text-editor-title"
                className="text-lg font-bold text-[#0F2419]"
              >
                Ubah Semua Isi Teks Aplikasi
              </h2>
              <p className="text-xs text-[#456051] mt-0.5">
                Kelola judul aplikasi, label menu, spanduk beranda, keterangan organ pelayanan, judul tiap halaman, galeri, dan kop surat secara langsung.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup editor teks"
            className="p-2 rounded-lg text-[#456051] hover:bg-white hover:text-[#0F2419] cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs & Search */}
        <div className="px-6 py-3.5 border-b border-[#E6EFE8] bg-white space-y-3 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {TAB_LIST.map((tab) => {
                const isActive = activeTab === tab.id && !searchQuery.trim();
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveTab(tab.id);
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? 'bg-[#146C43] text-white'
                        : 'bg-[#F5F9F6] border border-[#D4E4D8] text-[#456051] hover:text-[#0F2419]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-[#456051] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari teks di semua bagian..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D4E4D8] bg-[#F5F9F6] focus:bg-white text-xs text-[#0F2419] placeholder:text-[#6B8576] focus:outline-none focus:border-[#146C43]"
              />
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {errorMsg && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-[#B91C1C]">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="rounded-xl border border-[#BFE0C9] bg-[#EAF3EC] px-4 py-3 text-xs font-semibold text-[#146C43]">
                {successMsg}
              </div>
            )}

            {groupedFields.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D4E4D8] bg-[#F5F9F6] p-8 text-center space-y-1">
                <p className="text-sm font-semibold text-[#0F2419]">
                  Tidak ada teks yang cocok dengan kata kunci pencarian
                </p>
                <p className="text-xs text-[#456051]">
                  Coba gunakan kata kunci lain atau hapus kolom pencarian untuk melihat semua bagian.
                </p>
              </div>
            ) : (
              groupedFields.map((group) => (
                <section
                  key={group.groupLabel}
                  className="rounded-xl border border-[#D4E4D8] bg-[#F5F9F6]/60 p-4 sm:p-5 space-y-4"
                >
                  <h3 className="text-xs font-bold text-[#146C43] uppercase tracking-wider">
                    {group.groupLabel}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.fields.map((field) => {
                      const val = field.getValue(draft);
                      return (
                        <label
                          key={field.key}
                          className={`space-y-1.5 text-sm block ${
                            field.multiline ? 'md:col-span-2' : ''
                          }`}
                        >
                          <span className="font-medium text-[#0F2419] block">
                            {field.label}
                          </span>
                          {field.multiline ? (
                            <textarea
                              required
                              rows={2}
                              value={val}
                              onChange={(e) =>
                                setDraft((prev) => field.setValue(prev, e.target.value))
                              }
                              className="w-full px-3.5 py-2 rounded-lg border border-[#D4E4D8] bg-white text-sm text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                            />
                          ) : (
                            <input
                              required
                              type="text"
                              value={val}
                              onChange={(e) =>
                                setDraft((prev) => field.setValue(prev, e.target.value))
                              }
                              className="w-full px-3.5 py-2 rounded-lg border border-[#D4E4D8] bg-white text-sm text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                            />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-[#E6EFE8] bg-[#F5F9F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div>
              {confirmReset ? (
                <div className="inline-flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-[#B91C1C]">
                    Kembalikan semua teks ke bawaan?
                  </span>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleResetDefaults()}
                    className="px-3 py-1.5 rounded-lg bg-[#B91C1C] hover:bg-red-800 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
                  >
                    Ya, Kembalikan
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-1.5 rounded-lg border border-[#D4E4D8] bg-white text-xs font-semibold text-[#456051] cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#EAF3EC] text-xs font-semibold text-[#0F2419] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#146C43]" />
                  <span>Kembalikan Teks Bawaan</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-[#D4E4D8] bg-white text-xs font-semibold text-[#456051] hover:text-[#0F2419] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
              >
                {saving ? 'Menyimpan...' : 'Simpan Semua Teks'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
