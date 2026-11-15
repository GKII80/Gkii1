import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarRange,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  KeyRound,
  Lock,
  LogOut,
  Pencil,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { AuthUser, LedgerCategory, LedgerEntry, SiteTextContent } from '../types';
import { formatIndonesianDate, formatRupiah, formatShortDate } from '../lib/dateAndFormat';
import {
  generateFinancialReportPdf,
  ReportPrintScope,
} from '../lib/financialReportPdf';
import { DEFAULT_SITE_CONTENT } from '../lib/siteContentDefaults';
import { GkiiLogo } from './GkiiLogo';

interface TreasuryLedgerSectionProps {
  ledger: LedgerEntry[];
  siteContent?: SiteTextContent;
  authUser: AuthUser | null;
  canEditFinance: boolean;
  logoUrl?: string;
  onOpenLogin: () => void;
  onOpenChangePassword: () => void;
  onLogout: () => void;
  onAddEntry: (entry: Omit<LedgerEntry, 'id'>) => Promise<void>;
  onUpdateEntry: (id: string, entry: Omit<LedgerEntry, 'id'>) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
}

const CATEGORIES: LedgerCategory[] = [
  'Persepuluhan',
  'Persembahan Ibadah',
  'Persembahan Kantong Biru',
  'Persembahan Kantong Merah',
  'Persembahan Ibadah Sore',
  'Ucapan Syukur',
  'Diakonia',
  'Operasional Gereja',
  'Pembangunan',
  'Misi & Penginjilan',
];

