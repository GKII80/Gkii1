import React from 'react';
import type { FourfoldSymbolInfo } from '../types';

export type { FourfoldSymbolInfo };

export const GKII_OFFICIAL_LOGO_URL = '/assets/aistudio/Logo_GKII_Warna_adc8a1a7.png';

export const FOURFOLD_GOSPEL_SYMBOLS: FourfoldSymbolInfo[] = [
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
];

interface GkiiLogoProps {
  variant?: 'mark' | 'crest';
  className?: string;
  src?: string;
  alt?: string;
}

export const GkiiLogo: React.FC<GkiiLogoProps> = ({
  variant = 'mark',
  className = 'w-10 h-10',
  src,
  alt,
}) => {
  return (
    <img
      src={src || GKII_OFFICIAL_LOGO_URL}
      alt={
        alt ||
        (variant === 'crest'
          ? 'Logo Warna Resmi Gereja Kemah Injil Indonesia (GKII)'
          : 'Logo Gereja Kemah Injil Indonesia')
      }
      referrerPolicy="no-referrer"
      className={`object-contain rounded-full bg-white ${className}`}
    />
  );
};
