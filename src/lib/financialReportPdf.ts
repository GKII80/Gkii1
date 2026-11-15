import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatIndonesianDate, formatRupiah } from './dateAndFormat';

export type ReportPrintScope = 'bulanan' | 'tahunan' | 'lengkap';

export interface MonthlyReportRow {
  monthIndex: number;
  monthKey: string;
  monthName: string;
  shortName: string;
  count: number;
  masuk: number;
  keluar: number;
  selisih: number;
  closingBalance: number;
}

export interface MonthlyReportSummary {
  priorBalance: number;
  rows: MonthlyReportRow[];
  totalYearMasuk: number;
  totalYearKeluar: number;
  totalYearSelisih: number;
  totalYearCount: number;
  endBalance: number;
}

export interface AnnualRecapRow {
  year: string;
  count: number;
  masuk: number;
  keluar: number;
  selisih: number;
  closingBalance: number;
}

export interface AnnualRecapSummary {
  rows: AnnualRecapRow[];
  grandMasuk: number;
  grandKeluar: number;
  grandCount: number;
  grandBalance: number;
}

export interface CategorySummaryRow {
  category: string;
  masuk: number;
  keluar: number;
}

export interface GenerateFinancialPdfOptions {
  scope: ReportPrintScope;
  selectedYear: string;
  monthlyReport: MonthlyReportSummary;
  annualRecap: AnnualRecapSummary;
  categoryTotals: CategorySummaryRow[];
  includeCategories: boolean;
  signatoryName: string;
  signatoryRole: string;
  printedByLabel: string;
  currentBalance: number;
}

type DocWithAutoTable = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