const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const MONTH_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agt',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export const TreasuryLedgerSection: React.FC<TreasuryLedgerSectionProps> = ({
  ledger,
  siteContent,
  authUser,
  canEditFinance,
  logoUrl,
  onOpenLogin,
  onOpenChangePassword,
  onLogout,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
}) => {
  const [typeFilter, setTypeFilter] = useState<'semua' | 'masuk' | 'keluar'>('semua');
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');
  const [yearFilter, setYearFilter] = useState<string>('Semua');
  const [monthFilter, setMonthFilter] = useState<string>('Semua');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    for (const entry of ledger) {
      if (entry.date && entry.date.length >= 4) {
        set.add(entry.date.slice(0, 4));
      }
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [ledger]);

  const currentYear = String(new Date().getFullYear());
  const currentMonthKey = `${currentYear}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [reportTab, setReportTab] = useState<'bulanan' | 'tahunan'>('bulanan');
  const [reportYear, setReportYear] = useState<string>(currentYear);

  const selectedReportYear =
    availableYears.includes(reportYear) ? reportYear : availableYears[0] || currentYear;

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printScope, setPrintScope] = useState<ReportPrintScope>('bulanan');
  const [includeCategories, setIncludeCategories] = useState(true);
  const [signatoryName, setSignatoryName] = useState(
    authUser?.name || 'Ibu Ruth Marbun, S.E.'
  );
  const [signatoryRole, setSignatoryRole] = useState(
    authUser?.role || 'Bendahara Jemaat'
  );
  const [pdfFeedback, setPdfFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (authUser) {
      setSignatoryName(authUser.name);
      setSignatoryRole(authUser.role);
    }
  }, [authUser]);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    voucherNo: `KM-${new Date().getFullYear()}-${String(ledger.length + 105)}`,
    description: '',
    category: 'Persembahan Ibadah' as LedgerCategory,
    type: 'masuk' as 'masuk' | 'keluar',
    amount: '',
    recordedBy: authUser?.name || 'Ruth Marbun',
    donorName: '',
  });

  // Compute running balance chronologically across all entries
  const ledgerWithBalance = useMemo(() => {
    const sorted = [...ledger].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    return sorted.map((entry) => {
      running += entry.type === 'masuk' ? entry.amount : -entry.amount;
      return { ...entry, runningBalance: running };
    });
  }, [ledger]);

  const totalMasuk = useMemo(
    () => ledger.filter((e) => e.type === 'masuk').reduce((acc, e) => acc + e.amount, 0),
    [ledger]
  );

  const totalKeluar = useMemo(
    () => ledger.filter((e) => e.type === 'keluar').reduce((acc, e) => acc + e.amount, 0),
    [ledger]
  );

  const saldoAkhir = totalMasuk - totalKeluar;

  // This month & this year totals
  const currentMonthStats = useMemo(() => {
    const rows = ledger.filter((e) => e.date.startsWith(currentMonthKey));
    const masuk = rows.filter((e) => e.type === 'masuk').reduce((a, b) => a + b.amount, 0);
    const keluar = rows.filter((e) => e.type === 'keluar').reduce((a, b) => a + b.amount, 0);
    return { masuk, keluar, net: masuk - keluar };
  }, [ledger, currentMonthKey]);

  const currentYearStats = useMemo(() => {
    const rows = ledger.filter((e) => e.date.startsWith(currentYear));
    const masuk = rows.filter((e) => e.type === 'masuk').reduce((a, b) => a + b.amount, 0);
    const keluar = rows.filter((e) => e.type === 'keluar').reduce((a, b) => a + b.amount, 0);
    return { masuk, keluar, net: masuk - keluar };
  }, [ledger, currentYear]);

  // Monthly Report (Jan - Dec for selectedReportYear)
  const monthlyReport = useMemo(() => {
    // Opening balance carried from years prior to selectedReportYear
    const priorBalance = ledger
      .filter((e) => e.date.slice(0, 4) < selectedReportYear)
      .reduce((acc, e) => acc + (e.type === 'masuk' ? e.amount : -e.amount), 0);

    let cumulative = priorBalance;
    const rows = MONTH_NAMES_ID.map((monthName, idx) => {
      const mm = String(idx + 1).padStart(2, '0');
      const prefix = `${selectedReportYear}-${mm}`;
      const entries = ledger.filter((e) => e.date.startsWith(prefix));
      const masuk = entries
        .filter((e) => e.type === 'masuk')
        .reduce((a, b) => a + b.amount, 0);
      const keluar = entries
        .filter((e) => e.type === 'keluar')
        .reduce((a, b) => a + b.amount, 0);
      const selisih = masuk - keluar;
      cumulative += selisih;

      return {
        monthIndex: idx,
        monthKey: prefix,
        monthName,
        shortName: MONTH_SHORT_ID[idx],
        count: entries.length,
        masuk,
        keluar,
        selisih,
        closingBalance: cumulative,
      };
    });

    const totalYearMasuk = rows.reduce((a, r) => a + r.masuk, 0);
    const totalYearKeluar = rows.reduce((a, r) => a + r.keluar, 0);
    const totalYearCount = rows.reduce((a, r) => a + r.count, 0);

    return {
      priorBalance,
      rows,
      totalYearMasuk,
      totalYearKeluar,
      totalYearSelisih: totalYearMasuk - totalYearKeluar,
      totalYearCount,
      endBalance: cumulative,
    };
  }, [ledger, selectedReportYear]);

  const maxMonthlyBar = Math.max(
    1,
    ...monthlyReport.rows.map((r) => Math.max(r.masuk, r.keluar))
  );

  // Annual Recap across all recorded years (sorted ascending for cumulative balance)
  const annualRecap = useMemo(() => {
    const yearsAsc = [...availableYears].sort((a, b) => a.localeCompare(b));
    let cumulative = 0;
    const rows = yearsAsc.map((year) => {
      const entries = ledger.filter((e) => e.date.startsWith(year));
      const masuk = entries
        .filter((e) => e.type === 'masuk')
        .reduce((a, b) => a + b.amount, 0);
      const keluar = entries
        .filter((e) => e.type === 'keluar')
        .reduce((a, b) => a + b.amount, 0);
      const selisih = masuk - keluar;
      cumulative += selisih;
      return {
        year,
        count: entries.length,
        masuk,
        keluar,
        selisih,
        closingBalance: cumulative,
      };
    });
    return {
      rows,
      grandMasuk: rows.reduce((a, r) => a + r.masuk, 0),
      grandKeluar: rows.reduce((a, r) => a + r.keluar, 0),
      grandCount: rows.reduce((a, r) => a + r.count, 0),
      grandBalance: cumulative,
    };
  }, [ledger, availableYears]);

  const maxAnnualBar = Math.max(
    1,
    ...annualRecap.rows.map((r) => Math.max(r.masuk, r.keluar))
  );

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    return [...ledgerWithBalance]
      .reverse()
      .filter((row) => {
        const matchType = typeFilter === 'semua' || row.type === typeFilter;
        const matchCat = categoryFilter === 'Semua' || row.category === categoryFilter;
        const matchYear = yearFilter === 'Semua' || row.date.startsWith(yearFilter);
        const matchMonth =
          monthFilter === 'Semua' || row.date.slice(5, 7) === monthFilter;
        const matchSearch =
          !q ||
          row.description.toLowerCase().includes(q) ||
          row.voucherNo.toLowerCase().includes(q) ||
          row.category.toLowerCase().includes(q) ||
          (row.donorName || '').toLowerCase().includes(q);
        return matchType && matchCat && matchYear && matchMonth && matchSearch;
      });
  }, [ledgerWithBalance, typeFilter, categoryFilter, yearFilter, monthFilter, search]);

  const categoryTotals = useMemo(() => {
    const source =
      yearFilter === 'Semua'
        ? ledger
        : ledger.filter((e) => e.date.startsWith(yearFilter));
    return CATEGORIES.map((cat) => {
      const masuk = source
        .filter((e) => e.category === cat && e.type === 'masuk')
        .reduce((a, b) => a + b.amount, 0);
      const keluar = source
        .filter((e) => e.category === cat && e.type === 'keluar')
        .reduce((a, b) => a + b.amount, 0);
      return { category: cat, masuk, keluar };
    }).filter((c) => c.masuk > 0 || c.keluar > 0);
  }, [ledger, yearFilter]);

  const maxCatValue = Math.max(
    1,
    ...categoryTotals.map((c) => Math.max(c.masuk, c.keluar))
  );

  const startCreate = () => {
    if (!canEditFinance || !authUser) {
      onOpenLogin();
      return;
    }
    setEditingId(null);
    setActionError(null);
    setForm({
      date: new Date().toISOString().slice(0, 10),
      voucherNo: `KM-${new Date().getFullYear()}-${ledger.length + 105}`,
      description: '',
      category: 'Persembahan Ibadah',
      type: 'masuk',
      amount: '',
      recordedBy: authUser.name,
      donorName: '',
    });
    setShowForm((v) => !v);
  };

  const startEdit = (row: LedgerEntry) => {
    if (!canEditFinance) {
      onOpenLogin();
      return;
    }
    setEditingId(row.id);
    setActionError(null);
    setForm({
      date: row.date,
      voucherNo: row.voucherNo,
      description: row.description,
      category: row.category,
      type: row.type,
      amount: String(row.amount),
      recordedBy: row.recordedBy,
      donorName: row.donorName || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 180, behavior: 'smooth' });
  };

  const requiresDonorName =
    form.category === 'Persepuluhan' || form.category === 'Ucapan Syukur';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(form.amount);
    if (!form.description.trim() || !numericAmount || numericAmount <= 0) return;
    if (requiresDonorName && !form.donorName.trim()) {
      setActionError(
        `Nama yang memberi wajib diisi untuk kategori ${form.category}.`
      );
      return;
    }
    setActionError(null);
    try {
      const payload: Omit<LedgerEntry, 'id'> = {
        date: form.date,
        voucherNo: form.voucherNo,
        description: form.description,
        category: form.category,
        type: form.type,
        amount: numericAmount,
        recordedBy: form.recordedBy,
        ...(requiresDonorName && form.donorName.trim()
          ? { donorName: form.donorName.trim() }
          : {}),
      };
      if (editingId) {
        await onUpdateEntry(editingId, payload);
      } else {
        await onAddEntry(payload);
      }
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Gagal menyimpan transaksi keuangan.'
      );
    }
  };

  const handleExportCSV = () => {
    const header = [
      'Tanggal',
      'No Bukti',
      'Uraian',
      'Kategori',
      'Nama yang Memberi',
      'Jenis',
      'Nominal',
      'Saldo Berjalan',
      'Pencatat',
    ];
    const rows = ledgerWithBalance.map((r) => [
      r.date,
      r.voucherNo,
      `"${r.description.replace(/"/g, '""')}"`,
      r.category,
      `"${(r.donorName || '').replace(/"/g, '""')}"`,
      r.type === 'masuk' ? 'Pemasukan' : 'Pengeluaran',
      String(r.amount),
      String(r.runningBalance),
      r.recordedBy,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pembukuan-kas-gkii-sungai-barang-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMonthlyRecapCSV = () => {
    const header = [
      'Bulan',
      'Tahun',
      'Jumlah Transaksi',
      'Pemasukan (Rp)',
      'Pengeluaran (Rp)',
      'Surplus/Defisit (Rp)',
      'Saldo Akhir Bulan (Rp)',
    ];
    const rows = monthlyReport.rows.map((r) => [
      r.monthName,
      selectedReportYear,
      String(r.count),
      String(r.masuk),
      String(r.keluar),
      String(r.selisih),
      String(r.closingBalance),
    ]);
    rows.push([
      `TOTAL TAHUN ${selectedReportYear}`,
      selectedReportYear,
      String(monthlyReport.totalYearCount),
      String(monthlyReport.totalYearMasuk),
      String(monthlyReport.totalYearKeluar),
      String(monthlyReport.totalYearSelisih),
      String(monthlyReport.endBalance),
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-kas-bulanan-gkii-${selectedReportYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAnnualRecapCSV = () => {
    const header = [
      'Tahun Buku',
      'Jumlah Transaksi',
      'Total Pemasukan (Rp)',
      'Jumlah Pengeluaran (Rp)',
      'Surplus/Defisit (Rp)',
      'Saldo Kumulatif Akhir (Rp)',
    ];
    const rows = annualRecap.rows.map((r) => [
      r.year,
      String(r.count),
      String(r.masuk),
      String(r.keluar),
      String(r.selisih),
      String(r.closingBalance),
    ]);
    rows.push([
      'TOTAL AKUMULASI',
      String(annualRecap.grandCount),
      String(annualRecap.grandMasuk),
      String(annualRecap.grandKeluar),
      String(annualRecap.grandMasuk - annualRecap.grandKeluar),
      String(annualRecap.grandBalance),
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rekapan-kas-tahunan-gkii-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = (scopeOverride?: ReportPrintScope) => {
    const activeScope = scopeOverride || printScope;
    const printedByLabel = authUser
      ? `${authUser.name} (${authUser.role})`
      : `${signatoryName} (${signatoryRole})`;

    generateFinancialReportPdf({
      scope: activeScope,
      selectedYear: selectedReportYear,
      monthlyReport,
      annualRecap,
      categoryTotals,
      includeCategories,
      signatoryName: signatoryName.trim() || 'Ibu Ruth Marbun, S.E.',
      signatoryRole: signatoryRole.trim() || 'Bendahara Jemaat',
      printedByLabel,
      currentBalance: saldoAkhir,
    });

    setPdfFeedback(
      activeScope === 'bulanan'
        ? `PDF Laporan Kas Bulanan ${selectedReportYear} berhasil diunduh.`
        : activeScope === 'tahunan'
          ? 'PDF Rekapan Kas Tahunan berhasil diunduh.'
          : `PDF Laporan Keuangan Lengkap (${selectedReportYear}) berhasil diunduh.`
    );
    setTimeout(() => setPdfFeedback(null), 4000);
  };

  const handleDirectPrint = (scopeOverride?: ReportPrintScope) => {
    if (scopeOverride) {
      setPrintScope(scopeOverride);
    }
    setTimeout(() => {
      window.print();
    }, 60);
  };

  const openPrintPreview = () => {
    setPrintScope(reportTab === 'tahunan' ? 'tahunan' : 'bulanan');
    setPrintModalOpen(true);
  };

  const todayFormatted = formatIndonesianDate(new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-6">
      <div className="space-y-6 print:hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2419]">
            {siteContent?.sections.kasTitle || DEFAULT_SITE_CONTENT.sections.kasTitle}
          </h1>
          <p className="text-sm text-[#456051] mt-1">
            {siteContent?.sections.kasSubtitle ||
              DEFAULT_SITE_CONTENT.sections.kasSubtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#F5F9F6] text-[#0F2419] text-sm font-semibold whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#146C43]" />
            <span>Ekspor Buku Kas</span>
          </button>
          <button
            type="button"
            onClick={startCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold whitespace-nowrap cursor-pointer"
          >
            {canEditFinance ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>Catat Transaksi</span>
          </button>
        </div>
      </div>

      {/* Pengurus Finance Access Banner */}
      <section
        className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          canEditFinance
            ? 'border-[#BFE0C9] bg-[#EAF3EC]'
            : 'border-[#D4E4D8] bg-white'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3">
          {canEditFinance ? (
            <ShieldCheck className="w-5 h-5 text-[#146C43] shrink-0 mt-0.5 sm:mt-0" />
          ) : (
            <Lock className="w-5 h-5 text-[#456051] shrink-0 mt-0.5 sm:mt-0" />
          )}
          <div>
            <p className="text-sm font-bold text-[#0F2419]">
              {canEditFinance && authUser
                ? `Mode Pengelola Keuangan Aktif · ${authUser.name}`
                : 'Mode Baca Jemaat — Pengelolaan Data Keuangan Khusus Pengurus'}
            </p>
            <p className="text-xs text-[#456051] mt-0.5">
              {canEditFinance
                ? 'Anda memiliki izin untuk mencatat transaksi baru, mengubah, dan menghapus data pembukuan.'
                : 'Seluruh jemaat dapat melihat laporan kas secara transparan.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canEditFinance ? (
            <>
              <button
                type="button"
                onClick={onOpenChangePassword}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#BFE0C9] bg-white hover:bg-[#F5F9F6] text-xs font-semibold text-[#0F2419] whitespace-nowrap cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#146C43]" />
                <span>Ubah Sandi</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D4E4D8] bg-white hover:bg-red-50 hover:text-[#B91C1C] text-xs font-semibold text-[#0F2419] whitespace-nowrap cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Masuk Pengurus</span>
            </button>
          )}
        </div>
      </section>

      {/* 4-Card Financial Summary (Total Keseluruhan + Bulan Ini + Tahun Ini) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#BFE0C9] bg-[#EAF3EC] p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#0F5132]">
            <span>Saldo Kas Akhir Jemaat</span>
            <Wallet className="w-4 h-4 text-[#146C43]" />
          </div>
          <p className="text-2xl font-bold text-[#0F2419] font-mono tabular-nums">
            {formatRupiah(saldoAkhir)}
          </p>
          <p className="text-xs text-[#2D4D3B] tabular-nums">
            Per {formatShortDate(new Date().toISOString().slice(0, 10))}
          </p>
        </div>

        <div className="rounded-2xl border border-[#D4E4D8] bg-white p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-[#456051]">
            <span>Pemasukan vs Pengeluaran (Bulan Ini)</span>
            <CalendarRange className="w-4 h-4 text-[#146C43]" />
          </div>
          <p className="text-lg font-bold text-[#146C43] font-mono tabular-nums">
            +{formatRupiah(currentMonthStats.masuk)}
          </p>
          <p className="text-sm font-bold text-[#B91C1C] font-mono tabular-nums">
            Pengeluaran: {formatRupiah(currentMonthStats.keluar)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#D4E4D8] bg-white p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-[#456051]">
            <span>Pemasukan Tahun {currentYear}</span>
            <ArrowDownLeft className="w-4 h-4 text-[#146C43]" />
          </div>
          <p className="text-2xl font-bold text-[#146C43] font-mono tabular-nums">
            {formatRupiah(currentYearStats.masuk)}
          </p>
          <p className="text-xs text-[#456051] font-mono tabular-nums">
            Kumulatif semua tahun: {formatRupiah(totalMasuk)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#D4E4D8] bg-white p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-[#456051]">
            <span>Pengeluaran Tahun {currentYear}</span>
            <ArrowUpRight className="w-4 h-4 text-[#B91C1C]" />
          </div>
          <p className="text-2xl font-bold text-[#B91C1C] font-mono tabular-nums">
            {formatRupiah(currentYearStats.keluar)}
          </p>
          <p className="text-xs text-[#456051] font-mono tabular-nums">
            Kumulatif semua tahun: {formatRupiah(totalKeluar)}
          </p>
        </div>
      </section>

      {/* Add / Edit Transaction Form */}
      {showForm && canEditFinance && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#BFE0C9] bg-white p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0F2419]">
              {editingId
                ? 'Ubah Catatan Transaksi Pembukuan'
                : 'Catat Transaksi Pembukuan Baru'}
            </h2>
            {editingId && (
              <span className="text-xs font-mono text-[#146C43] font-semibold">
                Mode Ubah · {form.voucherNo}
              </span>
            )}
          </div>
          {actionError && (
            <p className="text-xs font-semibold text-[#B91C1C] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {actionError}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Jenis Transaksi</span>
              <select
                value={form.type}
                onChange={(e) => {
                  const nextType = e.target.value as 'masuk' | 'keluar';
                  setForm({
                    ...form,
                    type: nextType,
                    voucherNo: `${nextType === 'masuk' ? 'KM' : 'KK'}-${new Date().getFullYear()}-${ledger.length + 105}`,
                  });
                }}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              >
                <option value="masuk">Kas Masuk (Pemasukan)</option>
                <option value="keluar">Kas Keluar (Pengeluaran)</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Tanggal</span>
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">No. Bukti / Kwitansi</span>
              <input
                required
                type="text"
                value={form.voucherNo}
                onChange={(e) => setForm({ ...form, voucherNo: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] font-mono text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Kategori Pos Anggaran</span>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as LedgerCategory })
                }
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Nominal (Rupiah)</span>
              <input
                required
                min={1000}
                step={500}
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="Contoh: 1500000"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] font-mono tabular-nums text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Dicatat Oleh</span>
              <input
                required
                type="text"
                value={form.recordedBy}
                onChange={(e) => setForm({ ...form, recordedBy: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            {requiresDonorName && (
              <label className="space-y-1.5 text-sm md:col-span-2 lg:col-span-3">
                <span className="font-medium text-[#0F2419]">
                  Nama yang Memberi ({form.category}) *
                </span>
                <input
                  required
                  type="text"
                  value={form.donorName}
                  onChange={(e) => setForm({ ...form, donorName: e.target.value })}
                  placeholder="Contoh: Kel. Bpk. Yohanes Kiding / Ibu Martha Simanjuntak"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#BFE0C9] bg-[#F5F9F6] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>
            )}
            <label className="space-y-1.5 text-sm md:col-span-2 lg:col-span-3">
              <span className="font-medium text-[#0F2419]">Uraian Transaksi</span>
              <input
                required
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Contoh: Persembahan Ibadah Raya Minggu III"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold cursor-pointer"
            >
              {editingId ? 'Simpan Perubahan' : 'Simpan ke Buku Kas'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="px-5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#456051] text-sm font-medium cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* DEDICATED SECTION: Laporan Kas Per Bulan & Rekapan Per Tahun */}
      <section className="rounded-2xl border border-[#D4E4D8] bg-white p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#E6EFE8] pb-4">
          <div>
            <h2 className="text-lg font-bold text-[#0F2419]">
              Laporan Kas & Pengeluaran Per Bulan dan Rekapan Per Tahun
            </h2>
            <p className="text-xs text-[#456051] mt-0.5">
              Pantau total pemasukan, jumlah pengeluaran, selisih kas, dan saldo akhir secara bulanan maupun tahunan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 rounded-xl bg-[#EAF3EC] border border-[#D4E4D8]">
              <button
                type="button"
                onClick={() => setReportTab('bulanan')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  reportTab === 'bulanan'
                    ? 'bg-white text-[#0F2419] shadow-xs'
                    : 'text-[#456051] hover:text-[#0F2419]'
                }`}
              >
                Laporan Per Bulan
              </button>
              <button
                type="button"
                onClick={() => setReportTab('tahunan')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  reportTab === 'tahunan'
                    ? 'bg-white text-[#0F2419] shadow-xs'
                    : 'text-[#456051] hover:text-[#0F2419]'
                }`}
              >
                Rekapan Per Tahun
              </button>
            </div>

            {reportTab === 'bulanan' && (
              <select
                value={selectedReportYear}
                onChange={(e) => setReportYear(e.target.value)}
                aria-label="Pilih tahun laporan bulanan"
                className="px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-xs font-mono font-semibold text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    Tahun {y}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={
                reportTab === 'bulanan'
                  ? handleExportMonthlyRecapCSV
                  : handleExportAnnualRecapCSV
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4E4D8] bg-[#F5F9F6] hover:bg-[#EAF3EC] text-xs font-semibold text-[#0F2419] whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#146C43]" />
              <span>
                {reportTab === 'bulanan'
                  ? `CSV ${selectedReportYear}`
                  : 'CSV Tahunan'}
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleDownloadPdf(reportTab === 'tahunan' ? 'tahunan' : 'bulanan')
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#BFE0C9] bg-[#EAF3EC] hover:bg-[#DCECE1] text-xs font-semibold text-[#0F5132] whitespace-nowrap cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#146C43]" />
              <span>Unduh PDF</span>
            </button>

            <button
              type="button"
              onClick={openPrintPreview}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#F5F9F6] text-xs font-semibold text-[#0F2419] whitespace-nowrap cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#146C43]" />
              <span>Pratinjau Cetak</span>
            </button>

            <button
              type="button"
              onClick={() =>
                handleDirectPrint(reportTab === 'tahunan' ? 'tahunan' : 'bulanan')
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Langsung</span>
            </button>
          </div>
        </div>

        {pdfFeedback && (
          <div className="rounded-xl bg-[#EAF3EC] border border-[#BFE0C9] px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-[#0F5132]">
            <CheckCircle2 className="w-4 h-4 text-[#146C43] shrink-0" />
            <span>{pdfFeedback}</span>
          </div>
        )}

        {/* SUBVIEW A: LAPORAN PER BULAN */}
        {reportTab === 'bulanan' && (
          <div className="space-y-6">
            {/* Monthly Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl bg-[#F5F9F6] border border-[#E6EFE8] p-4">
                <p className="text-xs text-[#456051]">Saldo Bawaan Sebelum {selectedReportYear}</p>
                <p className="text-base font-bold font-mono tabular-nums text-[#0F2419] mt-1">
                  {formatRupiah(monthlyReport.priorBalance)}
                </p>
              </div>
              <div className="rounded-xl bg-[#F5F9F6] border border-[#E6EFE8] p-4">
                <p className="text-xs text-[#456051]">Total Pemasukan {selectedReportYear}</p>
                <p className="text-base font-bold font-mono tabular-nums text-[#146C43] mt-1">
                  {formatRupiah(monthlyReport.totalYearMasuk)}
                </p>
              </div>
              <div className="rounded-xl bg-[#F5F9F6] border border-[#E6EFE8] p-4">
                <p className="text-xs text-[#456051]">Jumlah Pengeluaran {selectedReportYear}</p>
                <p className="text-base font-bold font-mono tabular-nums text-[#B91C1C] mt-1">
                  {formatRupiah(monthlyReport.totalYearKeluar)}
                </p>
              </div>
              <div className="rounded-xl bg-[#EAF3EC] border border-[#BFE0C9] p-4">
                <p className="text-xs font-semibold text-[#0F5132]">Saldo Akhir Tahun {selectedReportYear}</p>
                <p className="text-base font-bold font-mono tabular-nums text-[#0F2419] mt-1">
                  {formatRupiah(monthlyReport.endBalance)}
                </p>
              </div>
            </div>

            {/* 12-Month Bar Comparison Chart */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#0F2419]">
                  Grafik Pemasukan & Pengeluaran Per Bulan ({selectedReportYear})
                </span>
                <div className="flex items-center gap-4 text-[#456051]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#146C43]" />
                    <span>Pemasukan</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#DC2626]" />
                    <span>Pengeluaran</span>
                  </span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[640px]">
                  <svg viewBox="0 0 760 200" className="w-full h-48">
                    {[0, 0.5, 1].map((r, i) => {
                      const y = 165 - r * 135;
                      return (
                        <g key={i}>
                          <line x1="65" y1={y} x2="745" y2={y} stroke="#E6EFE8" strokeWidth="1" />
                          <text x="58" y={y + 4} textAnchor="end" className="fill-[#456051] text-[10px] font-mono">
                            {r === 0 ? '0' : `${Math.round((maxMonthlyBar * r) / 1000000)}jt`}
                          </text>
                        </g>
                      );
                    })}
                    {monthlyReport.rows.map((m, idx) => {
                      const slotW = 670 / 12;
                      const x0 = 72 + idx * slotW;
                      const barW = 16;
                      const hIn = (m.masuk / maxMonthlyBar) * 135;
                      const hOut = (m.keluar / maxMonthlyBar) * 135;
                      return (
                        <g key={m.monthKey}>
                          <rect
                            x={x0 + 6}
                            y={165 - hIn}
                            width={barW}
                            height={Math.max(m.masuk > 0 ? 3 : 0, hIn)}
                            rx="3"
                            fill="#146C43"
                          >
                            <title>{`${m.monthName}: Pemasukan ${formatRupiah(m.masuk)}`}</title>
                          </rect>
                          <rect
                            x={x0 + 6 + barW + 3}
                            y={165 - hOut}
                            width={barW}
                            height={Math.max(m.keluar > 0 ? 3 : 0, hOut)}
                            rx="3"
                            fill="#DC2626"
                          >
                            <title>{`${m.monthName}: Pengeluaran ${formatRupiah(m.keluar)}`}</title>
                          </rect>
                          <text
                            x={x0 + slotW / 2 - 4}
                            y="186"
                            textAnchor="middle"
                            className="fill-[#0F2419] text-[11px] font-medium"
                          >
                            {m.shortName}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>

            {/* Monthly Report Table */}
            <div className="overflow-x-auto border border-[#E6EFE8] rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E6EFE8] bg-[#F5F9F6] text-xs font-semibold text-[#456051]">
                    <th className="py-3 px-4">Bulan ({selectedReportYear})</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Transaksi</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Pemasukan (Rp)</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Jumlah Pengeluaran (Rp)</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Surplus / Defisit</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Saldo Akhir Bulan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EFE8] text-sm">
                  {monthlyReport.rows.map((r) => (
                    <tr
                      key={r.monthKey}
                      className={r.count > 0 ? 'hover:bg-[#F5F9F6]/70' : 'text-[#6B8576]'}
                    >
                      <td className="py-2.5 px-4 font-medium text-[#0F2419]">
                        {r.monthName} {selectedReportYear}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-xs">
                        {r.count}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap text-[#146C43] font-semibold">
                        {r.masuk > 0 ? formatRupiah(r.masuk) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap text-[#B91C1C] font-semibold">
                        {r.keluar > 0 ? formatRupiah(r.keluar) : '—'}
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap font-semibold ${
                          r.selisih > 0
                            ? 'text-[#146C43]'
                            : r.selisih < 0
                              ? 'text-[#B91C1C]'
                              : 'text-[#6B8576]'
                        }`}
                      >
                        {r.count > 0
                          ? `${r.selisih > 0 ? '+' : ''}${formatRupiah(r.selisih)}`
                          : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums whitespace-nowrap font-semibold text-[#0F2419]">
                        {formatRupiah(r.closingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#D4E4D8] bg-[#EAF3EC] text-sm font-bold text-[#0F2419]">
                    <td className="py-3 px-4">Rekap Total Tahun {selectedReportYear}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {monthlyReport.totalYearCount}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap text-[#146C43]">
                      {formatRupiah(monthlyReport.totalYearMasuk)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap text-[#B91C1C]">
                      {formatRupiah(monthlyReport.totalYearKeluar)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap ${
                        monthlyReport.totalYearSelisih >= 0 ? 'text-[#146C43]' : 'text-[#B91C1C]'
                      }`}
                    >
                      {monthlyReport.totalYearSelisih >= 0 ? '+' : ''}
                      {formatRupiah(monthlyReport.totalYearSelisih)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatRupiah(monthlyReport.endBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* SUBVIEW B: REKAPAN PER TAHUN */}
        {reportTab === 'tahunan' && (
          <div className="space-y-6">
            {/* Annual Comparison Chart */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#0F2419]">
                  Perbandingan Pemasukan vs Jumlah Pengeluaran Per Tahun
                </span>
                <div className="flex items-center gap-4 text-[#456051]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#146C43]" />
                    <span>Pemasukan Tahunan</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#DC2626]" />
                    <span>Jumlah Pengeluaran Tahunan</span>
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {annualRecap.rows.map((row) => (
                  <div
                    key={row.year}
                    className="rounded-xl bg-[#F5F9F6] border border-[#E6EFE8] p-4 space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-bold font-mono text-[#0F2419]">
                        Tahun {row.year}
                      </span>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
                        <span className="text-[#146C43] font-semibold">
                          Masuk: {formatRupiah(row.masuk)}
                        </span>
                        <span className="text-[#B91C1C] font-semibold">
                          Pengeluaran: {formatRupiah(row.keluar)}
                        </span>
                        <span className="text-[#0F2419] font-bold">
                          Saldo Akhir: {formatRupiah(row.closingBalance)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-2.5 rounded-full bg-white overflow-hidden">
                        <div
                          className="h-full bg-[#146C43] rounded-full"
                          style={{
                            width: `${Math.max(4, (row.masuk / maxAnnualBar) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="h-2.5 rounded-full bg-white overflow-hidden">
                        <div
                          className="h-full bg-[#DC2626] rounded-full"
                          style={{
                            width: `${Math.max(4, (row.keluar / maxAnnualBar) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Annual Recap Table */}
            <div className="overflow-x-auto border border-[#E6EFE8] rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E6EFE8] bg-[#F5F9F6] text-xs font-semibold text-[#456051]">
                    <th className="py-3 px-4">Tahun Buku</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Jumlah Transaksi</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Total Pemasukan (Rp)</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Jumlah Pengeluaran (Rp)</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Surplus / Defisit Tahun</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap">Saldo Kumulatif Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EFE8] text-sm">
                  {annualRecap.rows.map((row) => (
                    <tr key={row.year} className="hover:bg-[#F5F9F6]/70">
                      <td className="py-3 px-4 font-bold font-mono text-[#0F2419]">
                        {row.year}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#456051]">
                        {row.count} catatan
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap text-[#146C43] font-semibold">
                        {formatRupiah(row.masuk)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap text-[#B91C1C] font-semibold">
                        {formatRupiah(row.keluar)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap font-semibold ${
                          row.selisih >= 0 ? 'text-[#146C43]' : 'text-[#B91C1C]'
                        }`}
                      >
                        {row.selisih >= 0 ? '+' : ''}
                        {formatRupiah(row.selisih)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap font-bold text-[#0F2419]">
                        {formatRupiah(row.closingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#D4E4D8] bg-[#EAF3EC] text-sm font-bold text-[#0F2419]">
                    <td className="py-3 px-4">Total Akumulasi Seluruh Tahun</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {annualRecap.grandCount} catatan
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap text-[#146C43]">
                      {formatRupiah(annualRecap.grandMasuk)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap text-[#B91C1C]">
                      {formatRupiah(annualRecap.grandKeluar)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap text-[#146C43]">
                      +{formatRupiah(annualRecap.grandMasuk - annualRecap.grandKeluar)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                      {formatRupiah(annualRecap.grandBalance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Category Distribution Bar Breakdown */}
      <section className="rounded-2xl border border-[#D4E4D8] bg-white p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-base font-bold text-[#0F2419]">
            Ringkasan Kas per Kategori Pelayanan {yearFilter === 'Semua' ? '(Semua Tahun)' : `(Tahun ${yearFilter})`}
          </h2>
          <div className="flex items-center gap-4 text-xs text-[#456051]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#146C43]" />
              <span>Pemasukan</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#DC2626]" />
              <span>Pengeluaran</span>
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {categoryTotals.map((cat) => (
            <div key={cat.category} className="space-y-1">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-medium text-[#0F2419]">{cat.category}</span>
                <span className="font-mono tabular-nums text-[#456051]">
                  {cat.masuk > 0 ? `+${formatRupiah(cat.masuk)}` : ''}
                  {cat.masuk > 0 && cat.keluar > 0 ? ' · ' : ''}
                  {cat.keluar > 0 ? `-${formatRupiah(cat.keluar)}` : ''}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[#EAF3EC] overflow-hidden flex gap-1">
                {cat.masuk > 0 && (
                  <div
                    className="h-full bg-[#146C43] rounded-full"
                    style={{ width: `${Math.max(4, (cat.masuk / maxCatValue) * 100)}%` }}
                  />
                )}
                {cat.keluar > 0 && (
                  <div
                    className="h-full bg-[#DC2626] rounded-full"
                    style={{ width: `${Math.max(4, (cat.keluar / maxCatValue) * 100)}%` }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Filter Toolbar & Ledger Table */}
      <section className="rounded-2xl border border-[#D4E4D8] bg-white overflow-hidden">
        <div className="p-5 border-b border-[#E6EFE8] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex p-1 rounded-lg bg-[#EAF3EC] border border-[#D4E4D8]">
              {(['semua', 'masuk', 'keluar'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    typeFilter === t
                      ? 'bg-white text-[#0F2419] shadow-xs'
                      : 'text-[#456051] hover:text-[#0F2419]'
                  }`}
                >
                  {t === 'semua' ? 'Semua' : t === 'masuk' ? 'Pemasukan' : 'Pengeluaran'}
                </button>
              ))}
            </div>

            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-xs font-medium text-[#0F2419] focus:outline-none focus:border-[#146C43]"
            >
              <option value="Semua">Semua Tahun</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Tahun {y}
                </option>
              ))}
            </select>

            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-xs font-medium text-[#0F2419] focus:outline-none focus:border-[#146C43]"
            >
              <option value="Semua">Semua Bulan</option>
              {MONTH_NAMES_ID.map((m, idx) => (
                <option key={m} value={String(idx + 1).padStart(2, '0')}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-xs font-medium text-[#0F2419] focus:outline-none focus:border-[#146C43]"
            >
              <option value="Semua">Semua Kategori</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full xl:w-72">
            <Search className="w-4 h-4 text-[#456051] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari uraian, nama pemberi, atau no. bukti..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#D4E4D8] text-xs text-[#0F2419] placeholder:text-[#6B8576] focus:outline-none focus:border-[#146C43]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E6EFE8] bg-[#F5F9F6] text-xs font-semibold text-[#456051]">
                <th className="py-3 px-4 whitespace-nowrap">Tanggal</th>
                <th className="py-3 px-4 whitespace-nowrap">No. Bukti</th>
                <th className="py-3 px-4">Uraian & Kategori</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Masuk (Rp)</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Keluar (Rp)</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Saldo Berjalan</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EFE8] text-sm">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#456051]">
                    Tidak ada catatan pembukuan yang sesuai dengan penyaringan.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F5F9F6]/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-[#456051] tabular-nums whitespace-nowrap">
                      {formatShortDate(row.date)}
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-[#0F2419] tabular-nums whitespace-nowrap">
                      {row.voucherNo}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#0F2419]">{row.description}</p>
                      {row.donorName && (
                        <p className="text-xs font-semibold text-[#146C43] mt-0.5">
                          Pemberi: {row.donorName}
                        </p>
                      )}
                      <p className="text-xs text-[#456051]">
                        {row.category} · Dicatat: {row.recordedBy}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap text-[#146C43] font-semibold">
                      {row.type === 'masuk' ? formatRupiah(row.amount) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap text-[#B91C1C] font-semibold">
                      {row.type === 'keluar' ? formatRupiah(row.amount) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap text-[#0F2419] font-semibold">
                      {formatRupiah(row.runningBalance)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {canEditFinance ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            title="Ubah transaksi"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#146C43] hover:bg-[#EAF3EC] transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Ubah</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteEntry(row.id)}
                            title="Hapus transaksi"
                            className="p-1.5 rounded-lg text-[#6B8576] hover:text-[#B91C1C] hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={onOpenLogin}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#456051] hover:text-[#146C43] cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Pengurus</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      </div>

      {/* Modal Pratinjau & Pengaturan Cetak Laporan */}
      {printModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 print:hidden">
          <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl border border-[#D4E4D8] bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E6EFE8] bg-[#F5F9F6] flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#0F2419]">
                  Pratinjau Cetak & Unduh PDF Laporan Kas
                </h2>
                <p className="text-xs text-[#456051] mt-0.5">
                  Atur cakupan laporan dan penandatangan resmi, lalu unduh PDF atau cetak langsung.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPrintModalOpen(false)}
                aria-label="Tutup pratinjau cetak"
                className="p-2 rounded-lg text-[#456051] hover:bg-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Print Options Toolbar */}
            <div className="px-6 py-4 border-b border-[#E6EFE8] bg-white grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <label className="space-y-1 text-xs md:col-span-4">
                <span className="font-semibold text-[#0F2419]">Cakupan Laporan Cetak</span>
                <select
                  value={printScope}
                  onChange={(e) => setPrintScope(e.target.value as ReportPrintScope)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white text-xs font-medium text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                >
                  <option value="bulanan">
                    Laporan Bulanan (Tahun {selectedReportYear})
                  </option>
                  <option value="tahunan">Rekapan Kas Per Tahun</option>
                  <option value="lengkap">
                    Laporan Lengkap (Bulanan {selectedReportYear} + Tahunan)
                  </option>
                </select>
              </label>

              <label className="space-y-1 text-xs md:col-span-3">
                <span className="font-semibold text-[#0F2419]">Nama Penandatangan</span>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-xs text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>

              <label className="space-y-1 text-xs md:col-span-3">
                <span className="font-semibold text-[#0F2419]">Jabatan Penandatangan</span>
                <input
                  type="text"
                  value={signatoryRole}
                  onChange={(e) => setSignatoryRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#D4E4D8] text-xs text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-[#0F2419] md:col-span-2 pb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCategories}
                  onChange={(e) => setIncludeCategories(e.target.checked)}
                  className="rounded border-[#D4E4D8] accent-[#146C43]"
                />
                <span>Rincian Kategori</span>
              </label>
            </div>

            {/* A4 Sheet Preview */}
            <div className="flex-1 overflow-y-auto bg-[#EEF4F0] p-4 sm:p-6">
              <div className="max-w-3xl mx-auto bg-white border border-[#D4E4D8] rounded-xl overflow-hidden shadow-xs">
                {/* Letterhead */}
                <div className="bg-[#146C43] text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-sm sm:text-base font-bold tracking-tight">
                      GEREJA KEMAH INJIL INDONESIA (GKII)
                    </p>
                    <p className="text-xs text-[#D7EFE0]">
                      JEMAAT SUNGAI BARANG · KALIMANTAN
                    </p>
                  </div>
                  <div className="text-left sm:text-right text-xs text-[#D7EFE0]">
                    <p className="font-semibold text-white">Laporan Keuangan Resmi</p>
                    <p>Dicetak: {todayFormatted}</p>
                  </div>
                </div>

                <div className="p-6 space-y-5 text-[#0F2419]">
                  <div className="border-b border-[#E6EFE8] pb-3">
                    <h3 className="text-base font-bold">
                      {printScope === 'bulanan'
                        ? `LAPORAN KAS & PENGELUARAN BULANAN TAHUN ${selectedReportYear}`
                        : printScope === 'tahunan'
                          ? 'REKAPAN KAS & PENGELUARAN PER TAHUN'
                          : `LAPORAN KEUANGAN LENGKAP (TAHUNAN & BULANAN ${selectedReportYear})`}
                    </h3>
                    <p className="text-xs text-[#456051] mt-0.5">
                      Disiapkan oleh: {signatoryName} ({signatoryRole})
                    </p>
                  </div>

                  {/* Summary metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {printScope === 'tahunan' ? (
                      <>
                        <div className="rounded-lg bg-[#F5F9F6] border border-[#E6EFE8] p-3">
                          <p className="text-[#456051]">Tahun Tercatat</p>
                          <p className="font-bold font-mono tabular-nums text-sm mt-0.5">
                            {annualRecap.rows.length} Tahun
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#F5F9F6] border border-[#E6EFE8] p-3">
                          <p className="text-[#456051]">Akumulasi Pemasukan</p>
                          <p className="font-bold font-mono tabular-nums text-sm text-[#146C43] mt-0.5">
                            {formatRupiah(annualRecap.grandMasuk)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#F5F9F6] border border-[#E6EFE8] p-3">
                          <p className="text-[#456051]">Akumulasi Pengeluaran</p>
                          <p className="font-bold font-mono tabular-nums text-sm text-[#B91C1C] mt-0.5">
                            {formatRupiah(annualRecap.grandKeluar)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#EAF3EC] border border-[#BFE0C9] p-3">
                          <p className="text-[#0F5132] font-semibold">Saldo Kas Akhir</p>
                          <p className="font-bold font-mono tabular-nums text-sm mt-0.5">
                            {formatRupiah(saldoAkhir)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="rounded-lg bg-[#F5F9F6] border border-[#E6EFE8] p-3">
                          <p className="text-[#456051]">Saldo Bawaan</p>
                          <p className="font-bold font-mono tabular-nums text-sm mt-0.5">
                            {formatRupiah(monthlyReport.priorBalance)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#F5F9F6] border border-[#E6EFE8] p-3">
                          <p className="text-[#456051]">Pemasukan {selectedReportYear}</p>
                          <p className="font-bold font-mono tabular-nums text-sm text-[#146C43] mt-0.5">
                            {formatRupiah(monthlyReport.totalYearMasuk)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#F5F9F6] border border-[#E6EFE8] p-3">
                          <p className="text-[#456051]">Pengeluaran {selectedReportYear}</p>
                          <p className="font-bold font-mono tabular-nums text-sm text-[#B91C1C] mt-0.5">
                            {formatRupiah(monthlyReport.totalYearKeluar)}
                          </p>
                        </div>
                        <div className="rounded-lg bg-[#EAF3EC] border border-[#BFE0C9] p-3">
                          <p className="text-[#0F5132] font-semibold">Saldo Akhir {selectedReportYear}</p>
                          <p className="font-bold font-mono tabular-nums text-sm mt-0.5">
                            {formatRupiah(monthlyReport.endBalance)}
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {(printScope === 'bulanan' || printScope === 'lengkap') && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-[#146C43]">
                        Rincian Kas & Pengeluaran Bulanan Tahun {selectedReportYear}
                      </p>
                      <div className="overflow-x-auto border border-[#D4E4D8] rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#146C43] text-white">
                              <th className="py-2 px-3">Bulan</th>
                              <th className="py-2 px-3 text-right">Trx</th>
                              <th className="py-2 px-3 text-right">Pemasukan</th>
                              <th className="py-2 px-3 text-right">Pengeluaran</th>
                              <th className="py-2 px-3 text-right">Surplus / Defisit</th>
                              <th className="py-2 px-3 text-right">Saldo Akhir</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E6EFE8]">
                            {monthlyReport.rows.map((r) => (
                              <tr key={r.monthKey}>
                                <td className="py-1.5 px-3 font-medium">
                                  {r.monthName}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                                  {r.count}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#146C43]">
                                  {r.masuk > 0 ? formatRupiah(r.masuk) : '—'}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#B91C1C]">
                                  {r.keluar > 0 ? formatRupiah(r.keluar) : '—'}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                                  {r.count > 0
                                    ? `${r.selisih > 0 ? '+' : ''}${formatRupiah(r.selisih)}`
                                    : '—'}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold">
                                  {formatRupiah(r.closingBalance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-[#EAF3EC] font-bold border-t border-[#BFE0C9]">
                              <td className="py-2 px-3">Total {selectedReportYear}</td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">
                                {monthlyReport.totalYearCount}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums text-[#146C43]">
                                {formatRupiah(monthlyReport.totalYearMasuk)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums text-[#B91C1C]">
                                {formatRupiah(monthlyReport.totalYearKeluar)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">
                                {monthlyReport.totalYearSelisih >= 0 ? '+' : ''}
                                {formatRupiah(monthlyReport.totalYearSelisih)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">
                                {formatRupiah(monthlyReport.endBalance)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {(printScope === 'tahunan' || printScope === 'lengkap') && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-[#146C43]">
                        Rekapan Kas & Pengeluaran Per Tahun
                      </p>
                      <div className="overflow-x-auto border border-[#D4E4D8] rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#146C43] text-white">
                              <th className="py-2 px-3">Tahun</th>
                              <th className="py-2 px-3 text-right">Trx</th>
                              <th className="py-2 px-3 text-right">Pemasukan</th>
                              <th className="py-2 px-3 text-right">Pengeluaran</th>
                              <th className="py-2 px-3 text-right">Surplus / Defisit</th>
                              <th className="py-2 px-3 text-right">Saldo Kumulatif</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E6EFE8]">
                            {annualRecap.rows.map((r) => (
                              <tr key={r.year}>
                                <td className="py-1.5 px-3 font-mono font-bold">
                                  {r.year}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                                  {r.count}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#146C43]">
                                  {formatRupiah(r.masuk)}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#B91C1C]">
                                  {formatRupiah(r.keluar)}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                                  {r.selisih >= 0 ? '+' : ''}
                                  {formatRupiah(r.selisih)}
                                </td>
                                <td className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold">
                                  {formatRupiah(r.closingBalance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-[#EAF3EC] font-bold border-t border-[#BFE0C9]">
                              <td className="py-2 px-3">Akumulasi</td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">
                                {annualRecap.grandCount}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums text-[#146C43]">
                                {formatRupiah(annualRecap.grandMasuk)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums text-[#B91C1C]">
                                {formatRupiah(annualRecap.grandKeluar)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">
                                +{formatRupiah(annualRecap.grandMasuk - annualRecap.grandKeluar)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono tabular-nums">
                                {formatRupiah(annualRecap.grandBalance)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {includeCategories && categoryTotals.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-[#146C43]">
                        Ringkasan Kas per Kategori Pelayanan
                      </p>
                      <div className="overflow-x-auto border border-[#D4E4D8] rounded-lg">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#0F5132] text-white">
                              <th className="py-2 px-3">Kategori Pelayanan</th>
                              <th className="py-2 px-3 text-right">Pemasukan</th>
                              <th className="py-2 px-3 text-right">Pengeluaran</th>
                              <th className="py-2 px-3 text-right">Selisih Bersih</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E6EFE8]">
                            {categoryTotals.map((c) => {
                              const net = c.masuk - c.keluar;
                              return (
                                <tr key={c.category}>
                                  <td className="py-1.5 px-3 font-medium">{c.category}</td>
                                  <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#146C43]">
                                    {c.masuk > 0 ? formatRupiah(c.masuk) : '—'}
                                  </td>
                                  <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#B91C1C]">
                                    {c.keluar > 0 ? formatRupiah(c.keluar) : '—'}
                                  </td>
                                  <td className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold">
                                    {net > 0 ? '+' : ''}
                                    {formatRupiah(net)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Signature preview */}
                  <div className="grid grid-cols-2 gap-8 pt-6 text-xs">
                    <div>
                      <p className="text-[#456051]">Mengetahui,</p>
                      <p className="font-bold">Badan Pengurus Jemaat (BPJ)</p>
                      <div className="h-14" />
                      <p className="font-bold underline">Pdt. Lukas H. Bangun, M.Th.</p>
                      <p className="text-[#456051]">Gembala Sidang / Ketua BPJ</p>
                    </div>
                    <div>
                      <p className="text-[#456051]">Desa Sungai Barang, {todayFormatted}</p>
                      <p className="font-bold">{signatoryRole}</p>
                      <div className="h-14" />
                      <p className="font-bold underline">{signatoryName}</p>
                      <p className="text-[#456051]">GKII Jemaat Sungai Barang</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#E6EFE8] bg-white flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-[#456051]">
                Format kertas A4 · Mendukung ekspor PDF langsung maupun cetak printer.
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setPrintModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#D4E4D8] text-xs font-semibold text-[#456051] cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#BFE0C9] bg-[#EAF3EC] hover:bg-[#DCECE1] text-xs font-semibold text-[#0F5132] cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-[#146C43]" />
                  <span>Unduh PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectPrint()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Langsung</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated A4 Print-Only View (Shown only when window.print() is triggered) */}
      <section className="hidden print:block bg-white text-[#0F2419] space-y-5">
        <div className="bg-[#146C43] text-white px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3.5">
            <GkiiLogo variant="mark" src={logoUrl} className="w-12 h-12 shrink-0" />
            <div>
              <h1 className="text-base font-bold tracking-tight">
                GEREJA KEMAH INJIL INDONESIA (GKII)
              </h1>
              <p className="text-xs text-[#D7EFE0]">
                JEMAAT SUNGAI BARANG · KALIMANTAN
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold">Laporan Resmi Kas & Pembukuan</p>
            <p>Tanggal Cetak: {todayFormatted}</p>
          </div>
        </div>

        <div className="border-b border-[#D4E4D8] pb-2">
          <h2 className="text-base font-bold">
            {printScope === 'bulanan'
              ? `LAPORAN KAS & PENGELUARAN BULANAN TAHUN ${selectedReportYear}`
              : printScope === 'tahunan'
                ? 'REKAPAN KAS & PENGELUARAN PER TAHUN'
                : `LAPORAN KEUANGAN LENGKAP (TAHUNAN & BULANAN ${selectedReportYear})`}
          </h2>
          <p className="text-xs text-[#456051]">
            Penanggung Jawab Cetak: {authUser ? `${authUser.name} (${authUser.role})` : `${signatoryName} (${signatoryRole})`}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3 text-xs">
          {printScope === 'tahunan' ? (
            <>
              <div className="border border-[#D4E4D8] bg-[#F5F9F6] p-3 rounded-lg">
                <p className="text-[#456051]">Tahun Tercatat</p>
                <p className="font-bold font-mono text-sm mt-1">
                  {annualRecap.rows.length} Tahun
                </p>
              </div>
              <div className="border border-[#D4E4D8] bg-[#F5F9F6] p-3 rounded-lg">
                <p className="text-[#456051]">Akumulasi Pemasukan</p>
                <p className="font-bold font-mono text-sm text-[#146C43] mt-1">
                  {formatRupiah(annualRecap.grandMasuk)}
                </p>
              </div>
              <div className="border border-[#D4E4D8] bg-[#F5F9F6] p-3 rounded-lg">
                <p className="text-[#456051]">Akumulasi Pengeluaran</p>
                <p className="font-bold font-mono text-sm text-[#B91C1C] mt-1">
                  {formatRupiah(annualRecap.grandKeluar)}
                </p>
              </div>
              <div className="border border-[#BFE0C9] bg-[#EAF3EC] p-3 rounded-lg">
                <p className="text-[#0F5132] font-semibold">Saldo Kas Akhir</p>
                <p className="font-bold font-mono text-sm mt-1">
                  {formatRupiah(saldoAkhir)}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="border border-[#D4E4D8] bg-[#F5F9F6] p-3 rounded-lg">
                <p className="text-[#456051]">Saldo Bawaan</p>
                <p className="font-bold font-mono text-sm mt-1">
                  {formatRupiah(monthlyReport.priorBalance)}
                </p>
              </div>
              <div className="border border-[#D4E4D8] bg-[#F5F9F6] p-3 rounded-lg">
                <p className="text-[#456051]">Pemasukan {selectedReportYear}</p>
                <p className="font-bold font-mono text-sm text-[#146C43] mt-1">
                  {formatRupiah(monthlyReport.totalYearMasuk)}
                </p>
              </div>
              <div className="border border-[#D4E4D8] bg-[#F5F9F6] p-3 rounded-lg">
                <p className="text-[#456051]">Pengeluaran {selectedReportYear}</p>
                <p className="font-bold font-mono text-sm text-[#B91C1C] mt-1">
                  {formatRupiah(monthlyReport.totalYearKeluar)}
                </p>
              </div>
              <div className="border border-[#BFE0C9] bg-[#EAF3EC] p-3 rounded-lg">
                <p className="text-[#0F5132] font-semibold">Saldo Akhir {selectedReportYear}</p>
                <p className="font-bold font-mono text-sm mt-1">
                  {formatRupiah(monthlyReport.endBalance)}
                </p>
              </div>
            </>
          )}
        </div>

        {(printScope === 'bulanan' || printScope === 'lengkap') && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#146C43]">
              Rincian Kas & Pengeluaran Bulanan Tahun {selectedReportYear}
            </h3>
            <table className="w-full text-left border-collapse text-xs border border-[#D4E4D8]">
              <thead>
                <tr className="bg-[#146C43] text-white">
                  <th className="py-2 px-3 border border-[#146C43]">Bulan</th>
                  <th className="py-2 px-3 text-right border border-[#146C43]">Trx</th>
                  <th className="py-2 px-3 text-right border border-[#146C43]">Pemasukan</th>
                  <th className="py-2 px-3 text-right border border-[#146C43]">Pengeluaran</th>
                  <th className="py-2 px-3 text-right border border-[#146C43]">Surplus / Defisit</th>
                  <th className="py-2 px-3 text-right border border-[#146C43]">Saldo Akhir</th>
                </tr>
              </thead>
              <tbody>
                {monthlyReport.rows.map((r) => (
                  <tr key={r.monthKey} className="border-b border-[#E6EFE8]">
                    <td className="py-1.5 px-3 font-medium">
                      {r.monthName} {selectedReportYear}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                      {r.count}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#146C43]">
                      {r.masuk > 0 ? formatRupiah(r.masuk) : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#B91C1C]">
                      {r.keluar > 0 ? formatRupiah(r.keluar) : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                      {r.count > 0
                        ? `${r.selisih > 0 ? '+' : ''}${formatRupiah(r.selisih)}`
                        : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold">
                      {formatRupiah(r.closingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#EAF3EC] font-bold border-t-2 border-[#BFE0C9]">
                  <td className="py-2 px-3">Total Tahun {selectedReportYear}</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    {monthlyReport.totalYearCount}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-[#146C43]">
                    {formatRupiah(monthlyReport.totalYearMasuk)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-[#B91C1C]">
                    {formatRupiah(monthlyReport.totalYearKeluar)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    {monthlyReport.totalYearSelisih >= 0 ? '+' : ''}
                    {formatRupiah(monthlyReport.totalYearSelisih)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    {formatRupiah(monthlyReport.endBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {(printScope === 'tahunan' || printScope === 'lengkap') && (
          <div className="space-y-2 break-inside-avoid">
            <h3 className="text-xs font-bold text-[#146C43]">
              Rekapan Kas & Pengeluaran Per Tahun
            </h3>
            <table className="w-full text-left border-collapse text-xs border border-[#D4E4D8]">
              <thead>
                <tr className="bg-[#146C43] text-white">
                  <th className="py-2 px-3 border border-[#146C43]">Tahun Buku</th>
                  <th className="py-2 px-3 text-right border border-[#146C43]">Transaksi</th>
                  <th className="py-2 px-3 text-right border border-[#146C43]">Total Pemasukan</th>
                  <th className="py-2 px-3 text-right border border-[#146C43]">Jumlah Pengeluaran</th>
                  <th className="py-2 px-3 text-right border border-[#146C43]">Surplus / Defisit</th>
                  <th className="py-2 px-3 text-right border border-[#146C43]">Saldo Kumulatif</th>
                </tr>
              </thead>
              <tbody>
                {annualRecap.rows.map((r) => (
                  <tr key={r.year} className="border-b border-[#E6EFE8]">
                    <td className="py-1.5 px-3 font-mono font-bold">{r.year}</td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                      {r.count} catatan
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#146C43]">
                      {formatRupiah(r.masuk)}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#B91C1C]">
                      {formatRupiah(r.keluar)}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                      {r.selisih >= 0 ? '+' : ''}
                      {formatRupiah(r.selisih)}
                    </td>
                    <td className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold">
                      {formatRupiah(r.closingBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#EAF3EC] font-bold border-t-2 border-[#BFE0C9]">
                  <td className="py-2 px-3">Akumulasi Seluruh Tahun</td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    {annualRecap.grandCount} catatan
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-[#146C43]">
                    {formatRupiah(annualRecap.grandMasuk)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums text-[#B91C1C]">
                    {formatRupiah(annualRecap.grandKeluar)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    +{formatRupiah(annualRecap.grandMasuk - annualRecap.grandKeluar)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono tabular-nums">
                    {formatRupiah(annualRecap.grandBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {includeCategories && categoryTotals.length > 0 && (
          <div className="space-y-2 break-inside-avoid">
            <h3 className="text-xs font-bold text-[#146C43]">
              Ringkasan Kas per Kategori Pelayanan
            </h3>
            <table className="w-full text-left border-collapse text-xs border border-[#D4E4D8]">
              <thead>
                <tr className="bg-[#0F5132] text-white">
                  <th className="py-2 px-3">Kategori Pelayanan</th>
                  <th className="py-2 px-3 text-right">Pemasukan</th>
                  <th className="py-2 px-3 text-right">Pengeluaran</th>
                  <th className="py-2 px-3 text-right">Selisih Bersih</th>
                </tr>
              </thead>
              <tbody>
                {categoryTotals.map((c) => {
                  const net = c.masuk - c.keluar;
                  return (
                    <tr key={c.category} className="border-b border-[#E6EFE8]">
                      <td className="py-1.5 px-3 font-medium">{c.category}</td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#146C43]">
                        {c.masuk > 0 ? formatRupiah(c.masuk) : '—'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums text-[#B91C1C]">
                        {c.keluar > 0 ? formatRupiah(c.keluar) : '—'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums font-semibold">
                        {net > 0 ? '+' : ''}
                        {formatRupiah(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-2 gap-10 pt-8 text-xs break-inside-avoid">
          <div>
            <p className="text-[#456051]">Mengetahui,</p>
            <p className="font-bold">Badan Pengurus Jemaat (BPJ)</p>
            <div className="h-16" />
            <p className="font-bold underline">Pdt. Lukas H. Bangun, M.Th.</p>
            <p className="text-[#456051]">Gembala Sidang / Ketua BPJ</p>
          </div>
          <div>
            <p className="text-[#456051]">Desa Sungai Barang, {todayFormatted}</p>
            <p className="font-bold">{signatoryRole}</p>
            <div className="h-16" />
            <p className="font-bold underline">{signatoryName}</p>
            <p className="text-[#456051]">GKII Jemaat Sungai Barang</p>
          </div>
        </div>
      </section>
    </div>
  );
};
