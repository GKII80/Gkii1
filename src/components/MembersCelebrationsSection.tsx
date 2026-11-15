import React, { useMemo, useState } from 'react';
import {
  Cake,
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  Heart,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  AgeCategory,
  BaptismStatus,
  FamilyRelationship,
  LiveNotification,
  Member,
  OrganPelayanan,
  SiteTextContent,
} from '../types';
import {
  calculateTurningAge,
  daysUntilNextOccurrence,
  formatIndonesianDate,
  toWhatsAppUrl,
} from '../lib/dateAndFormat';
import {
  exportMembersToCsv,
  exportMembersToExcel,
} from '../lib/membersExport';
import { DEFAULT_SITE_CONTENT } from '../lib/siteContentDefaults';

interface MembersCelebrationsSectionProps {
  members: Member[];
  siteContent?: SiteTextContent;
  notifications: LiveNotification[];
  now: Date;
  canEditAdmin: boolean;
  onAddMember: (member: Omit<Member, 'id'>) => Promise<void>;
  onUpdateMember: (id: string, member: Omit<Member, 'id'>) => Promise<void>;
  onDeleteMember: (id: string) => Promise<void>;
}

const ORGANS: OrganPelayanan[] = [
  'Perkaria',
  'Perkawan',
  'Sekolah Minggu',
  'Remaja',
  'Pemuda',
  'Lansia',
];

const ORGAN_LABELS: Record<OrganPelayanan, string> = {
  Perkaria: 'Kaum Pria (Perkaria)',
  Perkawan: 'Kaum Wanita (Perkawan)',
  'Sekolah Minggu': 'Sekolah Minggu (Anak)',
  Remaja: 'Persekutuan Remaja',
  Pemuda: 'Persekutuan Pemuda',
  Lansia: 'Lanjut Usia (Lansia)',
};

const AGE_CATEGORIES: AgeCategory[] = [
  'Anak (0-12)',
  'Remaja (13-17)',
  'Pemuda (18-30)',
  'Dewasa (31-59)',
  'Lansia (60+)',
];

const SECTORS = [
  'Sektor I - Hilir',
  'Sektor II - Tengah',
  'Sektor III - Hulu',
  'Sektor IV - Sungai Barang',
];

const FAMILY_RELATIONSHIPS: FamilyRelationship[] = [
  'Kepala Keluarga',
  'Istri',
  'Anak',
  'Orang Tua',
  'Famili Lain',
];

const BAPTISM_STATUSES: BaptismStatus[] = ['Sudah Baptis', 'Belum Baptis'];

const MONTHS_ID = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

function inferAgeCategoryFromBirthYear(yearStr: string): AgeCategory {
  const yr = Number(yearStr);
  if (Number.isNaN(yr)) return 'Dewasa (31-59)';
  const age = new Date().getFullYear() - yr;
  if (age <= 12) return 'Anak (0-12)';
  if (age <= 17) return 'Remaja (13-17)';
  if (age <= 30) return 'Pemuda (18-30)';
  if (age <= 59) return 'Dewasa (31-59)';
  return 'Lansia (60+)';
}

function clampDayForMonthYear(day: number, month: number, year: number): number {
  const maxDay = new Date(year, month, 0).getDate();
  return Math.min(Math.max(1, day), maxDay || 31);
}

function parseBirthParts(ymd: string) {
  const [y = '1990', m = '01', d = '01'] = (ymd || '1990-01-01').split('-');
  return {
    birthYear: y,
    birthMonth: m.padStart(2, '0'),
    birthDay: d.padStart(2, '0'),
  };
}

