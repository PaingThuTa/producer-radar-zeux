import { useEffect } from 'react';
import { api } from '@/lib/api-client';

function addDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function randomDays(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getFollowUpDelay(toStatus) {
  if (toStatus === 'follow up 1') return 1;
  if (toStatus === 'follow up 2') return randomDays(2, 4);
  if (toStatus === 'follow up 3') return randomDays(5, 10);
  if (toStatus === 'follow up 4') return randomDays(5, 10);
  if (toStatus === 'follow up 5') return randomDays(5, 10);
  return null;
}

const STATUS_CHAIN = ['contactado', 'follow up 1', 'follow up 2', 'follow up 3', 'follow up 4', 'follow up 5'];

/**
 * Auto-advances producer statuses based on time (next_follow_up <= today).
 * Also resets re_dms='yes' producers stuck at follow up 5 for 2+ months.
 */
export function useAutoAdvanceStatus(ytProducers = [], plProducers = [], onAdvanced) {
  useEffect(() => {
    if (!ytProducers.length && !plProducers.length) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const today_str = today.toISOString().split('T')[0];

    // Producers at follow up 5 with re_dms='yes' and last_action 60+ days ago → reset
    const shouldReset = (p) => {
      if (p.status !== 'archivado' || p.re_dms !== 'yes') return false;
      if (!p.last_action) return false;
      const last = new Date(p.last_action);
      last.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today - last) / 86400000);
      return diffDays >= 60;
    };

    // Producers whose next_follow_up date has passed → advance to next status
    const shouldAdvance = (p) => {
      if (!STATUS_CHAIN.includes(p.status)) return false;
      if (shouldReset(p)) return false; // reset takes priority
      if (!p.next_follow_up) return false;
      const d = new Date(p.next_follow_up);
      d.setHours(0, 0, 0, 0);
      return d < today;
    };

    const getNext = (status) => {
      const idx = STATUS_CHAIN.indexOf(status);
      return idx < STATUS_CHAIN.length - 1 ? STATUS_CHAIN[idx + 1] : 'archivado';
    };

    const ytToReset = ytProducers.filter(shouldReset);
    const plToReset = plProducers.filter(shouldReset);
    const ytToAdvance = ytProducers.filter(shouldAdvance);
    const plToAdvance = plProducers.filter(shouldAdvance);

    if (!ytToReset.length && !plToReset.length && !ytToAdvance.length && !plToAdvance.length) return;

    Promise.all([
      ...ytToReset.map(p =>
        api.entities.YouTubeProducer.update(p.id, {
          status: 'por contactar',
          last_action: today_str,
          next_follow_up: null,
        })
      ),
      ...plToReset.map(p =>
        api.entities.PlacementProducer.update(p.id, {
          status: 'por contactar',
          last_action: today_str,
          next_follow_up: null,
        })
      ),
      ...ytToAdvance.map(p => {
        const nextStatus = getNext(p.status);
        const delay = getFollowUpDelay(nextStatus);
        return api.entities.YouTubeProducer.update(p.id, {
          status: nextStatus,
          last_action: today_str,
          next_follow_up: delay != null ? addDays(delay) : null,
        });
      }),
      ...plToAdvance.map(p => {
        const nextStatus = getNext(p.status);
        const delay = getFollowUpDelay(nextStatus);
        return api.entities.PlacementProducer.update(p.id, {
          status: nextStatus,
          last_action: today_str,
          next_follow_up: delay != null ? addDays(delay) : null,
        });
      }),
    ]).then(() => {
      onAdvanced?.();
    });
  }, [ytProducers.length, plProducers.length]);
}