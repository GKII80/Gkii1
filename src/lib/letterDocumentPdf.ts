import { jsPDF } from 'jspdf';
import { ChurchLetter } from '../types';
import { formatIndonesianDate } from './dateAndFormat';
import { GKII_OFFICIAL_LOGO_URL } from '../components/GkiiLogo';

async function loadLogoBase64(logoUrl?: string): Promise<string | null> {
  try {
    const res = await fetch(logoUrl || GKII_OFFICIAL_LOGO_URL);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateChurchLetterPdf(
  letter: ChurchLetter,
  logoUrl?: string,
  kopLines?: { kopAddressLine?: string; kopRegionLine?: string }
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 20;
  const contentWidth = pageWidth - marginX * 2;

  // Kop Surat Gereja Kemah Injil Indonesia (GKII)
  const logoDataUrl = await loadLogoBase64(logoUrl);
  if (logoDataUrl) {
    try {
      const imgFmt = logoDataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
      doc.addImage(logoDataUrl, imgFmt, marginX, 13, 21, 21);
    } catch {
      // Ignore logo render failure
    }
  }

  const textCenterX = logoDataUrl ? pageWidth / 2 + 7 : pageWidth / 2;
  doc.setTextColor(15, 36, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('GEREJA KEMAH INJIL INDONESIA (GKII)', textCenterX, 18, {
    align: 'center',
  });
  doc.setFontSize(11.5);
  doc.setTextColor(20, 108, 67);
  doc.text('JEMAAT SUNGAI BARANG', textCenterX, 24, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(69, 96, 81);
  doc.text(
    kopLines?.kopAddressLine ||
      'Desa Sungai Barang, Kecamatan Kayan Selatan · Kabupaten Malinau · Kalimantan Utara',
    textCenterX,
    29.5,
    { align: 'center' }
  );
  doc.text(
    kopLines?.kopRegionLine ||
      'Sekretariat & Pelayanan Jemaat · GKII Daerah Kalimantan Utara',
    textCenterX,
    34,
    {
      align: 'center',
    }
  );

  // Double horizontal letterhead line
  doc.setDrawColor(20, 108, 67);
  doc.setLineWidth(0.9);
  doc.line(marginX, 38, pageWidth - marginX, 38);
  doc.setLineWidth(0.3);
  doc.line(marginX, 39.4, pageWidth - marginX, 39.4);

  let y = 50;

  // Document Heading
  doc.setTextColor(15, 36, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  const headingTitle =
    letter.letterType === 'Surat Masuk'
      ? 'LEMBAR ARSIP & DISPOSISI SURAT MASUK'
      : letter.letterType.toUpperCase();
  doc.text(headingTitle, pageWidth / 2, y, { align: 'center' });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Nomor: ${letter.letterNumber}`, pageWidth / 2, y, { align: 'center' });
  y += 12;

  const writeRow = (label: string, value: string | undefined) => {
    if (!value) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(69, 96, 81);
    doc.text(label, marginX, y);
    doc.text(':', marginX + 44, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 36, 25);
    const wrapped = doc.splitTextToSize(value, contentWidth - 48) as string[];
    doc.text(wrapped, marginX + 48, y);
    y += Math.max(6.5, wrapped.length * 5.2 + 1.5);
  };

  writeRow('Tanggal Surat', formatIndonesianDate(letter.letterDate));
  writeRow('Perihal / Judul', letter.subject);
  writeRow('Status Arsip', letter.status);

  y += 3;

  if (letter.letterType === 'Surat Masuk') {
    writeRow('Pengirim / Instansi', letter.sender);
    writeRow(
      'Tanggal Diterima',
      letter.receivedDate ? formatIndonesianDate(letter.receivedDate) : undefined
    );
    writeRow('Disposisi Sekretaris', letter.disposition);
  } else if (letter.letterType === 'Surat Keluar') {
    writeRow('Tujuan / Penerima', letter.recipient);
    writeRow('Penandatangan', letter.signer);
  } else if (letter.letterType === 'Surat Keputusan') {
    writeRow(
      'Berlaku Mulai',
      letter.effectiveDate ? formatIndonesianDate(letter.effectiveDate) : undefined
    );
    writeRow('Masa Berlaku', letter.validityPeriod);
    writeRow('Penandatangan SK', letter.signer);
  } else if (letter.letterType === 'Surat Nikah') {
    writeRow('Mempelai Pria', letter.groomName);
    writeRow('Mempelai Wanita', letter.brideName);
    writeRow('Tempat Pemberkatan', letter.ceremonyLocation);
    writeRow('Dilayani Oleh', letter.officiant);
    writeRow('Saksi-Saksi', letter.witnesses);
  } else if (letter.letterType === 'Surat Baptis') {
    writeRow('Nama yang Dibaptis', letter.baptizedName);
    writeRow('Tempat / Tgl Lahir', letter.birthInfo);
    writeRow('Nama Orang Tua', letter.parentsName);
    writeRow('Tempat Baptisan', letter.ceremonyLocation);
    writeRow('Dilayani Oleh', letter.officiant);
  } else if (letter.letterType === 'Surat Persembahan Anak') {
    writeRow('Nama Anak', letter.childName);
    writeRow('Tempat / Tgl Lahir', letter.birthInfo);
    writeRow('Nama Ayah', letter.fatherName);
    writeRow('Nama Ibu', letter.motherName);
    writeRow('Tempat Ibadah', letter.ceremonyLocation);
    writeRow('Didoakan Oleh', letter.officiant);
  }

  if (letter.notes) {
    y += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 108, 67);
    doc.text('Keterangan / Isi Ringkas:', marginX, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 36, 25);
    const notesLines = doc.splitTextToSize(letter.notes, contentWidth) as string[];
    doc.text(notesLines, marginX, y);
    y += notesLines.length * 5.4 + 4;
  }

  writeRow('Lampiran Foto Fisik', `${letter.physicalPhotos.length} halaman terarsip`);

  // Signature Block
  const signY = Math.max(y + 18, pageHeight - 62);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 36, 25);
  doc.text(
    `Sungai Barang, ${formatIndonesianDate(letter.letterDate)}`,
    pageWidth - marginX,
    signY,
    { align: 'right' }
  );

  doc.text('Mengetahui,', marginX + 22, signY + 8, { align: 'center' });
  doc.text('Gembala Sidang GKII Sungai Barang', marginX + 22, signY + 13.5, {
    align: 'center',
  });
  doc.setFont('helvetica', 'bold');
  doc.text('Pdt. Lukas H. Bangun, M.Th.', marginX + 22, signY + 34, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.text('Dicatat & Dikeluarkan Oleh,', pageWidth - marginX - 28, signY + 8, {
    align: 'center',
  });
  doc.text('Sekretaris Jemaat', pageWidth - marginX - 28, signY + 13.5, {
    align: 'center',
  });
  doc.setFont('helvetica', 'bold');
  doc.text(letter.recordedBy || 'Ibu Martha Simanjuntak', pageWidth - marginX - 28, signY + 34, {
    align: 'center',
  });

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(107, 133, 118);
  doc.text(
    `Arsip Resmi Sekretariat GKII Jemaat Sungai Barang · ${letter.letterNumber}`,
    marginX,
    pageHeight - 10
  );

  const safeNum = letter.letterNumber.replace(/[^a-zA-Z0-9-_]+/g, '-').toLowerCase();
  doc.save(`${letter.letterType.toLowerCase().replace(/\s+/g, '-')}-${safeNum}.pdf`);
}
