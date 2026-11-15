/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileText,
  Home,
  KeyRound,
  Menu,
  MessageCircle,
  Pencil,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  AuthUser,
  ChurchAnnouncement,
  ChurchDatabase,
  ChurchIdentity,
  ChurchLetter,
  CommitteeMeeting,
  CommitteeTask,
  DailyPrayer,
  Devotional,
  GalleryCategory,
  LeadershipMember,
  LedgerEntry,
  Member,
  SiteTextContent,
  VisionMission,
  WorshipSchedule,
} from './types';
import {
  computeLiveNotifications,
  toWhatsAppUrl,
} from './lib/dateAndFormat';
import { mergeSiteContent } from './lib/siteContentDefaults';
import { NavTabId, OverviewSection } from './components/OverviewSection';
import { WorshipBulletinPrayerSection } from './components/WorshipBulletinPrayerSection';
import { DevotionalShareSection } from './components/DevotionalShareSection';
import { TreasuryLedgerSection } from './components/TreasuryLedgerSection';
import { MembersCelebrationsSection } from './components/MembersCelebrationsSection';
import { GrowthAnalyticsSection } from './components/GrowthAnalyticsSection';
import { GkiiLogo } from './components/GkiiLogo';
import { LeadershipSection } from './components/LeadershipSection';
import { CommitteeSection } from './components/CommitteeSection';
import { SecretaryLettersSection } from './components/SecretaryLettersSection';
import {
  SiteTextEditorModal,
  SiteTextEditorTab,
} from './components/SiteTextEditorModal';

