import { Committee, LiveNotification, Member } from '../types';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parsed = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parsed = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function formatDateTimeID(dateTimeStr: string): string {
  if (!dateTimeStr) return '-';
  const parsed = new Date(dateTimeStr);
  if (Number.isNaN(parsed.getTime())) return dateTimeStr;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
}

export function daysUntilNextOccurrence(mmddDate: string, now: Date = new Date()): number | null {
  if (!mmddDate || mmddDate.length < 10) return null;
  const parts = mmddDate.split('-');
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  if (Number.isNaN(month) || Number.isNaN(day)) return null;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let target = new Date(now.getFullYear(), month, day);
  if (target < todayStart) {
    target = new Date(now.getFullYear() + 1, month, day);
  }
  const diffMs = target.getTime() - todayStart.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function calculateTurningAge(birthDate: string, now: Date = new Date()): number {
  const birthYear = Number(birthDate.slice(0, 4));
  if (Number.isNaN(birthYear)) return 0;
  return now.getFullYear() - birthYear;
}

export function computeLiveNotifications(
  members: Member[],
  committees: Committee[],
  now: Date = new Date()
): LiveNotification[] {
  const notifications: LiveNotification[] = [];

  for (const member of members) {
    const bDays = daysUntilNextOccurrence(member.birthDate, now);
    if (bDays !== null && bDays <= 7) {
      const age = calculateTurningAge(member.birthDate, now);
      const isToday = bDays === 0;
      const greeting = `Shalom ${member.fullName}, selamat ulang tahun kelahiran ke-${age}! Kiranya kasih karunia Tuhan Yesus senantiasa memberkati usia yang baru. Salam hangat dari GKII Jemaat Sungai Barang.`;
      notifications.push({
        id: `bday-${member.id}-${now.toISOString().slice(0, 10)}`,
        type: 'birthday',
        urgency: isToday ? 'today' : 'upcoming',
        title: isToday
          ? `Ulang Tahun Hari Ini: ${member.fullName}`
          : `HUT Kelahiran (${bDays} hari lagi): ${member.fullName}`,
        message: isToday
          ? `Merayakan ulang tahun ke-${age} hari ini (${member.organ} · ${member.sector}).`
          : `Akan berulang tahun ke-${age} dalam ${bDays} hari (${formatIndonesianDate(member.birthDate).slice(0, -5)}).`,
        targetName: member.fullName,
        phone: member.phone,
        whatsappText: greeting,
        dueLabel: isToday ? 'Hari Ini' : `${bDays} hari lagi`,
      });
    }

    if (member.weddingDate) {
      const wDays = daysUntilNextOccurrence(member.weddingDate, now);
      if (wDays !== null && wDays <= 7) {
        const years = calculateTurningAge(member.weddingDate, now);
        const isToday = wDays === 0;
        const coupleLabel = member.spouseName
          ? `${member.fullName} & ${member.spouseName}`
          : member.fullName;
        const greeting = `Shalom ${coupleLabel}, selamat ulang tahun pernikahan ke-${years}! Tuhan Yesus kiranya terus menguatkan dan memberkati rumah tangga saudara. Salam kasih dari GKII Jemaat Sungai Barang.`;
        notifications.push({
          id: `anniv-${member.id}-${now.toISOString().slice(0, 10)}`,
          type: 'anniversary',
          urgency: isToday ? 'today' : 'upcoming',
          title: isToday
            ? `HUT Pernikahan Hari Ini: ${coupleLabel}`
            : `HUT Pernikahan (${wDays} hari lagi): ${coupleLabel}`,
          message: isToday
            ? `Merayakan ulang tahun pernikahan ke-${years} hari ini (${member.sector}).`
            : `Akan merayakan ulang tahun pernikahan ke-${years} dalam ${wDays} hari.`,
          targetName: coupleLabel,
          phone: member.phone,
          whatsappText: greeting,
          dueLabel: isToday ? 'Hari Ini' : `${wDays} hari lagi`,
        });
      }
    }
  }

  for (const committee of committees) {
    for (const meeting of committee.meetings) {
      if (meeting.status === 'Selesai') continue;
      const meetingTime = new Date(meeting.dateTime).getTime();
      if (Number.isNaN(meetingTime)) continue;

      const diffMinutes = Math.round((meetingTime - now.getTime()) / (1000 * 60));
      if (diffMinutes >= -30 && diffMinutes <= meeting.reminderMinutesBefore) {
        const isImminent = diffMinutes <= 120;
        let dueLabel = 'Segera dimulai';
        if (diffMinutes > 60) {
          const hrs = Math.round(diffMinutes / 60);
          dueLabel = hrs >= 24 ? `${Math.round(hrs / 24)} hari lagi` : `${hrs} jam lagi`;
        } else if (diffMinutes > 0) {
          dueLabel = `${diffMinutes} menit lagi`;
        } else {
          dueLabel = 'Sedang berlangsung';
        }

        notifications.push({
          id: `meeting-${committee.id}-${meeting.id}`,
          type: 'meeting',
          urgency: isImminent ? 'today' : 'upcoming',
          title: `Pengingat Rapat: ${meeting.title}`,
          message: `${committee.name} · ${meeting.location} (${formatDateTimeID(meeting.dateTime)})`,
          targetName: committee.name,
          dueLabel,
          committeeId: committee.id,
        });
      }
    }
  }

  return notifications.sort((a, b) => {
    if (a.urgency === 'today' && b.urgency !== 'today') return -1;
    if (a.urgency !== 'today' && b.urgency === 'today') return 1;
    return 0;
  });
}

export function toWhatsAppUrl(phone: string | undefined, message: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits;
  const encoded = encodeURIComponent(message);
  return normalized ? `https://wa.me/${normalized}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}
