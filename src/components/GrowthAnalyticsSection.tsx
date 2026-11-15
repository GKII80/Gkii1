import React, { useMemo, useState } from 'react';
import { TrendingUp, Users } from 'lucide-react';
import {
  AgeCategory,
  GrowthSnapshot,
  Member,
  OrganPelayanan,
  SiteTextContent,
} from '../types';
import { DEFAULT_SITE_CONTENT } from '../lib/siteContentDefaults';

interface GrowthAnalyticsSectionProps {
  growthSeries: GrowthSnapshot[];
  members: Member[];
  siteContent?: SiteTextContent;
}

const ORGANS: OrganPelayanan[] = [
  'Perkaria',
  'Perkawan',
  'Sekolah Minggu',
  'Remaja',
  'Pemuda',
  'Lansia',
];

const ORGAN_COLORS: Record<OrganPelayanan, string> = {
  Perkaria: '#0F5132',
  Perkawan: '#48A97C',
  'Sekolah Minggu': '#146C43',
  Remaja: '#1E7E52',
  Pemuda: '#2D9A68',
  Lansia: '#7EC49E',
};

const AGE_CATEGORIES: AgeCategory[] = [
  'Anak (0-12)',
  'Remaja (13-17)',
  'Pemuda (18-30)',
  'Dewasa (31-59)',
  'Lansia (60+)',
];

const AGE_COLORS: Record<AgeCategory, string> = {
  'Anak (0-12)': '#146C43',
  'Remaja (13-17)': '#1E7E52',
  'Pemuda (18-30)': '#329B6A',
  'Dewasa (31-59)': '#0D442B',
  'Lansia (60+)': '#6AB88D',
};

