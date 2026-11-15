import React, { useState } from 'react';
import {
  Check,
  Copy,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Trash2,
} from 'lucide-react';
import { LeadershipMember, SiteTextContent } from '../types';
import { toWhatsAppUrl } from '../lib/dateAndFormat';
import { DEFAULT_SITE_CONTENT } from '../lib/siteContentDefaults';

interface LeadershipSectionProps {
  leadership: LeadershipMember[];
  siteContent?: SiteTextContent;
  canEditAdmin: boolean;
  onAddLeader: (leader: Omit<LeadershipMember, 'id' | 'order'>) => Promise<void>;
  onUpdateLeader: (
    id: string,
    leader: Omit<LeadershipMember, 'id' | 'order'>
  ) => Promise<void>;
  onDeleteLeader: (id: string) => Promise<void>;
}

function getInitials(name: string): string {
  const cleaned = name.replace(/^(Pdt\.|Bpk\.|Ibu|Sdr\.|Sdri\.)\s*/i, '');
  const parts = cleaned.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

export const LeadershipSection: React.FC<LeadershipSectionProps> = ({
  leadership,
  siteContent,
  canEditAdmin,
  onAddLeader,
  onUpdateLeader,
  onDeleteLeader,
}) => {
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState<Record<string, boolean>>({});
  const [showForm, setShowForm] = useState(false);
  const [editingLeaderId, setEditingLeaderId] = useState<string | null>(null);

  const emptyForm = () => ({
    name: '',
    role: '',
    period: '2024 – 2028',
    phone: '',
    email: '',
    photoUrl: '',
    bio: '',
    responsibilitiesText: '',
  });
  const [form, setForm] = useState(emptyForm);

  const handleCopyPhone = async (id: string, phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhoneId(id);
      setTimeout(() => setCopiedPhoneId(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.role.trim()) return;
    const responsibilities = form.responsibilitiesText
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    const payload: Omit<LeadershipMember, 'id' | 'order'> = {
      name: form.name,
      role: form.role,
      period: form.period,
      phone: form.phone,
      email: form.email || 'sekretariat@gkiisungaibarang.or.id',
      photoUrl: form.photoUrl,
      bio: form.bio || 'Melayani di Badan Pengurus Jemaat GKII Sungai Barang.',
      responsibilities:
        responsibilities.length > 0
          ? responsibilities
          : ['Melaksanakan tugas pelayanan sesuai bidang tanggung jawab BPJ.'],
    };

    if (editingLeaderId) {
      await onUpdateLeader(editingLeaderId, payload);
    } else {
      await onAddLeader(payload);
    }
    setForm(emptyForm());
    setEditingLeaderId(null);
    setShowForm(false);
  };

  const handleStartEdit = (leader: LeadershipMember) => {
    setEditingLeaderId(leader.id);
    setForm({
      name: leader.name,
      role: leader.role,
      period: leader.period,
      phone: leader.phone,
      email: leader.email,
      photoUrl: leader.photoUrl,
      bio: leader.bio,
      responsibilitiesText: leader.responsibilities.join('\n'),
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2419]">
            {siteContent?.sections.pengurusTitle ||
              DEFAULT_SITE_CONTENT.sections.pengurusTitle}
          </h1>
          <p className="text-sm text-[#456051] mt-1">
            {siteContent?.sections.pengurusSubtitle ||
              DEFAULT_SITE_CONTENT.sections.pengurusSubtitle}
          </p>
        </div>

        {canEditAdmin && (
          <button
            type="button"
            onClick={() => {
              if (showForm && editingLeaderId) {
                setEditingLeaderId(null);
                setForm(emptyForm());
              } else {
                setEditingLeaderId(null);
                setForm(emptyForm());
                setShowForm((v) => !v);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pengurus</span>
          </button>
        )}
      </div>

      {canEditAdmin && showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#BFE0C9] bg-white p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-[#0F2419]">
            {editingLeaderId ? 'Perbarui Data Badan Pengurus' : 'Tambah Anggota Badan Pengurus'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Nama & Gelar</span>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Bpk. Hendrikus Apui"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Jabatan Pelayanan</span>
              <input
                required
                type="text"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="Contoh: Koordinator Seksi Misi"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Nomor Kontak / WhatsApp</span>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="0812..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] font-mono text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Surel Pelayanan</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="sekretariat@gkiisungaibarang.or.id"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Masa Bakti</span>
              <input
                required
                type="text"
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Deskripsi Singkat Profil</span>
              <input
                type="text"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm md:col-span-2">
              <span className="font-medium text-[#0F2419]">
                Daftar Tanggung Jawab (1 baris per poin)
              </span>
              <textarea
                rows={3}
                value={form.responsibilitiesText}
                onChange={(e) =>
                  setForm({ ...form, responsibilitiesText: e.target.value })
                }
                placeholder={'Mengkoordinasikan pelayanan...\nMelaporkan perkembangan kepada BPJ...'}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold cursor-pointer"
            >
              {editingLeaderId ? 'Simpan Perubahan Pengurus' : 'Simpan Pengurus'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingLeaderId(null);
                setForm(emptyForm());
                setShowForm(false);
              }}
              className="px-5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#456051] text-sm font-medium cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {leadership.map((leader) => {
          const showPhoto = Boolean(leader.photoUrl) && !imgFailed[leader.id];
          return (
            <article
              key={leader.id}
              className="rounded-2xl border border-[#D4E4D8] bg-white p-6 flex flex-col justify-between gap-5"
            >
              <div className="space-y-4">
                {/* Profile Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border border-[#D4E4D8] bg-[#EAF3EC] shrink-0 flex items-center justify-center">
                      {showPhoto ? (
                        <img
                          src={leader.photoUrl}
                          alt={`Foto profil ${leader.name}`}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setImgFailed((prev) => ({ ...prev, [leader.id]: true }))
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-[#146C43] text-white">
                          <span className="text-xl font-bold tracking-tight">
                            {getInitials(leader.name)}
                          </span>
                          <span className="text-[10px] opacity-80">BPJ GKII</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#146C43]">
                        {leader.role} · Masa Bakti {leader.period}
                      </p>
                      <h2 className="text-xl font-bold text-[#0F2419] mt-0.5">
                        {leader.name}
                      </h2>
                      <p className="text-sm text-[#456051] mt-1 leading-snug">
                        {leader.bio}
                      </p>
                    </div>
                  </div>
                  {canEditAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(leader)}
                        title="Ubah data pengurus"
                        className="p-2 rounded-lg text-[#6B8576] hover:text-[#146C43] hover:bg-[#EAF3EC] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteLeader(leader.id)}
                        title="Hapus data pengurus"
                        className="p-2 rounded-lg text-[#6B8576] hover:text-[#B91C1C] hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Responsibilities */}
                <div className="rounded-xl bg-[#F5F9F6] border border-[#D4E4D8] p-4 space-y-2">
                  <p className="text-xs font-bold text-[#0F2419]">
                    Deskripsi Tanggung Jawab Pelayanan
                  </p>
                  <ul className="space-y-1.5 text-sm text-[#334E3F] list-disc list-inside leading-relaxed">
                    {leader.responsibilities.map((resp, idx) => (
                      <li key={idx}>{resp}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Contact Actions */}
              <div className="pt-4 border-t border-[#E6EFE8] flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5 text-xs text-[#456051]">
                  <p className="inline-flex items-center gap-1.5 font-mono tabular-nums text-[#0F2419] font-medium">
                    <Phone className="w-3.5 h-3.5 text-[#146C43]" />
                    <span>{leader.phone}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#146C43]" />
                    <span>{leader.email}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyPhone(leader.id, leader.phone)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#F5F9F6] text-xs font-semibold text-[#0F2419] cursor-pointer"
                  >
                    {copiedPhoneId === leader.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#146C43]" />
                        <span>Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#146C43]" />
                        <span>Salin Nomor</span>
                      </>
                    )}
                  </button>
                  <a
                    href={toWhatsAppUrl(
                      leader.phone,
                      `Shalom ${leader.name}, saya jemaat GKII Sungai Barang ingin berkonsultasi mengenai pelayanan.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Hubungi</span>
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
