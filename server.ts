import crypto from 'node:crypto';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  AuthRoleType,
  AuthUser,
  ChurchAnnouncement,
  ChurchDatabase,
  ChurchIdentity,
  ChurchLetter,
  CommitteeMeeting,
  CommitteeTask,
  DailyPrayer,
  Devotional,
  FourfoldSymbolInfo,
  GalleryCategory,
  GalleryPhoto,
  LeadershipMember,
  LedgerEntry,
  LetterType,
  Member,
  PhysicalLetterPhoto,
  SiteTextContent,
  VisionMission,
  WorshipSchedule,
} from './src/types.ts';
import {
  DEFAULT_SITE_CONTENT,
  mergeSiteContent,
} from './src/lib/siteContentDefaults.ts';

const DEFAULT_CHURCH_IDENTITY: ChurchIdentity = {
  kicker: 'Identitas Resmi · Injil Empat Berganda',
  heading: 'Logo Gereja Kemah Injil Indonesia (GKII)',
  description:
    'Lambang resmi GKII Jemaat Sungai Barang yang memuat empat simbol pokok Injil Empat Berganda dan dapat diunduh untuk keperluan surat, warta cetak, maupun spanduk pelayanan.',
  churchName: 'Gereja Kemah Injil Indonesia',
  subLabel: 'Jemaat Sungai Barang · Injil Empat Berganda',
  logoUrl: '/assets/aistudio/Logo_GKII_Warna_adc8a1a7.png',
  symbols: [
    {
      id: 'salib',
      symbolName: 'Salib',
      title: 'Yesus Kristus Juruselamat Kita',
      verseRef: 'Kisah Para Rasul 4:12',
      meaning:
        'Melambangkan pengorbanan Kristus di kayu salib untuk menebus dosa manusia dan menganugerahkan keselamatan kekal.',
    },
    {
      id: 'kendi',
      symbolName: 'Buli-Buli Minyak (Kendi)',
      title: 'Yesus Kristus Penyembuh Kita',
      verseRef: 'Yakobus 5:15',
      meaning:
        'Melambangkan urapan minyak dan kuasa pemulihan Tuhan Yesus bagi tubuh yang sakit maupun jiwa yang lemah.',
    },
    {
      id: 'cawan',
      symbolName: 'Bejana Pembasuhan (Cawan)',
      title: 'Yesus Kristus Pengudus Kita',
      verseRef: '2 Petrus 1:3',
      meaning:
        'Melambangkan kekudusan hidup yang dikerjakan oleh kuasa Roh Kudus dan firman Tuhan dalam perjalanan iman orang percaya.',
    },
    {
      id: 'mahkota',
      symbolName: 'Mahkota',
      title: 'Yesus Kristus Raja yang Akan Datang',
      verseRef: 'Markus 14:62',
      meaning:
        'Melambangkan pengharapan kedatangan Yesus Kristus kembali sebagai Raja segala raja dan Hakim yang mulia.',
    },
  ],
};

