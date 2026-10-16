/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { InvitationData, GuestRsvp, PublicSite } from './types/invitation';
import { INITIAL_INVITATION_DATA } from './utils/templates';
import { BuilderSidebar } from './components/builder/BuilderSidebar';
import { PreviewFrame } from './components/builder/PreviewFrame';
import { PublicGuestView } from './components/public/PublicGuestView';
import { ShareModal } from './components/builder/ShareModal';
import { AdminSiteManagerModal } from './components/admin/AdminSiteManagerModal';
import { AdminRsvpDashboardModal } from './components/admin/AdminRsvpDashboardModal';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { AdminSecurityModal } from './components/admin/AdminSecurityModal';
import { SacredCrossIcon } from './components/common/DecorativeIcons';
import {
  Eye,
  Edit3,
  Share2,
  Globe,
  Shield,
  CheckCircle2,
  AlertCircle,
  Heart,
  LogOut,
  Key,
  Cloud,
  RefreshCw,
} from 'lucide-react';
import {
  auth,
  subscribeToSites,
  subscribeToSiteRsvps,
  saveSiteToCloud,
  deleteSiteFromCloud,
  submitRsvpToCloud,
  deleteRsvpFromCloud,
  subscribeToSystemConfig,
  updateSystemConfigInCloud,
  SystemConfig,
} from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const STORAGE_KEY_SITES = 'blessed_sites_v2';

const INITIAL_RSVPS: GuestRsvp[] = [
  {
    id: 'rsvp_sample_1',
    name: 'Maria Santos',
    attending: true,
    guestCount: 1,
    message: 'So honored to be Godmother to baby Liam! May God shower his life with endless blessings.',
    submittedAt: 'Oct 4, 2026',
  },
  {
    id: 'rsvp_sample_2',
    name: 'Engr. Rafael Reyes',
    attending: true,
    guestCount: 1,
    message: 'Can’t wait to celebrate Liam’s first milestone and sacrament with the family!',
    submittedAt: 'Oct 5, 2026',
  },
];

const DEFAULT_SITE_1: PublicSite = {
  id: 'site_liam_1',
  slug: 'liam-alexander',
  title: "Liam Alexander's Holy Baptism & 1st Birthday",
  isPublished: true,
  publishedAt: 'Oct 5, 2026',
  createdAt: 'Oct 1, 2026',
  viewCount: 142,
  allowGuestRsvp: true,
  data: INITIAL_INVITATION_DATA,
  rsvps: INITIAL_RSVPS,
};

// Helper to ensure countdown and event dates accurately target December 7, 2026
function normalizeSiteData(data: InvitationData): InvitationData {
  if (!data) return data;
  let updated = { ...data };
  if (!updated.countdownTarget || updated.countdownTarget.startsWith('2026-12-13')) {
    updated.countdownTarget = '2026-12-07T10:00:00';
  }
  if (updated.baptismDate && updated.baptismDate.includes('December 13, 2026')) {
    updated.baptismDate = updated.baptismDate
      .replace('Sunday, December 13, 2026', 'Monday, December 7, 2026')
      .replace('December 13, 2026', 'December 7, 2026');
  }
  if (updated.birthdayDate && updated.birthdayDate.includes('December 13, 2026')) {
    updated.birthdayDate = updated.birthdayDate
      .replace('Sunday, December 13, 2026', 'Monday, December 7, 2026')
      .replace('December 13, 2026', 'December 7, 2026');
  }
  if (!updated.closingSignature || /Juan\s*(&|and)\s*Elena/i.test(updated.closingSignature) || /With love, Parents/i.test(updated.closingSignature)) {
    updated.closingSignature = 'With Love,';
  }
  return updated;
}

