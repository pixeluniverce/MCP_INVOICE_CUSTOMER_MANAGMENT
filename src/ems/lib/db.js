import { neon } from '@neondatabase/serverless';
import { cache } from 'react';
import { getSession } from '@/lib/auth';

// SECURITY: every query in the Employee Management section first checks for a logged-in ADMIN.
// (cache() makes this check run once per request.)
export const requireAdmin = cache(async () => {
  const s = await getSession();
  if (!s || s.role !== 'admin' || s.mustChange) throw new Error('Unauthorized');
  return true;
});

let client;
const get = () => {
  if (!client) {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set in Vercel Environment Variables');
    client = neon(process.env.DATABASE_URL);
  }
  return client;
};
export const sql = (...a) => requireAdmin().then(() => get()(...a));
sql.query = (...a) => requireAdmin().then(() => get().query(...a));
sql.transaction = (...a) => requireAdmin().then(() => get().transaction(...a));
export const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()); // India date
