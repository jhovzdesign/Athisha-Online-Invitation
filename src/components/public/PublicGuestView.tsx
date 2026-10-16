import React, { useState, useEffect } from 'react';
import { InvitationData, GuestRsvp } from '../../types/invitation';
import { CoverScreen } from '../invitation/CoverScreen';
import { InvitationView } from '../invitation/InvitationView';
import { invitationAudio } from '../../utils/audioPlayer';
import { SacredCrossIcon, GoldSparkleIcon } from '../common/DecorativeIcons';

interface PublicGuestViewProps {
  data: InvitationData;
  guestRsvps: GuestRsvp[];
  onAddRsvp: (rsvp: GuestRsvp) => void;
  onOpenBuilder?: () => void;
  isAdminLoggedIn?: boolean;
  onLogout?: () => void;
  isPublished?: boolean;
  passwordProtected?: boolean;
  sitePassword?: string;
  siteTitle?: string;
}

export const PublicGuestView: React.FC<PublicGuestViewProps> = ({
  data,
  guestRsvps,
  onAddRsvp,
  onOpenBuilder,
  isAdminLoggedIn = false,
  onLogout,
  isPublished = true,
  passwordProtected = false,
  sitePassword,
  siteTitle,
}) => {
  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(!passwordProtected);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  const handleOpenCover = () => {
    setIsCoverOpen(true);
    if (data.musicEnabled) {
      invitationAudio.play();
    }
  };

  const handleResetCover = () => {
    setIsCoverOpen(false);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sitePassword || enteredPassword === sitePassword) {
      setUnlocked(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  // Discreet keyboard shortcut for host/admin access from public view (Alt+A or Ctrl+Shift+A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === 'a') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a')) {
        onOpenBuilder?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenBuilder]);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-start relative overflow-x-hidden selection:bg-amber-100"
      style={{
        backgroundColor: data.secondaryColor || '#F7F4EE',
        backgroundImage: `radial-gradient(ellipse at 50% 0%, #FFFFFF 0%, ${data.secondaryColor} 65%, #EDE6DA 100%)`,
      }}
    >
      {/* Public view is kept clean and distraction-free without any admin bar */}

      {/* Desktop Presentation Ambiance: Soft floating light and delicate golden dust */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden hidden md:block">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full blur-3xl opacity-35"
          style={{ background: `radial-gradient(circle, ${data.accentColor}30, transparent 70%)` }}
        />
        <div className="absolute top-20 left-16 animate-sparkle opacity-25">
          <GoldSparkleIcon color={data.accentColor} className="w-6 h-6" />
        </div>
        <div className="absolute top-40 right-20 animate-sparkle opacity-25" style={{ animationDelay: '1.5s' }}>
          <GoldSparkleIcon color={data.accentColor} className="w-5 h-5" />
        </div>
        <div className="absolute bottom-24 left-24 animate-sparkle opacity-20" style={{ animationDelay: '2s' }}>
          <GoldSparkleIcon color={data.accentColor} className="w-6 h-6" />
        </div>
        <div className="absolute bottom-32 right-28 animate-sparkle opacity-20" style={{ animationDelay: '0.7s' }}>
          <GoldSparkleIcon color={data.accentColor} className="w-5 h-5" />
        </div>
      </div>

      {/* Invitation Core Container: Mobile (100% fluid) / Desktop (420px max centered) */}
      <div
        className="w-full max-w-[430px] min-h-screen relative flex flex-col md:my-6 md:rounded-[36px] shadow-2xl transition-all duration-300 md:border md:border-stone-200/80 overflow-hidden"
        style={{
          backgroundColor: data.primaryColor || '#FFFDF8',
        }}
      >
        {!isPublished ? (
          /* Unpublished / Draft Notice for Guests */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FFFDF8] font-montserrat">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-sm"
              style={{ background: `${data.accentColor}20` }}
            >
              <SacredCrossIcon color={data.accentColor} className="w-8 h-8" />
            </div>

            <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-stone-400 mb-2">
              BLESSED CELEBRATION
            </span>

            <h2 className="font-cormorant text-3xl font-bold text-stone-800 mb-2">
              Invitation Coming Soon
            </h2>

            <p className="text-xs text-stone-600 leading-relaxed max-w-xs mb-6">
              The Holy Baptism &amp; 1st Birthday invitation for{' '}
              <strong className="text-stone-800">{data.babyName}</strong> is currently being prepared with love by the family. Please check back shortly!
            </p>

            <button
              onClick={() => window.location.reload()}
              className="py-2.5 px-6 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer"
            >
              Check Again
            </button>
          </div>
        ) : !unlocked ? (
          /* Password Protection Gate */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FFFDF8] font-montserrat">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4 shadow-sm"
              style={{ background: `${data.accentColor}20` }}
            >
              <SacredCrossIcon color={data.accentColor} className="w-7 h-7" />
            </div>

            <h2 className="font-cormorant text-2xl font-bold text-stone-800 mb-1">
              Private Family Invitation
            </h2>

            <p className="text-xs text-stone-500 mb-4">
              Please enter the passcode provided by {data.babyName}&apos;s family to view the celebration details.
            </p>

            <form onSubmit={handlePasswordSubmit} className="w-full max-w-xs space-y-3">
              <input
                type="password"
                required
                placeholder="Enter invitation passcode"
                value={enteredPassword}
                onChange={(e) => setEnteredPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-center text-sm bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500/20"
              />
              {passwordError && (
                <p className="text-xs text-rose-600">Incorrect passcode. Please check with the family.</p>
              )}
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-white transition-opacity"
                style={{ backgroundColor: data.accentColor }}
              >
                Enter Invitation
              </button>
            </form>
          </div>
        ) : (
          /* Live Published Guest Experience */
          <>
            {/* Full-Screen Cover Screen */}
            <CoverScreen
              data={data}
              isOpen={isCoverOpen}
              onOpen={handleOpenCover}
            />

            {/* Main Sacred & Joyful Invitation Content */}
            <div className="w-full flex-1">
              <InvitationView
                data={data}
                onResetCover={handleResetCover}
                guestRsvps={guestRsvps}
                onAddRsvp={onAddRsvp}
              />
            </div>
          </>
        )}

        {/* Pure, Dignified Footer for Public Guests (No Admin Bar or Buttons) */}
        <div className="py-6 px-6 text-center border-t border-stone-200/50 bg-stone-50/60 font-montserrat text-[11px] text-stone-400 select-none">
          <div
            className="flex items-center justify-center gap-1.5 mb-1 opacity-70 cursor-default"
            onDoubleClick={() => onOpenBuilder?.()}
          >
            <SacredCrossIcon color={data.accentColor} className="w-3 h-3" />
            <span className="tracking-widest uppercase text-[10px]">Blessed Milestones</span>
          </div>
          <p className="font-light">
            Digital Invitation for {data.babyName}&apos;s Holy Baptism &amp; 1st Birthday
          </p>
        </div>
      </div>
    </div>
  );
};