export const GrowthAnalyticsSection: React.FC<GrowthAnalyticsSectionProps> = ({
  growthSeries,
  members,
  siteContent,
}) => {
  const [granularity, setGranularity] = useState<'tahunan' | 'triwulan'>('tahunan');
  const [hoveredPeriod, setHoveredPeriod] = useState<string | null>(null);

  const series = useMemo(
    () => growthSeries.filter((g) => g.granularity === granularity),
    [growthSeries, granularity]
  );

  const first = series[0];
  const latest = series[series.length - 1];
  const growthRate =
    first && latest && first.total > 0
      ? (((latest.total - first.total) / first.total) * 100).toFixed(1)
      : '0.0';

  const maxTotal = Math.max(10, ...series.map((s) => s.total));
  const maxOrganVal = Math.max(
    10,
    ...series.flatMap((s) => ORGANS.map((o) => s.byOrgan[o] || 0))
  );

  const activeSnapshot =
    series.find((s) => s.period === hoveredPeriod) || latest;

  // Live distribution from directory members
  const liveOrganCounts = useMemo(() => {
    const map: Record<OrganPelayanan, number> = {
      Perkaria: 0,
      Perkawan: 0,
      'Sekolah Minggu': 0,
      Remaja: 0,
      Pemuda: 0,
      Lansia: 0,
    };
    for (const m of members) {
      if (m.organ in map) {
        map[m.organ] += 1;
      } else if ((m.organ as string) === 'Pemuda & Remaja') {
        if (m.ageCategory === 'Remaja (13-17)') map.Remaja += 1;
        else map.Pemuda += 1;
      }
    }
    return map;
  }, [members]);

  const statusSummary = useMemo(() => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2419]">
            {siteContent?.sections.pertumbuhanTitle ||
              DEFAULT_SITE_CONTENT.sections.pertumbuhanTitle}
          </h1>
          <p className="text-sm text-[#456051] mt-1">
            {siteContent?.sections.pertumbuhanSubtitle ||
              DEFAULT_SITE_CONTENT.sections.pertumbuhanSubtitle}
          </p>
        </div>

        <div className="inline-flex p-1 rounded-xl bg-[#EAF3EC] border border-[#D4E4D8] self-start">
          <button
            type="button"
            onClick={() => {
              setGranularity('tahunan');
              setHoveredPeriod(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              granularity === 'tahunan'
                ? 'bg-white text-[#0F2419] shadow-xs'
                : 'text-[#456051]'
            }`}
          >
            Berkala Tahunan (2023–2026)
          </button>
          <button
            type="button"
            onClick={() => {
              setGranularity('triwulan');
              setHoveredPeriod(null);
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              granularity === 'triwulan'
                ? 'bg-white text-[#0F2419] shadow-xs'
                : 'text-[#456051]'
            }`}
          >
            Berkala Triwulan (2026)
          </button>
        </div>
      </div>

      {/* Top Summary Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#D4E4D8] bg-white p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-[#456051]">
            <span>Total Jiwa Periode Terakhir ({latest?.period})</span>
            <Users className="w-4 h-4 text-[#146C43]" />
          </div>
          <p className="text-3xl font-bold text-[#0F2419] font-mono tabular-nums">
            {latest?.total || 0} Jiwa
          </p>
          <p className="text-xs text-[#456051]">
            Tercatat dalam data statistik jemaat aktif & simpatisan
          </p>
        </div>

        <div className="rounded-2xl border border-[#D4E4D8] bg-white p-5 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-[#456051]">
            <span>Pertumbuhan Periode ({first?.period} → {latest?.period})</span>
            <TrendingUp className="w-4 h-4 text-[#146C43]" />
          </div>
          <p className="text-3xl font-bold text-[#146C43] font-mono tabular-nums">
            +{growthRate}%
          </p>
          <p className="text-xs text-[#456051] tabular-nums">
            Penambahan +{(latest?.total || 0) - (first?.total || 0)} jiwa dalam periode berjalan
          </p>
        </div>

        <div className="rounded-2xl border border-[#BFE0C9] bg-[#EAF3EC] p-5 space-y-1">
          <p className="text-xs font-semibold text-[#0F5132]">
            Sorotan Periode: {activeSnapshot?.period}
          </p>
          <p className="text-3xl font-bold text-[#0F2419] font-mono tabular-nums">
            {activeSnapshot?.total || 0} Jiwa
          </p>
          <p className="text-xs text-[#2D4D3B]">
            Arahkan kursor pada batang grafik untuk melihat rincian periode
          </p>
        </div>
      </section>

      {/* Jumlah Anggota per Organ Pelayanan (Perkaria, Perkawan, Sekolah Minggu, Remaja, Pemuda, Lansia) */}
      <section className="rounded-2xl border border-[#D4E4D8] bg-white p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[#0F2419]">
              Jumlah Jemaat per Organ Pelayanan ({activeSnapshot?.period || 'Periode Berjalan'})
            </h2>
            <p className="text-xs text-[#456051]">
              Rincian jumlah Perkaria, Perkawan, Sekolah Minggu, Remaja, Pemuda, dan Lansia berdasarkan statistik gereja & buku induk terdata.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums font-semibold text-[#146C43]">
            Buku Induk Terdaftar: {members.length} Jiwa
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ORGANS.map((organ) => {
            const statCount = activeSnapshot?.byOrgan[organ] || 0;
            const liveCount = liveOrganCounts[organ] || 0;
            const pct =
              activeSnapshot && activeSnapshot.total > 0
                ? Math.round((statCount / activeSnapshot.total) * 100)
                : 0;
            return (
              <div
                key={organ}
                className="rounded-xl border border-[#D4E4D8] bg-[#F5F9F6] p-4 space-y-1.5"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: ORGAN_COLORS[organ] }}
                  />
                  <span className="text-xs font-bold text-[#0F2419] truncate">{organ}</span>
                </div>
                <p className="text-2xl font-bold text-[#0F2419] font-mono tabular-nums">
                  {statCount} <span className="text-xs font-normal text-[#456051]">Jiwa</span>
                </p>
                <div className="text-[11px] text-[#456051] space-y-0.5">
                  <p className="font-mono tabular-nums">{pct}% dari total periode</p>
                  <p className="font-mono tabular-nums text-[#146C43] font-medium">
                    Buku induk: {liveCount} terdata
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Baptis & Status Pernikahan (Buku Induk Saat Ini) */}
        <div className="pt-4 border-t border-[#E6EFE8] space-y-3">
          <p className="text-xs font-semibold text-[#456051]">
            Rekapitulasi Status Baptisan & Status Pernikahan (Buku Induk Terdaftar: {members.length} Jiwa)
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-[#D4E4D8] bg-[#F5F9F6] p-4 space-y-1">
              <p className="text-xs font-bold text-[#146C43]">Sudah Baptis</p>
              <p className="text-2xl font-bold text-[#0F2419] font-mono tabular-nums">
                {statusSummary.baptized} <span className="text-xs font-normal text-[#456051]">Jiwa</span>
              </p>
              <p className="text-[11px] text-[#456051] font-mono tabular-nums">
                {members.length > 0 ? Math.round((statusSummary.baptized / members.length) * 100) : 0}% dari terdata
              </p>
            </div>
            <div className="rounded-xl border border-[#D4E4D8] bg-[#F5F9F6] p-4 space-y-1">
              <p className="text-xs font-bold text-[#B45309]">Belum Baptis</p>
              <p className="text-2xl font-bold text-[#0F2419] font-mono tabular-nums">
                {statusSummary.unbaptized} <span className="text-xs font-normal text-[#456051]">Jiwa</span>
              </p>
              <p className="text-[11px] text-[#456051] font-mono tabular-nums">
                {members.length > 0 ? Math.round((statusSummary.unbaptized / members.length) * 100) : 0}% dari terdata
              </p>
            </div>
            <div className="rounded-xl border border-[#D4E4D8] bg-[#F5F9F6] p-4 space-y-1">
              <p className="text-xs font-bold text-[#146C43]">Sudah Menikah</p>
              <p className="text-2xl font-bold text-[#0F2419] font-mono tabular-nums">
                {statusSummary.married} <span className="text-xs font-normal text-[#456051]">Jiwa</span>
              </p>
              <p className="text-[11px] text-[#456051] font-mono tabular-nums">
                {members.length > 0 ? Math.round((statusSummary.married / members.length) * 100) : 0}% dari terdata
              </p>
            </div>
            <div className="rounded-xl border border-[#D4E4D8] bg-[#F5F9F6] p-4 space-y-1">
              <p className="text-xs font-bold text-[#456051]">Belum Menikah</p>
              <p className="text-2xl font-bold text-[#0F2419] font-mono tabular-nums">
                {statusSummary.unmarried} <span className="text-xs font-normal text-[#456051]">Jiwa</span>
              </p>
              <p className="text-[11px] text-[#456051] font-mono tabular-nums">
                {members.length > 0 ? Math.round((statusSummary.unmarried / members.length) * 100) : 0}% dari terdata
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Chart 1: Pertumbuhan Berdasarkan Organ Pelayanan */}
      <section className="rounded-2xl border border-[#D4E4D8] bg-white p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0F2419]">
              1. Pertumbuhan Berdasarkan Organ Pelayanan
            </h2>
            <p className="text-xs text-[#456051]">
              Perbandingan jumlah anggota pada Perkaria, Perkawan, Sekolah Minggu, Remaja, Pemuda, dan Lansia.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#0F2419]">
            {ORGANS.map((organ) => (
              <span key={organ} className="inline-flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-xs shrink-0"
                  style={{ backgroundColor: ORGAN_COLORS[organ] }}
                />
                <span>{organ}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Grouped SVG Chart */}
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <svg viewBox="0 0 760 280" className="w-full h-64">
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = 230 - ratio * 185;
                const val = Math.round(maxOrganVal * ratio);
                return (
                  <g key={idx}>
                    <line
                      x1="48"
                      y1={y}
                      x2="740"
                      y2={y}
                      stroke="#E6EFE8"
                      strokeWidth="1"
                    />
                    <text
                      x="40"
                      y={y + 4}
                      textAnchor="end"
                      className="fill-[#456051] text-[10px] font-mono"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {series.map((snap, sIdx) => {
                const groupWidth = 680 / series.length;
                const groupX = 60 + sIdx * groupWidth;
                const barWidth = Math.min(20, (groupWidth - 30) / ORGANS.length);
                const startX = groupX + (groupWidth - barWidth * ORGANS.length - (ORGANS.length - 1) * 3) / 2;

                return (
                  <g
                    key={snap.period}
                    onMouseEnter={() => setHoveredPeriod(snap.period)}
                    className="cursor-pointer"
                  >
                    <rect
                      x={groupX + 4}
                      y="30"
                      width={groupWidth - 8}
                      height="210"
                      rx="8"
                      fill={hoveredPeriod === snap.period ? '#F5F9F6' : 'transparent'}
                    />
                    {ORGANS.map((organ, oIdx) => {
                      const val = snap.byOrgan[organ] || 0;
                      const h = (val / maxOrganVal) * 185;
                      const x = startX + oIdx * (barWidth + 3);
                      const y = 230 - h;
                      return (
                        <g key={organ}>
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={h}
                            rx="3"
                            fill={ORGAN_COLORS[organ]}
                          />
                          <text
                            x={x + barWidth / 2}
                            y={y - 5}
                            textAnchor="middle"
                            className="fill-[#0F2419] text-[10px] font-mono font-semibold"
                          >
                            {val}
                          </text>
                        </g>
                      );
                    })}
                    <text
                      x={groupX + groupWidth / 2}
                      y="256"
                      textAnchor="middle"
                      className="fill-[#0F2419] text-[12px] font-semibold"
                    >
                      {snap.period}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Summary Table by Organ */}
        <div className="overflow-x-auto border-t border-[#E6EFE8] pt-4">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="text-xs font-semibold text-[#456051] border-b border-[#E6EFE8]">
                <th className="py-2 pr-4">Organ Pelayanan</th>
                {series.map((s) => (
                  <th key={s.period} className="py-2 px-3 text-right font-mono tabular-nums">
                    {s.period}
                  </th>
                ))}
                <th className="py-2 pl-3 text-right whitespace-nowrap">Buku Induk Saat Ini</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EFE8]">
              {ORGANS.map((organ) => (
                <tr key={organ}>
                  <td className="py-2.5 pr-4 font-medium text-[#0F2419]">{organ}</td>
                  {series.map((s) => (
                    <td key={s.period} className="py-2.5 px-3 text-right font-mono tabular-nums text-[#0F2419]">
                      {s.byOrgan[organ] || 0}
                    </td>
                  ))}
                  <td className="py-2.5 pl-3 text-right font-mono tabular-nums font-semibold text-[#146C43]">
                    {liveOrganCounts[organ] || 0} terdata
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Chart 2: Pertumbuhan Berdasarkan Kategori Usia */}
      <section className="rounded-2xl border border-[#D4E4D8] bg-white p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-[#0F2419]">
              2. Pertumbuhan Berdasarkan Kategori Usia
            </h2>
            <p className="text-xs text-[#456051]">
              Distribusi kelompok usia Anak (0–12), Remaja (13–17), Pemuda (18–30), Dewasa (31–59), dan Lansia (60+).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-[#0F2419]">
            {AGE_CATEGORIES.map((age) => (
              <span key={age} className="inline-flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-xs shrink-0"
                  style={{ backgroundColor: AGE_COLORS[age] }}
                />
                <span>{age}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Stacked Proportional Trend Bars */}
        <div className="space-y-4">
          {series.map((snap) => {
            const widthPct = (snap.total / maxTotal) * 100;
            return (
              <div key={snap.period} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#0F2419]">{snap.period}</span>
                  <span className="font-mono tabular-nums font-semibold text-[#146C43]">
                    Total {snap.total} Jiwa
                  </span>
                </div>
                <div className="h-8 w-full rounded-lg bg-[#F5F9F6] border border-[#E6EFE8] overflow-hidden flex">
                  <div className="h-full flex overflow-hidden rounded-lg" style={{ width: `${widthPct}%` }}>
                    {AGE_CATEGORIES.map((age) => {
                      const val = snap.byAge[age] || 0;
                      const segPct = snap.total > 0 ? (val / snap.total) * 100 : 0;
                      return (
                        <div
                          key={age}
                          title={`${age}: ${val} jiwa`}
                          className="h-full flex items-center justify-center text-[10px] font-mono font-semibold text-white border-r border-white/25 last:border-r-0"
                          style={{
                            width: `${segPct}%`,
                            backgroundColor: AGE_COLORS[age],
                          }}
                        >
                          {segPct >= 9 ? val : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