export function generateFinancialReportPdf(options: GenerateFinancialPdfOptions): void {
  const {
    scope,
    selectedYear,
    monthlyReport,
    annualRecap,
    categoryTotals,
    includeCategories,
    signatoryName,
    signatoryRole,
    printedByLabel,
    currentBalance,
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  }) as DocWithAutoTable;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const todayIso = new Date().toISOString().slice(0, 10);
  const formattedToday = formatIndonesianDate(todayIso);

  // Top Emerald Letterhead Band
  doc.setFillColor(20, 108, 67); // #146C43
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('GEREJA KEMAH INJIL INDONESIA (GKII)', marginX, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text('JEMAAT SUNGAI BARANG · KALIMANTAN', marginX, 16.5);

  doc.setFontSize(8.5);
  doc.text('Laporan Resmi Pembukuan & Kas Jemaat', pageWidth - marginX, 11, {
    align: 'right',
  });
  doc.text(`Dicetak: ${formattedToday}`, pageWidth - marginX, 16.5, {
    align: 'right',
  });

  // Accent stripe
  doc.setFillColor(234, 243, 236); // #EAF3EC
  doc.rect(0, 28, pageWidth, 8, 'F');
  doc.setTextColor(15, 81, 50); // #0F5132
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Penanggung Jawab Cetak: ${printedByLabel}`, marginX, 33.3);

  let cursorY = 44;

  // Document Title
  const titleText =
    scope === 'bulanan'
      ? `LAPORAN KAS & PENGELUARAN BULANAN TAHUN ${selectedYear}`
      : scope === 'tahunan'
        ? 'REKAPAN KAS & PENGELUARAN PER TAHUN'
        : `LAPORAN KEUANGAN LENGKAP (TAHUNAN & BULANAN ${selectedYear})`;

  doc.setTextColor(15, 36, 25); // #0F2419
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text(titleText, marginX, cursorY);
  cursorY += 5.5;

  doc.setDrawColor(212, 228, 216); // #D4E4D8
  doc.setLineWidth(0.4);
  doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
  cursorY += 6;

  // Summary Cards Row
  const summaryCards =
    scope === 'tahunan'
      ? [
          {
            label: 'Total Tahun Buku',
            value: `${annualRecap.rows.length} Tahun`,
            color: [15, 36, 25] as [number, number, number],
          },
          {
            label: 'Akumulasi Pemasukan',
            value: formatRupiah(annualRecap.grandMasuk),
            color: [20, 108, 67] as [number, number, number],
          },
          {
            label: 'Akumulasi Pengeluaran',
            value: formatRupiah(annualRecap.grandKeluar),
            color: [185, 28, 28] as [number, number, number],
          },
          {
            label: 'Saldo Kas Akhir',
            value: formatRupiah(currentBalance),
            color: [15, 81, 50] as [number, number, number],
          },
        ]
      : [
          {
            label: `Saldo Bawaan (< ${selectedYear})`,
            value: formatRupiah(monthlyReport.priorBalance),
            color: [15, 36, 25] as [number, number, number],
          },
          {
            label: `Pemasukan ${selectedYear}`,
            value: formatRupiah(monthlyReport.totalYearMasuk),
            color: [20, 108, 67] as [number, number, number],
          },
          {
            label: `Pengeluaran ${selectedYear}`,
            value: formatRupiah(monthlyReport.totalYearKeluar),
            color: [185, 28, 28] as [number, number, number],
          },
          {
            label: `Saldo Akhir ${selectedYear}`,
            value: formatRupiah(monthlyReport.endBalance),
            color: [15, 81, 50] as [number, number, number],
          },
        ];

  const cardGap = 3;
  const cardW = (contentWidth - cardGap * 3) / 4;
  summaryCards.forEach((card, idx) => {
    const x = marginX + idx * (cardW + cardGap);
    if (idx === 3) {
      doc.setFillColor(234, 243, 236);
      doc.setDrawColor(191, 224, 201);
    } else {
      doc.setFillColor(245, 249, 246);
      doc.setDrawColor(212, 228, 216);
    }
    doc.roundedRect(x, cursorY, cardW, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(69, 96, 81);
    doc.text(card.label, x + 2.5, cursorY + 5.2);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(...card.color);
    doc.text(card.value, x + 2.5, cursorY + 12.2);
  });

  cursorY += 22;

  // SECTION 1: Monthly Table
  if (scope === 'bulanan' || scope === 'lengkap') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 36, 25);
    doc.text(
      `Rincian Kas & Pengeluaran Per Bulan (Tahun ${selectedYear})`,
      marginX,
      cursorY
    );
    cursorY += 3;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      theme: 'grid',
      headStyles: {
        fillColor: [20, 108, 67],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [15, 36, 25],
        cellPadding: 2.3,
      },
      alternateRowStyles: {
        fillColor: [245, 249, 246],
      },
      footStyles: {
        fillColor: [234, 243, 236],
        textColor: [15, 36, 25],
        fontSize: 8,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 34 },
        1: { halign: 'right', cellWidth: 16 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
      head: [
        [
          'Bulan',
          'Trx',
          'Pemasukan',
          'Pengeluaran',
          'Surplus / Defisit',
          'Saldo Akhir',
        ],
      ],
      body: monthlyReport.rows.map((r) => [
        `${r.monthName} ${selectedYear}`,
        String(r.count),
        r.masuk > 0 ? formatRupiah(r.masuk) : '—',
        r.keluar > 0 ? formatRupiah(r.keluar) : '—',
        r.count > 0
          ? `${r.selisih > 0 ? '+' : ''}${formatRupiah(r.selisih)}`
          : '—',
        formatRupiah(r.closingBalance),
      ]),
      foot: [
        [
          `Total Tahun ${selectedYear}`,
          String(monthlyReport.totalYearCount),
          formatRupiah(monthlyReport.totalYearMasuk),
          formatRupiah(monthlyReport.totalYearKeluar),
          `${monthlyReport.totalYearSelisih >= 0 ? '+' : ''}${formatRupiah(
            monthlyReport.totalYearSelisih
          )}`,
          formatRupiah(monthlyReport.endBalance),
        ],
      ],
    });

    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 8;
  }

  // SECTION 2: Annual Recap Table
  if (scope === 'tahunan' || scope === 'lengkap') {
    if (cursorY > pageHeight - 65) {
      doc.addPage();
      cursorY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 36, 25);
    doc.text('Rekapan Pemasukan & Pengeluaran Per Tahun', marginX, cursorY);
    cursorY += 3;

    const netGrand = annualRecap.grandMasuk - annualRecap.grandKeluar;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      theme: 'grid',
      headStyles: {
        fillColor: [20, 108, 67],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [15, 36, 25],
        cellPadding: 2.5,
      },
      alternateRowStyles: {
        fillColor: [245, 249, 246],
      },
      footStyles: {
        fillColor: [234, 243, 236],
        textColor: [15, 36, 25],
        fontSize: 8,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 26, fontStyle: 'bold' },
        1: { halign: 'right', cellWidth: 22 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
      },
      head: [
        [
          'Tahun Buku',
          'Transaksi',
          'Total Pemasukan',
          'Jumlah Pengeluaran',
          'Surplus / Defisit',
          'Saldo Kumulatif',
        ],
      ],
      body: annualRecap.rows.map((r) => [
        r.year,
        `${r.count} cat.`,
        formatRupiah(r.masuk),
        formatRupiah(r.keluar),
        `${r.selisih >= 0 ? '+' : ''}${formatRupiah(r.selisih)}`,
        formatRupiah(r.closingBalance),
      ]),
      foot: [
        [
          'Akumulasi',
          `${annualRecap.grandCount} cat.`,
          formatRupiah(annualRecap.grandMasuk),
          formatRupiah(annualRecap.grandKeluar),
          `${netGrand >= 0 ? '+' : ''}${formatRupiah(netGrand)}`,
          formatRupiah(annualRecap.grandBalance),
        ],
      ],
    });

    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 8;
  }

  // SECTION 3: Category Summary (Optional)
  if (includeCategories && categoryTotals.length > 0) {
    if (cursorY > pageHeight - 60) {
      doc.addPage();
      cursorY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 36, 25);
    doc.text('Ringkasan Kas per Kategori Pelayanan', marginX, cursorY);
    cursorY += 3;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      theme: 'grid',
      headStyles: {
        fillColor: [15, 81, 50],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [15, 36, 25],
        cellPadding: 2.2,
      },
      alternateRowStyles: {
        fillColor: [245, 249, 246],
      },
      columnStyles: {
        0: { cellWidth: 68 },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
      head: [['Kategori Pelayanan', 'Pemasukan', 'Pengeluaran', 'Selisih Bersih']],
      body: categoryTotals.map((c) => {
        const net = c.masuk - c.keluar;
        return [
          c.category,
          c.masuk > 0 ? formatRupiah(c.masuk) : '—',
          c.keluar > 0 ? formatRupiah(c.keluar) : '—',
          `${net > 0 ? '+' : ''}${formatRupiah(net)}`,
        ];
      }),
    });

    cursorY = (doc.lastAutoTable?.finalY ?? cursorY) + 8;
  }

  // Signature Block
  if (cursorY > pageHeight - 44) {
    doc.addPage();
    cursorY = 20;
  } else {
    cursorY += 4;
  }

  const leftSignX = marginX + 6;
  const rightSignX = pageWidth - marginX - 58;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(69, 96, 81);
  doc.text('Mengetahui,', leftSignX, cursorY);
  doc.text(`Desa Sungai Barang, ${formattedToday}`, rightSignX, cursorY);

  cursorY += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 36, 25);
  doc.text('Badan Pengurus Jemaat (BPJ)', leftSignX, cursorY);
  doc.text(signatoryRole, rightSignX, cursorY);

  cursorY += 18;
  doc.setDrawColor(160, 184, 168);
  doc.line(leftSignX, cursorY - 3, leftSignX + 48, cursorY - 3);
  doc.line(rightSignX, cursorY - 3, rightSignX + 52, cursorY - 3);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Pdt. Lukas H. Bangun, M.Th.', leftSignX, cursorY + 1.5);
  doc.text(signatoryName, rightSignX, cursorY + 1.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(69, 96, 81);
  doc.text('Gembala Sidang / Ketua BPJ', leftSignX, cursorY + 5.5);
  doc.text('GKII Jemaat Sungai Barang', rightSignX, cursorY + 5.5);

  // Page numbers on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 133, 118);
    doc.text(
      `GKII Jemaat Sungai Barang · Dokumen Laporan Keuangan Resmi`,
      marginX,
      pageHeight - 8
    );
    doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - marginX, pageHeight - 8, {
      align: 'right',
    });
  }

  const fileName =
    scope === 'bulanan'
      ? `laporan-kas-bulanan-gkii-${selectedYear}.pdf`
      : scope === 'tahunan'
        ? `rekapan-kas-tahunan-gkii.pdf`
        : `laporan-keuangan-lengkap-gkii-${selectedYear}.pdf`;

  doc.save(fileName);
}