export const MembersCelebrationsSection: React.FC<MembersCelebrationsSectionProps> = ({
  members,
  siteContent,
  notifications,
  now,
  canEditAdmin,
  onAddMember,
  onUpdateMember,
  onDeleteMember,
}) => {
  const [search, setSearch] = useState('');
  const [organFilter, setOrganFilter] = useState('Semua');
  const [baptismFilter, setBaptismFilter] = useState<'Semua' | BaptismStatus>('Semua');
  const [marriageFilter, setMarriageFilter] = useState<'Semua' | 'Sudah Menikah' | 'Belum Menikah'>('Semua');
  const [celebrationScope, setCelebrationScope] = useState<'minggu' | 'bulan'>('minggu');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

  const currentYear = now.getFullYear();
  const yearsList = useMemo(() => {
    const arr: string[] = [];
    for (let y = currentYear; y >= 1925; y--) {
      arr.push(String(y));
    }
    return arr;
  }, [currentYear]);

  const emptyForm = () => ({
    fullName: '',
    gender: 'L' as 'L' | 'P',
    noKk: '',
    noNik: '',
    birthPlace: 'Sungai Barang',
    birthDay: '01',
    birthMonth: '01',
    birthYear: '1990',
    familyRelationship: 'Kepala Keluarga' as FamilyRelationship,
    weddingDate: '',
    spouseName: '',
    baptismStatus: 'Belum Baptis' as BaptismStatus,
    phone: '',
    sector: 'Sektor I - Hilir',
    organ: 'Perkaria' as OrganPelayanan,
    ageCategory: 'Dewasa (31-59)' as AgeCategory,
    status: 'Aktif' as 'Aktif' | 'Simpatisan',
    joinedYear: currentYear,
  });

  const [form, setForm] = useState(emptyForm);

  const daysInSelectedMonth = useMemo(() => {
    const m = Number(form.birthMonth) || 1;
    const y = Number(form.birthYear) || 1990;
    return new Date(y, m, 0).getDate();
  }, [form.birthMonth, form.birthYear]);

  const celebrationList = useMemo(() => {
    const maxDays = celebrationScope === 'minggu' ? 7 : 31;
    const list: {
      key: string;
      kind: 'Kelahiran' | 'Pernikahan';
      name: string;
      daysLeft: number;
      milestone: number;
      dateText: string;
      sector: string;
      phone: string;
      greeting: string;
    }[] = [];

    for (const m of members) {
      const bDays = daysUntilNextOccurrence(m.birthDate, now);
      if (bDays !== null && bDays <= maxDays) {
        const age = calculateTurningAge(m.birthDate, now);
        list.push({
          key: `b-${m.id}`,
          kind: 'Kelahiran',
          name: m.fullName,
          daysLeft: bDays,
          milestone: age,
          dateText: formatIndonesianDate(m.birthDate),
          sector: m.sector,
          phone: m.phone,
          greeting: `Shalom ${m.fullName}, selamat ulang tahun kelahiran ke-${age}! Kiranya kasih karunia Tuhan Yesus menyertai di usia baru ini. Salam kasih dari GKII Jemaat Sungai Barang.`,
        });
      }

      if (m.weddingDate) {
        const wDays = daysUntilNextOccurrence(m.weddingDate, now);
        if (wDays !== null && wDays <= maxDays) {
          const years = calculateTurningAge(m.weddingDate, now);
          const couple = m.spouseName ? `${m.fullName} & ${m.spouseName}` : m.fullName;
          list.push({
            key: `w-${m.id}`,
            kind: 'Pernikahan',
            name: couple,
            daysLeft: wDays,
            milestone: years,
            dateText: formatIndonesianDate(m.weddingDate),
            sector: m.sector,
            phone: m.phone,
            greeting: `Shalom ${couple}, selamat ulang tahun pernikahan ke-${years}! Tuhan Yesus kiranya senantiasa memberkati dan meneguhkan rumah tangga saudara. Salam hangat dari GKII Jemaat Sungai Barang.`,
          });
        }
      }
    }

    return list.sort((a, b) => a.daysLeft - b.daysLeft);
  }, [members, celebrationScope, now]);

  const organCounts = useMemo(() => {
    const counts: Record<OrganPelayanan, number> = {
      Perkaria: 0,
      Perkawan: 0,
      'Sekolah Minggu': 0,
      Remaja: 0,
      Pemuda: 0,
      Lansia: 0,
    };
    for (const m of members) {
      if (m.organ in counts) {
        counts[m.organ] += 1;
      } else if ((m.organ as string) === 'Pemuda & Remaja') {
        if (m.ageCategory === 'Remaja (13-17)') counts.Remaja += 1;
        else counts.Pemuda += 1;
      }
    }
    return counts;
  }, [members]);

  const statusCounts = useMemo(() => {
    let baptized = 0;
    let unbaptized = 0;
    let married = 0;
    let unmarried = 0;
    for (const m of members) {
      if ((m.baptismStatus || 'Belum Baptis') === 'Sudah Baptis') baptized += 1;
      else unbaptized += 1;
      if (m.weddingDate) married += 1;
      else unmarried += 1;
    }
    return { baptized, unbaptized, married, unmarried };
  }, [members]);

  const filteredMembers = useMemo(() => {
    const q = search.toLowerCase();
    return members.filter((m) => {
      const matchOrgan = organFilter === 'Semua' || m.organ === organFilter;
      const matchBaptism =
        baptismFilter === 'Semua' || (m.baptismStatus || 'Belum Baptis') === baptismFilter;
      const isMarried = Boolean(m.weddingDate);
      const matchMarriage =
        marriageFilter === 'Semua' ||
        (marriageFilter === 'Sudah Menikah' ? isMarried : !isMarried);
      const matchSearch =
        !q ||
        m.fullName.toLowerCase().includes(q) ||
        (m.noKk || '').toLowerCase().includes(q) ||
        (m.noNik || '').toLowerCase().includes(q) ||
        (m.birthPlace || '').toLowerCase().includes(q) ||
        (m.familyRelationship || '').toLowerCase().includes(q) ||
        m.sector.toLowerCase().includes(q) ||
        m.phone.includes(q);
      return matchOrgan && matchBaptism && matchMarriage && matchSearch;
    });
  }, [members, organFilter, baptismFilter, marriageFilter, search]);

  const todayAlerts = notifications.filter(
    (n) => (n.type === 'birthday' || n.type === 'anniversary') && n.urgency === 'today'
  );

  const handleCopyGreeting = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(key);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleBirthPartChange = (part: 'day' | 'month' | 'year', value: string) => {
    setForm((prev) => {
      const nextYear = part === 'year' ? value : prev.birthYear;
      const nextMonth = part === 'month' ? value : prev.birthMonth;
      const rawDay = Number(part === 'day' ? value : prev.birthDay);
      const clampedDay = clampDayForMonthYear(
        rawDay,
        Number(nextMonth) || 1,
        Number(nextYear) || 1990
      );
      return {
        ...prev,
        birthYear: nextYear,
        birthMonth: nextMonth,
        birthDay: String(clampedDay).padStart(2, '0'),
        ageCategory: part === 'year' ? inferAgeCategoryFromBirthYear(nextYear) : prev.ageCategory,
      };
    });
  };

  const handleStartEdit = (m: Member) => {
    const parts = parseBirthParts(m.birthDate);
    setEditingMemberId(m.id);
    setForm({
      fullName: m.fullName,
      gender: m.gender,
      noKk: m.noKk || '',
      noNik: m.noNik || '',
      birthPlace: m.birthPlace || '',
      birthDay: parts.birthDay,
      birthMonth: parts.birthMonth,
      birthYear: parts.birthYear,
      familyRelationship: m.familyRelationship || 'Kepala Keluarga',
      weddingDate: m.weddingDate || '',
      spouseName: m.spouseName || '',
      baptismStatus: m.baptismStatus || 'Belum Baptis',
      phone: m.phone,
      sector: m.sector,
      organ: m.organ,
      ageCategory: m.ageCategory,
      status: m.status,
      joinedYear: m.joinedYear,
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    const composedBirthDate = `${form.birthYear}-${form.birthMonth.padStart(2, '0')}-${form.birthDay.padStart(2, '0')}`;
    const payload: Omit<Member, 'id'> = {
      fullName: form.fullName.trim(),
      gender: form.gender,
      noKk: form.noKk.trim(),
      noNik: form.noNik.trim(),
      birthPlace: form.birthPlace.trim(),
      birthDate: composedBirthDate,
      familyRelationship: form.familyRelationship,
      weddingDate: form.weddingDate || null,
      spouseName: form.spouseName.trim() || null,
      baptismStatus: form.baptismStatus,
      phone: form.phone.trim(),
      sector: form.sector,
      organ: form.organ,
      ageCategory: form.ageCategory,
      status: form.status,
      joinedYear: Number(form.joinedYear) || currentYear,
    };

    if (editingMemberId) {
      await onUpdateMember(editingMemberId, payload);
    } else {
      await onAddMember(payload);
    }
    setForm(emptyForm());
    setEditingMemberId(null);
    setShowForm(false);
  };

  const activeFilterLabel = useMemo(() => {
    const parts: string[] = [];
    if (organFilter !== 'Semua') parts.push(organFilter);
    if (baptismFilter !== 'Semua') parts.push(baptismFilter);
    if (marriageFilter !== 'Semua') parts.push(marriageFilter);
    if (search.trim()) parts.push(`Cari-${search.trim()}`);
    return parts.length > 0 ? parts.join(' · ') : 'Semua';
  }, [organFilter, baptismFilter, marriageFilter, search]);

  const isFiltered = filteredMembers.length !== members.length;

  const handleExportCsv = () => {
    if (filteredMembers.length === 0) return;
    exportMembersToCsv(filteredMembers, activeFilterLabel);
    setExportNotice(
      `Berkas CSV (${filteredMembers.length} data jemaat) berhasil diunduh.`
    );
    setTimeout(() => setExportNotice(null), 4000);
  };

  const handleExportExcel = () => {
    if (filteredMembers.length === 0) return;
    exportMembersToExcel(filteredMembers, activeFilterLabel);
    setExportNotice(
      `Berkas Excel .xlsx (${filteredMembers.length} data jemaat + Ringkasan Statistik) berhasil diunduh.`
    );
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2419]">
            {siteContent?.sections.jemaatTitle ||
              DEFAULT_SITE_CONTENT.sections.jemaatTitle}
          </h1>
          <p className="text-sm text-[#456051] mt-1">
            {siteContent?.sections.jemaatSubtitle ||
              DEFAULT_SITE_CONTENT.sections.jemaatSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={filteredMembers.length === 0}
            onClick={handleExportCsv}
            title="Unduh data jemaat dalam format CSV"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#EAF3EC] disabled:opacity-50 text-[#0F2419] text-sm font-semibold whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#146C43]" />
            <span>Ekspor CSV ({filteredMembers.length})</span>
          </button>

          <button
            type="button"
            disabled={filteredMembers.length === 0}
            onClick={handleExportExcel}
            title="Unduh data jemaat dalam format Excel (.xlsx)"
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-[#146C43] bg-[#EAF3EC] hover:bg-[#D8ECDF] disabled:opacity-50 text-[#0F5132] text-sm font-semibold whitespace-nowrap cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#146C43]" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          {canEditAdmin && (
            <button
              type="button"
              onClick={() => {
                if (showForm && editingMemberId) {
                  setEditingMemberId(null);
                  setForm(emptyForm());
                } else {
                  setEditingMemberId(null);
                  setForm(emptyForm());
                  setShowForm((v) => !v);
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Data Jemaat</span>
            </button>
          )}
        </div>
      </div>

      {exportNotice && (
        <div className="rounded-xl border border-[#BFE0C9] bg-[#EAF3EC] px-4 py-3 flex items-center justify-between gap-3 text-xs font-semibold text-[#0F5132]">
          <span>{exportNotice}</span>
          <button
            type="button"
            onClick={() => setExportNotice(null)}
            className="text-[#146C43] hover:underline cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Rekapitulasi Jumlah Jemaat per Organ Pelayanan */}
      <section className="rounded-2xl border border-[#D4E4D8] bg-white p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-[#0F2419]">
              Jumlah Jemaat Berdasarkan Organ Pelayanan
            </h2>
            <p className="text-xs text-[#456051]">
              Klik salah satu organ di bawah untuk menyaring daftar jemaat pada buku induk.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums font-semibold text-[#146C43]">
            Total Terdata: {members.length} Jiwa
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ORGANS.map((organ) => {
            const count = organCounts[organ] || 0;
            const pct = members.length > 0 ? Math.round((count / members.length) * 100) : 0;
            const isSelected = organFilter === organ;
            return (
              <button
                key={organ}
                type="button"
                onClick={() => setOrganFilter(isSelected ? 'Semua' : organ)}
                className={`text-left rounded-xl border p-3.5 transition-colors cursor-pointer ${
                  isSelected
                    ? 'border-[#146C43] bg-[#EAF3EC]'
                    : 'border-[#D4E4D8] bg-[#F5F9F6] hover:border-[#146C43]'
                }`}
              >
                <p className="text-xs font-semibold text-[#146C43] truncate">{organ}</p>
                <p className="text-2xl font-bold text-[#0F2419] font-mono tabular-nums mt-1">
                  {count} <span className="text-xs font-normal text-[#456051]">Jiwa</span>
                </p>
                <p className="text-[11px] text-[#456051] mt-0.5 truncate">
                  {ORGAN_LABELS[organ]} · {pct}%
                </p>
              </button>
            );
          })}
        </div>

        {/* Status Baptisan & Status Pernikahan Summary */}
        <div className="pt-4 border-t border-[#E6EFE8] grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#456051]">
              Status Baptisan Anggota Jemaat
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setBaptismFilter(
                    baptismFilter === 'Sudah Baptis' ? 'Semua' : 'Sudah Baptis'
                  )
                }
                className={`text-left rounded-xl border p-3.5 transition-colors cursor-pointer ${
                  baptismFilter === 'Sudah Baptis'
                    ? 'border-[#146C43] bg-[#EAF3EC]'
                    : 'border-[#D4E4D8] bg-[#F5F9F6] hover:border-[#146C43]'
                }`}
              >
                <p className="text-xs font-semibold text-[#146C43]">Sudah Baptis</p>
                <p className="text-2xl font-bold text-[#0F2419] font-mono tabular-nums mt-1">
                  {statusCounts.baptized}{' '}
                  <span className="text-xs font-normal text-[#456051]">Jiwa</span>
                </p>
                <p className="text-[11px] text-[#456051] mt-0.5 tabular-nums">
                  {members.length > 0
                    ? Math.round((statusCounts.baptized / members.length) * 100)
                    : 0}
                  % dari total jemaat terdata
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setBaptismFilter(
                    baptismFilter === 'Belum Baptis' ? 'Semua' : 'Belum Baptis'
                  )
                }
                className={`text-left rounded-xl border p-3.5 transition-colors cursor-pointer ${
                  baptismFilter === 'Belum Baptis'
                    ? 'border-[#B45309] bg-amber-50'
                    : 'border-[#D4E4D8] bg-[#F5F9F6] hover:border-[#B45309]'
                }`}
              >
                <p className="text-xs font-semibold text-[#B45309]">Belum Baptis</p>
                <p className="text-2xl font-bold text-[#0F2419] font-mono tabular-nums mt-1">
                  {statusCounts.unbaptized}{' '}
                  <span className="text-xs font-normal text-[#456051]">Jiwa</span>
                </p>
                <p className="text-[11px] text-[#456051] mt-0.5 tabular-nums">
                  {members.length > 0
                    ? Math.round((statusCounts.unbaptized / members.length) * 100)
                    : 0}
                  % dari total jemaat terdata
                </p>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#456051]">
              Status Pernikahan Anggota Jemaat
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setMarriageFilter(
                    marriageFilter === 'Sudah Menikah' ? 'Semua' : 'Sudah Menikah'
                  )
                }
                className={`text-left rounded-xl border p-3.5 transition-colors cursor-pointer ${
                  marriageFilter === 'Sudah Menikah'
                    ? 'border-[#146C43] bg-[#EAF3EC]'
                    : 'border-[#D4E4D8] bg-[#F5F9F6] hover:border-[#146C43]'
                }`}
              >
                <p className="text-xs font-semibold text-[#146C43]">Sudah Menikah</p>
                <p className="text-2xl font-bold text-[#0F2419] font-mono tabular-nums mt-1">
                  {statusCounts.married}{' '}
                  <span className="text-xs font-normal text-[#456051]">Jiwa</span>
                </p>
                <p className="text-[11px] text-[#456051] mt-0.5 tabular-nums">
                  {members.length > 0
                    ? Math.round((statusCounts.married / members.length) * 100)
                    : 0}
                  % memiliki tanggal nikah
                </p>
              </button>

              <button
                type="button"
                onClick={() =>
                  setMarriageFilter(
                    marriageFilter === 'Belum Menikah' ? 'Semua' : 'Belum Menikah'
                  )
                }
                className={`text-left rounded-xl border p-3.5 transition-colors cursor-pointer ${
                  marriageFilter === 'Belum Menikah'
                    ? 'border-[#146C43] bg-[#EAF3EC]'
                    : 'border-[#D4E4D8] bg-[#F5F9F6] hover:border-[#146C43]'
                }`}
              >
                <p className="text-xs font-semibold text-[#456051]">Belum Menikah</p>
                <p className="text-2xl font-bold text-[#0F2419] font-mono tabular-nums mt-1">
                  {statusCounts.unmarried}{' '}
                  <span className="text-xs font-normal text-[#456051]">Jiwa</span>
                </p>
                <p className="text-[11px] text-[#456051] mt-0.5 tabular-nums">
                  {members.length > 0
                    ? Math.round((statusCounts.unmarried / members.length) * 100)
                    : 0}
                  % belum menikah / lajang
                </p>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time Today Celebration Banner */}
      {todayAlerts.length > 0 && (
        <section className="rounded-2xl border border-[#BFE0C9] bg-[#EAF3EC] p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <p className="text-sm font-bold text-[#0F2419]">
              Notifikasi Otomatis Langsung: {todayAlerts.length} Perayaan Hari Ini
            </p>
            <span className="text-xs font-mono tabular-nums text-[#146C43]">
              Diperbarui otomatis: {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayAlerts.map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl bg-white border border-[#D4E4D8] p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#B45309]">
                    {alert.type === 'birthday' ? 'HUT Kelahiran' : 'HUT Pernikahan'} · Hari Ini
                  </p>
                  <p className="text-sm font-bold text-[#0F2419] truncate">{alert.targetName}</p>
                  <p className="text-xs text-[#456051]">{alert.message}</p>
                </div>
                {alert.whatsappText && (
                  <a
                    href={toWhatsAppUrl(alert.phone, alert.whatsappText)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold whitespace-nowrap shrink-0"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Ucapkan</span>
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Add / Edit Member Form */}
      {canEditAdmin && showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#BFE0C9] bg-white p-6 space-y-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-[#0F2419]">
              {editingMemberId ? 'Ubah Data Anggota Jemaat' : 'Tambah Anggota Jemaat Baru'}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Nama Lengkap</span>
              <input
                required
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Contoh: Bpk. Markus Lawai"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Nomor Kartu Keluarga (No. KK)</span>
              <input
                required
                type="text"
                inputMode="numeric"
                value={form.noKk}
                onChange={(e) => setForm({ ...form, noKk: e.target.value.replace(/\D/g, '') })}
                placeholder="16 digit No. KK"
                maxLength={16}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] font-mono tabular-nums text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Nomor Induk Kependudukan (No. NIK)</span>
              <input
                required
                type="text"
                inputMode="numeric"
                value={form.noNik}
                onChange={(e) => setForm({ ...form, noNik: e.target.value.replace(/\D/g, '') })}
                placeholder="16 digit No. NIK"
                maxLength={16}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] font-mono tabular-nums text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Tempat Lahir</span>
              <input
                required
                type="text"
                value={form.birthPlace}
                onChange={(e) => setForm({ ...form, birthPlace: e.target.value })}
                placeholder="Contoh: Sungai Barang"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>

            <div className="space-y-1.5 text-sm lg:col-span-2">
              <span className="block font-medium text-[#0F2419]">
                Tanggal, Bulan, dan Tahun Lahir
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                <select
                  aria-label="Tanggal lahir"
                  value={form.birthDay}
                  onChange={(e) => handleBirthPartChange('day', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#D4E4D8] bg-white font-mono tabular-nums text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                >
                  {Array.from({ length: daysInSelectedMonth }, (_, i) =>
                    String(i + 1).padStart(2, '0')
                  ).map((d) => (
                    <option key={d} value={d}>
                      Tgl {d}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Bulan lahir"
                  value={form.birthMonth}
                  onChange={(e) => handleBirthPartChange('month', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                >
                  {MONTHS_ID.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Tahun lahir"
                  value={form.birthYear}
                  onChange={(e) => handleBirthPartChange('year', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-[#D4E4D8] bg-white font-mono tabular-nums text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                >
                  {yearsList.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Hubungan dalam Keluarga</span>
              <select
                value={form.familyRelationship}
                onChange={(e) =>
                  setForm({ ...form, familyRelationship: e.target.value as FamilyRelationship })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              >
                {FAMILY_RELATIONSHIPS.map((rel) => (
                  <option key={rel} value={rel}>
                    {rel}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Status Baptisan</span>
              <select
                value={form.baptismStatus}
                onChange={(e) =>
                  setForm({ ...form, baptismStatus: e.target.value as BaptismStatus })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              >
                {BAPTISM_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Jenis Kelamin</span>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value as 'L' | 'P' })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </label>

            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Tanggal Nikah (Opsional)</span>
              <input
                type="date"
                value={form.weddingDate}
                onChange={(e) => setForm({ ...form, weddingDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] font-mono text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Nama Pasangan (Opsional)</span>
              <input
                type="text"
                value={form.spouseName}
                onChange={(e) => setForm({ ...form, spouseName: e.target.value })}
                placeholder="Nama suami / istri"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Nomor WhatsApp / Telepon</span>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0812..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] font-mono text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Organ Pelayanan</span>
              <select
                value={form.organ}
                onChange={(e) => setForm({ ...form, organ: e.target.value as OrganPelayanan })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              >
                {ORGANS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Kategori Usia</span>
              <select
                value={form.ageCategory}
                onChange={(e) =>
                  setForm({ ...form, ageCategory: e.target.value as AgeCategory })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              >
                {AGE_CATEGORIES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Sektor / Rayon</span>
              <select
                value={form.sector}
                onChange={(e) => setForm({ ...form, sector: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              >
                {SECTORS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold cursor-pointer"
            >
              {editingMemberId ? 'Simpan Perubahan Data' : 'Simpan Data Jemaat'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingMemberId(null);
                setForm(emptyForm());
                setShowForm(false);
              }}
              className="px-5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#456051] text-sm font-medium cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Celebrations Section (7 Hari / 31 Hari) */}
      <section className="rounded-2xl border border-[#D4E4D8] bg-white p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0F2419]">
              Jadwal Ulang Tahun Kelahiran & Pernikahan
            </h2>
            <p className="text-xs text-[#456051]">
              Anggota jemaat yang merayakan hari spesial dalam rentang waktu terdekat.
            </p>
          </div>
          <div className="inline-flex p-1 rounded-lg bg-[#EAF3EC] border border-[#D4E4D8] self-start">
            <button
              type="button"
              onClick={() => setCelebrationScope('minggu')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                celebrationScope === 'minggu'
                  ? 'bg-white text-[#0F2419] shadow-xs'
                  : 'text-[#456051]'
              }`}
            >
              7 Hari ke Depan
            </button>
            <button
              type="button"
              onClick={() => setCelebrationScope('bulan')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                celebrationScope === 'bulan'
                  ? 'bg-white text-[#0F2419] shadow-xs'
                  : 'text-[#456051]'
              }`}
            >
              31 Hari ke Depan
            </button>
          </div>
        </div>

        {celebrationList.length === 0 ? (
          <p className="text-sm text-[#456051] py-4">
            Belum ada jadwal ulang tahun atau pernikahan pada rentang waktu ini.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {celebrationList.map((c) => (
              <div
                key={c.key}
                className="rounded-xl border border-[#D4E4D8] bg-[#F5F9F6] p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      {c.kind === 'Kelahiran' ? (
                        <Cake className="w-3.5 h-3.5 text-[#146C43]" />
                      ) : (
                        <Heart className="w-3.5 h-3.5 text-[#B45309]" />
                      )}
                      <span className="font-semibold text-[#146C43]">
                        HUT {c.kind} ke-{c.milestone}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-[#0F2419] font-semibold">
                        {c.daysLeft === 0 ? 'Hari Ini' : `${c.daysLeft} hari lagi`}
                      </span>
                    </div>
                    <p className="text-base font-bold text-[#0F2419]">{c.name}</p>
                    <p className="text-xs text-[#456051]">
                      {c.sector} · Tanggal: {c.dateText}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={toWhatsAppUrl(c.phone, c.greeting)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Kirim via WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleCopyGreeting(c.key, c.greeting)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#EAF3EC] text-[#0F2419] text-xs font-semibold cursor-pointer"
                  >
                    {copiedId === c.key ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#146C43]" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#146C43]" />
                        <span>Salin Ucapan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Member Directory Table */}
      <section className="rounded-2xl border border-[#D4E4D8] bg-white overflow-hidden">
        <div className="p-5 border-b border-[#E6EFE8] flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {['Semua', ...ORGANS].map((org) => (
                <button
                  key={org}
                  type="button"
                  onClick={() => setOrganFilter(org)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    organFilter === org
                      ? 'bg-[#146C43] text-white'
                      : 'bg-[#F5F9F6] border border-[#D4E4D8] text-[#456051] hover:text-[#0F2419]'
                  }`}
                >
                  {org}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
              <select
                aria-label="Saring status baptisan"
                value={baptismFilter}
                onChange={(e) =>
                  setBaptismFilter(e.target.value as 'Semua' | BaptismStatus)
                }
                className="px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-xs font-medium text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              >
                <option value="Semua">Semua Status Baptis</option>
                <option value="Sudah Baptis">Sudah Baptis</option>
                <option value="Belum Baptis">Belum Baptis</option>
              </select>

              <select
                aria-label="Saring status pernikahan"
                value={marriageFilter}
                onChange={(e) =>
                  setMarriageFilter(
                    e.target.value as 'Semua' | 'Sudah Menikah' | 'Belum Menikah'
                  )
                }
                className="px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-xs font-medium text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              >
                <option value="Semua">Semua Status Pernikahan</option>
                <option value="Sudah Menikah">Sudah Menikah</option>
                <option value="Belum Menikah">Belum Menikah</option>
              </select>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-[#456051] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama, NIK, No. KK, tempat lahir..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D4E4D8] text-xs text-[#0F2419] placeholder:text-[#6B8576] focus:outline-none focus:border-[#146C43]"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E6EFE8] text-xs text-[#456051]">
            <span className="tabular-nums">
              Menampilkan <strong className="text-[#0F2419]">{filteredMembers.length}</strong> dari{' '}
              <strong className="text-[#0F2419]">{members.length}</strong> anggota jemaat
              {isFiltered ? ` (Penyaringan aktif: ${activeFilterLabel})` : ''}
            </span>
            {isFiltered && (
              <button
                type="button"
                onClick={() => {
                  setOrganFilter('Semua');
                  setBaptismFilter('Semua');
                  setMarriageFilter('Semua');
                  setSearch('');
                }}
                className="font-semibold text-[#146C43] hover:underline cursor-pointer"
              >
                Atur Ulang Penyaringan
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E6EFE8] bg-[#F5F9F6] text-xs font-semibold text-[#456051]">
                <th className="py-3 px-4">Nama & Hubungan Keluarga</th>
                <th className="py-3 px-4 whitespace-nowrap">No. KK & No. NIK</th>
                <th className="py-3 px-4">Tempat & Tgl/Bln/Thn Lahir</th>
                <th className="py-3 px-4">Status Baptis & Organ</th>
                <th className="py-3 px-4 whitespace-nowrap">Tanggal Nikah</th>
                <th className="py-3 px-4">Sektor & Kontak</th>
                {canEditAdmin && <th className="py-3 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EFE8] text-sm">
              {filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-[#F5F9F6]/70 align-top">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-[#0F2419]">{m.fullName}</p>
                    <p className="text-xs text-[#146C43] font-medium mt-0.5">
                      {m.familyRelationship || 'Kepala Keluarga'}
                    </p>
                    <p className="text-xs text-[#456051]">
                      {m.gender === 'L' ? 'Laki-laki' : 'Perempuan'} · {m.status} ({m.joinedYear})
                    </p>
                  </td>
                  <td className="py-3 px-4 text-xs text-[#456051] whitespace-nowrap">
                    <p>
                      KK:{' '}
                      <span className="font-mono tabular-nums text-[#0F2419] font-medium">
                        {m.noKk || '—'}
                      </span>
                    </p>
                    <p className="mt-0.5">
                      NIK:{' '}
                      <span className="font-mono tabular-nums text-[#0F2419] font-medium">
                        {m.noNik || '—'}
                      </span>
                    </p>
                  </td>
                  <td className="py-3 px-4 text-xs text-[#456051]">
                    <p className="font-medium text-[#0F2419]">{m.birthPlace || '—'}</p>
                    <p className="font-mono tabular-nums mt-0.5">
                      {formatIndonesianDate(m.birthDate)}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-xs">
                    <p
                      className={`font-semibold ${
                        m.baptismStatus === 'Sudah Baptis'
                          ? 'text-[#146C43]'
                          : 'text-[#B45309]'
                      }`}
                    >
                      {m.baptismStatus || 'Belum Baptis'}
                    </p>
                    <p className="text-[#0F2419] font-medium mt-0.5">{m.organ}</p>
                    <p className="text-[#456051]">{m.ageCategory}</p>
                  </td>
                  <td className="py-3 px-4 text-xs text-[#456051] whitespace-nowrap">
                    {m.weddingDate ? (
                      <div>
                        <p className="font-mono text-[#0F2419] tabular-nums">
                          {formatIndonesianDate(m.weddingDate)}
                        </p>
                        {m.spouseName && (
                          <p className="whitespace-normal max-w-[170px] mt-0.5">
                            Pasangan: {m.spouseName}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span>Belum Menikah</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-[#456051]">
                    <p className="font-medium text-[#0F2419]">{m.sector}</p>
                    <p className="font-mono tabular-nums mt-0.5">{m.phone}</p>
                  </td>
                  {canEditAdmin && (
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(m)}
                          title="Ubah data jemaat"
                          className="p-1.5 rounded-lg text-[#6B8576] hover:text-[#146C43] hover:bg-[#EAF3EC] transition-colors cursor-pointer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteMember(m.id)}
                          title="Hapus data jemaat"
                          className="p-1.5 rounded-lg text-[#6B8576] hover:text-[#B91C1C] hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