const DEFAULT_VISION_MISSION: VisionMission = {
  period: '2024 – 2028',
  vision:
    'Menjadi Jemaat Kemah Injil yang dewasa dalam iman, teguh dalam kasih persaudaraan, dan berdampak bagi masyarakat Sungai Barang serta misi penginjilan.',
  missions: [
    'Membangun kehidupan ibadah dan doa jemaat yang hidup, alkitabiah, dan berpusat pada Kristus.',
    'Memperlengkapi keluarga, anak Sekolah Minggu, pemuda, Perkawan, Perkaria, dan lansia melalui pemuridan yang berkelanjutan.',
    'Mewujudkan pelayanan kasih dan diakonia yang nyata bagi jemaat dan warga sekitar Desa Sungai Barang.',
    'Mengelola organisasi, kepanitiaan, dan keuangan gereja secara tertib, jujur, dan transparan demi kemuliaan Tuhan.',
  ],
  themeVerseRef: 'Kolose 2:7',
  themeVerseText:
    'Hendaklah kamu berakar di dalam Dia dan dibangun di atas Dia, hendaklah kamu bertambah teguh dalam iman yang telah diajarkan kepadamu, dan hendaklah hatimu melimpah dengan syukur.',
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'church-db.json');

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatYMD(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatDateTimeLocal(d: Date): string {
  return `${formatYMD(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function createInitialData(): ChurchDatabase {
  const now = new Date();
  const todayYMD = formatYMD(now);
  const plus2Days = addDays(now, 2);
  const plus5Days = addDays(now, 5);
  const plus1Day = addDays(now, 1);
  const minus3Days = addDays(now, -3);
  const minus6Days = addDays(now, -6);

  const imminentMeeting = new Date(now.getTime() + 45 * 60 * 1000);
  const tomorrowMeeting = new Date(plus1Day.getFullYear(), plus1Day.getMonth(), plus1Day.getDate(), 18, 30);
  const nextWeekMeeting = new Date(plus5Days.getFullYear(), plus5Days.getMonth(), plus5Days.getDate(), 19, 0);

  const todayMD = `${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  const plus2MD = `${pad2(plus2Days.getMonth() + 1)}-${pad2(plus2Days.getDate())}`;
  const plus5MD = `${pad2(plus5Days.getMonth() + 1)}-${pad2(plus5Days.getDate())}`;

  return {
    visionMission: DEFAULT_VISION_MISSION,
    churchIdentity: DEFAULT_CHURCH_IDENTITY,
    siteContent: mergeSiteContent(),
    schedules: [
      {
        id: 'sch-1',
        title: 'Ibadah Raya Minggu Pagi',
        organ: 'Umum / Raya',
        dayOfWeek: 'Minggu',
        time: '09:00 WIB',
        location: 'Gedung Gereja Utama GKII Sungai Barang',
        mcName: 'Sdr. Daniel Putra, S.Kom.',
        speaker: 'Pdt. Lukas H. Bangun, M.Th.',
        offeringCollectors: 'Ibu Martha Simanjuntak & Bpk. Yohanes Kiding',
        intercessoryPrayerLeader: 'Bpk. Andreas Lawing',
        theme: 'Berakar, Bertumbuh, dan Berbuah dalam Kasih Kristus',
        notes: 'Disertai Perjamuan Kudus pada Minggu Pertama setiap bulan.',
      },
      {
        id: 'sch-2',
        title: 'Ibadah Sekolah Minggu & Tunas',
        organ: 'Sekolah Minggu',
        dayOfWeek: 'Minggu',
        time: '07:30 WIB',
        location: 'Ruang Pelayanan Anak Sungai Barang',
        mcName: 'Sdri. Gabriela Tika',
        speaker: 'Kak Ester L. & Tim Guru SM',
        offeringCollectors: 'Adik Clara Jelita & Tim Tunas',
        intercessoryPrayerLeader: 'Kak Ester L.',
        theme: 'Yesus Sahabat Terbaik Anak-Anak',
        notes: 'Dibagi menjadi Kelas Balita, Pratama, dan Madya.',
      },
      {
        id: 'sch-3',
        title: 'Persekutuan Pemuda & Remaja (PERKARYA)',
        organ: 'Pemuda & Remaja',
        dayOfWeek: 'Sabtu',
        time: '17:00 WIB',
        location: 'Aula Serbaguna GKII Sungai Barang',
        mcName: 'Sdri. Gabriela Tika',
        speaker: 'Sdr. Daniel Putra, S.Kom.',
        offeringCollectors: 'Sdr. Kevin Apui & Adik Clara Jelita',
        intercessoryPrayerLeader: 'Sdri. Gabriela Tika',
        theme: 'Menjadi Terang di Era Digital',
        notes: 'Dilanjutkan latihan musik pujian bagi tim pelayanan pemuda.',
      },
      {
        id: 'sch-4',
        title: 'Ibadah Kaum Wanita (PERKAWAN)',
        organ: 'Perkawan',
        dayOfWeek: 'Kamis',
        time: '16:00 WIB',
        location: 'Gedung Gereja Utama / Bergilir Rumah Jemaat',
        mcName: 'Ibu Maria Bilung',
        speaker: 'Ibu Martha Simanjuntak',
        offeringCollectors: 'Ibu Dina Lenjau & Ibu Ruth Marbun',
        intercessoryPrayerLeader: 'Ibu Dina Lenjau',
        theme: 'Perempuan yang Takut Akan Tuhan',
        notes: 'Membawa Alkitab dan Kidung Kemah Injil.',
      },
      {
        id: 'sch-5',
        title: 'Ibadah Kaum Pria (PERKARIA)',
        organ: 'Perkaria',
        dayOfWeek: 'Jumat',
        time: '19:00 WIB',
        location: 'Aula Serbaguna GKII Sungai Barang',
        mcName: 'Bpk. Andreas Lawing',
        speaker: 'Bpk. Yohanes Kiding',
        offeringCollectors: 'Bpk. Samuel Marbun & Bpk. Markus Lawai',
        intercessoryPrayerLeader: 'Bpk. Yohanes Kiding',
        theme: 'Imam dalam Keluarga dan Teladan di Masyarakat',
      },
      {
        id: 'sch-6',
        title: 'Ibadah Doa Syafaat & Persekutuan Sektor',
        organ: 'Doa & Sektor',
        dayOfWeek: 'Rabu',
        time: '19:00 WIB',
        location: 'Rumah Keluarga Jemaat (Sektor I – IV)',
        mcName: 'Ibu Martha Simanjuntak',
        speaker: 'Majelis & Penatua Sektor',
        offeringCollectors: 'Tuan Rumah & Diaken Sektor',
        intercessoryPrayerLeader: 'Pdt. Lukas H. Bangun, M.Th.',
        theme: 'Doa yang Kuat Menggerakkan Pelayanan',
      },
      {
        id: 'sch-7',
        title: 'Persekutuan Lanjut Usia (Lansia)',
        organ: 'Lansia',
        dayOfWeek: 'Selasa',
        time: '09:30 WIB',
        location: 'Ruang Konsistori & Taman Gereja',
        mcName: 'Oma Naomi Lawai',
        speaker: 'Pdt. Lukas H. Bangun, M.Th.',
        offeringCollectors: 'Ibu Ruth Marbun & Ibu Maria Bilung',
        intercessoryPrayerLeader: 'Opa Petrus Ubung',
        theme: 'Masa Tua yang Tetap Berbuah Lebat (Mazmur 92:15)',
        notes: 'Tersedia pemeriksaan tekanan darah ringan & ramah tamah sehat.',
      },
    ],
    announcements: [
      {
        id: 'ann-1',
        title: 'Persiapan Perayaan Natal Jemaat Sungai Barang',
        date: todayYMD,
        category: 'Kegiatan Gereja',
        summary: 'Undangan rapat koordinasi seluruh seksi kepanitiaan Natal dan jadwal latihan paduan suara gabungan.',
        content:
          'Kepada seluruh anggota panitia dan pelayan musik GKII Jemaat Sungai Barang, diharapkan hadir dalam rapat koordinasi persiapan Natal jemaat. Latihan paduan suara gabungan Perkawan, Perkaria, dan Pemuda diadakan setiap hari Sabtu pukul 19:30 WIB di gedung gereja utama.',
        author: 'Sekretariat BPJ',
      },
      {
        id: 'ann-2',
        title: 'Bakti Sosial Kesehatan & Kunjungan Diakonia Lansia',
        date: formatYMD(minus3Days),
        category: 'Pelayanan',
        summary: 'Tim Diakonia akan melaksanakan kunjungan kasih dan pembagian paket sembako ke rumah jemaat lansia di Sektor I–IV.',
        content:
          'Pelayanan Diakonia jemaat akan mengunjungi 14 keluarga lanjut usia dan jemaat yang sedang dalam pemulihan kesehatan. Jemaat yang tergerak mendukung pelayanan ini dapat menyalurkannya melalui kotak Diakonia setiap ibadah Minggu atau menghubungi Bendahara Jemaat.',
        author: 'Seksi Diakonia',
      },
      {
        id: 'ann-3',
        title: 'Laporan Penerimaan Persembahan Ibadah Minggu Lalu',
        date: formatYMD(minus6Days),
        category: 'Keuangan & Pembangunan',
        summary: 'Rekapitulasi persembahan ibadah raya, sekolah minggu, persepuluhan, dan dana pemeliharaan gedung.',
        content:
          'Puji syukur kepada Tuhan atas kesetiaan jemaat dalam memberi. Total penerimaan pekan lalu telah dicatat dalam Buku Kas Jemaat dan dapat diperiksa secara transparan pada menu Kas & Pembukuan.',
        author: 'Ibu Ruth Marbun (Bendahara)',
      },
    ],
    prayers: [
      {
        id: 'pry-1',
        title: 'Kesehatan & Pemulihan Jemaat yang Sakit',
        category: 'Jemaat Sakit & Pemulihan',
        verseRef: 'Yeremia 30:17',
        verseText: 'Sebab Aku akan mendatangkan kesembuhan bagimu, Aku akan mengobati luka-lukamu, demikianlah firman TUHAN.',
        guideSteps: [
          'Doakan pemulihan fisik bagi Bpk. Petrus Ubung dan Ibu Naomi Lawai agar diberi kekuatan dari Tuhan.',
          'Doakan ketabahan serta sukacita bagi keluarga yang setia mendampingi dan merawat.',
          'Doakan hikmat bagi para dokter dan tenaga kesehatan yang menangani.',
        ],
        prayedCount: 28,
        date: todayYMD,
      },
      {
        id: 'pry-2',
        title: 'Pertumbuhan Iman Pemuda & Anak Sekolah Minggu',
        category: 'Keluarga & Pemuda',
        verseRef: '1 Timotius 4:12',
        verseText: 'Jangan seorangpun menganggap engkau rendah karena engkau muda. Jadilah teladan bagi orang-orang percaya.',
        guideSteps: [
          'Doakan anak-anak dan remaja Sungai Barang agar memiliki hati yang takut akan Tuhan di tengah tantangan zaman.',
          'Doakan para guru Sekolah Minggu dan pembina pemuda supaya terus diperlengkapi dengan kesabaran dan kasih.',
          'Doakan studi, pekerjaan, dan masa depan generasi muda jemaat.',
        ],
        prayedCount: 19,
        date: todayYMD,
      },
      {
        id: 'pry-3',
        title: 'Pelayanan Misi Pedalaman & Kemah Injil',
        category: 'Misi & Penginjilan',
        verseRef: 'Matius 28:19',
        verseText: 'Karena itu pergilah, jadikanlah semua bangsa murid-Ku dan baptislah mereka dalam nama Bapa dan Anak dan Roh Kudus.',
        guideSteps: [
          'Doakan para penginjil dan pos pelayanan GKII di wilayah pedalaman agar dilindungi dalam perjalanan pelayanan.',
          'Doakan kecukupan dana misi dan kebutuhan jemaat-jemaat rintisan.',
        ],
        prayedCount: 24,
        date: todayYMD,
      },
      {
        id: 'pry-4',
        title: 'Damai Sejahtera bagi Desa Sungai Barang & Bangsa Indonesia',
        category: 'Bangsa & Negara',
        verseRef: 'Yeremia 29:7',
        verseText: 'Usahakanlah kesejahteraan kota ke mana kamu Aku buang, dan berdoalah untuk kota itu kepada TUHAN.',
        guideSteps: [
          'Doakan kerukunan antarwarga di Sungai Barang, pemimpin desa, dan pemerintah daerah.',
          'Doakan kelancaran panen, usaha pertanian, serta pekerjaan seluruh kepala keluarga jemaat.',
        ],
        prayedCount: 31,
        date: todayYMD,
      },
    ],
    ledger: [
      {
        id: 'led-h1',
        date: '2024-06-09',
        voucherNo: 'KM-2024-045',
        description: 'Persembahan Ibadah Raya & Persepuluhan Semester I',
        category: 'Persembahan Ibadah',
        type: 'masuk',
        amount: 42500000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h2',
        date: '2024-06-22',
        voucherNo: 'KK-2024-028',
        description: 'Operasional Pelayanan & Pemeliharaan Gedung Ibadah 2024',
        category: 'Operasional Gereja',
        type: 'keluar',
        amount: 26800000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h3',
        date: '2024-12-15',
        voucherNo: 'KM-2024-098',
        description: 'Persembahan Natal & Ucapan Syukur Akhir Tahun 2024',
        category: 'Ucapan Syukur',
        type: 'masuk',
        amount: 24300000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h4',
        date: '2024-12-20',
        voucherNo: 'KK-2024-077',
        description: 'Bantuan Diakonia Natal & Dukungan Misi Daerah 2024',
        category: 'Diakonia',
        type: 'keluar',
        amount: 14900000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h5',
        date: '2025-03-16',
        voucherNo: 'KM-2025-022',
        description: 'Persepuluhan & Persembahan Ibadah Triwulan I 2025',
        category: 'Persepuluhan',
        type: 'masuk',
        amount: 21400000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h6',
        date: '2025-04-12',
        voucherNo: 'KK-2025-019',
        description: 'Perbaikan Sistem Audio & Kursi Ruang Ibadah 2025',
        category: 'Operasional Gereja',
        type: 'keluar',
        amount: 12600000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h7',
        date: '2025-08-17',
        voucherNo: 'KM-2025-064',
        description: 'Kolekte Syukur Kemerdekaan & Pembangunan Gedung',
        category: 'Pembangunan',
        type: 'masuk',
        amount: 28900000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h8',
        date: '2025-11-24',
        voucherNo: 'KK-2025-058',
        description: 'Dukungan Misi Pedalaman & Diakonia Keluarga Jemaat',
        category: 'Misi & Penginjilan',
        type: 'keluar',
        amount: 16400000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h9',
        date: `${now.getFullYear()}-01-18`,
        voucherNo: 'KM-2026-004',
        description: 'Persembahan Ibadah Awal Tahun & Persepuluhan Januari',
        category: 'Persepuluhan',
        type: 'masuk',
        amount: 16200000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h10',
        date: `${now.getFullYear()}-01-25`,
        voucherNo: 'KK-2026-003',
        description: 'Tagihan Listrik, Air & Perlengkapan Ibadah Januari',
        category: 'Operasional Gereja',
        type: 'keluar',
        amount: 4950000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h11',
        date: `${now.getFullYear()}-03-08`,
        voucherNo: 'KM-2026-021',
        description: 'Persembahan Ibadah Raya & Ucapan Syukur Panen',
        category: 'Ucapan Syukur',
        type: 'masuk',
        amount: 14800000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h12',
        date: `${now.getFullYear()}-03-22`,
        voucherNo: 'KK-2026-014',
        description: 'Pelayanan Paskah, Diakonia & Buku Sekolah Minggu',
        category: 'Diakonia',
        type: 'keluar',
        amount: 6200000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h13',
        date: `${now.getFullYear()}-06-14`,
        voucherNo: 'KM-2026-052',
        description: 'Persepuluhan Jemaat & Donasi Pemeliharaan Gereja Juni',
        category: 'Persepuluhan',
        type: 'masuk',
        amount: 17900000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h14',
        date: `${now.getFullYear()}-06-24`,
        voucherNo: 'KK-2026-027',
        description: 'Perawatan Genset, Sound System & Utilitas Semester I',
        category: 'Operasional Gereja',
        type: 'keluar',
        amount: 5800000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h15',
        date: `${now.getFullYear()}-09-13`,
        voucherNo: 'KM-2026-079',
        description: 'Persembahan Ibadah Raya & Misi Daerah September',
        category: 'Persembahan Ibadah',
        type: 'masuk',
        amount: 15400000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h16',
        date: `${now.getFullYear()}-09-21`,
        voucherNo: 'KK-2026-035',
        description: 'Bantuan Misi Pedalaman & Kunjungan Sektor Hulu',
        category: 'Misi & Penginjilan',
        type: 'keluar',
        amount: 6450000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h17',
        date: `${now.getFullYear()}-10-11`,
        voucherNo: 'KM-2026-091',
        description: 'Persembahan Ibadah Raya & Persepuluhan Oktober',
        category: 'Persepuluhan',
        type: 'masuk',
        amount: 16900000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-h18',
        date: `${now.getFullYear()}-10-19`,
        voucherNo: 'KK-2026-039',
        description: 'Belanja Material Cat & Atap Awal Ruang Sekolah Minggu',
        category: 'Pembangunan',
        type: 'keluar',
        amount: 7150000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-1',
        date: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`,
        voucherNo: 'KM-2026-101',
        description: 'Persembahan Ibadah Raya Minggu I Bulan Ini',
        category: 'Persembahan Ibadah',
        type: 'masuk',
        amount: 9500000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-2',
        date: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-03`,
        voucherNo: 'KM-2026-102',
        description: 'Penerimaan Persepuluhan Jemaat (Amplop 01–18)',
        category: 'Persepuluhan',
        type: 'masuk',
        amount: 8750000,
        recordedBy: 'Ruth Marbun',
        donorName: 'Kel. Bpk. Yohanes Kiding & Keluarga Sektor I',
      },
      {
        id: 'led-3',
        date: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-04`,
        voucherNo: 'KK-2026-041',
        description: 'Pembayaran Listrik, Air & Pemeliharaan Sound System Gereja',
        category: 'Operasional Gereja',
        type: 'keluar',
        amount: 1850000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-4',
        date: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-06`,
        voucherNo: 'KK-2026-042',
        description: 'Bantuan Diakonia Pengobatan & Paket Sembako Lansia',
        category: 'Diakonia',
        type: 'keluar',
        amount: 2400000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-5',
        date: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-08`,
        voucherNo: 'KM-2026-103',
        description: 'Persembahan Ibadah Minggu II & Ucapan Syukur Keluarga',
        category: 'Ucapan Syukur',
        type: 'masuk',
        amount: 6350000,
        recordedBy: 'Ruth Marbun',
        donorName: 'Kel. Bpk. Andreas Lawing',
      },
      {
        id: 'led-6',
        date: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-10`,
        voucherNo: 'KK-2026-043',
        description: 'Dukungan Pos Misi Pedalaman & Pembelian Buku Sekolah Minggu',
        category: 'Misi & Penginjilan',
        type: 'keluar',
        amount: 3100000,
        recordedBy: 'Ruth Marbun',
      },
      {
        id: 'led-7',
        date: todayYMD,
        voucherNo: 'KM-2026-104',
        description: 'Donasi Dana Renovasi Atap & Pengecatan Ruang Anak',
        category: 'Pembangunan',
        type: 'masuk',
        amount: 5200000,
        recordedBy: 'Ruth Marbun',
      },
    ],
    members: [
      {
        id: 'mem-1',
        fullName: 'Bpk. Yohanes Kiding',
        gender: 'L',
        noKk: '6503041205120001',
        noNik: '6503041405780001',
        birthPlace: 'Sungai Barang',
        birthDate: `1978-${todayMD}`,
        familyRelationship: 'Kepala Keluarga',
        weddingDate: `2004-${plus2MD}`,
        spouseName: 'Ibu Maria Bilung',
        baptismStatus: 'Sudah Baptis',
        phone: '081254108811',
        sector: 'Sektor I - Hilir',
        organ: 'Perkaria',
        ageCategory: 'Dewasa (31-59)',
        status: 'Aktif',
        joinedYear: 2012,
      },
      {
        id: 'mem-2',
        fullName: 'Ibu Maria Bilung',
        gender: 'P',
        noKk: '6503041205120001',
        noNik: '6503045804810002',
        birthPlace: 'Long Nawang',
        birthDate: '1981-04-18',
        familyRelationship: 'Istri',
        weddingDate: `2004-${plus2MD}`,
        spouseName: 'Bpk. Yohanes Kiding',
        baptismStatus: 'Sudah Baptis',
        phone: '081254108812',
        sector: 'Sektor I - Hilir',
        organ: 'Perkawan',
        ageCategory: 'Dewasa (31-59)',
        status: 'Aktif',
        joinedYear: 2012,
      },
      {
        id: 'mem-3',
        fullName: 'Sdri. Gabriela Tika',
        gender: 'P',
        noKk: '6503040809180004',
        noNik: '6503044505020003',
        birthPlace: 'Sungai Barang',
        birthDate: `2002-${todayMD}`,
        familyRelationship: 'Anak',
        weddingDate: null,
        spouseName: null,
        baptismStatus: 'Sudah Baptis',
        phone: '085247889102',
        sector: 'Sektor II - Tengah',
        organ: 'Pemuda',
        ageCategory: 'Pemuda (18-30)',
        status: 'Aktif',
        joinedYear: 2018,
      },
      {
        id: 'mem-4',
        fullName: 'Bpk. Andreas Lawing',
        gender: 'L',
        noKk: '6503041008100002',
        noNik: '6503041209740001',
        birthPlace: 'Data Dian',
        birthDate: '1974-09-12',
        familyRelationship: 'Kepala Keluarga',
        weddingDate: `2001-${todayMD}`,
        spouseName: 'Ibu Dina Lenjau',
        baptismStatus: 'Sudah Baptis',
        phone: '081347221904',
        sector: 'Sektor III - Hulu',
        organ: 'Perkaria',
        ageCategory: 'Dewasa (31-59)',
        status: 'Aktif',
        joinedYear: 2010,
      },
      {
        id: 'mem-5',
        fullName: 'Ibu Dina Lenjau',
        gender: 'P',
        noKk: '6503041008100002',
        noNik: '6503045911770002',
        birthPlace: 'Sungai Barang',
        birthDate: `1977-${plus5MD}`,
        familyRelationship: 'Istri',
        weddingDate: `2001-${todayMD}`,
        spouseName: 'Bpk. Andreas Lawing',
        baptismStatus: 'Sudah Baptis',
        phone: '081347221905',
        sector: 'Sektor III - Hulu',
        organ: 'Perkawan',
        ageCategory: 'Dewasa (31-59)',
        status: 'Aktif',
        joinedYear: 2010,
      },
      {
        id: 'mem-6',
        fullName: 'Opa Petrus Ubung',
        gender: 'L',
        noKk: '6503040504980003',
        noNik: '6503041605580001',
        birthPlace: 'Sungai Barang',
        birthDate: `1958-${plus2MD}`,
        familyRelationship: 'Kepala Keluarga',
        weddingDate: '1984-06-21',
        spouseName: 'Oma Naomi Lawai',
        baptismStatus: 'Sudah Baptis',
        phone: '082155904411',
        sector: 'Sektor I - Hilir',
        organ: 'Lansia',
        ageCategory: 'Lansia (60+)',
        status: 'Aktif',
        joinedYear: 1998,
      },
      {
        id: 'mem-7',
        fullName: 'Oma Naomi Lawai',
        gender: 'P',
        noKk: '6503040504980003',
        noNik: '6503044308610002',
        birthPlace: 'Long Sule',
        birthDate: '1961-08-03',
        familyRelationship: 'Istri',
        weddingDate: '1984-06-21',
        spouseName: 'Opa Petrus Ubung',
        baptismStatus: 'Sudah Baptis',
        phone: '082155904412',
        sector: 'Sektor I - Hilir',
        organ: 'Lansia',
        ageCategory: 'Lansia (60+)',
        status: 'Aktif',
        joinedYear: 1998,
      },
      {
        id: 'mem-8',
        fullName: 'Sdr. Daniel Putra',
        gender: 'L',
        noKk: '6503041502160005',
        noNik: '6503042703950001',
        birthPlace: 'Malinau',
        birthDate: '1995-03-27',
        familyRelationship: 'Kepala Keluarga',
        weddingDate: null,
        spouseName: null,
        baptismStatus: 'Sudah Baptis',
        phone: '081258883301',
        sector: 'Sektor IV - Sungai Barang',
        organ: 'Pemuda',
        ageCategory: 'Pemuda (18-30)',
        status: 'Aktif',
        joinedYear: 2016,
      },
      {
        id: 'mem-9',
        fullName: 'Adik Samuel Apui',
        gender: 'L',
        noKk: '6503041205120001',
        noNik: '6503041405160003',
        birthPlace: 'Sungai Barang',
        birthDate: '2016-05-14',
        familyRelationship: 'Anak',
        weddingDate: null,
        spouseName: null,
        baptismStatus: 'Belum Baptis',
        phone: '081254108811',
        sector: 'Sektor I - Hilir',
        organ: 'Sekolah Minggu',
        ageCategory: 'Anak (0-12)',
        status: 'Aktif',
        joinedYear: 2021,
      },
      {
        id: 'mem-10',
        fullName: 'Adik Clara Jelita',
        gender: 'P',
        noKk: '6503041008100002',
        noNik: '6503045911110003',
        birthPlace: 'Sungai Barang',
        birthDate: `2011-${plus5MD}`,
        familyRelationship: 'Anak',
        weddingDate: null,
        spouseName: null,
        baptismStatus: 'Belum Baptis',
        phone: '081347221904',
        sector: 'Sektor III - Hulu',
        organ: 'Remaja',
        ageCategory: 'Remaja (13-17)',
        status: 'Aktif',
        joinedYear: 2019,
      },
      {
        id: 'mem-11',
        fullName: 'Ibu Ruth Marbun',
        gender: 'P',
        noKk: '6503042107140006',
        noNik: '6503044912820002',
        birthPlace: 'Tanjung Selor',
        birthDate: '1982-12-09',
        familyRelationship: 'Istri',
        weddingDate: '2009-07-17',
        spouseName: 'Bpk. Samuel Marbun',
        baptismStatus: 'Sudah Baptis',
        phone: '081349001122',
        sector: 'Sektor II - Tengah',
        organ: 'Perkawan',
        ageCategory: 'Dewasa (31-59)',
        status: 'Aktif',
        joinedYear: 2014,
      },
      {
        id: 'mem-12',
        fullName: 'Adik Mikhael Ngau',
        gender: 'L',
        noKk: '6503040809180004',
        noNik: '6503041102180004',
        birthPlace: 'Sungai Barang',
        birthDate: '2018-02-11',
        familyRelationship: 'Anak',
        weddingDate: null,
        spouseName: null,
        baptismStatus: 'Belum Baptis',
        phone: '085247889102',
        sector: 'Sektor IV - Sungai Barang',
        organ: 'Sekolah Minggu',
        ageCategory: 'Anak (0-12)',
        status: 'Aktif',
        joinedYear: 2023,
      },
    ],
    leadership: [
      {
        id: 'bpj-1',
        name: 'Pdt. Lukas H. Bangun, M.Th.',
        role: 'Gembala Sidang',
        period: '2024 – 2028',
        phone: '081254009901',
        email: 'gembala@gkiisungaibarang.or.id',
        photoUrl: '',
        responsibilities: [
          'Memimpin pengajaran firman Tuhan, sakramen Baptisan & Perjamuan Kudus, serta penggembalaan jemaat.',
          'Membimbing Badan Pengurus Jemaat dan majelis dalam visi pelayanan GKII Sungai Barang.',
          'Melaksanakan konseling pastoral dan perkunjungan rohani kepada keluarga jemaat.',
        ],
        bio: 'Melayani sebagai Gembala Sidang GKII Jemaat Sungai Barang sejak tahun 2019 dengan fokus pemuridan keluarga.',
        order: 1,
      },
      {
        id: 'bpj-2',
        name: 'Sdr. Daniel Putra, S.Kom.',
        role: 'Ketua Badan Pengurus Jemaat & Koordinator Pemuda',
        period: '2024 – 2028',
        phone: '081258883301',
        email: 'ketua.bpj@gkiisungaibarang.or.id',
        photoUrl: '/src/assets/images/leader_portrait_male_2_1794621190137.jpg',
        responsibilities: [
          'Mengkoordinasikan rapat rutin Badan Pengurus Jemaat dan pelaksanaan program kerja tahunan.',
          'Mengawasi sinergi antar organ pelayanan (Perkaria, Perkawan, Pemuda, dan Sekolah Minggu).',
          'Mewakili jemaat dalam koordinasi wilayah/daerah GKII dan hubungan kemasyarakatan.',
        ],
        bio: 'Aktif membina generasi muda serta memodernisasi sistem administrasi dan informasi jemaat.',
        order: 2,
      },
      {
        id: 'bpj-3',
        name: 'Ibu Ruth Marbun, S.E.',
        role: 'Bendahara Jemaat',
        period: '2024 – 2028',
        phone: '081349001122',
        email: 'bendahara@gkiisungaibarang.or.id',
        photoUrl: '/src/assets/images/leader_portrait_female_1_1794621188844.jpg',
        responsibilities: [
          'Mencatat seluruh pemasukan persembahan, persepuluhan, dan pengeluaran kas secara transparan.',
          'Menyusun laporan keuangan bulanan dan laporan pertanggungjawaban tahunan jemaat.',
          'Mengelola penyaluran anggaran operasional, misi, pembangunan, dan diakonia.',
        ],
        bio: 'Berpengalaman di bidang akuntansi dan melayani sebagai bendahara jemaat dengan prinsip akuntabilitas.',
        order: 3,
      },
      {
        id: 'bpj-4',
        name: 'Ibu Martha Simanjuntak',
        role: 'Sekretaris & Koordinator Diakonia / Perkawan',
        period: '2024 – 2028',
        phone: '082155117740',
        email: 'sekretariat@gkiisungaibarang.or.id',
        photoUrl: '/src/assets/images/leader_portrait_female_2_1794621193639.jpg',
        responsibilities: [
          'Mengelola surat-menyurat gereja, warta jemaat mingguan, dan pemutakhiran data anggota.',
          'Mengkoordinasikan pelayanan Diakonia bagi lansia, jemaat sakit, serta berita sukacita/dukacita.',
          'Mendampingi pembinaan persekutuan kaum wanita (Perkawan).',
        ],
        bio: 'Berdedikasi penuh dalam pelayanan sosial gereja dan pendataan keluarga jemaat di seluruh sektor.',
        order: 4,
      },
    ],
    committees: [
      {
        id: 'com-1',
        name: 'Panitia Perayaan Natal Jemaat 2026',
        eventDate: `${now.getFullYear()}-12-24`,
        description:
          'Kepanitiaan gabungan untuk mempersiapkan Ibadah Malam Natal, Natal Anak Sekolah Minggu, dan Ramah Tamah Jemaat.',
        chairperson: 'Sdr. Daniel Putra, S.Kom.',
        meetings: [
          {
            id: 'mtg-1',
            title: 'Rapat Finalisasi Susunan Acara & Anggaran Seksi',
            dateTime: formatDateTimeLocal(imminentMeeting),
            location: 'Ruang Konsistori GKII Sungai Barang',
            agenda: 'Finalisasi liturgi Natal, konfirmasi pengisi pujian, serta verifikasi anggaran konsumsi dan dekorasi.',
            reminderMinutesBefore: 120,
            status: 'Terjadwal',
            attendeesNote: 'Wajib dihadiri seluruh koordinator seksi dan BPH Panitia.',
          },
          {
            id: 'mtg-2',
            title: 'Rapat Teknis Perlengkapan & Tata Panggung',
            dateTime: formatDateTimeLocal(tomorrowMeeting),
            location: 'Gedung Gereja Utama',
            agenda: 'Pengecekan sound system, pencahayaan panggung, serta jadwal dekorasi pohon Natal.',
            reminderMinutesBefore: 1440,
            status: 'Terjadwal',
            attendeesNote: 'Seksi Perlengkapan, Multimedia, dan Musik.',
          },
        ],
        tasks: [
          {
            id: 'tsk-1',
            title: 'Menyusun tata ibadah & liturgi malam Natal',
            section: 'Acara & Ibadah',
            assignee: 'Pdt. Lukas H. Bangun',
            deadline: formatYMD(plus5Days),
            status: 'Proses',
            notes: 'Koordinasi dengan pemimpin pujian dan tim tamborin.',
          },
          {
            id: 'tsk-2',
            title: 'Pengadaan paket bingkisan Natal anak Sekolah Minggu',
            section: 'Konsumsi',
            assignee: 'Ibu Martha Simanjuntak',
            deadline: `${now.getFullYear()}-12-15`,
            status: 'Belum Mulai',
            notes: 'Estimasi 55 paket anak.',
          },
          {
            id: 'tsk-3',
            title: 'Pengecekan mic wireless & kabel audio altar',
            section: 'Perlengkapan & Dekorasi',
            assignee: 'Sdr. Daniel Putra',
            deadline: formatYMD(plus2Days),
            status: 'Selesai',
            notes: 'Sudah diuji coba dan siap digunakan.',
          },
        ],
      },
      {
        id: 'com-2',
        name: 'Panitia Renovasi Ruang Pelayanan Anak',
        eventDate: `${now.getFullYear()}-12-10`,
        description:
          'Kepanitiaan khusus perbaikan atap, ventilasi, serta pengecatan ruang kelas Sekolah Minggu.',
        chairperson: 'Bpk. Yohanes Kiding',
        meetings: [
          {
            id: 'mtg-3',
            title: 'Evaluasi Progres Pekerjaan Atap & RAB Material',
            dateTime: formatDateTimeLocal(nextWeekMeeting),
            location: 'Ruang Pelayanan Anak',
            agenda: 'Cek laporan belanja cat dan plafon bersama Bendahara Jemaat.',
            reminderMinutesBefore: 1440,
            status: 'Terjadwal',
            attendeesNote: 'Tim Teknis Bangunan & Bendahara.',
          },
        ],
        tasks: [
          {
            id: 'tsk-4',
            title: 'Survei harga seng gelombang & cat tembok tahan cuaca',
            section: 'Perlengkapan & Dekorasi',
            assignee: 'Bpk. Yohanes Kiding',
            deadline: formatYMD(plus2Days),
            status: 'Selesai',
          },
          {
            id: 'tsk-5',
            title: 'Penjadwalan kerja bakti pengecatan bersama Perkaria',
            section: 'Dana & Usaha',
            assignee: 'Bpk. Andreas Lawing',
            deadline: formatYMD(plus5Days),
            status: 'Proses',
          },
        ],
      },
    ],
    growthSeries: [
      {
        period: '2023',
        granularity: 'tahunan',
        byOrgan: {
          Perkaria: 46,
          Perkawan: 52,
          'Sekolah Minggu': 38,
          Remaja: 18,
          Pemuda: 26,
          Lansia: 22,
        },
        byAge: {
          'Anak (0-12)': 38,
          'Remaja (13-17)': 19,
          'Pemuda (18-30)': 35,
          'Dewasa (31-59)': 88,
          'Lansia (60+)': 22,
        },
        total: 202,
      },
      {
        period: '2024',
        granularity: 'tahunan',
        byOrgan: {
          Perkaria: 50,
          Perkawan: 58,
          'Sekolah Minggu': 43,
          Remaja: 21,
          Pemuda: 30,
          Lansia: 25,
        },
        byAge: {
          'Anak (0-12)': 43,
          'Remaja (13-17)': 22,
          'Pemuda (18-30)': 41,
          'Dewasa (31-59)': 96,
          'Lansia (60+)': 25,
        },
        total: 227,
      },
      {
        period: '2025',
        granularity: 'tahunan',
        byOrgan: {
          Perkaria: 55,
          Perkawan: 64,
          'Sekolah Minggu': 49,
          Remaja: 23,
          Pemuda: 35,
          Lansia: 28,
        },
        byAge: {
          'Anak (0-12)': 49,
          'Remaja (13-17)': 25,
          'Pemuda (18-30)': 47,
          'Dewasa (31-59)': 105,
          'Lansia (60+)': 28,
        },
        total: 254,
      },
      {
        period: '2026',
        granularity: 'tahunan',
        byOrgan: {
          Perkaria: 61,
          Perkawan: 70,
          'Sekolah Minggu': 56,
          Remaja: 26,
          Pemuda: 40,
          Lansia: 32,
        },
        byAge: {
          'Anak (0-12)': 56,
          'Remaja (13-17)': 29,
          'Pemuda (18-30)': 53,
          'Dewasa (31-59)': 115,
          'Lansia (60+)': 32,
        },
        total: 285,
      },
      {
        period: 'Q1 2026',
        granularity: 'triwulan',
        byOrgan: {
          Perkaria: 56,
          Perkawan: 65,
          'Sekolah Minggu': 50,
          Remaja: 24,
          Pemuda: 36,
          Lansia: 29,
        },
        byAge: {
          'Anak (0-12)': 50,
          'Remaja (13-17)': 26,
          'Pemuda (18-30)': 48,
          'Dewasa (31-59)': 107,
          'Lansia (60+)': 29,
        },
        total: 260,
      },
      {
        period: 'Q2 2026',
        granularity: 'triwulan',
        byOrgan: {
          Perkaria: 58,
          Perkawan: 67,
          'Sekolah Minggu': 52,
          Remaja: 25,
          Pemuda: 37,
          Lansia: 30,
        },
        byAge: {
          'Anak (0-12)': 52,
          'Remaja (13-17)': 27,
          'Pemuda (18-30)': 50,
          'Dewasa (31-59)': 110,
          'Lansia (60+)': 30,
        },
        total: 269,
      },
      {
        period: 'Q3 2026',
        granularity: 'triwulan',
        byOrgan: {
          Perkaria: 59,
          Perkawan: 69,
          'Sekolah Minggu': 54,
          Remaja: 25,
          Pemuda: 39,
          Lansia: 31,
        },
        byAge: {
          'Anak (0-12)': 54,
          'Remaja (13-17)': 28,
          'Pemuda (18-30)': 51,
          'Dewasa (31-59)': 113,
          'Lansia (60+)': 31,
        },
        total: 277,
      },
      {
        period: 'Q4 2026',
        granularity: 'triwulan',
        byOrgan: {
          Perkaria: 61,
          Perkawan: 70,
          'Sekolah Minggu': 56,
          Remaja: 26,
          Pemuda: 40,
          Lansia: 32,
        },
        byAge: {
          'Anak (0-12)': 56,
          'Remaja (13-17)': 29,
          'Pemuda (18-30)': 53,
          'Dewasa (31-59)': 115,
          'Lansia (60+)': 32,
        },
        total: 285,
      },
    ],
    devotionals: [
      {
        id: 'dev-1',
        date: todayYMD,
        title: 'Ditanam di Tepi Aliran Air Kehidupan',
        verseRef: 'Mazmur 1:3',
        verseText:
          'Ia seperti pohon, yang ditanam di tepi aliran air, yang menghasilkan buahnya pada musimnya, dan yang tidak layu daunnya; apa saja yang diperbuatnya berhasil.',
        content:
          'Di tengah kesibukan ladang, pekerjaan, dan tanggung jawab keluarga di Sungai Barang, kita sering kali merasa kering secara rohani ketika hanya mengandalkan kekuatan sendiri. Pemazmur mengingatkan bahwa rahasia pohon yang daunnya selalu hijau bukanlah karena tidak pernah ada musim kemarau, melainkan karena akarnya tertanam dekat dengan aliran air.\n\nAliran air itu adalah firman Tuhan dan persekutuan yang intim bersama Kristus setiap hari. Ketika jemaat merenungkan firman-Nya siang dan malam, hidup kita dipelihara dari dalam—sehingga tetap menghasilkan buah kasih, kesabaran, dan pengharapan pada musimnya.',
        application:
          'Luangkan 10 menit pagi ini sebelum memulai aktivitas untuk membaca satu pasal Alkitab dan mendoakan satu anggota jemaat lainnya.',
        closingPrayer:
          'Tuhan Yesus, tanamkanlah hidup kami semakin dalam pada firman-Mu. Segarkan jiwa kami agar hari ini kami menjadi berkat bagi keluarga dan sesama di Sungai Barang. Amin.',
        author: 'Pdt. Lukas H. Bangun, M.Th.',
      },
      {
        id: 'dev-2',
        date: formatYMD(addDays(now, -1)),
        title: 'Kasih yang Nyata dalam Kebersamaan Jemaat',
        verseRef: 'Galatia 6:2',
        verseText: 'Bertolong-tolonganlah menanggung bebanmu! Demikianlah kamu memenuhi hukum Kristus.',
        content:
          'Gereja bukan sekadar gedung tempat kita berkumpul seminggu sekali, melainkan keluarga rohani yang saling menopang. Setiap kali kita mendoakan saudara yang sakit, membantu tetangga yang berkekurangan, atau melayani dengan tulus dalam kepanitiaan gereja, di situlah hukum Kristus menjadi nyata dan dapat dirasakan dunia.',
        application:
          'Sapa dan tanyakan kabar satu saudara seiman hari ini, baik secara langsung maupun melalui pesan singkat.',
        closingPrayer:
          'Bapa di surga, ajarlah kami memiliki hati yang peka untuk saling mengasihi dan menopang dalam persekutuan Jemaat Sungai Barang. Amin.',
        author: 'Pdt. Lukas H. Bangun, M.Th.',
      },
    ],
    gallery: [
      {
        id: 'gal-1',
        title: 'Ibadah Raya Minggu & Perjamuan Kudus',
        category: 'Ibadah Raya',
        date: formatYMD(minus3Days),
        caption:
          'Suasana pujian penyembahan dan pelayanan firman Tuhan bersama seluruh jemaat di gedung gereja utama GKII Sungai Barang.',
        imageUrl: '/gallery/ibadah-raya.svg',
        capturedBy: 'Ibu Martha Simanjuntak',
        createdAt: minus3Days.toISOString(),
      },
      {
        id: 'gal-2',
        title: 'Pembinaan Anak Sekolah Minggu & Kelas Tunas',
        category: 'Sekolah Minggu & Remaja',
        date: formatYMD(minus6Days),
        caption:
          'Anak-anak Sekolah Minggu belajar cerita Alkitab, menghafal ayat emas, dan bernyanyi bersama tim guru Sekolah Minggu.',
        imageUrl: '/gallery/sekolah-minggu.svg',
        capturedBy: 'Sdri. Gabriela Tika',
        createdAt: minus6Days.toISOString(),
      },
      {
        id: 'gal-3',
        title: 'Perkunjungan Diakonia & Pelayanan Kasih Sektor',
        category: 'Diakonia & Baksos',
        date: formatYMD(addDays(now, -10)),
        caption:
          'Penyaluran bantuan diakonia dan doa penguatan bagi warga lansia serta keluarga jemaat yang sedang dalam pemulihan.',
        imageUrl: '/gallery/diakonia-kasih.svg',
        capturedBy: 'Ibu Ruth Marbun, S.E.',
        createdAt: addDays(now, -10).toISOString(),
      },
      {
        id: 'gal-4',
        title: 'Gotong Royong Pemeliharaan Halaman & Gedung Gereja',
        category: 'Gotong Royong & Panitia',
        date: formatYMD(addDays(now, -14)),
        caption:
          'Kebersamaan jemaat Perkaria, Perkawan, dan Pemuda membersihkan halaman gereja serta menata ruang ibadah.',
        imageUrl: '/gallery/gotong-royong.svg',
        capturedBy: 'Bpk. Yohanes Kiding',
        createdAt: addDays(now, -14).toISOString(),
      },
    ],
    letters: [
      {
        id: 'let-1',
        letterType: 'Surat Masuk',
        letterNumber: '048/PW-GKII-KT/XI/2026',
        letterDate: formatYMD(minus6Days),
        subject: 'Undangan Rapat Kerja Wilayah & Pembinaan Majelis GKII Kalimantan Utara',
        status: 'Ditindaklanjuti',
        sender: 'Pengurus Wilayah GKII Kalimantan Utara',
        receivedDate: formatYMD(minus3Days),
        disposition: 'Diteruskan ke Gembala Sidang & BPJ untuk penunjukan 2 utusan jemaat.',
        notes: 'Mohon konfirmasi daftar utusan paling lambat minggu depan.',
        physicalPhotos: [],
        recordedBy: 'Ibu Martha Simanjuntak',
        createdAt: minus3Days.toISOString(),
      },
      {
        id: 'let-2',
        letterType: 'Surat Keluar',
        letterNumber: '024/GKII-SB/SKel/XI/2026',
        letterDate: formatYMD(minus3Days),
        subject: 'Surat Pengantar Bantuan Diakonia & Pelayanan Kasih Sektor Hilir',
        status: 'Selesai',
        recipient: 'Pemerintah Desa Sungai Barang & Majelis Sektor I',
        signer: 'Pdt. Lukas H. Bangun, M.Th. & Ibu Martha Simanjuntak',
        notes: 'Sudah dikirimkan bersamaan dengan tim Diakonia dan dokumentasi penyaluran.',
        physicalPhotos: [],
        recordedBy: 'Ibu Martha Simanjuntak',
        createdAt: minus3Days.toISOString(),
      },
      {
        id: 'let-3',
        letterType: 'Surat Keputusan',
        letterNumber: '007/GKII-SB/SK/X/2026',
        letterDate: `${now.getFullYear()}-10-05`,
        subject: 'Pengangkatan Panitia Natal Jemaat GKII Sungai Barang Tahun 2026',
        status: 'Arsip Aktif',
        effectiveDate: `${now.getFullYear()}-10-05`,
        validityPeriod: `Oktober – Desember ${now.getFullYear()}`,
        signer: 'Pdt. Lukas H. Bangun, M.Th.',
        notes: 'Menetapkan Bpk. Yohanes Kiding sebagai Ketua Panitia beserta susunan seksi acara, konsumsi, dan perlengkapan.',
        physicalPhotos: [],
        recordedBy: 'Ibu Martha Simanjuntak',
        createdAt: `${now.getFullYear()}-10-05T09:00:00.000Z`,
      },
      {
        id: 'let-4',
        letterType: 'Surat Nikah',
        letterNumber: '012/GKII-SB/SN/IX/2026',
        letterDate: `${now.getFullYear()}-09-19`,
        subject: 'Surat Keterangan Pemberkatan Nikah Kudus',
        status: 'Selesai',
        groomName: 'Bpk. Andreas Lawing',
        brideName: 'Ibu Esther Tika',
        ceremonyLocation: 'Gedung Gereja Utama GKII Jemaat Sungai Barang',
        officiant: 'Pdt. Lukas H. Bangun, M.Th.',
        witnesses: 'Bpk. Yohanes Kiding & Ibu Martha Simanjuntak',
        notes: 'Pemberkatan nikah kudus telah dilaksanakan dengan tertib dan dicatatkan pada arsip gereja.',
        physicalPhotos: [],
        recordedBy: 'Ibu Martha Simanjuntak',
        createdAt: `${now.getFullYear()}-09-19T11:00:00.000Z`,
      },
      {
        id: 'let-5',
        letterType: 'Surat Baptis',
        letterNumber: '018/GKII-SB/SB/VIII/2026',
        letterDate: `${now.getFullYear()}-08-16`,
        subject: 'Piagam Baptisan Air Kudus',
        status: 'Selesai',
        baptizedName: 'Sdri. Gabriela Tika',
        birthInfo: 'Sungai Barang, 12 April 2005',
        parentsName: 'Bpk. Samuel Tika & Ibu Maria L.',
        ceremonyLocation: 'Sungai Barang / Kolam Pembaptisan GKII Sungai Barang',
        officiant: 'Pdt. Lukas H. Bangun, M.Th.',
        notes: 'Telah mengikuti katekisasi baptisan selama 8 pertemuan sebelum pembaptisan.',
        physicalPhotos: [],
        recordedBy: 'Ibu Martha Simanjuntak',
        createdAt: `${now.getFullYear()}-08-16T10:00:00.000Z`,
      },
      {
        id: 'let-6',
        letterType: 'Surat Persembahan Anak',
        letterNumber: '009/GKII-SB/SPA/VII/2026',
        letterDate: `${now.getFullYear()}-07-12`,
        subject: 'Surat Penyerahan / Persembahan Anak Kepada Tuhan',
        status: 'Selesai',
        childName: 'Adik Naomi Kiding',
        birthInfo: 'Sungai Barang, 14 Mei 2026',
        fatherName: 'Bpk. Yohanes Kiding',
        motherName: 'Ibu Damaris Lawing',
        ceremonyLocation: 'Ibadah Raya Minggu GKII Jemaat Sungai Barang',
        officiant: 'Pdt. Lukas H. Bangun, M.Th.',
        notes: 'Didoakan dan diserahkan dalam ibadah raya minggu bersama kedua orang tua.',
        physicalPhotos: [],
        recordedBy: 'Ibu Martha Simanjuntak',
        createdAt: `${now.getFullYear()}-07-12T09:30:00.000Z`,
      },
    ],
  };
}

function loadDatabase(): ChurchDatabase {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const initialData = createInitialData();
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  const parsed = JSON.parse(raw) as ChurchDatabase;
  let dirty = false;
  if (!parsed.visionMission) {
    parsed.visionMission = DEFAULT_VISION_MISSION;
    dirty = true;
  }
  if (!parsed.churchIdentity) {
    parsed.churchIdentity = DEFAULT_CHURCH_IDENTITY;
    dirty = true;
  } else {
    if (
      !Array.isArray(parsed.churchIdentity.symbols) ||
      parsed.churchIdentity.symbols.length !== 4
    ) {
      parsed.churchIdentity = {
        ...DEFAULT_CHURCH_IDENTITY,
        ...parsed.churchIdentity,
        symbols: DEFAULT_CHURCH_IDENTITY.symbols,
      };
      dirty = true;
    }
    if (parsed.churchIdentity.subLabel === 'Jemaat Sungai Barang · The Fourfold Gospel') {
      parsed.churchIdentity.subLabel = DEFAULT_CHURCH_IDENTITY.subLabel;
      dirty = true;
    }
  }
  if (!parsed.siteContent) {
    parsed.siteContent = mergeSiteContent();
    dirty = true;
  } else {
    parsed.siteContent = mergeSiteContent(parsed.siteContent);
  }
  if (parsed.ledger.length <= 7 && !parsed.ledger.some((l) => l.id === 'led-h1')) {
    const seeded = initialData.ledger;
    const existingIds = new Set(parsed.ledger.map((l) => l.id));
    for (const entry of seeded) {
      if (!existingIds.has(entry.id)) {
        parsed.ledger.push(entry);
      }
    }
    parsed.ledger.sort((a, b) => a.date.localeCompare(b.date));
    dirty = true;
  }

  // Backfill new schedule service role fields for existing disk records
  const seedScheduleMap = new Map(initialData.schedules.map((s) => [s.id, s]));
  parsed.schedules = parsed.schedules.map((s) => {
    const seed = seedScheduleMap.get(s.id);
    if (
      !s.mcName ||
      !s.offeringCollectors ||
      !s.intercessoryPrayerLeader
    ) {
      dirty = true;
      return {
        ...s,
        mcName: s.mcName || seed?.mcName || 'Majelis Bertugas',
        offeringCollectors:
          s.offeringCollectors || seed?.offeringCollectors || 'Diaken & Kolektan Bertugas',
        intercessoryPrayerLeader:
          s.intercessoryPrayerLeader || seed?.intercessoryPrayerLeader || s.speaker || 'Majelis Doa',
      };
    }
    return s;
  });

  // Backfill & migrate member identity, family fields, and split Remaja/Pemuda organ
  const seedMemberMap = new Map(initialData.members.map((m) => [m.id, m]));
  parsed.members = parsed.members.map((m, idx) => {
    const seed = seedMemberMap.get(m.id);
    let updated = m;
    if ((updated.organ as string) === 'Pemuda & Remaja') {
      dirty = true;
      updated = {
        ...updated,
        organ:
          seed?.organ ||
          (updated.ageCategory === 'Remaja (13-17)' ? 'Remaja' : 'Pemuda'),
      };
    }
    if (
      !updated.noKk ||
      !updated.noNik ||
      !updated.birthPlace ||
      !updated.familyRelationship ||
      !updated.baptismStatus
    ) {
      dirty = true;
      const defaultRel =
        updated.ageCategory === 'Anak (0-12)' || updated.ageCategory === 'Remaja (13-17)'
          ? 'Anak'
          : updated.gender === 'P' && updated.weddingDate
            ? 'Istri'
            : 'Kepala Keluarga';
      const defaultBaptism = updated.ageCategory === 'Anak (0-12)' ? 'Belum Baptis' : 'Sudah Baptis';
      updated = {
        ...updated,
        noKk: updated.noKk || seed?.noKk || `650304010120${String(idx + 10).padStart(4, '0')}`,
        noNik: updated.noNik || seed?.noNik || `650304010180${String(idx + 10).padStart(4, '0')}`,
        birthPlace: updated.birthPlace || seed?.birthPlace || 'Sungai Barang',
        familyRelationship: updated.familyRelationship || seed?.familyRelationship || defaultRel,
        baptismStatus: updated.baptismStatus || seed?.baptismStatus || defaultBaptism,
      };
    }
    return updated;
  });

  // Migrate growthSeries from combined 'Pemuda & Remaja' into separate 'Remaja' and 'Pemuda'
  const seedGrowthMap = new Map(
    initialData.growthSeries.map((g) => [`${g.granularity}:${g.period}`, g])
  );
  parsed.growthSeries = parsed.growthSeries.map((g) => {
    const rawByOrgan = g.byOrgan as Record<string, number>;
    if (
      rawByOrgan['Pemuda & Remaja'] !== undefined ||
      rawByOrgan.Remaja === undefined ||
      rawByOrgan.Pemuda === undefined
    ) {
      dirty = true;
      const seedSnap = seedGrowthMap.get(`${g.granularity}:${g.period}`);
      const legacyCombined = rawByOrgan['Pemuda & Remaja'] || 0;
      const remajaCount =
        rawByOrgan.Remaja ??
        seedSnap?.byOrgan.Remaja ??
        Math.round(legacyCombined * 0.4);
      const pemudaCount =
        rawByOrgan.Pemuda ??
        seedSnap?.byOrgan.Pemuda ??
        Math.max(0, legacyCombined - remajaCount);
      return {
        ...g,
        byOrgan: {
          Perkaria: rawByOrgan.Perkaria ?? seedSnap?.byOrgan.Perkaria ?? 0,
          Perkawan: rawByOrgan.Perkawan ?? seedSnap?.byOrgan.Perkawan ?? 0,
          'Sekolah Minggu':
            rawByOrgan['Sekolah Minggu'] ?? seedSnap?.byOrgan['Sekolah Minggu'] ?? 0,
          Remaja: remajaCount,
          Pemuda: pemudaCount,
          Lansia: rawByOrgan.Lansia ?? seedSnap?.byOrgan.Lansia ?? 0,
        },
      };
    }
    return g;
  });

  if (!Array.isArray(parsed.gallery) || parsed.gallery.length === 0) {
    parsed.gallery = initialData.gallery;
    dirty = true;
  }

  // Backfill donorName on seeded Persepuluhan / Ucapan Syukur entries
  const seedLedgerMap = new Map(initialData.ledger.map((l) => [l.id, l]));
  parsed.ledger = parsed.ledger.map((entry) => {
    const seed = seedLedgerMap.get(entry.id);
    if (
      (entry.category === 'Persepuluhan' || entry.category === 'Ucapan Syukur') &&
      !entry.donorName &&
      seed?.donorName
    ) {
      dirty = true;
      return { ...entry, donorName: seed.donorName };
    }
    return entry;
  });

  if (!Array.isArray(parsed.letters) || parsed.letters.length === 0) {
    parsed.letters = initialData.letters;
    dirty = true;
  }

  if (dirty) {
    saveDatabase(parsed);
  }
  return parsed;
}

function saveDatabase(db: ChurchDatabase): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

let db = loadDatabase();
const sseClients = new Set<express.Response>();

interface AuthAccountRecord {
  username: string;
  email: string;
  name: string;
  role: string;
  roleType: AuthRoleType;
  salt: string;
  passwordHash: string;
}

interface AuthStore {
  sessionSecret: string;
  accounts: AuthAccountRecord[];
}

interface LegacyTreasurerAuthRecord {
  username: string;
  email: string;
  name: string;
  role: string;
  salt: string;
  passwordHash: string;
  sessionSecret: string;
}

const AUTH_FILE = path.join(DATA_DIR, 'auth-accounts.json');
const LEGACY_AUTH_FILE = path.join(DATA_DIR, 'treasurer-auth.json');

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createDefaultAccount(
  username: string,
  email: string,
  name: string,
  role: string,
  roleType: AuthRoleType,
  password: string
): AuthAccountRecord {
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    username,
    email,
    name,
    role,
    roleType,
    salt,
    passwordHash: hashPassword(password, salt),
  };
}

function loadAuthStore(): AuthStore {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(AUTH_FILE)) {
    const parsed = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) as AuthStore;
    let changed = false;
    if (!parsed.sessionSecret) {
      parsed.sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
      changed = true;
    }
    if (!Array.isArray(parsed.accounts)) {
      parsed.accounts = [];
      changed = true;
    }
    if (!parsed.accounts.some((a) => a.roleType === 'sekretaris_admin')) {
      parsed.accounts.push(
        createDefaultAccount(
          'sekretaris',
          'sekretaris@gkiisungaibarang.or.id',
          'Ibu Martha Simanjuntak',
          'Sekretaris & Admin Penuh',
          'sekretaris_admin',
          'admin2026'
        )
      );
      changed = true;
    }
    if (!parsed.accounts.some((a) => a.roleType === 'bendahara')) {
      parsed.accounts.push(
        createDefaultAccount(
          'bendahara',
          'bendahara@gkiisungaibarang.or.id',
          'Ibu Ruth Marbun, S.E.',
          'Bendahara Jemaat',
          'bendahara',
          'gkii2026'
        )
      );
      changed = true;
    }
    if (changed) {
      fs.writeFileSync(AUTH_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
    }
    return parsed;
  }

  let sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
  let bendaharaAccount: AuthAccountRecord | null = null;

  if (fs.existsSync(LEGACY_AUTH_FILE)) {
    try {
      const legacy = JSON.parse(
        fs.readFileSync(LEGACY_AUTH_FILE, 'utf-8')
      ) as LegacyTreasurerAuthRecord;
      if (legacy.sessionSecret) sessionSecret = legacy.sessionSecret;
      if (legacy.username && legacy.salt && legacy.passwordHash) {
        bendaharaAccount = {
          username: legacy.username,
          email: legacy.email,
          name: legacy.name,
          role: legacy.role,
          roleType: 'bendahara',
          salt: legacy.salt,
          passwordHash: legacy.passwordHash,
        };
      }
    } catch {
      // Fallback to default Bendahara record
    }
  }

  const store: AuthStore = {
    sessionSecret,
    accounts: [
      createDefaultAccount(
        'sekretaris',
        'sekretaris@gkiisungaibarang.or.id',
        'Ibu Martha Simanjuntak',
        'Sekretaris & Admin Penuh',
        'sekretaris_admin',
        'admin2026'
      ),
      bendaharaAccount ||
        createDefaultAccount(
          'bendahara',
          'bendahara@gkiisungaibarang.or.id',
          'Ibu Ruth Marbun, S.E.',
          'Bendahara Jemaat',
          'bendahara',
          'gkii2026'
        ),
    ],
  };
  fs.writeFileSync(AUTH_FILE, JSON.stringify(store, null, 2), 'utf-8');
  return store;
}