const NAV_ITEMS: {
  id: NavTabId;
  defaultLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'beranda', defaultLabel: 'Beranda', icon: Home },
  { id: 'ibadah', defaultLabel: 'Ibadah, Warta & Doa', icon: CalendarDays },
  { id: 'renungan', defaultLabel: 'Renungan Harian', icon: BookOpen },
  { id: 'kas', defaultLabel: 'Kas & Pembukuan', icon: Wallet },
  { id: 'jemaat', defaultLabel: 'Data Jemaat & HUT', icon: Users },
  { id: 'pertumbuhan', defaultLabel: 'Pertumbuhan Jemaat', icon: BarChart3 },
  { id: 'pengurus', defaultLabel: 'Badan Pengurus', icon: ShieldCheck },
  { id: 'kepanitiaan', defaultLabel: 'Kepanitiaan', icon: ClipboardList },
  { id: 'surat', defaultLabel: 'Arsip & Surat', icon: FileText },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTabId>('beranda');
  const [data, setData] = useState<ChurchDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState<Date>(() => new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);

  // Auth State (Sekretaris Admin Penuh & Bendahara)
  const [authToken, setAuthToken] = useState<string | null>(() =>
    typeof window !== 'undefined'
      ? localStorage.getItem('gkii_auth_token') ||
        localStorage.getItem('gkii_bendahara_token')
      : null
  );
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [changePwModalOpen, setChangePwModalOpen] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [pwForm, setPwForm] = useState({
    displayName: '',
    currentPassword: '',
    newPassword: '',
  });
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  const isAdmin = authUser?.roleType === 'sekretaris_admin';
  const canEditFinance = isAdmin || authUser?.roleType === 'bendahara';
  const [letters, setLetters] = useState<ChurchLetter[]>([]);
  const [loadingLetters, setLoadingLetters] = useState(false);
  const [textEditorOpen, setTextEditorOpen] = useState(false);
  const [textEditorTab, setTextEditorTab] = useState<SiteTextEditorTab>('identitas');

  const siteContent = useMemo(
    () => mergeSiteContent(data?.siteContent),
    [data?.siteContent]
  );

  const openTextEditor = (tab: SiteTextEditorTab = 'identitas') => {
    setTextEditorTab(tab);
    setTextEditorOpen(true);
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Gagal memuat data gereja');
      const json = (await res.json()) as ChurchDatabase;
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan memuat data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLetters = useCallback(async () => {
    if (!authToken || authUser?.roleType !== 'sekretaris_admin') {
      setLetters([]);
      return;
    }
    setLoadingLetters(true);
    try {
      const res = await fetch('/api/letters', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const rows = (await res.json()) as ChurchLetter[];
        setLetters(rows);
      }
    } catch {
      // Ignore transient fetch failure
    } finally {
      setLoadingLetters(false);
    }
  }, [authToken, authUser?.roleType]);

  useEffect(() => {
    fetchData();

    // Real-time clock tick every 30s for automatic birthday, anniversary, and meeting reminders
    const clockTimer = setInterval(() => {
      setNow(new Date());
    }, 30000);

    // Real-time Server-Sent Events subscription
    const eventSource = new EventSource('/api/events');
    eventSource.addEventListener('connected', () => setSseConnected(true));
    eventSource.addEventListener('sync', () => {
      fetchData();
      void fetchLetters();
    });
    eventSource.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      clearInterval(clockTimer);
      eventSource.close();
    };
  }, [fetchData, fetchLetters]);

  useEffect(() => {
    void fetchLetters();
  }, [fetchLetters]);

  useEffect(() => {
    if (!authToken) {
      setAuthUser(null);
      setLetters([]);
      return;
    }
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then((res) => res.json())
      .then((json: { authenticated: boolean; user: AuthUser | null }) => {
        if (json.authenticated && json.user) {
          setAuthUser(json.user);
        } else {
          localStorage.removeItem('gkii_auth_token');
          localStorage.removeItem('gkii_bendahara_token');
          setAuthToken(null);
          setAuthUser(null);
        }
      })
      .catch(() => {
        setAuthUser(null);
      });
  }, [authToken]);

  const notifications = useMemo(() => {
    if (!data) return [];
    return computeLiveNotifications(data.members, data.committees, now);
  }, [data, now]);

  const urgentCount = notifications.filter((n) => n.urgency === 'today').length;

  const apiCall = async (url: string, method: string, body?: unknown) => {
    const headers: Record<string, string> = {};
    if (body) headers['Content-Type'] = 'application/json';
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(url, {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      let msg = 'Operasi gagal disimpan';
      try {
        const errJson = (await res.json()) as { error?: string };
        if (errJson.error) msg = errJson.error;
      } catch {
        // ignore
      }
      if (res.status === 401) {
        setAuthError(msg);
        setLoginModalOpen(true);
      }
      throw new Error(msg);
    }
    await fetchData();
    if (url.startsWith('/api/letters')) {
      await fetchLetters();
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier,
          password: loginPassword,
        }),
      });
      const json = (await res.json()) as {
        token?: string;
        user?: AuthUser;
        error?: string;
      };
      if (!res.ok || !json.token || !json.user) {
        setAuthError(json.error || 'Gagal masuk akun pengurus.');
        return;
      }
      localStorage.setItem('gkii_auth_token', json.token);
      localStorage.removeItem('gkii_bendahara_token');
      setAuthToken(json.token);
      setAuthUser(json.user);
      setLoginPassword('');
      setLoginModalOpen(false);
    } catch {
      setAuthError('Terjadi kesalahan koneksi saat masuk.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('gkii_auth_token');
    localStorage.removeItem('gkii_bendahara_token');
    setAuthToken(null);
    setAuthUser(null);
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setPwSuccess(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(pwForm),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        user?: AuthUser;
        error?: string;
      };
      if (!res.ok) {
        setAuthError(json.error || 'Gagal mengubah kata sandi.');
        return;
      }
      if (json.user) setAuthUser(json.user);
      setPwSuccess('Kata sandi dan profil akun berhasil diperbarui.');
      setPwForm({ displayName: '', currentPassword: '', newPassword: '' });
      setTimeout(() => {
        setChangePwModalOpen(false);
        setPwSuccess(null);
      }, 1200);
    } catch {
      setAuthError('Gagal terhubung ke server.');
    }
  };

  // Handlers
  const handleUpdateSiteContent = (
    payload: Partial<SiteTextContent> & { resetDefault?: boolean }
  ) => apiCall('/api/site-content', 'PUT', payload);

  const handleUpdateVisionMission = (vm: VisionMission) =>
    apiCall('/api/vision-mission', 'PUT', vm);

  const handleUpdateChurchIdentity = (
    payload: Partial<ChurchIdentity> & { logoDataUrl?: string; resetLogo?: boolean }
  ) => apiCall('/api/church-identity', 'PUT', payload);

  const handleAddSchedule = (item: Omit<WorshipSchedule, 'id'>) =>
    apiCall('/api/schedules', 'POST', item);
  const handleUpdateSchedule = (id: string, item: Omit<WorshipSchedule, 'id'>) =>
    apiCall(`/api/schedules/${id}`, 'PUT', item);
  const handleDeleteSchedule = (id: string) =>
    apiCall(`/api/schedules/${id}`, 'DELETE');

  const handleAddAnnouncement = (item: Omit<ChurchAnnouncement, 'id'>) =>
    apiCall('/api/announcements', 'POST', item);
  const handleUpdateAnnouncement = (id: string, item: Omit<ChurchAnnouncement, 'id'>) =>
    apiCall(`/api/announcements/${id}`, 'PUT', item);
  const handleDeleteAnnouncement = (id: string) =>
    apiCall(`/api/announcements/${id}`, 'DELETE');

  const handleAddPrayer = (item: Omit<DailyPrayer, 'id' | 'prayedCount'>) =>
    apiCall('/api/prayers', 'POST', item);
  const handleUpdatePrayer = (
    id: string,
    item: Omit<DailyPrayer, 'id' | 'prayedCount'>
  ) => apiCall(`/api/prayers/${id}`, 'PUT', item);
  const handlePrayIncrement = (id: string) =>
    apiCall(`/api/prayers/${id}/pray`, 'PATCH');
  const handleDeletePrayer = (id: string) =>
    apiCall(`/api/prayers/${id}`, 'DELETE');

  const handleAddDevotional = (item: Omit<Devotional, 'id'>) =>
    apiCall('/api/devotionals', 'POST', item);
  const handleUpdateDevotional = (id: string, item: Omit<Devotional, 'id'>) =>
    apiCall(`/api/devotionals/${id}`, 'PUT', item);
  const handleDeleteDevotional = (id: string) =>
    apiCall(`/api/devotionals/${id}`, 'DELETE');

  const handleAddLedger = (entry: Omit<LedgerEntry, 'id'>) =>
    apiCall('/api/ledger', 'POST', entry);
  const handleUpdateLedger = (id: string, entry: Omit<LedgerEntry, 'id'>) =>
    apiCall(`/api/ledger/${id}`, 'PUT', entry);
  const handleDeleteLedger = (id: string) =>
    apiCall(`/api/ledger/${id}`, 'DELETE');

  const handleAddMember = (member: Omit<Member, 'id'>) =>
    apiCall('/api/members', 'POST', member);
  const handleUpdateMember = (id: string, member: Omit<Member, 'id'>) =>
    apiCall(`/api/members/${id}`, 'PUT', member);
  const handleDeleteMember = (id: string) =>
    apiCall(`/api/members/${id}`, 'DELETE');

  const handleAddLeader = (leader: Omit<LeadershipMember, 'id' | 'order'>) =>
    apiCall('/api/leadership', 'POST', leader);
  const handleUpdateLeader = (
    id: string,
    leader: Omit<LeadershipMember, 'id' | 'order'>
  ) => apiCall(`/api/leadership/${id}`, 'PUT', leader);
  const handleDeleteLeader = (id: string) =>
    apiCall(`/api/leadership/${id}`, 'DELETE');

  const handleAddCommittee = (item: {
    name: string;
    eventDate: string;
    description: string;
    chairperson: string;
  }) => apiCall('/api/committees', 'POST', item);
  const handleUpdateCommittee = (
    id: string,
    item: {
      name: string;
      eventDate: string;
      description: string;
      chairperson: string;
    }
  ) => apiCall(`/api/committees/${id}`, 'PUT', item);

  const handleAddMeeting = (
    committeeId: string,
    meeting: Omit<CommitteeMeeting, 'id' | 'status'>
  ) => apiCall(`/api/committees/${committeeId}/meetings`, 'POST', meeting);

  const handleUpdateMeetingStatus = (
    committeeId: string,
    meetingId: string,
    status: CommitteeMeeting['status']
  ) =>
    apiCall(`/api/committees/${committeeId}/meetings/${meetingId}`, 'PATCH', {
      status,
    });

  const handleAddTask = (
    committeeId: string,
    task: Omit<CommitteeTask, 'id' | 'status'>
  ) => apiCall(`/api/committees/${committeeId}/tasks`, 'POST', task);

  const handleUpdateTaskStatus = (
    committeeId: string,
    taskId: string,
    status: CommitteeTask['status']
  ) =>
    apiCall(`/api/committees/${committeeId}/tasks/${taskId}`, 'PATCH', {
      status,
    });

  const handleDeleteTask = (committeeId: string, taskId: string) =>
    apiCall(`/api/committees/${committeeId}/tasks/${taskId}`, 'DELETE');

  const handleAddGalleryPhoto = (payload: {
    title: string;
    category: GalleryCategory;
    date: string;
    caption: string;
    imageDataUrl: string;
  }) => apiCall('/api/gallery', 'POST', payload);

  const handleUpdateGalleryPhoto = (
    id: string,
    payload: {
      title: string;
      category: GalleryCategory;
      date: string;
      caption: string;
    }
  ) => apiCall(`/api/gallery/${id}`, 'PUT', payload);

  const handleDeleteGalleryPhoto = (id: string) =>
    apiCall(`/api/gallery/${id}`, 'DELETE');

  const handleAddLetter = (
    payload: Omit<ChurchLetter, 'id' | 'physicalPhotos' | 'recordedBy' | 'createdAt'> & {
      initialPhotos?: { label: string; imageDataUrl: string }[];
    }
  ) => apiCall('/api/letters', 'POST', payload);

  const handleUpdateLetter = (id: string, payload: Partial<ChurchLetter>) =>
    apiCall(`/api/letters/${id}`, 'PUT', payload);

  const handleDeleteLetter = (id: string) =>
    apiCall(`/api/letters/${id}`, 'DELETE');

  const handleAddLetterPhoto = (
    letterId: string,
    payload: { label: string; imageDataUrl: string }
  ) => apiCall(`/api/letters/${letterId}/photos`, 'POST', payload);

  const handleDeleteLetterPhoto = (letterId: string, photoId: string) =>
    apiCall(`/api/letters/${letterId}/photos/${photoId}`, 'DELETE');

  const getNavLabel = (id: NavTabId) =>
    siteContent.navLabels[id] ||
    NAV_ITEMS.find((item) => item.id === id)?.defaultLabel ||
    'Beranda';

  const activeNavLabel = getNavLabel(activeTab);

  const selectTab = (tab: NavTabId) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#F5F9F6] print:bg-white text-[#0F2419] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-[#D4E4D8] sticky top-0 h-screen print:hidden">
        <div className="px-5 py-5 border-b border-[#E6EFE8]">
          <button
            type="button"
            onClick={() => selectTab('beranda')}
            className="flex items-center gap-3 text-left cursor-pointer"
          >
            <GkiiLogo
              variant="mark"
              src={data?.churchIdentity?.logoUrl}
              className="w-10 h-10 shrink-0"
            />
            <div className="min-w-0">
              <span className="block text-base font-bold tracking-tight text-[#0F2419] truncate">
                {siteContent.appTitle}
              </span>
              <span className="block text-xs text-[#456051] mt-0.5 truncate">
                {siteContent.appSubtitle}
              </span>
            </div>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Menu Utama">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#146C43] text-white font-semibold'
                    : 'text-[#2D4D3B] hover:bg-[#EAF3EC] hover:text-[#0F2419]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#146C43]'}`} />
                <span className="truncate">{getNavLabel(item.id)}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-[#E6EFE8] text-xs text-[#456051] space-y-1">
          <p className="font-semibold text-[#0F2419]">Gereja Kemah Injil Indonesia</p>
          <p>{siteContent.appTitle}</p>
          {sseConnected && (
            <p className="text-[11px] text-[#146C43] font-medium pt-0.5">
              Pembaruan langsung aktif
            </p>
          )}
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex print:hidden">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-white h-full border-r border-[#D4E4D8] flex flex-col z-10">
            <div className="px-5 py-4 border-b border-[#E6EFE8] flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <GkiiLogo
                  variant="mark"
                  src={data?.churchIdentity?.logoUrl}
                  className="w-8 h-8 shrink-0"
                />
                <span className="text-base font-bold text-[#0F2419] truncate">
                  {siteContent.appTitle}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Tutup menu"
                className="p-2 rounded-lg text-[#456051] hover:bg-[#EAF3EC] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer ${
                      isActive
                        ? 'bg-[#146C43] text-white font-semibold'
                        : 'text-[#2D4D3B] hover:bg-[#EAF3EC]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#146C43]'}`} />
                    <span>{getNavLabel(item.id)}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar (3 zones: Title/Breadcrumb — Date — Real-time Notification Bell) */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-[#D4E4D8] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#0F2419] hover:bg-[#EAF3EC] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 min-w-0">
              <GkiiLogo
                variant="mark"
                src={data?.churchIdentity?.logoUrl}
                className="w-8 h-8 shrink-0"
              />
              <div className="flex items-center gap-2 text-sm truncate">
                <span className="font-semibold text-[#146C43] hidden sm:inline whitespace-nowrap">
                  {siteContent.appTitle}
                </span>
                <span className="text-[#9AB5A3] hidden sm:inline" aria-hidden="true">
                  /
                </span>
                <span className="font-semibold text-[#0F2419] truncate">{activeNavLabel}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <span className="hidden xl:inline text-xs font-mono tabular-nums text-[#456051] whitespace-nowrap">
              {new Intl.DateTimeFormat('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(now)}
            </span>

            {isAdmin && (
              <button
                type="button"
                onClick={() => openTextEditor('identitas')}
                title="Ubah semua isi teks pada aplikasi"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#146C43] bg-[#EAF3EC] hover:bg-[#D8ECDF] text-[#0F5132] text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-[#146C43]" />
                <span className="hidden sm:inline">Ubah Teks Aplikasi</span>
                <span className="sm:hidden">Teks</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (authUser) {
                  setPwForm({ displayName: authUser.name, currentPassword: '', newPassword: '' });
                  setAuthError(null);
                  setPwSuccess(null);
                  setChangePwModalOpen(true);
                } else {
                  setAuthError(null);
                  setLoginModalOpen(true);
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold whitespace-nowrap cursor-pointer ${
                authUser
                  ? 'border-[#BFE0C9] bg-[#EAF3EC] text-[#0F5132]'
                  : 'border-[#D4E4D8] bg-white hover:bg-[#F5F9F6] text-[#0F2419]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-[#146C43]" />
              <span className="hidden sm:inline">
                {authUser ? authUser.name.split(',')[0] : 'Masuk Akun'}
              </span>
              <span className="sm:hidden">
                {authUser ? 'Akun' : 'Masuk'}
              </span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label="Buka pusat notifikasi langsung"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#F5F9F6] text-xs font-semibold text-[#0F2419] whitespace-nowrap cursor-pointer"
              >
                <Bell className="w-4 h-4 text-[#146C43]" />
                <span>Notifikasi</span>
                {notifications.length > 0 && (
                  <span className="font-mono tabular-nums text-[#146C43] font-bold">
                    ({urgentCount > 0 ? urgentCount : notifications.length})
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-[#D4E4D8] bg-white shadow-lg z-40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E6EFE8] bg-[#F5F9F6] flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#0F2419]">
                        Notifikasi Langsung
                      </p>
                      <p className="text-[11px] text-[#456051]">
                        HUT Kelahiran, Pernikahan & Pengingat Rapat
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      aria-label="Tutup notifikasi"
                      className="p-1.5 rounded-lg text-[#456051] hover:bg-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto divide-y divide-[#E6EFE8]">
                    {notifications.length === 0 ? (
                      <p className="p-5 text-sm text-[#456051] text-center">
                        Tidak ada notifikasi aktif saat ini.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-4 space-y-2 hover:bg-[#F5F9F6]/60">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span
                              className={`font-semibold ${
                                n.type === 'meeting' ? 'text-[#146C43]' : 'text-[#B45309]'
                              }`}
                            >
                              {n.type === 'birthday'
                                ? 'Ulang Tahun Kelahiran'
                                : n.type === 'anniversary'
                                  ? 'Ulang Tahun Pernikahan'
                                  : 'Pengingat Rapat'}
                            </span>
                            <span className="font-mono tabular-nums text-[#456051]">
                              {n.dueLabel}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-[#0F2419]">{n.title}</p>
                          <p className="text-xs text-[#456051]">{n.message}</p>
                          <div className="flex items-center gap-2 pt-1">
                            {n.whatsappText && (
                              <a
                                href={toWhatsAppUrl(n.phone, n.whatsappText)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#146C43] text-white text-[11px] font-semibold"
                              >
                                <MessageCircle className="w-3 h-3" />
                                <span>Kirim Ucapan</span>
                              </a>
                            )}
                            {n.type === 'meeting' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNotifOpen(false);
                                  selectTab('kepanitiaan');
                                }}
                                className="text-[11px] font-semibold text-[#146C43] hover:underline cursor-pointer"
                              >
                                Buka Kepanitiaan →
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Viewport Container */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 print:max-w-none print:p-0">
          {loading ? (
            <div className="space-y-4">
              <div className="h-44 rounded-2xl bg-white border border-[#D4E4D8] animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-28 rounded-2xl bg-white border border-[#D4E4D8] animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : error || !data ? (
            <div className="rounded-2xl border border-red-200 bg-white p-8 text-center space-y-3">
              <p className="text-base font-bold text-[#B91C1C]">
                {error || 'Data gereja tidak dapat dimuat.'}
              </p>
              <button
                type="button"
                onClick={fetchData}
                className="px-4 py-2 rounded-lg bg-[#146C43] text-white text-sm font-semibold cursor-pointer"
              >
                Muat Ulang Data
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'beranda' && (
                <OverviewSection
                  data={data}
                  siteContent={siteContent}
                  notifications={notifications}
                  canEditAdmin={isAdmin}
                  canUploadGallery={Boolean(authUser)}
                  uploaderName={authUser?.name}
                  onOpenLogin={() => {
                    setAuthError(null);
                    setLoginIdentifier('');
                    setLoginPassword('');
                    setLoginModalOpen(true);
                  }}
                  onOpenTextEditor={openTextEditor}
                  onNavigate={selectTab}
                  onUpdateVisionMission={handleUpdateVisionMission}
                  onUpdateChurchIdentity={handleUpdateChurchIdentity}
                  onAddGalleryPhoto={handleAddGalleryPhoto}
                  onUpdateGalleryPhoto={handleUpdateGalleryPhoto}
                  onDeleteGalleryPhoto={handleDeleteGalleryPhoto}
                />
              )}
              {activeTab === 'ibadah' && (
                <WorshipBulletinPrayerSection
                  data={data}
                  siteContent={siteContent}
                  canEditAdmin={isAdmin}
                  onOpenLogin={() => {
                    setAuthError(null);
                    setLoginIdentifier('');
                    setLoginPassword('');
                    setLoginModalOpen(true);
                  }}
                  onAddSchedule={handleAddSchedule}
                  onUpdateSchedule={handleUpdateSchedule}
                  onDeleteSchedule={handleDeleteSchedule}
                  onAddAnnouncement={handleAddAnnouncement}
                  onUpdateAnnouncement={handleUpdateAnnouncement}
                  onDeleteAnnouncement={handleDeleteAnnouncement}
                  onAddPrayer={handleAddPrayer}
                  onUpdatePrayer={handleUpdatePrayer}
                  onPrayIncrement={handlePrayIncrement}
                  onDeletePrayer={handleDeletePrayer}
                />
              )}
              {activeTab === 'renungan' && (
                <DevotionalShareSection
                  devotionals={data.devotionals}
                  siteContent={siteContent}
                  canEditAdmin={isAdmin}
                  onAddDevotional={handleAddDevotional}
                  onUpdateDevotional={handleUpdateDevotional}
                  onDeleteDevotional={handleDeleteDevotional}
                />
              )}
              {activeTab === 'kas' && (
                <TreasuryLedgerSection
                  ledger={data.ledger}
                  siteContent={siteContent}
                  authUser={authUser}
                  canEditFinance={canEditFinance}
                  logoUrl={data.churchIdentity?.logoUrl}
                  onOpenLogin={() => {
                    setAuthError(null);
                    setLoginModalOpen(true);
                  }}
                  onOpenChangePassword={() => {
                    setPwForm({
                      displayName: authUser?.name || '',
                      currentPassword: '',
                      newPassword: '',
                    });
                    setAuthError(null);
                    setPwSuccess(null);
                    setChangePwModalOpen(true);
                  }}
                  onLogout={handleLogout}
                  onAddEntry={handleAddLedger}
                  onUpdateEntry={handleUpdateLedger}
                  onDeleteEntry={handleDeleteLedger}
                />
              )}
              {activeTab === 'jemaat' && (
                <MembersCelebrationsSection
                  members={data.members}
                  siteContent={siteContent}
                  notifications={notifications}
                  now={now}
                  canEditAdmin={isAdmin}
                  onAddMember={handleAddMember}
                  onUpdateMember={handleUpdateMember}
                  onDeleteMember={handleDeleteMember}
                />
              )}
              {activeTab === 'pertumbuhan' && (
                <GrowthAnalyticsSection
                  growthSeries={data.growthSeries}
                  members={data.members}
                  siteContent={siteContent}
                />
              )}
              {activeTab === 'pengurus' && (
                <LeadershipSection
                  leadership={data.leadership}
                  siteContent={siteContent}
                  canEditAdmin={isAdmin}
                  onAddLeader={handleAddLeader}
                  onUpdateLeader={handleUpdateLeader}
                  onDeleteLeader={handleDeleteLeader}
                />
              )}
              {activeTab === 'kepanitiaan' && (
                <CommitteeSection
                  committees={data.committees}
                  siteContent={siteContent}
                  now={now}
                  canEditAdmin={isAdmin}
                  onAddCommittee={handleAddCommittee}
                  onUpdateCommittee={handleUpdateCommittee}
                  onAddMeeting={handleAddMeeting}
                  onUpdateMeetingStatus={handleUpdateMeetingStatus}
                  onAddTask={handleAddTask}
                  onUpdateTaskStatus={handleUpdateTaskStatus}
                  onDeleteTask={handleDeleteTask}
                />
              )}
              {activeTab === 'surat' && (
                <SecretaryLettersSection
                  letters={letters}
                  siteContent={siteContent}
                  loadingLetters={loadingLetters}
                  canEditAdmin={isAdmin}
                  secretaryName={authUser?.name}
                  logoUrl={data.churchIdentity?.logoUrl}
                  onOpenSecretaryLogin={() => {
                    setAuthError(null);
                    setLoginIdentifier('');
                    setLoginPassword('');
                    setLoginModalOpen(true);
                  }}
                  onAddLetter={handleAddLetter}
                  onUpdateLetter={handleUpdateLetter}
                  onDeleteLetter={handleDeleteLetter}
                  onAddLetterPhoto={handleAddLetterPhoto}
                  onDeleteLetterPhoto={handleDeleteLetterPhoto}
                />
              )}
            </>
          )}
        </main>

        {/* Quiet Footer */}
        <footer className="border-t border-[#D4E4D8] bg-white px-4 sm:px-6 lg:px-8 py-5 text-xs text-[#456051] print:hidden">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>{siteContent.footerOrg}</span>
            <span>{siteContent.footerMotto}</span>
          </div>
        </footer>
      </div>

      {/* Modal Ubah Semua Teks Aplikasi (Admin) */}
      {isAdmin && (
        <SiteTextEditorModal
          open={textEditorOpen}
          initialTab={textEditorTab}
          siteContent={siteContent}
          onClose={() => setTextEditorOpen(false)}
          onSave={handleUpdateSiteContent}
        />
      )}

      {/* Modal Masuk Akun Pengurus */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl border border-[#D4E4D8] bg-white p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#0F2419]">
                  Masuk Akun Pengurus
                </h2>
                <p className="text-xs text-[#456051] mt-1">
                  Silakan masukkan nama pengguna atau surel serta kata sandi akun Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLoginModalOpen(false)}
                aria-label="Tutup dialog"
                className="p-1.5 rounded-lg text-[#456051] hover:bg-[#F5F9F6] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {authError && (
              <p className="text-xs font-semibold text-[#B91C1C] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {authError}
              </p>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-[#0F2419]">Nama Pengguna / Surel</span>
                <input
                  required
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="Masukkan nama pengguna atau surel"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-[#0F2419]">Kata Sandi</span>
                <input
                  required
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setLoginModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-[#D4E4D8] text-xs font-semibold text-[#456051] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold cursor-pointer"
                >
                  Masuk Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ubah Kata Sandi & Profil Akun */}
      {changePwModalOpen && authUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-md rounded-2xl border border-[#D4E4D8] bg-white p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#0F2419]">
                  Pengaturan Akun Pengurus
                </h2>
                <p className="text-xs text-[#456051] mt-1">
                  Perbarui nama tampilan dan kata sandi akun Anda secara berkala.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChangePwModalOpen(false)}
                aria-label="Tutup dialog"
                className="p-1.5 rounded-lg text-[#456051] hover:bg-[#F5F9F6] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {authError && (
              <p className="text-xs font-semibold text-[#B91C1C] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {authError}
              </p>
            )}
            {pwSuccess && (
              <p className="text-xs font-semibold text-[#146C43] bg-[#EAF3EC] border border-[#BFE0C9] rounded-lg px-3 py-2">
                {pwSuccess}
              </p>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-[#0F2419]">Nama Tampilan Pengurus</span>
                <input
                  required
                  type="text"
                  value={pwForm.displayName}
                  onChange={(e) => setPwForm({ ...pwForm, displayName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-[#0F2419]">Kata Sandi Lama</span>
                <input
                  required
                  type="password"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-[#0F2419]">Kata Sandi Baru (min. 6 karakter)</span>
                <input
                  required
                  minLength={6}
                  type="password"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                />
              </label>
              <div className="flex items-center justify-between gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleLogout();
                    setChangePwModalOpen(false);
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#B91C1C] hover:bg-red-50 cursor-pointer"
                >
                  Keluar Akun
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setChangePwModalOpen(false)}
                    className="px-4 py-2.5 rounded-lg border border-[#D4E4D8] text-xs font-semibold text-[#456051] cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold cursor-pointer"
                  >
                    Simpan Sandi Baru
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
