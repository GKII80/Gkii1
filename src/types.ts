export type OrganPelayanan =
  | 'Perkaria'
  | 'Perkawan'
  | 'Sekolah Minggu'
  | 'Remaja'
  | 'Pemuda'
  | 'Lansia';

export type AgeCategory =
  | 'Anak (0-12)'
  | 'Remaja (13-17)'
  | 'Pemuda (18-30)'
  | 'Dewasa (31-59)'
  | 'Lansia (60+)';

export interface WorshipSchedule {
  id: string;
  title: string;
  organ: 'Umum / Raya' | OrganPelayanan | 'Pemuda & Remaja' | 'Doa & Sektor';
  dayOfWeek: string;
  time: string;
  location: string; // Tempat Ibadah
  mcName: string; // Nama MC
  speaker: string; // Penghotbah
  offeringCollectors: string; // Petugas Kantong Persembahan
  intercessoryPrayerLeader: string; // Pemimpin Doa Syafaat
  theme: string;
  notes?: string;
}

export interface ChurchAnnouncement {
  id: string;
  title: string;
  date: string;
  category: 'Kegiatan Gereja' | 'Berita Jemaat' | 'Pelayanan' | 'Keuangan & Pembangunan';
  summary: string;
  content: string;
  author: string;
}

export interface DailyPrayer {
  id: string;
  title: string;
  category:
    | 'Bangsa & Negara'
    | 'Jemaat Sakit & Pemulihan'
    | 'Misi & Penginjilan'
    | 'Keluarga & Pemuda'
    | 'Pelayanan Gereja';
  verseRef: string;
  verseText: string;
  guideSteps: string[];
  prayedCount: number;
  date: string;
}

export type LedgerCategory =
  | 'Persepuluhan'
  | 'Persembahan Ibadah'
  | 'Persembahan Kantong Biru'
  | 'Persembahan Kantong Merah'
  | 'Persembahan Ibadah Sore'
  | 'Ucapan Syukur'
  | 'Diakonia'
  | 'Operasional Gereja'
  | 'Pembangunan'
  | 'Misi & Penginjilan';

export interface LedgerEntry {
  id: string;
  date: string;
  voucherNo: string;
  description: string;
  category: LedgerCategory;
  type: 'masuk' | 'keluar';
  amount: number;
  recordedBy: string;
  donorName?: string; // Nama yang memberi (untuk Persepuluhan & Ucapan Syukur)
}

export type FamilyRelationship =
  | 'Kepala Keluarga'
  | 'Istri'
  | 'Anak'
  | 'Orang Tua'
  | 'Famili Lain';

export type BaptismStatus = 'Sudah Baptis' | 'Belum Baptis';

export interface Member {
  id: string;
  fullName: string;
  gender: 'L' | 'P';
  noKk: string;
  noNik: string;
  birthPlace: string;
  birthDate: string; // YYYY-MM-DD (Tanggal, Bulan, Tahun Lahir)
  familyRelationship: FamilyRelationship;
  weddingDate: string | null; // YYYY-MM-DD
  spouseName: string | null;
  baptismStatus: BaptismStatus;
  phone: string;
  sector: string;
  organ: OrganPelayanan;
  ageCategory: AgeCategory;
  status: 'Aktif' | 'Simpatisan';
  joinedYear: number;
}

export interface LeadershipMember {
  id: string;
  name: string;
  role: string;
  period: string;
  phone: string;
  email: string;
  photoUrl: string;
  responsibilities: string[];
  bio: string;
  order: number;
}

export interface CommitteeMeeting {
  id: string;
  title: string;
  dateTime: string; // YYYY-MM-DDTHH:mm
  location: string;
  agenda: string;
  reminderMinutesBefore: number;
  status: 'Terjadwal' | 'Berlangsung' | 'Selesai';
  attendeesNote: string;
}

export interface CommitteeTask {
  id: string;
  title: string;
  section: string;
  assignee: string;
  deadline: string;
  status: 'Belum Mulai' | 'Proses' | 'Selesai';
  notes?: string;
}

export interface Committee {
  id: string;
  name: string;
  eventDate: string;
  description: string;
  chairperson: string;
  meetings: CommitteeMeeting[];
  tasks: CommitteeTask[];
}

export interface GrowthSnapshot {
  period: string;
  granularity: 'tahunan' | 'triwulan';
  byOrgan: Record<OrganPelayanan, number>;
  byAge: Record<AgeCategory, number>;
  total: number;
}

export interface Devotional {
  id: string;
  date: string;
  title: string;
  verseRef: string;
  verseText: string;
  content: string;
  application: string;
  closingPrayer: string;
  author: string;
}

export interface VisionMission {
  period: string;
  vision: string;
  missions: string[];
  themeVerseRef: string;
  themeVerseText: string;
}