export default function App() {
  // All public sites managed by the admin in centralized database
  const [sites, setSites] = useState<PublicSite[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SITES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((s: PublicSite) => ({
            ...s,
            data: normalizeSiteData(s.data),
          }));
        }
      }
    } catch {
      // Fallback
    }
    return [DEFAULT_SITE_1];
  });

  const [activeSiteId, setActiveSiteId] = useState<string>(() => {
    return sites[0]?.id || DEFAULT_SITE_1.id;
  });

  // Cloud Database Status Tracking
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'syncing' | 'offline' | 'error'>('syncing');
  const [lastSyncTime, setLastSyncTime] = useState<string>('Just now');
  const isInitialCloudLoadDone = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocalEditTimeRef = useRef<number>(0);

  // URL state checking
  const [currentUrlParams, setCurrentUrlParams] = useState<URLSearchParams>(
    () => new URLSearchParams(window.location.search)
  );

  useEffect(() => {
    const handlePopState = () => {
      setCurrentUrlParams(new URLSearchParams(window.location.search));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Save sites to localStorage as optimistic offline cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SITES, JSON.stringify(sites));
    } catch {
      // Storage error
    }
  }, [sites]);

  // Determine active site for editing or viewing
  const activeSite = useMemo(() => {
    return sites.find((s) => s.id === activeSiteId) || sites[0] || DEFAULT_SITE_1;
  }, [sites, activeSiteId]);

  // Determine site for guest viewing
  const guestSite = useMemo(() => {
    const slugParam = currentUrlParams.get('site');
    if (slugParam) {
      const matched = sites.find((s) => s.slug === slugParam.toLowerCase().trim());
      if (matched) return matched;
    }
    return activeSite;
  }, [sites, currentUrlParams, activeSite]);

  // Admin Authentication Credentials & Session
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem('blessed_admin_session') === 'true' ||
        sessionStorage.getItem('blessed_admin_session') === 'true'
      );
    } catch {
      return false;
    }
  });

  const [adminCreds, setAdminCreds] = useState<{ username: string; passwordHash: string }>(() => {
    try {
      const saved = localStorage.getItem('blessed_admin_creds');
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return { username: 'admin', passwordHash: 'admin123' };
  });

  // Firebase Auth Listener (Google Sign-In integration)
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdminLoggedIn(true);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Centralized System Config Listener (Syncs Admin credentials across all devices)
  useEffect(() => {
    const unsubscribeConfig = subscribeToSystemConfig(
      (config) => {
        if (config?.adminUsername && config?.adminPasswordHash) {
          setAdminCreds({
            username: config.adminUsername,
            passwordHash: config.adminPasswordHash,
          });
          try {
            localStorage.setItem(
              'blessed_admin_creds',
              JSON.stringify({
                username: config.adminUsername,
                passwordHash: config.adminPasswordHash,
              })
            );
          } catch {
            // Ignore storage err
          }
        }
      },
      (err) => {
        console.warn('System config cloud sync error:', err);
      }
    );

    return () => unsubscribeConfig();
  }, []);

  // Centralized Sites Subscription: Real-time sync across all browsers and devices
  useEffect(() => {
    setCloudStatus('syncing');

    const unsubscribeSites = subscribeToSites(
      async (cloudSites) => {
        setCloudStatus('connected');
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

        if (cloudSites.length === 0 && !isInitialCloudLoadDone.current) {
          isInitialCloudLoadDone.current = true;
          // Seed the initial default site Liam Alexander into the centralized database
          try {
            await saveSiteToCloud(DEFAULT_SITE_1);
            for (const rsvp of INITIAL_RSVPS) {
              await submitRsvpToCloud(DEFAULT_SITE_1.id, rsvp);
            }
          } catch (seedErr) {
            console.error('Initial cloud database seed error:', seedErr);
          }
        } else if (cloudSites.length > 0) {
          isInitialCloudLoadDone.current = true;
          setSites((prevSites) => {
            return cloudSites.map((cSite) => {
              const existing = prevSites.find((p) => p.id === cSite.id);
              const isRecentLocalEdit =
                cSite.id === activeSiteId &&
                Date.now() - lastLocalEditTimeRef.current < 4000;

              // If the user recently uploaded a custom photo locally, protect it from being stomped by older remote snapshot
              let siteData = normalizeSiteData(cSite.data);
              if (
                isRecentLocalEdit &&
                existing?.data?.babyPhotoUrl?.startsWith('data:') &&
                !cSite.data?.babyPhotoUrl?.startsWith('data:')
              ) {
                siteData = {
                  ...cSite.data,
                  babyPhotoUrl: existing.data.babyPhotoUrl,
                };
              }

              return {
                ...cSite,
                data: siteData,
                rsvps: existing?.rsvps?.length ? existing.rsvps : cSite.rsvps || [],
              };
            });
          });
        }
      },
      (error) => {
        console.error('Cloud sites subscription error:', error);
        setCloudStatus('error');
      }
    );

    return () => {
      unsubscribeSites();
    };
  }, []);

  // Centralized RSVPs Subscription for every site: Live synchronization of guest responses
  const siteIdsKey = useMemo(() => sites.map((s) => s.id).sort().join(','), [sites]);

  useEffect(() => {
    if (sites.length === 0) return;

    const unsubs = sites.map((site) =>
      subscribeToSiteRsvps(
        site.id,
        (cloudRsvps) => {
          setSites((prev) =>
            prev.map((s) =>
              s.id === site.id
                ? {
                    ...s,
                    rsvps: cloudRsvps,
                  }
                : s
            )
          );
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        },
        (err) => {
          console.warn(`RSVP sync error for site ${site.id}:`, err);
        }
      )
    );

    return () => {
      unsubs.forEach((unsub) => unsub());
    };
  }, [siteIdsKey]);

  const viewParam = currentUrlParams.get('view');
  const isExplicitAdmin = viewParam === 'admin';
  // Guest mode is active if:
  // 1) Explicitly viewing as guest (?view=guest)
  // 2) User is not logged in as admin AND not explicitly on ?view=admin
  const isGuestMode = viewParam === 'guest' || (!isAdminLoggedIn && !isExplicitAdmin);

  // Mobile layout tab: 'editor' vs 'preview'
  const [mobileActiveView, setMobileActiveView] = useState<'editor' | 'preview'>('preview');

  // Modals
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isAdminSiteModalOpen, setIsAdminSiteModalOpen] = useState(false);
  const [isAdminRsvpModalOpen, setIsAdminRsvpModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAdminSecurityModalOpen, setIsAdminSecurityModalOpen] = useState(false);

  // Update admin credentials in centralized database
  const handleUpdateAdminCreds = async (newUsername: string, newPassword: string) => {
    const updated: SystemConfig = { adminUsername: newUsername, adminPasswordHash: newPassword };
    setAdminCreds({ username: newUsername, passwordHash: newPassword });
    try {
      localStorage.setItem('blessed_admin_creds', JSON.stringify({ username: newUsername, passwordHash: newPassword }));
      await updateSystemConfigInCloud(updated);
    } catch (err) {
      console.error('Failed to sync admin credentials to cloud:', err);
    }
  };

  const handleAdminLogout = async () => {
    localStorage.removeItem('blessed_admin_session');
    sessionStorage.removeItem('blessed_admin_session');
    setIsAdminLoggedIn(false);
    try {
      await signOut(auth);
    } catch {
      // Ignore
    }
  };

  // Total RSVPs across all sites
  const totalAllRsvpsCount = useMemo(
    () => sites.reduce((sum, s) => sum + s.rsvps.length, 0),
    [sites]
  );

  // Update active site data from Builder (Optimistic + Debounced or Immediate Cloud Save)
  const handleUpdateActiveSiteData = (updatedData: InvitationData, saveImmediately = false) => {
    lastLocalEditTimeRef.current = Date.now();
    const updatedSite: PublicSite = {
      ...activeSite,
      title: `${updatedData.babyName}'s Holy Baptism & 1st Birthday`,
      data: updatedData,
      updatedAt: new Date().toISOString(),
    };

    // 1. Instant local update for responsive UI across all views
    setSites((prevSites) =>
      prevSites.map((site) => (site.id === activeSite.id ? updatedSite : site))
    );

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (saveImmediately) {
      setCloudStatus('syncing');
      saveSiteToCloud(updatedSite)
        .then(() => {
          setCloudStatus('connected');
          setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        })
        .catch((err) => {
          console.error('Error saving site immediately to cloud:', err);
          setCloudStatus('error');
        });
      return;
    }

    // 2. Debounced save to centralized cloud database
    setCloudStatus('syncing');
    debounceTimerRef.current = setTimeout(async () => {
      try {
        await saveSiteToCloud(updatedSite);
        setCloudStatus('connected');
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.error('Error saving updated site to cloud:', err);
        setCloudStatus('error');
      }
    }, 400);
  };

  // Immediate save to cloud (called on photo uploads or explicit save button)
  const handleSaveActiveSiteImmediately = async (customSite?: PublicSite): Promise<void> => {
    const siteToSave = customSite || activeSite;
    setCloudStatus('syncing');
    try {
      await saveSiteToCloud(siteToSave);
      setCloudStatus('connected');
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.error('Immediate save to cloud failed:', err);
      setCloudStatus('error');
      throw err;
    }
  };

  // RSVP submission (by guest on public site or preview) -> Saved to Cloud
  const handleAddRsvpToGuestSite = async (newRsvp: GuestRsvp) => {
    // Optimistic update
    setSites((prevSites) =>
      prevSites.map((site) =>
        site.id === guestSite.id
          ? {
              ...site,
              rsvps: [newRsvp, ...site.rsvps.filter((r) => r.id !== newRsvp.id)],
            }
          : site
      )
    );

    // Persist to centralized cloud database
    try {
      await submitRsvpToCloud(guestSite.id, newRsvp);
      setLastSyncTime('Just now');
    } catch (err) {
      console.error('Failed to submit RSVP to cloud:', err);
    }
  };

  // Clear RSVPs on active site
  const handleClearActiveSiteRsvps = async () => {
    if (window.confirm('Are you sure you want to clear all guest RSVP responses for this site across all devices?')) {
      const currentRsvps = activeSite.rsvps;
      // Optimistic
      setSites((prevSites) =>
        prevSites.map((site) => (site.id === activeSite.id ? { ...site, rsvps: [] } : site))
      );
      // Delete in cloud
      try {
        for (const r of currentRsvps) {
          await deleteRsvpFromCloud(activeSite.id, r.id);
        }
      } catch (err) {
        console.error('Error clearing RSVPs in cloud:', err);
      }
    }
  };

  // Admin: Create new site -> Persist to Cloud
  const handleCreateNewSite = async (newSite: PublicSite) => {
    setSites((prev) => [newSite, ...prev]);
    setActiveSiteId(newSite.id);
    setCloudStatus('syncing');
    try {
      await saveSiteToCloud(newSite);
      setCloudStatus('connected');
    } catch (err) {
      console.error('Failed to create new site in cloud:', err);
      setCloudStatus('error');
    }
  };

  // Admin: Toggle publish status -> Persist to Cloud
  const handleTogglePublish = async (siteId: string) => {
    const targetSite = sites.find((s) => s.id === siteId);
    if (!targetSite) return;

    const updatedSite: PublicSite = {
      ...targetSite,
      isPublished: !targetSite.isPublished,
      publishedAt: !targetSite.isPublished
        ? new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : targetSite.publishedAt,
    };

    setSites((prev) => prev.map((s) => (s.id === siteId ? updatedSite : s)));

    try {
      await saveSiteToCloud(updatedSite);
    } catch (err) {
      console.error('Failed to toggle publish in cloud:', err);
    }
  };

  // Admin: Delete site -> Remove from Cloud
  const handleDeleteSite = async (siteId: string) => {
    const remaining = sites.filter((s) => s.id !== siteId);
    if (remaining.length > 0) {
      setSites(remaining);
      setActiveSiteId(remaining[0].id);
    }
    try {
      await deleteSiteFromCloud(siteId);
    } catch (err) {
      console.error('Failed to delete site from cloud:', err);
    }
  };

  // Admin: Delete specific RSVP -> Remove from Cloud
  const handleDeleteRsvpFromSite = async (siteId: string, rsvpId: string) => {
    setSites((prev) =>
      prev.map((s) =>
        s.id === siteId
          ? {
              ...s,
              rsvps: s.rsvps.filter((r) => r.id !== rsvpId),
            }
          : s
      )
    );
    try {
      await deleteRsvpFromCloud(siteId, rsvpId);
    } catch (err) {
      console.error('Failed to delete RSVP from cloud:', err);
    }
  };

  // Admin: Clear all RSVPs for specific site
  const handleClearSiteRsvps = async (siteId: string) => {
    if (window.confirm('Are you sure you want to clear all RSVPs for this site across all devices?')) {
      const site = sites.find((s) => s.id === siteId);
      if (site) {
        setSites((prev) => prev.map((s) => (s.id === siteId ? { ...s, rsvps: [] } : s)));
        try {
          for (const r of site.rsvps) {
            await deleteRsvpFromCloud(siteId, r.id);
          }
        } catch (err) {
          console.error('Failed to clear RSVPs in cloud:', err);
        }
      }
    }
  };

  // Navigation helpers
  const openGuestMode = (slug?: string) => {
    const targetSlug = slug || activeSite.slug;
    const newUrl = `${window.location.pathname}?site=${targetSlug}&view=guest`;
    window.history.pushState({ view: 'guest' }, '', newUrl);
    setCurrentUrlParams(new URLSearchParams(`?site=${targetSlug}&view=guest`));
  };

  const closeGuestMode = () => {
    window.history.pushState({}, '', window.location.pathname);
    setCurrentUrlParams(new URLSearchParams(''));
  };

  // If in pure Public Guest View mode, render dedicated distraction-free invitation
  if (isGuestMode) {
    return (
      <div className="w-full min-h-screen">
        <PublicGuestView
          data={guestSite.data}
          guestRsvps={guestSite.rsvps}
          onAddRsvp={handleAddRsvpToGuestSite}
          onOpenBuilder={() => {
            if (isAdminLoggedIn) {
              closeGuestMode();
            } else {
              setIsLoginModalOpen(true);
            }
          }}
          isAdminLoggedIn={isAdminLoggedIn}
          onLogout={handleAdminLogout}
          isPublished={guestSite.isPublished}
          passwordProtected={guestSite.passwordProtected}
          sitePassword={guestSite.password}
          siteTitle={guestSite.title}
        />

        {/* Admin Login Modal (if host triggers login from public guest page) */}
        <AdminLoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onLoginSuccess={() => {
            setIsAdminLoggedIn(true);
            setIsLoginModalOpen(false);
            closeGuestMode();
          }}
          savedUsername={adminCreds.username}
          savedPasswordHash={adminCreds.passwordHash}
          canCancel={true}
        />
      </div>
    );
  }

  // If not logged in and on Admin page, show Admin Login Portal
  if (!isAdminLoggedIn) {
    return (
      <div
        className="w-full min-h-screen flex flex-col items-center justify-center p-4 font-montserrat relative select-none"
        style={{
          backgroundColor: activeSite.data.secondaryColor || '#F7F4EE',
          backgroundImage: `radial-gradient(ellipse at 50% 15%, #FFFFFF 20%, ${activeSite.data.secondaryColor} 70%, #EDE6DA 100%)`,
        }}
      >
        <AdminLoginModal
          isOpen={true}
          onClose={() => openGuestMode()}
          onLoginSuccess={() => {
            setIsAdminLoggedIn(true);
          }}
          savedUsername={adminCreds.username}
          savedPasswordHash={adminCreds.passwordHash}
          canCancel={true}
        />

        {/* Escape link for guests who landed on root */}
        <div className="mt-4 text-center z-10">
          <button
            onClick={() => openGuestMode()}
            className="text-xs text-stone-500 hover:text-stone-800 underline transition-colors cursor-pointer"
          >
            ← View Public Guest Invitation
          </button>
        </div>
      </div>
    );
  }

  // Admin Studio Mode (Authenticated)
  return (
    <div className="w-full h-screen flex flex-col bg-stone-100 overflow-hidden font-montserrat text-stone-900">
      {/* Top Bar Navigation (Following Top Bar Contract: 3 zones, single line) */}
      <header className="h-14 bg-white border-b border-stone-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        {/* Zone 1: Brand title with delicate sacred cross icon & cloud status */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${activeSite.data.accentColor}20` }}
          >
            <SacredCrossIcon color={activeSite.data.accentColor} className="w-3.5 h-4.5" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-stone-900 truncate">
              Blessed Milestones
            </h1>
            {/* Live Cloud Sync Indicator */}
            <div
              className={`hidden md:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                cloudStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : cloudStatus === 'syncing'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
              title="Centralized database shared live across all browsers and devices"
            >
              <Cloud className="w-2.5 h-2.5 shrink-0" />
              <span>
                {cloudStatus === 'connected'
                  ? 'Cloud Synced'
                  : cloudStatus === 'syncing'
                  ? 'Syncing...'
                  : 'Reconnecting'}
              </span>
              {cloudStatus === 'connected' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links / Admin Controls & Mobile Segmented View */}
        <div className="md:hidden flex items-center bg-stone-100 p-0.5 rounded-xl text-xs">
          <button
            onClick={() => setMobileActiveView('editor')}
            className={`px-3 py-1 font-semibold rounded-lg flex items-center gap-1 transition-all ${
              mobileActiveView === 'editor'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Studio</span>
          </button>
          <button
            onClick={() => setMobileActiveView('preview')}
            className={`px-3 py-1 font-semibold rounded-lg flex items-center gap-1 transition-all ${
              mobileActiveView === 'preview'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Preview</span>
          </button>
        </div>

        <nav className="hidden md:flex items-center gap-3 text-xs font-medium text-stone-600">
          {/* Admin Multi-Site Manager Trigger */}
          <button
            onClick={() => setIsAdminSiteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors font-semibold cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-stone-600" />
            <span>Sites ({sites.length})</span>
            <span className="text-[10px] text-stone-400 font-mono">/{activeSite.slug}</span>
          </button>

          <span className="text-stone-300">·</span>

          {/* Quick Publish Toggle Button */}
          <button
            onClick={() => handleTogglePublish(activeSite.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
              activeSite.isPublished
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
            title="Click to toggle publish status"
          >
            {activeSite.isPublished ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Public Site: Live</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <span>Site: Draft (Offline)</span>
              </>
            )}
          </button>

          <span className="text-stone-300">·</span>
          <span className="text-stone-500 truncate max-w-xs">{activeSite.data.babyName}&apos;s Celebration</span>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2">
          {/* Admin All RSVPs Button */}
          <button
            onClick={() => setIsAdminRsvpModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors cursor-pointer"
            title="View all guest RSVP responses across all public sites"
          >
            <Heart className="w-3.5 h-3.5 fill-rose-500/20 text-rose-600" />
            <span>RSVPs ({totalAllRsvpsCount})</span>
          </button>

          {/* Admin Sites Button */}
          <button
            onClick={() => setIsAdminSiteModalOpen(true)}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors cursor-pointer"
            title="Create and manage public sites for guests"
          >
            <Shield className="w-3.5 h-3.5 text-stone-600" />
            <span>Admin Sites</span>
          </button>

          {/* Admin Credentials Button */}
          <button
            onClick={() => setIsAdminSecurityModalOpen(true)}
            className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/60 transition-colors cursor-pointer"
            title="Manage admin login credentials (synced in cloud)"
          >
            <Key className="w-3.5 h-3.5 text-amber-700" />
            <span>Admin Access</span>
          </button>

          {/* Public Guest View Link */}
          <button
            onClick={() => openGuestMode()}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-stone-600" />
            <span>View as Guest</span>
          </button>

          {/* Publish & Share Button */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-xl text-white shadow-xs transition-all hover:opacity-95 active:scale-95 cursor-pointer"
            style={{ backgroundColor: activeSite.data.accentColor }}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Publish &amp; Share</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={handleAdminLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-600 border border-stone-200 transition-colors cursor-pointer"
            title="Logout from Admin Studio"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Workspace: Left Builder Sidebar + Right Preview Frame */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar: Customization Controls (Hidden on mobile if preview tab active) */}
        <aside
          className={`w-full md:w-[420px] lg:w-[460px] h-full shrink-0 ${
            mobileActiveView === 'editor' ? 'block' : 'hidden md:block'
          }`}
        >
          <BuilderSidebar
            data={activeSite.data}
            onChange={handleUpdateActiveSiteData}
            onSaveNow={handleSaveActiveSiteImmediately}
            isSaving={cloudStatus === 'syncing'}
            lastSyncTime={lastSyncTime}
            guestRsvps={activeSite.rsvps}
            onOpenShare={() => setIsShareModalOpen(true)}
            onClearRsvps={handleClearActiveSiteRsvps}
          />
        </aside>

        {/* Right Live Preview: Interactive Phone / Desktop Canvas */}
        <section
          className={`flex-1 h-full ${
            mobileActiveView === 'preview' ? 'block' : 'hidden md:block'
          }`}
        >
          <PreviewFrame
            data={activeSite.data}
            guestRsvps={activeSite.rsvps}
            onAddRsvp={handleAddRsvpToGuestSite}
            isGuestMode={false}
            onToggleGuestMode={() => openGuestMode()}
          />
        </section>
      </main>

      {/* Share & QR Code Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        data={activeSite.data}
        siteSlug={activeSite.slug}
        customUrl={activeSite.customUrl}
        onOpenGuestView={() => openGuestMode()}
      />

      {/* Admin Multi-Site Manager Console Modal */}
      <AdminSiteManagerModal
        isOpen={isAdminSiteModalOpen}
        onClose={() => setIsAdminSiteModalOpen(false)}
        sites={sites}
        activeSiteId={activeSite.id}
        onSelectSite={(id) => {
          setActiveSiteId(id);
          setIsAdminSiteModalOpen(false);
        }}
        onCreateSite={handleCreateNewSite}
        onTogglePublish={handleTogglePublish}
        onUpdateSiteConfig={async (id, updates) => {
          const target = sites.find((s) => s.id === id);
          if (target) {
            const updated = { ...target, ...updates };
            setSites((prev) => prev.map((s) => (s.id === id ? updated : s)));
            try {
              await saveSiteToCloud(updated);
            } catch (err) {
              console.error('Error updating site config in cloud:', err);
            }
          }
        }}
        onDeleteSite={handleDeleteSite}
        onOpenPublicSite={(slug) => {
          setIsAdminSiteModalOpen(false);
          openGuestMode(slug);
        }}
        onOpenRsvpsModal={() => {
          setIsAdminSiteModalOpen(false);
          setIsAdminRsvpModalOpen(true);
        }}
        onOpenSecurityModal={() => {
          setIsAdminSiteModalOpen(false);
          setIsAdminSecurityModalOpen(true);
        }}
      />

      {/* Admin All RSVPs Response Management Dashboard Modal */}
      <AdminRsvpDashboardModal
        isOpen={isAdminRsvpModalOpen}
        onClose={() => setIsAdminRsvpModalOpen(false)}
        sites={sites}
        activeSiteId={activeSite.id}
        onDeleteRsvp={handleDeleteRsvpFromSite}
        onClearSiteRsvps={handleClearSiteRsvps}
      />

      {/* Admin Security & Password Settings Modal */}
      <AdminSecurityModal
        isOpen={isAdminSecurityModalOpen}
        onClose={() => setIsAdminSecurityModalOpen(false)}
        currentUsername={adminCreds.username}
        currentPassword={adminCreds.passwordHash}
        onSaveCredentials={handleUpdateAdminCreds}
      />
    </div>
  );
}
