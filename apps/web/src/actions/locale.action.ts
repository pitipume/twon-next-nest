'use server';

import { cookies } from 'next/headers';

export type Locale = 'en' | 'th';

export async function setLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set('locale', locale, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });
}
