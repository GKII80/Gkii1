import React, { useMemo, useState } from 'react';
import {
  BellRing,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  Committee,
  CommitteeMeeting,
  CommitteeTask,
  SiteTextContent,
} from '../types';
import {
  formatDateTimeID,
  formatIndonesianDate,
} from '../lib/dateAndFormat';
import { DEFAULT_SITE_CONTENT } from '../lib/siteContentDefaults';

interface CommitteeSectionProps {
  committees: Committee[];
  siteContent?: SiteTextContent;
  now: Date;
  canEditAdmin: boolean;
  onAddCommittee: (item: {
    name: string;
    eventDate: string;
    description: string;
    chairperson: string;
  }) => Promise<void>;
  onUpdateCommittee: (
    id: string,
    item: {
      name: string;
      eventDate: string;
      description: string;
      chairperson: string;
    }
  ) => Promise<void>;
  onAddMeeting: (
    committeeId: string,
    meeting: Omit<CommitteeMeeting, 'id' | 'status'>
  ) => Promise<void>;
  onUpdateMeetingStatus: (
    committeeId: string,
    meetingId: string,
    status: CommitteeMeeting['status']
  ) => Promise<void>;
  onAddTask: (
    committeeId: string,
    task: Omit<CommitteeTask, 'id' | 'status'>
  ) => Promise<void>;
  onUpdateTaskStatus: (
    committeeId: string,
    taskId: string,
    status: CommitteeTask['status']
  ) => Promise<void>;
  onDeleteTask: (committeeId: string, taskId: string) => Promise<void>;
}

function getCountdownLabel(dateTimeStr: string, now: Date): {
  label: string;
  isWithinReminder: boolean;
  diffMinutes: number;
} {
  const target = new Date(dateTimeStr).getTime();
  if (Number.isNaN(target)) {
    return { label: '-', isWithinReminder: false, diffMinutes: 99999 };
  }
  const diffMinutes = Math.round((target - now.getTime()) / (1000 * 60));
  if (diffMinutes < -30) {
    return { label: 'Waktu rapat telah lewat', isWithinReminder: false, diffMinutes };
  }
  if (diffMinutes <= 0) {
    return { label: 'Sedang berlangsung sekarang', isWithinReminder: true, diffMinutes };
  }
  if (diffMinutes < 60) {
    return { label: `${diffMinutes} menit lagi`, isWithinReminder: true, diffMinutes };
  }
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (hours < 24) {
    return {
      label: `${hours} jam ${mins} mnt lagi`,
      isWithinReminder: true,
      diffMinutes,
    };
  }
  const days = Math.floor(hours / 24);
  return {
    label: `${days} hari lagi`,
    isWithinReminder: days <= 2,
    diffMinutes,
  };
}

