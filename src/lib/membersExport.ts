import * as XLSX from 'xlsx';
import { Member, OrganPelayanan } from '../types';
import { formatIndonesianDate } from './dateAndFormat';

const ORGAN_ORDER: OrganPelayanan[] = [
  'Perkaria',
  'Perkawan',
  'Sekolah Minggu',
  'Remaja',
  'Pemuda',
  'Lansia',
];

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const HEADERS = [
  'No',
  'Nama Lengkap',
  'Jenis Kelamin',
  'No. KK',
  'No. NIK',
  'Tempat Lahir',
  'Tanggal Lahir',
  'Hubungan dalam Keluarga',
  'Status Baptis',
  'Status Pernikahan',
  'Tanggal Nikah',
  'Nama Pasangan',
  'Organ Pelayanan',
  'Kategori Usia',
  'Sektor',
  'No. WhatsApp / Telepon',
  'Status Keanggotaan',
  'Tahun Terdaftar',
];

function memberToRow(m: Member, index: number): (string | number)[] {
  return [
    index + 1,
    m.fullName,
    m.gender === 'L' ? 'Laki-laki' : 'Perempuan',
    m.noKk || '',
    m.noNik || '',
    m.birthPlace || '',
    m.birthDate || '',
    m.familyRelationship || 'Kepala Keluarga',
    m.baptismStatus || 'Belum Baptis',
    m.weddingDate ? 'Sudah Menikah' : 'Belum Menikah',
    m.weddingDate || '',
    m.spouseName || '',
    m.organ,
    m.ageCategory,
    m.sector,
    m.phone || '',
    m.status,
    m.joinedYear,
  ];
}

export function exportMembersToCsv(members: Member[], filterLabel = 'Semua'): void {
  const rows = members.map((m, i) => memberToRow(m, i));
  const lines = [
    HEADERS.map(escapeCsvCell).join(','),
    ...rows.map((row) =>
      row
        .map((cell, colIdx) => {
          // Prefix tab/keep quoted clean string for No. KK (3), No. NIK (4), Phone (15)
          if ((colIdx === 3 || colIdx === 4 || colIdx === 15) && String(cell).length > 0) {
            return escapeCsvCell(String(cell));
          }
          return escapeCsvCell(cell);
        })
        .join(',')
    ),
  ];

  // UTF-8 BOM so Microsoft Excel & Google Sheets preserve Indonesian text cleanly
  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const dateStamp = new Date().toISOString().slice(0, 10);
  const safeSlug = filterLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  triggerDownload(blob, `data-jemaat-gkii-sungai-barang-${safeSlug || 'semua'}-${dateStamp}.csv`);
}

export function exportMembersToExcel(members: Member[], filterLabel = 'Semua'): void {
  const wb = XLSX.utils.book_new();
  const dateStamp = new Date().toISOString().slice(0, 10);

  // Sheet 1: Data Jemaat
  const titleRows: (string | number)[][] = [
    ['GEREJA KEMAH INJIL INDONESIA (GKII) — JEMAAT SUNGAI BARANG'],
    ['DATA BUKU INDUK ANGGOTA JEMAAT'],
    [`Penyaringan: ${filterLabel} | Total Data: ${members.length} Jiwa | Diekspor: ${formatIndonesianDate(dateStamp)}`],
    [],
    HEADERS,
    ...members.map((m, i) => memberToRow(m, i)),
  ];

  const wsData = XLSX.utils.aoa_to_sheet(titleRows);

  // Force string cell type on No. KK (col 3), No. NIK (col 4), Tanggal Lahir (col 6),
  // Tanggal Nikah (col 10), and No. WhatsApp (col 15) to prevent Excel scientific notation
  // or stripping leading zeros.
  const stringCols = [3, 4, 6, 10, 15];
  const headerRowIndex = 4; // 0-indexed row 5 in Excel
  for (let r = headerRowIndex + 1; r < titleRows.length; r++) {
    for (const c of stringCols) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = wsData[addr];
      if (cell) {
        cell.t = 's';
        cell.v = String(cell.v ?? '');
        cell.z = '@';
      }
    }
  }

  wsData['!cols'] = [
    { wch: 5 },  // No
    { wch: 26 }, // Nama Lengkap
    { wch: 12 }, // Jenis Kelamin
    { wch: 20 }, // No. KK
    { wch: 20 }, // No. NIK
    { wch: 18 }, // Tempat Lahir
    { wch: 14 }, // Tanggal Lahir
    { wch: 20 }, // Hubungan Keluarga
    { wch: 15 }, // Status Baptis
    { wch: 16 }, // Status Pernikahan
    { wch: 14 }, // Tanggal Nikah
    { wch: 22 }, // Nama Pasangan
    { wch: 18 }, // Organ Pelayanan
    { wch: 16 }, // Kategori Usia
    { wch: 24 }, // Sektor
    { wch: 18 }, // No. WhatsApp
    { wch: 16 }, // Status Keanggotaan
    { wch: 14 }, // Tahun Terdaftar
  ];

  wsData['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 8 } },
  ];

  XLSX.utils.book_append_sheet(wb, wsData, 'Data Jemaat');

  // Sheet 2: Ringkasan Statistik
  const total = members.length;
  const organCounts: Record<OrganPelayanan, number> = {
    Perkaria: 0,
    Perkawan: 0,
    'Sekolah Minggu': 0,
    Remaja: 0,
    Pemuda: 0,
    Lansia: 0,
  };
  let baptized = 0;
  let unbaptized = 0;
  let married = 0;
  let unmarried = 0;

  for (const m of members) {
    if (m.organ in organCounts) organCounts[m.organ] += 1;
    if ((m.baptismStatus || 'Belum Baptis') === 'Sudah Baptis') baptized += 1;
    else unbaptized += 1;
    if (m.weddingDate) married += 1;
    else unmarried += 1;
  }

  const summaryRows: (string | number)[][] = [
    ['REKAPITULASI STATISTIK JEMAAT — GKII SUNGAI BARANG'],
    [`Saringan Ekspor: ${filterLabel} | Tanggal: ${formatIndonesianDate(dateStamp)}`],
    [],
    ['Kategori', 'Jumlah (Jiwa)', 'Persentase'],
    ['Total Anggota Jemaat', total, '100%'],
    [],
    ['BERDASARKAN ORGAN PELAYANAN', '', ''],
    ...ORGAN_ORDER.map((org) => [
      org,
      organCounts[org],
      total > 0 ? `${Math.round((organCounts[org] / total) * 100)}%` : '0%',
    ]),
    [],
    ['BERDASARKAN STATUS BAPTISAN', '', ''],
    ['Sudah Baptis', baptized, total > 0 ? `${Math.round((baptized / total) * 100)}%` : '0%'],
    ['Belum Baptis', unbaptized, total > 0 ? `${Math.round((unbaptized / total) * 100)}%` : '0%'],
    [],
    ['BERDASARKAN STATUS PERNIKAHAN', '', ''],
    ['Sudah Menikah', married, total > 0 ? `${Math.round((married / total) * 100)}%` : '0%'],
    ['Belum Menikah', unmarried, total > 0 ? `${Math.round((unmarried / total) * 100)}%` : '0%'],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 16 }, { wch: 14 }];
  wsSummary['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Statistik');

  const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbArray], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const safeSlug = filterLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  triggerDownload(
    blob,
    `data-jemaat-gkii-sungai-barang-${safeSlug || 'semua'}-${dateStamp}.xlsx`
  );
}