function saveAuthStore(store: AuthStore): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

const authStore = loadAuthStore();

function toAuthUser(account: AuthAccountRecord): AuthUser {
  return {
    username: account.username,
    email: account.email,
    name: account.name,
    role: account.role,
    roleType: account.roleType,
  };
}

function createSessionToken(user: AuthUser): string {
  const payload = Buffer.from(
    JSON.stringify({
      username: user.username,
      roleType: user.roleType,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', authStore.sessionSecret)
    .update(payload)
    .digest('base64url');
  return `${payload}.${sig}`;
}

function verifySessionToken(token: string | undefined): AuthUser | null {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expectedSig = crypto
    .createHmac('sha256', authStore.sessionSecret)
    .update(payload)
    .digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      username: string;
      roleType?: AuthRoleType;
      exp: number;
    };
    if (!parsed.exp || Date.now() > parsed.exp) {
      return null;
    }
    const account = authStore.accounts.find((a) => a.username === parsed.username);
    if (!account) return null;
    return toAuthUser(account);
  } catch {
    return null;
  }
}

function extractBearerToken(req: express.Request): string | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return undefined;
  return header.slice(7).trim();
}

interface AuthenticatedRequest extends express.Request {
  authUser?: AuthUser;
}

function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const user = verifySessionToken(extractBearerToken(req));
  if (!user) {
    res.status(401).json({
      error: 'Akses ditolak. Silakan masuk terlebih dahulu menggunakan akun resmi gereja.',
    });
    return;
  }
  (req as AuthenticatedRequest).authUser = user;
  next();
}

