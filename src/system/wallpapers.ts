import prismUrl from '../assets/images/nizamos_fluent_prism_1794583592731.jpg';
import slateUrl from '../assets/images/desktop_wallpaper_slate_1794581287179.jpg';
import emeraldUrl from '../assets/images/wallpaper_neon_emerald_1794582181170.jpg';
import cobaltUrl from '../assets/images/wallpaper_electric_cobalt_1794582181644.jpg';

export type PresetWallpaperId = 'kemet' | 'emerald' | 'prism' | 'slate' | 'cobalt';

export interface PresetWallpaper {
  id: PresetWallpaperId;
  label: string;
  arabicLabel: string;
  url: string;
}

export const PRESET_WALLPAPERS: PresetWallpaper[] = [
  { id: 'kemet', label: 'Kemet Midnight', arabicLabel: 'كيميت الليلي', url: '/wallpaper.jpg' },
  { id: 'emerald', label: 'Mint Architecture', arabicLabel: 'العمارة النعناعية', url: emeraldUrl },
  { id: 'prism', label: 'Cosmic Prism', arabicLabel: 'المنشور الكوني', url: prismUrl },
  { id: 'slate', label: 'Dark Slate', arabicLabel: 'الرمادي الليلي', url: slateUrl },
  { id: 'cobalt', label: 'Electric Cobalt', arabicLabel: 'الكوبالت الأزرق', url: cobaltUrl },
];

export const SOLID_WALLPAPERS = [
  { color: '#0f172a', label: 'Deep Midnight Navy' },
  { color: '#090d16', label: 'Obsidian' },
  { color: '#071b16', label: 'Deep Emerald' },
  { color: '#140c24', label: 'Ultraviolet Dark' },
];

export function getPresetWallpaperUrl(id: PresetWallpaperId): string {
  return PRESET_WALLPAPERS.find((p) => p.id === id)?.url ?? '/wallpaper.jpg';
}
