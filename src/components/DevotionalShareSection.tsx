import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Pencil,
  Plus,
  Send,
  Share2,
  Trash2,
} from 'lucide-react';
import { Devotional, SiteTextContent } from '../types';
import { formatIndonesianDate } from '../lib/dateAndFormat';
import { DEFAULT_SITE_CONTENT } from '../lib/siteContentDefaults';

interface DevotionalShareSectionProps {
  devotionals: Devotional[];
  siteContent?: SiteTextContent;
  canEditAdmin: boolean;
  onAddDevotional: (item: Omit<Devotional, 'id'>) => Promise<void>;
  onUpdateDevotional: (id: string, item: Omit<Devotional, 'id'>) => Promise<void>;
  onDeleteDevotional: (id: string) => Promise<void>;
}

export const DevotionalShareSection: React.FC<DevotionalShareSectionProps> = ({
  devotionals,
  siteContent,
  canEditAdmin,
  onAddDevotional,
  onUpdateDevotional,
  onDeleteDevotional,
}) => {
  const [selectedId, setSelectedId] = useState<string>(devotionals[0]?.id || '');
  const [copied, setCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingDevotionalId, setEditingDevotionalId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const emptyDevotionalForm = (): Omit<Devotional, 'id'> => ({
    date: new Date().toISOString().slice(0, 10),
    title: '',
    verseRef: '',
    verseText: '',
    content: '',
    application: '',
    closingPrayer: '',
    author: 'Pdt. Lukas H. Bangun, M.Th.',
  });
  const [form, setForm] = useState<Omit<Devotional, 'id'>>(emptyDevotionalForm);

  const active =
    devotionals.find((d) => d.id === selectedId) || devotionals[0];

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 1080;
    const h = 1080;
    canvas.width = w;
    canvas.height = h;

    // Background clean white-to-soft-sage botanical card
    ctx.fillStyle = '#F5F9F6';
    ctx.fillRect(0, 0, w, h);

    // Top emerald header band
    ctx.fillStyle = '#146C43';
    ctx.fillRect(0, 0, w, 190);

    // Inner white editorial card
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#C9DFCF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(64, 130, w - 128, h - 220, 28);
    ctx.fill();
    ctx.stroke();

    // Header text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('RENUNGAN HARIAN · GKII JEMAAT SUNGAI BARANG', 72, 74);
    ctx.font = '400 22px "DM Sans", sans-serif';
    ctx.fillStyle = '#D7EFE0';
    ctx.fillText(formatIndonesianDate(active.date), 72, 108);

    // Title
    ctx.fillStyle = '#0F2419';
    ctx.font = '700 44px "Plus Jakarta Sans", sans-serif';
    const wrapLines = (text: string, maxWidth: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let current = '';
      for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth) {
          if (current) lines.push(current);
          current = word;
        } else {
          current = test;
        }
      }
      if (current) lines.push(current);
      return lines;
    };

    let y = 215;
    for (const line of wrapLines(active.title, w - 220)) {
      ctx.fillText(line, 110, y);
      y += 56;
    }

    // Verse box
    y += 18;
    const verseLines = wrapLines(`“${active.verseText}”`, w - 280);
    const boxHeight = verseLines.length * 42 + 95;
    ctx.fillStyle = '#EAF3EC';
    ctx.beginPath();
    ctx.roundRect(110, y, w - 220, boxHeight, 18);
    ctx.fill();

    ctx.fillStyle = '#146C43';
    ctx.font = '700 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(active.verseRef, 140, y + 48);

    ctx.fillStyle = '#0F2419';
    ctx.font = 'italic 28px "DM Sans", sans-serif';
    let vy = y + 92;
    for (const vLine of verseLines.slice(0, 6)) {
      ctx.fillText(vLine, 140, vy);
      vy += 40;
    }

    // Application highlight
    const appY = Math.max(vy + 50, y + boxHeight + 56);
    ctx.fillStyle = '#146C43';
    ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('APLIKASI HARI INI', 110, appY);

    ctx.fillStyle = '#334E3F';
    ctx.font = '400 26px "DM Sans", sans-serif';
    let ay = appY + 42;
    for (const aLine of wrapLines(active.application, w - 220).slice(0, 4)) {
      ctx.fillText(aLine, 110, ay);
      ay += 38;
    }

    // Footer
    ctx.fillStyle = '#456051';
    ctx.font = '500 22px "DM Sans", sans-serif';
    ctx.fillText(`Oleh ${active.author} · @gkiisungaibarang`, 110, h - 130);
  }, [active]);

  const buildShareText = (d: Devotional) =>
    `*Renungan Harian GKII Jemaat Sungai Barang*\n${formatIndonesianDate(d.date)}\n\n*${d.title}*\n"${d.verseText}" (${d.verseRef})\n\n${d.content}\n\n*Aplikasi:* ${d.application}\n\n*Doa:* ${d.closingPrayer}\n— ${d.author}`;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://gkiisungaibarang.or.id';

  const handleCopy = async () => {
    if (!active) return;
    const shareText = buildShareText(active);
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setShareFeedback('Silakan salin teks secara manual.');
    }
  };

  const handleNativeShare = async () => {
    if (!active) return;
    const shareText = buildShareText(active);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${active.title} — GKII Sungai Barang`,
          text: shareText,
          url: currentUrl,
        });
        setShareFeedback('Renungan berhasil dibagikan.');
      } catch {
        // User cancelled native share
      }
    } else {
      await handleCopy();
      setShareFeedback('Teks renungan disalin untuk dibagikan.');
    }
  };

  const handleDownloadCard = () => {
    if (!canvasRef.current || !active) return;
    const link = document.createElement('a');
    link.download = `renungan-gkii-sungai-barang-${active.date}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    setShareFeedback('Kartu gambar renungan berhasil diunduh untuk media sosial.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    if (editingDevotionalId) {
      await onUpdateDevotional(editingDevotionalId, form);
    } else {
      await onAddDevotional(form);
    }
    setForm(emptyDevotionalForm());
    setEditingDevotionalId(null);
    setShowForm(false);
  };

  const handleStartEdit = (item: Devotional) => {
    setEditingDevotionalId(item.id);
    setForm({
      date: item.date,
      title: item.title,
      verseRef: item.verseRef,
      verseText: item.verseText,
      content: item.content,
      application: item.application,
      closingPrayer: item.closingPrayer,
      author: item.author,
    });
    setShowForm(true);
  };

  const shareText = active ? buildShareText(active) : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2419]">
            {siteContent?.sections.renunganTitle ||
              DEFAULT_SITE_CONTENT.sections.renunganTitle}
          </h1>
          <p className="text-sm text-[#456051] mt-1">
            {siteContent?.sections.renunganSubtitle ||
              DEFAULT_SITE_CONTENT.sections.renunganSubtitle}
          </p>
        </div>
        {canEditAdmin && (
          <button
            type="button"
            onClick={() => {
              if (showForm && editingDevotionalId) {
                setEditingDevotionalId(null);
                setForm(emptyDevotionalForm());
              } else {
                setEditingDevotionalId(null);
                setForm(emptyDevotionalForm());
                setShowForm((v) => !v);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tulis Renungan Baru</span>
          </button>
        )}
      </div>

      {canEditAdmin && showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[#BFE0C9] bg-white p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-[#0F2419]">
            {editingDevotionalId ? 'Perbarui Renungan Harian' : 'Terbitkan Renungan Harian'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Judul Renungan</span>
              <input
                required
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Tanggal</span>
              <input
                required
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Ayat Nas (Referensi)</span>
              <input
                required
                type="text"
                value={form.verseRef}
                onChange={(e) => setForm({ ...form, verseRef: e.target.value })}
                placeholder="Contoh: Yohanes 15:5"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Penulis</span>
              <input
                required
                type="text"
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm md:col-span-2">
              <span className="font-medium text-[#0F2419]">Isi Ayat Alkitab</span>
              <input
                required
                type="text"
                value={form.verseText}
                onChange={(e) => setForm({ ...form, verseText: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm md:col-span-2">
              <span className="font-medium text-[#0F2419]">Uraian Renungan</span>
              <textarea
                required
                rows={4}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Aplikasi Praktis</span>
              <input
                required
                type="text"
                value={form.application}
                onChange={(e) => setForm({ ...form, application: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
            <label className="space-y-1.5 text-sm">
              <span className="font-medium text-[#0F2419]">Doa Penutup</span>
              <input
                required
                type="text"
                value={form.closingPrayer}
                onChange={(e) => setForm({ ...form, closingPrayer: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#0F2419] focus:outline-none focus:border-[#146C43]"
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold cursor-pointer"
            >
              {editingDevotionalId ? 'Simpan Perubahan Renungan' : 'Terbitkan Renungan'}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingDevotionalId(null);
                setForm(emptyDevotionalForm());
                setShowForm(false);
              }}
              className="px-5 py-2.5 rounded-lg border border-[#D4E4D8] text-[#456051] text-sm font-medium cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {!active ? (
        <div className="rounded-2xl border border-[#D4E4D8] bg-white p-10 text-center space-y-2">
          <p className="text-base font-semibold text-[#0F2419]">
            Belum ada renungan harian yang diterbitkan
          </p>
          <p className="text-sm text-[#456051]">
            Silakan tambahkan renungan harian baru melalui tombol di atas.
          </p>
        </div>
      ) : (
        <>
          {/* Archive Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {devotionals.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setSelectedId(d.id);
                  setConfirmDeleteId(null);
                }}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  active.id === d.id
                    ? 'bg-[#146C43] text-white'
                    : 'bg-white border border-[#D4E4D8] text-[#456051] hover:text-[#0F2419]'
                }`}
              >
                {formatIndonesianDate(d.date)} · {d.title}
              </button>
            ))}
          </div>

          {/* Main Reader + Social Share Card Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <article className="lg:col-span-7 rounded-2xl border border-[#D4E4D8] bg-white p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#456051]">
                    <span className="font-semibold text-[#146C43]">Renungan Harian</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatIndonesianDate(active.date)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{active.author}</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#0F2419] leading-snug">
                    {active.title}
                  </h2>
                </div>

                {canEditAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEdit(active)}
                      title="Ubah renungan ini"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4E4D8] bg-[#F5F9F6] hover:bg-[#EAF3EC] text-xs font-semibold text-[#0F2419] cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#146C43]" />
                      <span>Ubah</span>
                    </button>
                    {confirmDeleteId === active.id ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={async () => {
                            await onDeleteDevotional(active.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#B91C1C] text-white text-xs font-semibold cursor-pointer"
                        >
                          Ya, Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#D4E4D8] text-xs font-medium text-[#456051] cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(active.id)}
                        title="Hapus renungan ini"
                        className="p-2 rounded-lg text-[#6B8576] hover:text-[#B91C1C] hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

          <div className="rounded-xl bg-[#F5F9F6] border border-[#D4E4D8] p-5 space-y-2">
            <p className="text-xs font-bold text-[#146C43]">{active.verseRef}</p>
            <p className="text-base text-[#0F2419] italic leading-relaxed">
              “{active.verseText}”
            </p>
          </div>

          <div className="space-y-4 text-[15px] sm:text-base text-[#233D2E] leading-relaxed whitespace-pre-line">
            {active.content}
          </div>

          <div className="rounded-xl border border-[#D4E4D8] p-5 space-y-3">
            <div>
              <p className="text-xs font-bold text-[#146C43]">Aplikasi Hari Ini</p>
              <p className="text-sm sm:text-[15px] text-[#0F2419] mt-1 leading-relaxed">
                {active.application}
              </p>
            </div>
            <div className="pt-3 border-t border-[#E6EFE8]">
              <p className="text-xs font-bold text-[#146C43]">Doa Penutup</p>
              <p className="text-sm sm:text-[15px] text-[#456051] italic mt-1 leading-relaxed">
                {active.closingPrayer}
              </p>
            </div>
          </div>

          {/* Direct Social Share Buttons */}
          <div className="pt-2 space-y-3">
            <p className="text-sm font-bold text-[#0F2419]">Bagikan Langsung ke Media Sosial</p>
            <div className="flex flex-wrap items-center gap-2.5">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}&quote=${encodeURIComponent(`${active.title} — "${active.verseText}" (${active.verseRef})`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#F5F9F6] text-[#0F2419] text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <Share2 className="w-3.5 h-3.5 text-[#146C43]" />
                <span>Facebook</span>
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${active.title} (${active.verseRef}): "${active.verseText}" — GKII Jemaat Sungai Barang`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#F5F9F6] text-[#0F2419] text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <Share2 className="w-3.5 h-3.5 text-[#146C43]" />
                <span>X / Twitter</span>
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#F5F9F6] text-[#0F2419] text-xs font-semibold transition-colors whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5 text-[#146C43]" />
                <span>Telegram</span>
              </a>
              <button
                type="button"
                onClick={handleNativeShare}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#F5F9F6] text-[#0F2419] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-[#146C43]" />
                <span>Bagikan Cepat</span>
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#D4E4D8] bg-white hover:bg-[#F5F9F6] text-[#0F2419] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#146C43]" />
                    <span>Teks Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#146C43]" />
                    <span>Salin Teks</span>
                  </>
                )}
              </button>
            </div>
            {shareFeedback && (
              <p className="text-xs font-medium text-[#146C43]">{shareFeedback}</p>
            )}
          </div>
        </article>

        {/* Visual Social Media Quote Card Generator */}
        <aside className="lg:col-span-5 rounded-2xl border border-[#D4E4D8] bg-white p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[#0F2419]">Kartu Gambar Media Sosial</h3>
            <p className="text-xs text-[#456051]">
              Unduh kartu renungan ini untuk langsung dibagikan ke Status WhatsApp, Instagram, atau Facebook.
            </p>
          </div>
          <div className="rounded-xl overflow-hidden border border-[#D4E4D8] bg-[#F5F9F6]">
            <canvas
              ref={canvasRef}
              className="w-full h-auto block"
              aria-label="Pratinjau Kartu Renungan Harian"
            />
          </div>
          <button
            type="button"
            onClick={handleDownloadCard}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#146C43] hover:bg-[#0F5132] text-white text-sm font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Kartu Gambar (PNG)</span>
          </button>
        </aside>
      </div>
        </>
      )}
    </div>
  );
};