function requireFinanceAccess(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const user = verifySessionToken(extractBearerToken(req));
  if (!user) {
    res.status(401).json({
      error:
        'Akses ditolak. Silakan masuk menggunakan akun pengurus yang berwenang untuk mengelola data keuangan.',
    });
    return;
  }
  if (user.roleType !== 'bendahara' && user.roleType !== 'sekretaris_admin') {
    res.status(403).json({
      error: 'Anda tidak memiliki izin untuk mengubah data keuangan.',
    });
    return;
  }
  (req as AuthenticatedRequest).authUser = user;
  next();
}

function requireAdminAccess(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const user = verifySessionToken(extractBearerToken(req));
  if (!user) {
    res.status(401).json({
      error:
        'Akses ditolak. Silakan masuk menggunakan akun pengurus yang berwenang untuk mengelola menu ini.',
    });
    return;
  }
  if (user.roleType !== 'sekretaris_admin') {
    res.status(403).json({
      error:
        'Izin terbatas. Menu administrasi ini hanya dapat diubah oleh akun pengurus yang berwenang.',
    });
    return;
  }
  (req as AuthenticatedRequest).authUser = user;
  next();
}

function broadcastUpdate(reason: string): void {
  const payload = JSON.stringify({ reason, timestamp: new Date().toISOString() });
  for (const res of sseClients) {
    res.write(`event: sync\ndata: ${payload}\n\n`);
  }
}

