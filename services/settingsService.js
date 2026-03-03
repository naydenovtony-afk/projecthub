/**
 * App Settings Service
 * Reads and writes global app settings from/to the `app_settings` Supabase table.
 * Used by the admin panel (write) and public pages like register/login (read).
 */

import { supabase } from './supabase.js';

/**
 * Fetch all app settings as a parsed key-value object.
 * Falls back to safe defaults if the table cannot be reached.
 *
 * @returns {Promise<{ maintenance_mode: boolean, allow_registrations: boolean, max_file_size_mb: number, site_announcement: string }>}
 */
export async function getAppSettings() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value');

    if (error) throw error;

    const raw = Object.fromEntries((data || []).map(({ key, value }) => [key, value]));

    return {
      maintenance_mode:    raw.maintenance_mode    === 'true',
      allow_registrations: raw.allow_registrations !== 'false', // default true
      max_file_size_mb:    parseInt(raw.max_file_size_mb  || '50', 10),
      site_announcement:   raw.site_announcement   || '',
    };
  } catch (error) {
    console.warn('[settingsService] Could not fetch settings, using defaults:', error.message);
    return {
      maintenance_mode:    false,
      allow_registrations: true,
      max_file_size_mb:    50,
      site_announcement:   '',
    };
  }
}

/**
 * Upsert multiple settings at once.
 *
 * @param {Object}  settings         - Plain object of setting key → value pairs
 * @param {string}  adminUserId      - UUID of the admin performing the save
 * @returns {Promise<boolean>}       - true on success, false on failure
 */
export async function saveAppSettings(settings, adminUserId) {
  try {
    const rows = Object.entries(settings).map(([key, value]) => ({
      key,
      value:      String(value),
      updated_at: new Date().toISOString(),
      updated_by: adminUserId || null,
    }));

    const { error } = await supabase
      .from('app_settings')
      .upsert(rows, { onConflict: 'key' });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[settingsService] saveAppSettings error:', error);
    return false;
  }
}
