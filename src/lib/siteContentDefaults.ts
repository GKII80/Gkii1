import type { SiteTextContent } from '../types';

export const DEFAULT_SITE_CONTENT: SiteTextContent = {
  appTitle: 'GKII Sungai Barang',
  appSubtitle: 'Portal Jemaat & Pelayanan',
  footerOrg: 'Gereja Kemah Injil Indonesia (GKII) · Jemaat Sungai Barang',
  footerMotto: 'Melayani dengan Kasih, Kebenaran, dan Ketertiban',
  kopAddressLine:
    'Desa Sungai Barang, Kecamatan Kayan Selatan · Kabupaten Malinau · Kalimantan Utara',
  kopRegionLine: 'Pelayanan Jemaat · GKII Daerah Kalimantan Utara',
  navLabels: {
    beranda: 'Beranda',
    ibadah: 'Ibadah, Warta & Doa',
    renungan: 'Renungan Harian',
    kas: 'Kas & Pembukuan',
    jemaat: 'Data Jemaat & HUT',
    pertumbuhan: 'Pertumbuhan Jemaat',
    pengurus: 'Badan Pengurus',
    kepanitiaan: 'Kepanitiaan',
    surat: 'Arsip & Surat',
  },
  heroEyebrow: 'Gereja Kemah Injil Indonesia · Jemaat Sungai Barang',
  heroTitle: 'Portal Pelayanan, Persekutuan, dan Administrasi Jemaat',
  heroSubtitle:
    'Akses terpadu untuk jadwal ibadah, warta gereja, panduan doa harian, pembukuan kas jemaat secara transparan, serta pengingat ulang tahun dan rapat kepanitiaan secara langsung.',
  heroLocationLabel: 'Desa Sungai Barang · Kalimantan',
  heroBadgeCode: 'GKII',
  organHeading: 'Jumlah Jemaat per Organ Pelayanan',
  organSubtitle:
    'Rekapitulasi jumlah Perkaria, Perkawan, Sekolah Minggu, Remaja, Pemuda, dan Lansia.',
  organSubtitles: {
    Perkaria: 'Kaum Bapak',
    Perkawan: 'Kaum Ibu',
    'Sekolah Minggu': 'Anak',
    Remaja: 'Usia 13–17 th',
    Pemuda: 'Usia 18–30 th',
    Lansia: 'Usia 60+ th',
  },
  notifTitle: 'Notifikasi Otomatis Hari Ini',
  notifSubtitle:
    'Pembaruan langsung ulang tahun jemaat, pernikahan, dan pengingat rapat panitia.',
  galleryKicker: 'Dokumentasi Visual Pelayanan',
  galleryTitle: 'Galeri Kegiatan Gereja',
  gallerySubtitle:
    'Dokumentasi ibadah raya, pembinaan organ pelayanan, diakonia, dan kebersamaan Jemaat Sungai Barang.',
  sections: {
    ibadahTitle: 'Jadwal Ibadah, Warta Gereja & Doa Harian',
    ibadahSubtitle:
      'Pusat informasi peribadahan mingguan, warta jemaat resmi, dan dukungan doa harian GKII Sungai Barang.',
    renunganTitle: 'Renungan Harian & Berbagi Media Sosial',
    renunganSubtitle:
      'Baca firman Tuhan setiap hari dan bagikan langsung ke WhatsApp, Facebook, X, Telegram, atau kartu gambar.',
    kasTitle: 'Kas, Pembukuan & Laporan Keuangan',
    kasSubtitle:
      'Pencatatan pemasukan dan pengeluaran yang transparan, tertib, dan dapat dicetak dalam laporan bulanan maupun tahunan.',
    jemaatTitle: 'Data Jemaat, Ulang Tahun & Pernikahan',
    jemaatSubtitle:
      'Buku induk jemaat (KK, NIK, kelahiran, hubungan keluarga, pernikahan, & baptisan) serta pengingat hari spesial secara langsung.',
    pertumbuhanTitle: 'Grafik Pertumbuhan Jemaat Berkala',
    pertumbuhanSubtitle:
      'Statistik perkembangan jumlah jiwa berdasarkan Organ Pelayanan dan Kategori Usia di GKII Sungai Barang.',
    pengurusTitle: 'Badan Pengurus Jemaat (BPJ)',
    pengurusSubtitle:
      'Profil pengurus GKII Jemaat Sungai Barang lengkap dengan tanggung jawab pelayanan dan kontak yang dapat dihubungi.',
    kepanitiaanTitle: 'Kepanitiaan, Jadwal Rapat & Tugas',
    kepanitiaanSubtitle:
      'Pengaturan panitia pelayanan, pengingat jadwal rapat otomatis, serta pembagian tugas tiap seksi.',
    suratTitle: 'Arsip Surat, Sakramen & Foto Fisik Surat',
    suratSubtitle:
      'Kelola Surat Masuk, Surat Keluar, Surat Keputusan, Surat Nikah, Surat Baptis, Surat Persembahan Anak, dan arsip foto dokumen fisik.',
  },
};

export function mergeSiteContent(
  incoming?: Partial<SiteTextContent> | null
): SiteTextContent {
  if (!incoming) {
    return {
      ...DEFAULT_SITE_CONTENT,
      navLabels: { ...DEFAULT_SITE_CONTENT.navLabels },
      organSubtitles: { ...DEFAULT_SITE_CONTENT.organSubtitles },
      sections: { ...DEFAULT_SITE_CONTENT.sections },
    };
  }
  return {
    ...DEFAULT_SITE_CONTENT,
    ...incoming,
    navLabels: {
      ...DEFAULT_SITE_CONTENT.navLabels,
      ...(incoming.navLabels || {}),
    },
    organSubtitles: {
      ...DEFAULT_SITE_CONTENT.organSubtitles,
      ...(incoming.organSubtitles || {}),
    },
    sections: {
      ...DEFAULT_SITE_CONTENT.sections,
      ...(incoming.sections || {}),
    },
  };
}