async function startServer() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, church: 'GKII Jemaat Sungai Barang' });
  });

  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    sseClients.add(res);

    const heartbeat = setInterval(() => {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
      sseClients.delete(res);
    });
  });

  app.get('/api/data', (_req, res) => {
    const { letters: _omitLetters, ...publicDb } = db;
    res.json(publicDb);
  });

  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body as { identifier?: string; password?: string };
    const idNorm = (identifier || '').trim().toLowerCase();
    const account = authStore.accounts.find(
      (a) => a.username.toLowerCase() === idNorm || a.email.toLowerCase() === idNorm
    );
    if (!account || !password) {
      res.status(401).json({ error: 'Nama pengguna, surel, atau kata sandi tidak sesuai.' });
      return;
    }
    const candidateHash = hashPassword(password, account.salt);
    const a = Buffer.from(candidateHash, 'hex');
    const b = Buffer.from(account.passwordHash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.status(401).json({ error: 'Nama pengguna, surel, atau kata sandi tidak sesuai.' });
      return;
    }
    const user = toAuthUser(account);
    const token = createSessionToken(user);
    res.json({ token, user });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = verifySessionToken(extractBearerToken(req));
    if (!user) {
      res.json({ authenticated: false, user: null });
      return;
    }
    res.json({ authenticated: true, user });
  });

  app.post('/api/auth/change-password', requireAuth, (req, res) => {
    const authUser = (req as AuthenticatedRequest).authUser!;
    const { currentPassword, newPassword, displayName } = req.body as {
      currentPassword?: string;
      newPassword?: string;
      displayName?: string;
    };
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Kata sandi baru minimal harus 6 karakter.' });
      return;
    }
    const idx = authStore.accounts.findIndex((a) => a.username === authUser.username);
    if (idx === -1) {
      res.status(404).json({ error: 'Akun tidak ditemukan.' });
      return;
    }
    const account = authStore.accounts[idx];
    const currentHash = hashPassword(currentPassword, account.salt);
    const a = Buffer.from(currentHash, 'hex');
    const b = Buffer.from(account.passwordHash, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.status(401).json({ error: 'Kata sandi lama tidak sesuai.' });
      return;
    }
    const newSalt = crypto.randomBytes(16).toString('hex');
    const updated: AuthAccountRecord = {
      ...account,
      name: displayName?.trim() || account.name,
      salt: newSalt,
      passwordHash: hashPassword(newPassword, newSalt),
    };
    authStore.accounts[idx] = updated;
    saveAuthStore(authStore);
    res.json({
      ok: true,
      user: toAuthUser(updated),
    });
  });

  app.put('/api/vision-mission', requireAdminAccess, (req, res) => {
    const incoming = req.body as Partial<VisionMission>;
    db.visionMission = {
      ...db.visionMission,
      ...incoming,
      missions: Array.isArray(incoming.missions)
        ? incoming.missions.filter((m) => typeof m === 'string' && m.trim().length > 0)
        : db.visionMission.missions,
    };
    saveDatabase(db);
    broadcastUpdate('visionMission');
    res.json(db.visionMission);
  });

  app.put('/api/site-content', requireAdminAccess, (req, res) => {
    const body = req.body as Partial<SiteTextContent> & { resetDefault?: boolean };
    if (body.resetDefault) {
      db.siteContent = mergeSiteContent();
    } else {
      const current = mergeSiteContent(db.siteContent);
      db.siteContent = {
        appTitle:
          typeof body.appTitle === 'string' && body.appTitle.trim()
            ? body.appTitle.trim()
            : current.appTitle,
        appSubtitle:
          typeof body.appSubtitle === 'string' && body.appSubtitle.trim()
            ? body.appSubtitle.trim()
            : current.appSubtitle,
        footerOrg:
          typeof body.footerOrg === 'string' && body.footerOrg.trim()
            ? body.footerOrg.trim()
            : current.footerOrg,
        footerMotto:
          typeof body.footerMotto === 'string' && body.footerMotto.trim()
            ? body.footerMotto.trim()
            : current.footerMotto,
        kopAddressLine:
          typeof body.kopAddressLine === 'string' && body.kopAddressLine.trim()
            ? body.kopAddressLine.trim()
            : current.kopAddressLine,
        kopRegionLine:
          typeof body.kopRegionLine === 'string' && body.kopRegionLine.trim()
            ? body.kopRegionLine.trim()
            : current.kopRegionLine,
        navLabels: {
          ...current.navLabels,
          ...(body.navLabels || {}),
        },
        heroEyebrow:
          typeof body.heroEyebrow === 'string' && body.heroEyebrow.trim()
            ? body.heroEyebrow.trim()
            : current.heroEyebrow,
        heroTitle:
          typeof body.heroTitle === 'string' && body.heroTitle.trim()
            ? body.heroTitle.trim()
            : current.heroTitle,
        heroSubtitle:
          typeof body.heroSubtitle === 'string' && body.heroSubtitle.trim()
            ? body.heroSubtitle.trim()
            : current.heroSubtitle,
        heroLocationLabel:
          typeof body.heroLocationLabel === 'string' && body.heroLocationLabel.trim()
            ? body.heroLocationLabel.trim()
            : current.heroLocationLabel,
        heroBadgeCode:
          typeof body.heroBadgeCode === 'string' && body.heroBadgeCode.trim()
            ? body.heroBadgeCode.trim()
            : current.heroBadgeCode,
        organHeading:
          typeof body.organHeading === 'string' && body.organHeading.trim()
            ? body.organHeading.trim()
            : current.organHeading,
        organSubtitle:
          typeof body.organSubtitle === 'string' && body.organSubtitle.trim()
            ? body.organSubtitle.trim()
            : current.organSubtitle,
        organSubtitles: {
          ...current.organSubtitles,
          ...(body.organSubtitles || {}),
        },
        notifTitle:
          typeof body.notifTitle === 'string' && body.notifTitle.trim()
            ? body.notifTitle.trim()
            : current.notifTitle,
        notifSubtitle:
          typeof body.notifSubtitle === 'string' && body.notifSubtitle.trim()
            ? body.notifSubtitle.trim()
            : current.notifSubtitle,
        galleryKicker:
          typeof body.galleryKicker === 'string' && body.galleryKicker.trim()
            ? body.galleryKicker.trim()
            : current.galleryKicker,
        galleryTitle:
          typeof body.galleryTitle === 'string' && body.galleryTitle.trim()
            ? body.galleryTitle.trim()
            : current.galleryTitle,
        gallerySubtitle:
          typeof body.gallerySubtitle === 'string' && body.gallerySubtitle.trim()
            ? body.gallerySubtitle.trim()
            : current.gallerySubtitle,
        sections: {
          ...current.sections,
          ...(body.sections || {}),
        },
      };
    }
    saveDatabase(db);
    broadcastUpdate('siteContent');
    res.json(db.siteContent || DEFAULT_SITE_CONTENT);
  });

  app.put('/api/church-identity', requireAdminAccess, (req, res) => {
    const authUser = (req as express.Request & { authUser?: AuthUser }).authUser;
    const body = req.body as Partial<ChurchIdentity> & {
      logoDataUrl?: string;
      resetLogo?: boolean;
    };

    const current = db.churchIdentity || DEFAULT_CHURCH_IDENTITY;
    let nextLogoUrl = current.logoUrl || DEFAULT_CHURCH_IDENTITY.logoUrl;

    const cleanupCustomLogo = (oldUrl: string | undefined) => {
      if (oldUrl && oldUrl.startsWith('/uploads/logo-')) {
        const safeName = path.basename(oldUrl);
        const filePath = path.join(UPLOADS_DIR, safeName);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch {
            // Ignore unlink error
          }
        }
      }
    };

    if (body.resetLogo) {
      cleanupCustomLogo(current.logoUrl);
      nextLogoUrl = DEFAULT_CHURCH_IDENTITY.logoUrl;
    } else if (typeof body.logoDataUrl === 'string' && body.logoDataUrl.trim().length > 0) {
      const match = body.logoDataUrl
        .trim()
        .match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
      if (!match) {
        res.status(400).json({
          error: 'Format logo tidak valid. Gunakan file gambar PNG, JPEG, atau WebP.',
        });
        return;
      }
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      const buffer = Buffer.from(match[2], 'base64');
      if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
        res.status(400).json({ error: 'Ukuran logo melebihi batas maksimal 10 MB.' });
        return;
      }
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      const filename = `logo-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
      cleanupCustomLogo(current.logoUrl);
      nextLogoUrl = `/uploads/${filename}`;
    }

    const validIds: FourfoldSymbolInfo['id'][] = ['salib', 'kendi', 'cawan', 'mahkota'];
    const incomingSymbolsMap = new Map<string, Partial<FourfoldSymbolInfo>>();
    if (Array.isArray(body.symbols)) {
      for (const s of body.symbols) {
        if (s && typeof s.id === 'string') {
          incomingSymbolsMap.set(s.id, s);
        }
      }
    }

    const mergedSymbols: FourfoldSymbolInfo[] = validIds.map((id, idx) => {
      const existingSym =
        current.symbols.find((s) => s.id === id) || DEFAULT_CHURCH_IDENTITY.symbols[idx];
      const incomingSym = incomingSymbolsMap.get(id);
      return {
        id,
        symbolName:
          typeof incomingSym?.symbolName === 'string' && incomingSym.symbolName.trim()
            ? incomingSym.symbolName.trim()
            : existingSym.symbolName,
        title:
          typeof incomingSym?.title === 'string' && incomingSym.title.trim()
            ? incomingSym.title.trim()
            : existingSym.title,
        verseRef:
          typeof incomingSym?.verseRef === 'string' && incomingSym.verseRef.trim()
            ? incomingSym.verseRef.trim()
            : existingSym.verseRef,
        meaning:
          typeof incomingSym?.meaning === 'string' && incomingSym.meaning.trim()
            ? incomingSym.meaning.trim()
            : existingSym.meaning,
      };
    });

    const nextIdentity: ChurchIdentity = {
      kicker:
        typeof body.kicker === 'string' && body.kicker.trim()
          ? body.kicker.trim()
          : current.kicker,
      heading:
        typeof body.heading === 'string' && body.heading.trim()
          ? body.heading.trim()
          : current.heading,
      description:
        typeof body.description === 'string' && body.description.trim()
          ? body.description.trim()
          : current.description,
      churchName:
        typeof body.churchName === 'string' && body.churchName.trim()
          ? body.churchName.trim()
          : current.churchName,
      subLabel:
        typeof body.subLabel === 'string' && body.subLabel.trim()
          ? body.subLabel.trim()
          : current.subLabel,
      logoUrl: nextLogoUrl,
      symbols: mergedSymbols,
      updatedBy: authUser?.name || 'Sekretaris Jemaat',
      updatedAt: new Date().toISOString(),
    };

    db.churchIdentity = nextIdentity;
    saveDatabase(db);
    broadcastUpdate('churchIdentity');
    res.json(db.churchIdentity);
  });

  app.post('/api/schedules', requireAdminAccess, (req, res) => {
    const body = req.body as Partial<WorshipSchedule>;
    const item: WorshipSchedule = {
      id: `sch-${Date.now()}`,
      title: String(body.title || '').trim(),
      organ: body.organ || 'Umum / Raya',
      dayOfWeek: String(body.dayOfWeek || 'Minggu').trim(),
      time: String(body.time || '09:00 WIB').trim(),
      location: String(body.location || '').trim(),
      mcName: String(body.mcName || '').trim(),
      speaker: String(body.speaker || '').trim(),
      offeringCollectors: String(body.offeringCollectors || '').trim(),
      intercessoryPrayerLeader: String(body.intercessoryPrayerLeader || '').trim(),
      theme: String(body.theme || '').trim(),
      notes: body.notes ? String(body.notes).trim() : undefined,
    };
    db.schedules.unshift(item);
    saveDatabase(db);
    broadcastUpdate('schedules');
    res.status(201).json(item);
  });

  app.put('/api/schedules/:id', requireAdminAccess, (req, res) => {
    const idx = db.schedules.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Jadwal ibadah tidak ditemukan' });
      return;
    }
    const body = req.body as Partial<WorshipSchedule>;
    db.schedules[idx] = {
      ...db.schedules[idx],
      ...body,
      id: req.params.id,
      mcName: String(body.mcName ?? db.schedules[idx].mcName).trim(),
      speaker: String(body.speaker ?? db.schedules[idx].speaker).trim(),
      offeringCollectors: String(
        body.offeringCollectors ?? db.schedules[idx].offeringCollectors
      ).trim(),
      intercessoryPrayerLeader: String(
        body.intercessoryPrayerLeader ?? db.schedules[idx].intercessoryPrayerLeader
      ).trim(),
      location: String(body.location ?? db.schedules[idx].location).trim(),
    };
    saveDatabase(db);
    broadcastUpdate('schedules');
    res.json(db.schedules[idx]);
  });

  app.delete('/api/schedules/:id', requireAdminAccess, (req, res) => {
    db.schedules = db.schedules.filter((s) => s.id !== req.params.id);
    saveDatabase(db);
    broadcastUpdate('schedules');
    res.json({ ok: true });
  });

  app.post('/api/announcements', requireAdminAccess, (req, res) => {
    const item: ChurchAnnouncement = {
      id: `ann-${Date.now()}`,
      ...req.body,
    };
    db.announcements.unshift(item);
    saveDatabase(db);
    broadcastUpdate('announcements');
    res.status(201).json(item);
  });

  app.put('/api/announcements/:id', requireAdminAccess, (req, res) => {
    const idx = db.announcements.findIndex((a) => a.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Warta gereja tidak ditemukan' });
      return;
    }
    db.announcements[idx] = {
      ...db.announcements[idx],
      ...req.body,
      id: db.announcements[idx].id,
    };
    saveDatabase(db);
    broadcastUpdate('announcements');
    res.json(db.announcements[idx]);
  });

  app.delete('/api/announcements/:id', requireAdminAccess, (req, res) => {
    db.announcements = db.announcements.filter((a) => a.id !== req.params.id);
    saveDatabase(db);
    broadcastUpdate('announcements');
    res.json({ ok: true });
  });

  app.post('/api/prayers', requireAdminAccess, (req, res) => {
    const item: DailyPrayer = {
      id: `pry-${Date.now()}`,
      prayedCount: 1,
      ...req.body,
    };
    db.prayers.unshift(item);
    saveDatabase(db);
    broadcastUpdate('prayers');
    res.status(201).json(item);
  });

  app.put('/api/prayers/:id', requireAdminAccess, (req, res) => {
    const idx = db.prayers.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Pokok doa tidak ditemukan' });
      return;
    }
    db.prayers[idx] = {
      ...db.prayers[idx],
      ...req.body,
      id: db.prayers[idx].id,
    };
    saveDatabase(db);
    broadcastUpdate('prayers');
    res.json(db.prayers[idx]);
  });

  app.patch('/api/prayers/:id/pray', (req, res) => {
    const target = db.prayers.find((p) => p.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Pokok doa tidak ditemukan' });
      return;
    }
    target.prayedCount += 1;
    saveDatabase(db);
    broadcastUpdate('prayers');
    res.json(target);
  });

  app.delete('/api/prayers/:id', requireAdminAccess, (req, res) => {
    db.prayers = db.prayers.filter((p) => p.id !== req.params.id);
    saveDatabase(db);
    broadcastUpdate('prayers');
    res.json({ ok: true });
  });

  app.post('/api/ledger', requireFinanceAccess, (req, res) => {
    const body = req.body as Partial<LedgerEntry>;
    const isDonorCategory =
      body.category === 'Persepuluhan' || body.category === 'Ucapan Syukur';
    const cleanDonor = isDonorCategory ? String(body.donorName || '').trim() : '';
    const item: LedgerEntry = {
      id: `led-${Date.now()}`,
      date: String(body.date || ''),
      voucherNo: String(body.voucherNo || ''),
      description: String(body.description || ''),
      category: body.category || 'Persembahan Ibadah',
      type: body.type === 'keluar' ? 'keluar' : 'masuk',
      amount: Number(body.amount) || 0,
      recordedBy: String(body.recordedBy || ''),
      ...(cleanDonor ? { donorName: cleanDonor } : {}),
    };
    db.ledger.push(item);
    db.ledger.sort((a, b) => a.date.localeCompare(b.date));
    saveDatabase(db);
    broadcastUpdate('ledger');
    res.status(201).json(item);
  });

  app.put('/api/ledger/:id', requireFinanceAccess, (req, res) => {
    const idx = db.ledger.findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Catatan transaksi tidak ditemukan' });
      return;
    }
    const body = req.body as Partial<LedgerEntry>;
    const nextCategory = body.category ?? db.ledger[idx].category;
    const isDonorCategory =
      nextCategory === 'Persepuluhan' || nextCategory === 'Ucapan Syukur';
    const rawDonor =
      body.donorName !== undefined ? body.donorName : db.ledger[idx].donorName;
    const cleanDonor = isDonorCategory ? String(rawDonor || '').trim() : '';

    const updated: LedgerEntry = {
      ...db.ledger[idx],
      ...body,
      id: req.params.id,
      category: nextCategory,
      amount: Number(body.amount ?? db.ledger[idx].amount) || 0,
    };
    if (cleanDonor) {
      updated.donorName = cleanDonor;
    } else {
      delete updated.donorName;
    }

    db.ledger[idx] = updated;
    db.ledger.sort((a, b) => a.date.localeCompare(b.date));
    saveDatabase(db);
    broadcastUpdate('ledger');
    res.json(db.ledger[idx]);
  });

  app.delete('/api/ledger/:id', requireFinanceAccess, (req, res) => {
    db.ledger = db.ledger.filter((l) => l.id !== req.params.id);
    saveDatabase(db);
    broadcastUpdate('ledger');
    res.json({ ok: true });
  });

  app.post('/api/members', requireAdminAccess, (req, res) => {
    const body = req.body as Partial<Member>;
    const item: Member = {
      id: `mem-${Date.now()}`,
      fullName: String(body.fullName || '').trim(),
      gender: body.gender === 'P' ? 'P' : 'L',
      noKk: String(body.noKk || '').trim(),
      noNik: String(body.noNik || '').trim(),
      birthPlace: String(body.birthPlace || '').trim(),
      birthDate: String(body.birthDate || '').trim(),
      familyRelationship: body.familyRelationship || 'Kepala Keluarga',
      weddingDate: body.weddingDate ? String(body.weddingDate).trim() : null,
      spouseName: body.spouseName ? String(body.spouseName).trim() : null,
      baptismStatus: body.baptismStatus === 'Sudah Baptis' ? 'Sudah Baptis' : 'Belum Baptis',
      phone: String(body.phone || '').trim(),
      sector: String(body.sector || 'Sektor I - Hilir').trim(),
      organ: body.organ || 'Perkaria',
      ageCategory: body.ageCategory || 'Dewasa (31-59)',
      status: body.status === 'Simpatisan' ? 'Simpatisan' : 'Aktif',
      joinedYear: Number(body.joinedYear) || new Date().getFullYear(),
    };
    db.members.unshift(item);
    saveDatabase(db);
    broadcastUpdate('members');
    res.status(201).json(item);
  });

  app.put('/api/members/:id', requireAdminAccess, (req, res) => {
    const idx = db.members.findIndex((m) => m.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Data jemaat tidak ditemukan' });
      return;
    }
    const body = req.body as Partial<Member>;
    const existing = db.members[idx];
    db.members[idx] = {
      ...existing,
      ...body,
      id: req.params.id,
      fullName: String(body.fullName ?? existing.fullName).trim(),
      noKk: String(body.noKk ?? existing.noKk).trim(),
      noNik: String(body.noNik ?? existing.noNik).trim(),
      birthPlace: String(body.birthPlace ?? existing.birthPlace).trim(),
      birthDate: String(body.birthDate ?? existing.birthDate).trim(),
      familyRelationship: body.familyRelationship ?? existing.familyRelationship,
      weddingDate:
        body.weddingDate !== undefined
          ? body.weddingDate
            ? String(body.weddingDate).trim()
            : null
          : existing.weddingDate,
      spouseName:
        body.spouseName !== undefined
          ? body.spouseName
            ? String(body.spouseName).trim()
            : null
          : existing.spouseName,
      baptismStatus:
        body.baptismStatus === 'Sudah Baptis' || body.baptismStatus === 'Belum Baptis'
          ? body.baptismStatus
          : existing.baptismStatus,
      joinedYear: Number(body.joinedYear ?? existing.joinedYear) || existing.joinedYear,
    };
    saveDatabase(db);
    broadcastUpdate('members');
    res.json(db.members[idx]);
  });

  app.delete('/api/members/:id', requireAdminAccess, (req, res) => {
    db.members = db.members.filter((m) => m.id !== req.params.id);
    saveDatabase(db);
    broadcastUpdate('members');
    res.json({ ok: true });
  });

  app.post('/api/leadership', requireAdminAccess, (req, res) => {
    const item: LeadershipMember = {
      id: `bpj-${Date.now()}`,
      order: db.leadership.length + 1,
      ...req.body,
    };
    db.leadership.push(item);
    saveDatabase(db);
    broadcastUpdate('leadership');
    res.status(201).json(item);
  });

  app.put('/api/leadership/:id', requireAdminAccess, (req, res) => {
    const idx = db.leadership.findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Data pengurus tidak ditemukan' });
      return;
    }
    db.leadership[idx] = {
      ...db.leadership[idx],
      ...req.body,
      id: db.leadership[idx].id,
    };
    saveDatabase(db);
    broadcastUpdate('leadership');
    res.json(db.leadership[idx]);
  });

  app.delete('/api/leadership/:id', requireAdminAccess, (req, res) => {
    db.leadership = db.leadership.filter((l) => l.id !== req.params.id);
    saveDatabase(db);
    broadcastUpdate('leadership');
    res.json({ ok: true });
  });

  app.post('/api/committees', requireAdminAccess, (req, res) => {
    const item = {
      id: `com-${Date.now()}`,
      meetings: [],
      tasks: [],
      ...req.body,
    };
    db.committees.unshift(item);
    saveDatabase(db);
    broadcastUpdate('committees');
    res.status(201).json(item);
  });

  app.put('/api/committees/:id', requireAdminAccess, (req, res) => {
    const idx = db.committees.findIndex((c) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Data kepanitiaan tidak ditemukan' });
      return;
    }
    db.committees[idx] = {
      ...db.committees[idx],
      name: String(req.body.name ?? db.committees[idx].name).trim(),
      eventDate: String(req.body.eventDate ?? db.committees[idx].eventDate).trim(),
      description: String(req.body.description ?? db.committees[idx].description).trim(),
      chairperson: String(req.body.chairperson ?? db.committees[idx].chairperson).trim(),
    };
    saveDatabase(db);
    broadcastUpdate('committees');
    res.json(db.committees[idx]);
  });

  app.post('/api/committees/:id/meetings', requireAdminAccess, (req, res) => {
    const com = db.committees.find((c) => c.id === req.params.id);
    if (!com) {
      res.status(404).json({ error: 'Panitia tidak ditemukan' });
      return;
    }
    const meeting: CommitteeMeeting = {
      id: `mtg-${Date.now()}`,
      status: 'Terjadwal',
      reminderMinutesBefore: Number(req.body.reminderMinutesBefore) || 1440,
      ...req.body,
    };
    com.meetings.push(meeting);
    saveDatabase(db);
    broadcastUpdate('committees');
    res.status(201).json(meeting);
  });

  app.patch('/api/committees/:id/meetings/:meetingId', requireAdminAccess, (req, res) => {
    const com = db.committees.find((c) => c.id === req.params.id);
    const meeting = com?.meetings.find((m) => m.id === req.params.meetingId);
    if (!meeting) {
      res.status(404).json({ error: 'Jadwal rapat tidak ditemukan' });
      return;
    }
    Object.assign(meeting, req.body);
    saveDatabase(db);
    broadcastUpdate('committees');
    res.json(meeting);
  });

  app.post('/api/committees/:id/tasks', requireAdminAccess, (req, res) => {
    const com = db.committees.find((c) => c.id === req.params.id);
    if (!com) {
      res.status(404).json({ error: 'Panitia tidak ditemukan' });
      return;
    }
    const task: CommitteeTask = {
      id: `tsk-${Date.now()}`,
      status: 'Belum Mulai',
      ...req.body,
    };
    com.tasks.push(task);
    saveDatabase(db);
    broadcastUpdate('committees');
    res.status(201).json(task);
  });

  app.patch('/api/committees/:id/tasks/:taskId', requireAdminAccess, (req, res) => {
    const com = db.committees.find((c) => c.id === req.params.id);
    const task = com?.tasks.find((t) => t.id === req.params.taskId);
    if (!task) {
      res.status(404).json({ error: 'Tugas panitia tidak ditemukan' });
      return;
    }
    Object.assign(task, req.body);
    saveDatabase(db);
    broadcastUpdate('committees');
    res.json(task);
  });

  app.delete('/api/committees/:id/tasks/:taskId', requireAdminAccess, (req, res) => {
    const com = db.committees.find((c) => c.id === req.params.id);
    if (!com) {
      res.status(404).json({ error: 'Panitia tidak ditemukan' });
      return;
    }
    com.tasks = com.tasks.filter((t) => t.id !== req.params.taskId);
    saveDatabase(db);
    broadcastUpdate('committees');
    res.json({ ok: true });
  });

  app.post('/api/devotionals', requireAdminAccess, (req, res) => {
    const item: Devotional = {
      id: `dev-${Date.now()}`,
      ...req.body,
    };
    db.devotionals.unshift(item);
    saveDatabase(db);
    broadcastUpdate('devotionals');
    res.status(201).json(item);
  });

  app.put('/api/devotionals/:id', requireAdminAccess, (req, res) => {
    const idx = db.devotionals.findIndex((d) => d.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Renungan tidak ditemukan' });
      return;
    }
    db.devotionals[idx] = {
      ...db.devotionals[idx],
      ...req.body,
      id: db.devotionals[idx].id,
    };
    saveDatabase(db);
    broadcastUpdate('devotionals');
    res.json(db.devotionals[idx]);
  });

  app.delete('/api/devotionals/:id', requireAdminAccess, (req, res) => {
    db.devotionals = db.devotionals.filter((d) => d.id !== req.params.id);
    saveDatabase(db);
    broadcastUpdate('devotionals');
    res.json({ ok: true });
  });

  app.post('/api/gallery', requireAuth, (req, res) => {
    const authUser = (req as AuthenticatedRequest).authUser!;
    const body = req.body as {
      title?: string;
      category?: GalleryCategory;
      date?: string;
      caption?: string;
      imageDataUrl?: string;
    };

    const title = String(body.title || '').trim();
    const caption = String(body.caption || '').trim();
    const date = String(body.date || '').trim() || formatYMD(new Date());
    const validCategories: GalleryCategory[] = [
      'Ibadah Raya',
      'Sekolah Minggu & Remaja',
      'Pemuda',
      'Perkawan & Perkaria',
      'Diakonia & Baksos',
      'Gotong Royong & Panitia',
    ];
    const category: GalleryCategory = validCategories.includes(body.category as GalleryCategory)
      ? (body.category as GalleryCategory)
      : 'Ibadah Raya';

    if (!title) {
      res.status(400).json({ error: 'Judul kegiatan wajib diisi.' });
      return;
    }

    const imageDataUrl = String(body.imageDataUrl || '');
    const match = imageDataUrl.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      res.status(400).json({
        error: 'Format gambar tidak valid. Gunakan kamera perangkat atau unggah file JPEG, PNG, atau WebP.',
      });
      return;
    }

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
      res.status(400).json({ error: 'Ukuran foto melebihi batas maksimal 10 MB.' });
      return;
    }

    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const filename = `gal-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

    const item: GalleryPhoto = {
      id: `gal-${Date.now()}`,
      title,
      category,
      date,
      caption: caption || `Dokumentasi kegiatan ${title} GKII Jemaat Sungai Barang.`,
      imageUrl: `/uploads/${filename}`,
      capturedBy: authUser.name,
      createdAt: new Date().toISOString(),
    };

    db.gallery.unshift(item);
    saveDatabase(db);
    broadcastUpdate('gallery');
    res.status(201).json(item);
  });

  app.put('/api/gallery/:id', requireAdminAccess, (req, res) => {
    const idx = db.gallery.findIndex((g) => g.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Foto kegiatan tidak ditemukan.' });
      return;
    }
    const body = req.body as Partial<GalleryPhoto>;
    db.gallery[idx] = {
      ...db.gallery[idx],
      title: String(body.title ?? db.gallery[idx].title).trim() || db.gallery[idx].title,
      category: (body.category ?? db.gallery[idx].category) as GalleryCategory,
      date: String(body.date ?? db.gallery[idx].date).trim() || db.gallery[idx].date,
      caption: String(body.caption ?? db.gallery[idx].caption).trim(),
    };
    saveDatabase(db);
    broadcastUpdate('gallery');
    res.json(db.gallery[idx]);
  });

  app.delete('/api/gallery/:id', requireAuth, (req, res) => {
    const target = db.gallery.find((g) => g.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Foto kegiatan tidak ditemukan.' });
      return;
    }

    if (target.imageUrl.startsWith('/uploads/')) {
      const safeName = path.basename(target.imageUrl);
      const filePath = path.join(UPLOADS_DIR, safeName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // Ignore file unlink failure if already missing
        }
      }
    }

    db.gallery = db.gallery.filter((g) => g.id !== req.params.id);
    saveDatabase(db);
    broadcastUpdate('gallery');
    res.json({ ok: true });
  });

  function saveLetterPhotoFromDataUrl(
    imageDataUrl: string,
    label: string
  ): PhysicalLetterPhoto {
    const match = imageDataUrl.match(
      /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=]+)$/
    );
    if (!match) {
      throw new Error(
        'Format foto fisik surat tidak valid. Gunakan kamera atau gambar JPEG, PNG, atau WebP.'
      );
    }
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
      throw new Error('Ukuran foto fisik surat melebihi batas maksimal 10 MB.');
    }
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const filename = `let-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
    return {
      id: `lph-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      label: label.trim() || 'Halaman Surat',
      imageUrl: `/uploads/${filename}`,
      capturedAt: new Date().toISOString(),
    };
  }

  function removeUploadedFileIfLocal(imageUrl: string): void {
    if (imageUrl.startsWith('/uploads/')) {
      const safeName = path.basename(imageUrl);
      const filePath = path.join(UPLOADS_DIR, safeName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // Ignore missing file
        }
      }
    }
  }

  const VALID_LETTER_TYPES: LetterType[] = [
    'Surat Masuk',
    'Surat Keluar',
    'Surat Keputusan',
    'Surat Nikah',
    'Surat Baptis',
    'Surat Persembahan Anak',
  ];

  app.get('/api/letters', requireAdminAccess, (_req, res) => {
    res.json(db.letters || []);
  });

  app.post('/api/letters', requireAdminAccess, (req, res) => {
    const authUser = (req as AuthenticatedRequest).authUser!;
    const body = req.body as Partial<ChurchLetter> & {
      initialPhotos?: { label?: string; imageDataUrl?: string }[];
    };

    const letterType: LetterType = VALID_LETTER_TYPES.includes(body.letterType as LetterType)
      ? (body.letterType as LetterType)
      : 'Surat Masuk';

    const letterNumber = String(body.letterNumber || '').trim();
    const subject = String(body.subject || '').trim();
    const letterDate = String(body.letterDate || '').trim() || formatYMD(new Date());

    if (!letterNumber || !subject) {
      res.status(400).json({ error: 'Nomor surat dan perihal/judul surat wajib diisi.' });
      return;
    }

    const physicalPhotos: PhysicalLetterPhoto[] = [];
    if (Array.isArray(body.initialPhotos)) {
      try {
        for (let i = 0; i < body.initialPhotos.length; i += 1) {
          const entry = body.initialPhotos[i];
          if (entry?.imageDataUrl) {
            physicalPhotos.push(
              saveLetterPhotoFromDataUrl(
                entry.imageDataUrl,
                entry.label || `Halaman ${i + 1}`
              )
            );
          }
        }
      } catch (err) {
        for (const saved of physicalPhotos) {
          removeUploadedFileIfLocal(saved.imageUrl);
        }
        res.status(400).json({
          error: err instanceof Error ? err.message : 'Gagal menyimpan foto fisik surat.',
        });
        return;
      }
    }

    const item: ChurchLetter = {
      id: `let-${Date.now()}`,
      letterType,
      letterNumber,
      letterDate,
      subject,
      status:
        body.status === 'Ditindaklanjuti' || body.status === 'Selesai'
          ? body.status
          : 'Arsip Aktif',
      notes: String(body.notes || '').trim(),
      sender: body.sender ? String(body.sender).trim() : undefined,
      receivedDate: body.receivedDate ? String(body.receivedDate).trim() : undefined,
      disposition: body.disposition ? String(body.disposition).trim() : undefined,
      recipient: body.recipient ? String(body.recipient).trim() : undefined,
      signer: body.signer ? String(body.signer).trim() : undefined,
      effectiveDate: body.effectiveDate ? String(body.effectiveDate).trim() : undefined,
      validityPeriod: body.validityPeriod ? String(body.validityPeriod).trim() : undefined,
      groomName: body.groomName ? String(body.groomName).trim() : undefined,
      brideName: body.brideName ? String(body.brideName).trim() : undefined,
      officiant: body.officiant ? String(body.officiant).trim() : undefined,
      ceremonyLocation: body.ceremonyLocation
        ? String(body.ceremonyLocation).trim()
        : undefined,
      witnesses: body.witnesses ? String(body.witnesses).trim() : undefined,
      baptizedName: body.baptizedName ? String(body.baptizedName).trim() : undefined,
      birthInfo: body.birthInfo ? String(body.birthInfo).trim() : undefined,
      parentsName: body.parentsName ? String(body.parentsName).trim() : undefined,
      childName: body.childName ? String(body.childName).trim() : undefined,
      fatherName: body.fatherName ? String(body.fatherName).trim() : undefined,
      motherName: body.motherName ? String(body.motherName).trim() : undefined,
      physicalPhotos,
      recordedBy: authUser.name,
      createdAt: new Date().toISOString(),
    };

    if (!Array.isArray(db.letters)) {
      db.letters = [];
    }
    db.letters.unshift(item);
    saveDatabase(db);
    broadcastUpdate('letters');
    res.status(201).json(item);
  });

  app.put('/api/letters/:id', requireAdminAccess, (req, res) => {
    const letters = db.letters || [];
    const idx = letters.findIndex((l) => l.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Arsip surat tidak ditemukan.' });
      return;
    }
    const body = req.body as Partial<ChurchLetter>;
    const existing = letters[idx];
    const nextType: LetterType = VALID_LETTER_TYPES.includes(body.letterType as LetterType)
      ? (body.letterType as LetterType)
      : existing.letterType;

    letters[idx] = {
      ...existing,
      ...body,
      id: existing.id,
      letterType: nextType,
      letterNumber: String(body.letterNumber ?? existing.letterNumber).trim(),
      letterDate: String(body.letterDate ?? existing.letterDate).trim(),
      subject: String(body.subject ?? existing.subject).trim(),
      notes: String(body.notes ?? existing.notes).trim(),
      physicalPhotos: existing.physicalPhotos,
    };

    db.letters = letters;
    saveDatabase(db);
    broadcastUpdate('letters');
    res.json(letters[idx]);
  });

  app.post('/api/letters/:id/photos', requireAdminAccess, (req, res) => {
    const letters = db.letters || [];
    const target = letters.find((l) => l.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Arsip surat tidak ditemukan.' });
      return;
    }
    const { imageDataUrl, label } = req.body as {
      imageDataUrl?: string;
      label?: string;
    };
    if (!imageDataUrl) {
      res.status(400).json({ error: 'Foto fisik surat wajib disertakan.' });
      return;
    }

    try {
      const saved = saveLetterPhotoFromDataUrl(
        imageDataUrl,
        label || `Halaman ${target.physicalPhotos.length + 1}`
      );
      target.physicalPhotos.push(saved);
      saveDatabase(db);
      broadcastUpdate('letters');
      res.status(201).json(saved);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Gagal menyimpan foto fisik surat.',
      });
    }
  });

  app.delete('/api/letters/:id/photos/:photoId', requireAdminAccess, (req, res) => {
    const letters = db.letters || [];
    const target = letters.find((l) => l.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Arsip surat tidak ditemukan.' });
      return;
    }
    const photo = target.physicalPhotos.find((p) => p.id === req.params.photoId);
    if (!photo) {
      res.status(404).json({ error: 'Foto fisik surat tidak ditemukan.' });
      return;
    }
    removeUploadedFileIfLocal(photo.imageUrl);
    target.physicalPhotos = target.physicalPhotos.filter((p) => p.id !== req.params.photoId);
    saveDatabase(db);
    broadcastUpdate('letters');
    res.json({ ok: true });
  });

  app.delete('/api/letters/:id', requireAdminAccess, (req, res) => {
    const letters = db.letters || [];
    const target = letters.find((l) => l.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Arsip surat tidak ditemukan.' });
      return;
    }
    for (const p of target.physicalPhotos) {
      removeUploadedFileIfLocal(p.imageUrl);
    }
    db.letters = letters.filter((l) => l.id !== req.params.id);
    saveDatabase(db);
    broadcastUpdate('letters');
    res.json({ ok: true });
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    // Serve a clean no-WebSocket @vite/client module because HMR is disabled in AI Studio preview
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
}
function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style && style.parentNode) {
    style.parentNode.removeChild(style);
    sheetsMap.delete(id);
  }
}
function createHotContext() {
  return {
    data: {},
    accept() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
function injectQuery(url, queryToInject) {
  if (url[0] !== '.' && url[0] !== '/') return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return \`\${pathname}?\${queryToInject}\${search ? '&' + search.slice(1) : ''}\${hash || ''}\`;
}
class ErrorOverlay {}
export { ErrorOverlay, createHotContext, injectQuery, removeStyle, updateStyle };
`);
    });

    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false, ws: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server GKII Jemaat Sungai Barang berjalan di port ${PORT}`);
  });
}

startServer();