export const CommitteeSection: React.FC<CommitteeSectionProps> = ({
  committees,
  siteContent,
  now,
  canEditAdmin,
  onAddCommittee,
  onUpdateCommittee,
  onAddMeeting,
  onUpdateMeetingStatus,
  onAddTask,
  onUpdateTaskStatus,
  onDeleteTask,
}) => {
  const [selectedId, setSelectedId] = useState<string>(committees[0]?.id || '');
  const [showNewCommittee, setShowNewCommittee] = useState(false);
  const [editingCommitteeId, setEditingCommitteeId] = useState<string | null>(null);
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);

  const activeCommittee =
    committees.find((c) => c.id === selectedId) || committees[0];

  const emptyComForm = () => ({
    name: '',
    eventDate: new Date().toISOString().slice(0, 10),
    chairperson: '',
    description: '',
  });
  const [comForm, setComForm] = useState(emptyComForm);

  const defaultMeetingTime = useMemo(() => {
    const d = new Date(now.getTime() + 90 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, [now]);

  const [mtgForm, setMtgForm] = useState({
    title: '',
    dateTime: defaultMeetingTime,
    location: 'Ruang Konsistori GKII Sungai Barang',
    agenda: '',
    reminderMinutesBefore: 1440,
    attendeesNote: 'Seluruh koordinator seksi dan pengurus inti panitia.',
  });

  const [tskForm, setTskForm] = useState({
    title: '',
    section: 'Acara & Ibadah',
    assignee: '',
    deadline: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  // Collect all active automatic meeting reminders across all committees
  const activeReminders = useMemo(() => {
    const items: {
      committeeName: string;
      committeeId: string;
      meeting: CommitteeMeeting;
      countdown: ReturnType<typeof getCountdownLabel>;
    }[] = [];

    for (const com of committees) {
      for (const meeting of com.meetings) {
        if (meeting.status === 'Selesai') continue;
        const countdown = getCountdownLabel(meeting.dateTime, now);
        if (countdown.diffMinutes >= -30 && countdown.diffMinutes <= meeting.reminderMinutesBefore) {
          items.push({
            committeeName: com.name,
            committeeId: com.id,
            meeting,
            countdown,
          });
        }
      }
    }
    return items.sort((a, b) => a.countdown.diffMinutes - b.countdown.diffMinutes);
  }, [committees, now]);

  const handleCommitteeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comForm.name.trim()) return;
    if (editingCommitteeId) {
      await onUpdateCommittee(editingCommitteeId, comForm);
    } else {
      await onAddCommittee(comForm);
    }
    setComForm(emptyComForm());
    setEditingCommitteeId(null);
    setShowNewCommittee(false);
  };

  const handleStartEditCommittee = (committee: Committee) => {
    setEditingCommitteeId(committee.id);
    setComForm({
      name: committee.name,
      eventDate: committee.eventDate,
      chairperson: committee.chairperson,
      description: committee.description,
    });
    setShowNewCommittee(true);
  };

  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommittee || !mtgForm.title.trim()) return;
    await onAddMeeting(activeCommittee.id, mtgForm);
    setMtgForm({
      title: '',
      dateTime: defaultMeetingTime,
      location: 'Ruang Konsistori GKII Sungai Barang',
      agenda: '',
      reminderMinutesBefore: 1440,
      attendeesNote: 'Seluruh koordinator seksi dan pengurus inti panitia.',
    });
    setShowNewMeeting(false);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCommittee || !tskForm.title.trim()) return;
    await onAddTask(activeCommittee.id, tskForm);
    setTskForm({
      title: '',
      section: 'Acara & Ibadah',
      assignee: '',
      deadline: new Date().toISOString().slice(0, 10),
      notes: '',
    });
    setShowNewTask(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2419]">
            {siteContent?.sections.kepanitiaanTitle ||
              DEFAULT_SITE_CONTENT.sections.kepanitiaanTitle}
          </h1>
          <p className="text-sm text-[#456051] mt-1">
            {siteContent?.sections.kepanitiaanSubtitle ||
              DEFAULT_SITE_CONTENT.sections.kepanitiaanSubtitle}
          </p>
        </div>

        {canEditAdmin && (
          <button
            type="button"
            onClick={() => {
              if (showNewCommittee && editingCommitteeId) {
                setEditingCommitteeId(null);
                setComForm(emptyComForm());
              } else {
                setEditingCommitteeId(null);
                setComForm(emptyComForm());
                setShowNewCommittee((v) => !v);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Kepanitiaan Baru</span>
          </button>
        )}
      </div>

      {/* Automatic Meeting Reminders Panel */}
      <section className="rounded-2xl border border-[#BFE0C9] bg-[#EAF3EC] p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BellRing className="w-4 h-4 text-[#146C43]" />
            <h2 className="text-sm font-bold text-[#0F2419]">
              Notifikasi Pengingat Otomatis Agenda Rapat ({activeReminders.length} Aktif)
            </h2>
          </div>
          <span className="text-xs font-mono tabular-nums text-[#2D4D3B]">
            Pemantauan waktu: {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
          </span>
        </div>

        {activeReminders.length === 0 ? (
          <p className="text-sm text-[#2D4D3B]">
            Tidak ada agenda rapat yang memasuki jendela pengingat otomatis saat ini.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeReminders.map(({ committeeName, committeeId, meeting, countdown }) => (
              <div
                key={meeting.id}
                className="rounded-xl bg-white border border-[#D4E4D8] p-4 flex flex-col justify-between gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-[#146C43]">{committeeName}</p>
                    <p className="text-sm font-bold text-[#0F2419] mt-0.5">{meeting.title}</p>
                  </div>
                  <span className="text-xs font-mono tabular-nums font-bold text-[#B45309] whitespace-nowrap">
                    {countdown.label}
                  </span>
                </div>
                <p className="text-xs text-[#456051]">
                  {formatDateTimeID(meeting.dateTime)} · {meeting.location}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-[#E6EFE8]">
                  <span className="text-[11px] text-[#456051]">
                    Pengingat disetel {meeting.reminderMinutesBefore >= 1440 ? `${meeting.reminderMinutesBefore / 1440} hari` : `${meeting.reminderMinutesBefore} menit`} sebelum rapat
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedId(committeeId)}
                    className="text-xs font-semibold text-[#146C43] hover:underline cursor-pointer"
                  >
                    Lihat Panitia
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* New / Edit Committee Form */}
      {canEditAdmin && showNewCommittee && (
        <form
          onSubmit={handleCommitteeSubmit}
          className="rounded-2xl border border-[#BFE0C9] bg-white p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-[#0F2419]">
            {editingCommitteeId ? 'Ubah Informasi Kepanitiaan' : 'Buat Kepanitiaan Acara Baru'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Nama Kepanitiaan</span>
              <input
                required
                type="text"
                value={comForm.name}
                onChange={(e) => setComForm({ ...comForm, name: e.target.value })}
                placeholder="Contoh: Panitia Paskah 2027"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Tanggal Pelaksanaan Acara</span>
              <input
                required
                type="date"
                value={comForm.eventDate}
                onChange={(e) => setComForm({ ...comForm, eventDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Ketua Panitia</span>
              <input
                required
                type="text"
                value={comForm.chairperson}
                onChange={(e) => setComForm({ ...comForm, chairperson: e.target.value })}
                placeholder="Nama ketua panitia"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm md:col-span-3">
              <span className="font-medium text-[#0F2419]">Deskripsi Kegiatan</span>
              <input
                required
                type="text"
                value={comForm.description}
                onChange={(e) => setComForm({ ...comForm, description: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold cursor-pointer"
            >
              {editingCommitteeId ? 'Simpan Perubahan Kepanitiaan' : 'Simpan Kepanitiaan'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingCommitteeId(null);
                setComForm(emptyComForm());
                setShowNewCommittee(false);
              }}
              className="px-5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#456051] text-sm font-medium cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* Committee Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {committees.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedId(c.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              activeCommittee?.id === c.id
                ? 'bg-[#146C43] text-white'
                : 'bg-white border border-[#D4E4D8] text-[#0F2419] hover:bg-[#F5F9F6]'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {activeCommittee && (
        <div className="space-y-6">
          {/* Committee Info Bar */}
          <div className="rounded-2xl border border-[#D4E4D8] bg-white p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#456051]">
                <span className="font-semibold text-[#146C43]">Ketua: {activeCommittee.chairperson}</span>
                <span aria-hidden="true">·</span>
                <span>Hari H Acara: {formatIndonesianDate(activeCommittee.eventDate)}</span>
              </div>
              <h2 className="text-xl font-bold text-[#0F2419]">{activeCommittee.name}</h2>
              <p className="text-sm text-[#456051]">{activeCommittee.description}</p>
            </div>
            {canEditAdmin && (
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleStartEditCommittee(activeCommittee)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#D4E4D8] bg-[#F5F9F6] hover:bg-[#EAF3EC] text-[#0F2419] text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-[#146C43]" />
                  <span>Ubah Info Panitia</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewMeeting((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#146C43] text-[#146C43] hover:bg-[#EAF3EC] text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Jadwalkan Rapat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewTask((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Tugas Panitia</span>
                </button>
              </div>
            )}
          </div>

          {/* Add Meeting Form */}
          {canEditAdmin && showNewMeeting && (
            <form
              onSubmit={handleMeetingSubmit}
              className="rounded-2xl border border-[#BFE0C9] bg-white p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-[#0F2419]">
                Jadwalkan Rapat — {activeCommittee.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[#0F2419]">Agenda / Judul Rapat</span>
                  <input
                    required
                    type="text"
                    value={mtgForm.title}
                    onChange={(e) => setMtgForm({ ...mtgForm, title: e.target.value })}
                    placeholder="Contoh: Rapat Koordinasi Seksi Acara"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[#0F2419]">Tanggal & Jam Rapat</span>
                  <input
                    required
                    type="datetime-local"
                    value={mtgForm.dateTime}
                    onChange={(e) => setMtgForm({ ...mtgForm, dateTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] font-mono text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[#0F2419]">Pengingat Otomatis Sebelum Rapat</span>
                  <select
                    value={mtgForm.reminderMinutesBefore}
                    onChange={(e) =>
                      setMtgForm({
                        ...mtgForm,
                        reminderMinutesBefore: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  >
                    <option value={60}>1 Jam Sebelum Rapat</option>
                    <option value={180}>3 Jam Sebelum Rapat</option>
                    <option value={1440}>24 Jam (1 Hari) Sebelum Rapat</option>
                    <option value={2880}>48 Jam (2 Hari) Sebelum Rapat</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[#0F2419]">Lokasi Rapat</span>
                  <input
                    required
                    type="text"
                    value={mtgForm.location}
                    onChange={(e) => setMtgForm({ ...mtgForm, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>
                <label className="space-y-1.5 text-sm md:col-span-2">
                  <span className="font-medium text-[#0F2419]">Pokok Pembahasan Rapat</span>
                  <input
                    required
                    type="text"
                    value={mtgForm.agenda}
                    onChange={(e) => setMtgForm({ ...mtgForm, agenda: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold cursor-pointer"
                >
                  Simpan Jadwal Rapat
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewMeeting(false)}
                  className="px-5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#456051] text-sm font-medium cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          )}

          {/* Add Task Form */}
          {canEditAdmin && showNewTask && (
            <form
              onSubmit={handleTaskSubmit}
              className="rounded-2xl border border-[#BFE0C9] bg-white p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-[#0F2419]">
                Tambah Pembagian Tugas — {activeCommittee.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <label className="space-y-1.5 text-sm lg:col-span-2">
                  <span className="font-medium text-[#0F2419]">Uraian Tugas</span>
                  <input
                    required
                    type="text"
                    value={tskForm.title}
                    onChange={(e) => setTskForm({ ...tskForm, title: e.target.value })}
                    placeholder="Contoh: Menyiapkan konsumsi tamu & paduan suara"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[#0F2419]">Seksi Panitia</span>
                  <select
                    value={tskForm.section}
                    onChange={(e) => setTskForm({ ...tskForm, section: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] bg-white text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  >
                    <option value="Acara & Ibadah">Acara & Ibadah</option>
                    <option value="Konsumsi">Konsumsi</option>
                    <option value="Perlengkapan & Dekorasi">Perlengkapan & Dekorasi</option>
                    <option value="Dana & Usaha">Dana & Usaha</option>
                    <option value="Dokumentasi & Publikasi">Dokumentasi & Publikasi</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[#0F2419]">Penanggung Jawab</span>
                  <input
                    required
                    type="text"
                    value={tskForm.assignee}
                    onChange={(e) => setTskForm({ ...tskForm, assignee: e.target.value })}
                    placeholder="Nama anggota panitia"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-[#0F2419]">Tenggat Waktu</span>
                  <input
                    required
                    type="date"
                    value={tskForm.deadline}
                    onChange={(e) => setTskForm({ ...tskForm, deadline: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>
                <label className="space-y-1.5 text-sm lg:col-span-3">
                  <span className="font-medium text-[#0F2419]">Catatan Tambahan</span>
                  <input
                    type="text"
                    value={tskForm.notes}
                    onChange={(e) => setTskForm({ ...tskForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
                  />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold cursor-pointer"
                >
                  Simpan Tugas
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewTask(false)}
                  className="px-5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#456051] text-sm font-medium cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          )}

          {/* Meetings Grid */}
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-[#0F2419]">
              Jadwal Rapat Terjadwal ({activeCommittee.meetings.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeCommittee.meetings.map((meeting) => {
                const cd = getCountdownLabel(meeting.dateTime, now);
                return (
                  <article
                    key={meeting.id}
                    className="rounded-2xl border border-[#D4E4D8] bg-white p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[#146C43]">
                          Status: {meeting.status} · {meeting.status !== 'Selesai' ? cd.label : 'Sudah dilaksanakan'}
                        </p>
                        <h4 className="text-base font-bold text-[#0F2419] mt-0.5">
                          {meeting.title}
                        </h4>
                      </div>
                      {canEditAdmin && (
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateMeetingStatus(
                              activeCommittee.id,
                              meeting.id,
                              meeting.status === 'Selesai' ? 'Terjadwal' : 'Selesai'
                            )
                          }
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                            meeting.status === 'Selesai'
                              ? 'bg-[#EAF3EC] text-[#146C43] border border-[#BFE0C9]'
                              : 'border border-[#D4E4D8] text-[#0F2419] hover:bg-[#F5F9F6]'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{meeting.status === 'Selesai' ? 'Selesai' : 'Tandai Selesai'}</span>
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-[#456051]">{meeting.agenda}</p>
                    <div className="text-xs text-[#456051] space-y-1 pt-1">
                      <p className="flex items-center gap-1.5 font-mono tabular-nums text-[#0F2419]">
                        <Clock className="w-3.5 h-3.5 text-[#146C43]" />
                        <span>{formatDateTimeID(meeting.dateTime)}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#146C43]" />
                        <span>{meeting.location}</span>
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Task Assignment Table */}
          <section className="rounded-2xl border border-[#D4E4D8] bg-white overflow-hidden">
            <div className="p-5 border-b border-[#E6EFE8] flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#0F2419]">
                Pembagian Tugas Anggota Panitia ({activeCommittee.tasks.length})
              </h3>
              <span className="text-xs font-mono tabular-nums text-[#456051]">
                {activeCommittee.tasks.filter((t) => t.status === 'Selesai').length} /{' '}
                {activeCommittee.tasks.length} selesai
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E6EFE8] bg-[#F5F9F6] text-xs font-semibold text-[#456051]">
                    <th className="py-3 px-4">Tugas & Catatan</th>
                    <th className="py-3 px-4">Seksi</th>
                    <th className="py-3 px-4">Penanggung Jawab</th>
                    <th className="py-3 px-4 whitespace-nowrap">Tenggat</th>
                    <th className="py-3 px-4">Status Kemajuan</th>
                    {canEditAdmin && <th className="py-3 px-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EFE8] text-sm">
                  {activeCommittee.tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-[#F5F9F6]/70">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#0F2419]">{task.title}</p>
                        {task.notes && (
                          <p className="text-xs text-[#456051] mt-0.5">{task.notes}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-[#146C43] whitespace-nowrap">
                        {task.section}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#0F2419] whitespace-nowrap">
                        {task.assignee}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[#456051] tabular-nums whitespace-nowrap">
                        {formatIndonesianDate(task.deadline)}
                      </td>
                      <td className="py-3 px-4">
                        {canEditAdmin ? (
                          <select
                            value={task.status}
                            onChange={(e) =>
                              onUpdateTaskStatus(
                                activeCommittee.id,
                                task.id,
                                e.target.value as CommitteeTask['status']
                              )
                            }
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer focus:outline-none ${
                              task.status === 'Selesai'
                                ? 'bg-[#EAF3EC] border-[#BFE0C9] text-[#146C43]'
                                : task.status === 'Proses'
                                  ? 'bg-amber-50 border-amber-200 text-[#B45309]'
                                  : 'bg-white border-[#D4E4D8] text-[#456051]'
                            }`}
                          >
                            <option value="Belum Mulai">Belum Mulai</option>
                            <option value="Proses">Proses</option>
                            <option value="Selesai">Selesai</option>
                          </select>
                        ) : (
                          <span
                            className={`text-xs font-semibold ${
                              task.status === 'Selesai'
                                ? 'text-[#146C43]'
                                : task.status === 'Proses'
                                  ? 'text-[#B45309]'
                                  : 'text-[#456051]'
                            }`}
                          >
                            {task.status}
                          </span>
                        )}
                      </td>
                      {canEditAdmin && (
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => onDeleteTask(activeCommittee.id, task.id)}
                            title="Hapus tugas"
                            className="p-1.5 rounded-lg text-[#6B8576] hover:text-[#B91C1C] hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