export type GalleryCategory =
  | 'Ibadah Raya'
  | 'Sekolah Minggu & Remaja'
  | 'Pemuda'
  | 'Perkawan & Perkaria'
  | 'Diakonia & Baksos'
  | 'Gotong Royong & Panitia';

export interface GalleryPhoto {
  id: string;
  title: string;
  category: GalleryCategory;
  date: string; // YYYY-MM-DD
  caption: string;
  imageUrl: string;
  capturedBy: string;
  createdAt: string;
}

export type LetterType =
  | 'Surat Masuk'
  | 'Surat Keluar'
  | 'Surat Keputusan'
  | 'Surat Nikah'
  | 'Surat Baptis'
  | 'Surat Persembahan Anak';

export interface PhysicalLetterPhoto {
  id: string;
  label: string;
  imageUrl: string;
  capturedAt: string;
}

export interface ChurchLetter {
  id: string;
  letterType: LetterType;
  letterNumber: string;
  letterDate: string; // YYYY-MM-DD
  subject: string;
  status: 'Arsip Aktif' | 'Ditindaklanjuti' | 'Selesai';
  notes: string;
  sender?: string;
  receivedDate?: string;
  disposition?: string;
  recipient?: string;
  signer?: string;
  effectiveDate?: string;
  validityPeriod?: string;
  groomName?: string;
  brideName?: string;
  officiant?: string;
  ceremonyLocation?: string;
  witnesses?: string;
  baptizedName?: string;
  birthInfo?: string;
  parentsName?: string;
  childName?: string;
  fatherName?: string;
  motherName?: string;
  physicalPhotos: PhysicalLetterPhoto[];
  recordedBy: string;
  createdAt: string;
}

export interface FourfoldSymbolInfo {
  id: 'salib' | 'kendi' | 'cawan' | 'mahkota';
  symbolName: string;
  title: string;
  verseRef: string;
  meaning: string;
}

export interface ChurchIdentity {
  kicker: string;
  heading: string;
  description: string;
  churchName: string;
  subLabel: string;
  logoUrl: string;
  symbols: FourfoldSymbolInfo[];
  updatedBy?: string;
  updatedAt?: string;
}

export interface SiteTextContent {
  appTitle: string;
  appSubtitle: string;
  footerOrg: string;
  footerMotto: string;
  kopAddressLine: string;
  kopRegionLine: string;
  navLabels: {
    beranda: string;
    ibadah: string;
    renungan: string;
    kas: string;
    jemaat: string;
    pertumbuhan: string;
    pengurus: string;
    kepanitiaan: string;
    surat: string;
  };
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroLocationLabel: string;
  heroBadgeCode: string;
  organHeading: string;
  organSubtitle: string;
  organSubtitles: {
    Perkaria: string;
    Perkawan: string;
    'Sekolah Minggu': string;
    Remaja: string;
    Pemuda: string;
    Lansia: string;
  };
  notifTitle: string;
  notifSubtitle: string;
  galleryKicker: string;
  galleryTitle: string;
  gallerySubtitle: string;
  sections: {
    ibadahTitle: string;
    ibadahSubtitle: string;
    renunganTitle: string;
    renunganSubtitle: string;
    kasTitle: string;
    kasSubtitle: string;
    jemaatTitle: string;
    jemaatSubtitle: string;
    pertumbuhanTitle: string;
    pertumbuhanSubtitle: string;
    pengurusTitle: string;
    pengurusSubtitle: string;
    kepanitiaanTitle: string;
    kepanitiaanSubtitle: string;
    suratTitle: string;
    suratSubtitle: string;
  };
}

export interface ChurchDatabase {
  visionMission: VisionMission;
  churchIdentity?: ChurchIdentity;
  siteContent?: SiteTextContent;
  schedules: WorshipSchedule[];
  announcements: ChurchAnnouncement[];
  prayers: DailyPrayer[];
  ledger: LedgerEntry[];
  members: Member[];
  leadership: LeadershipMember[];
  committees: Committee[];
  growthSeries: GrowthSnapshot[];
  devotionals: Devotional[];
  gallery: GalleryPhoto[];
  letters?: ChurchLetter[];
}

export interface LiveNotification {
  id: string;
  type: 'birthday' | 'anniversary' | 'meeting';
  urgency: 'today' | 'upcoming';
  title: string;
  message: string;
  targetName: string;
  phone?: string;
  whatsappText?: string;
  dueLabel: string;
  committeeId?: string;
}

export type AuthRoleType = 'sekretaris_admin' | 'bendahara';

export interface AuthUser {
  username: string;
  email: string;
  name: string;
  role: string;
  roleType: AuthRoleType;
}

export type TreasurerUser = AuthUser;
