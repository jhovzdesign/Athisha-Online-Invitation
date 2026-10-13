import React, { useState } from 'react';
import {
  InvitationData,
  TemplateStyle,
  FrameShape,
  FontHeading,
  FontScript,
  FontBody,
  Gender,
  GuestRsvp,
} from '../../types/invitation';
import { TEMPLATES, ASSET_IMAGES } from '../../utils/templates';
import {
  Sparkles,
  Palette,
  FileText,
  Users,
  Image,
  Calendar,
  Clock,
  Heart,
  Plus,
  Trash2,
  Check,
  Music,
  Download,
  Share2,
  Upload,
  Camera,
  AlertCircle,
  Save,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { compressAndReadImageFile } from '../../utils/imageUpload';

interface BuilderSidebarProps {
  data: InvitationData;
  onChange: (updated: InvitationData, saveImmediately?: boolean) => void;
  onSaveNow?: () => Promise<void>;
  isSaving?: boolean;
  lastSyncTime?: string;
  guestRsvps: GuestRsvp[];
  onOpenShare: () => void;
  onClearRsvps: () => void;
}

type TabType = 'invitation' | 'design' | 'family' | 'gallery' | 'rsvps';

export const BuilderSidebar: React.FC<BuilderSidebarProps> = ({
  data,
  onChange,
  onSaveNow,
  isSaving = false,
  lastSyncTime,
  guestRsvps,
  onOpenShare,
  onClearRsvps,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('invitation');
  const [isUploadingBabyPhoto, setIsUploadingBabyPhoto] = useState(false);
  const [isUploadingGalleryPhoto, setIsUploadingGalleryPhoto] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Hidden file input refs for 100% reliable programmatic click
  const babyPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const galleryPhotoInputRef = React.useRef<HTMLInputElement>(null);

  // Update helper
  const updateField = <K extends keyof InvitationData>(field: K, value: InvitationData[K]) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const showSaveSuccess = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 3500);
  };

  // Upload handler for main baby portrait photo (from file input or drop)
  const processAndApplyBabyPhoto = async (file: File) => {
    setIsUploadingBabyPhoto(true);
    setUploadError(null);
    setSaveSuccessMsg(null);

    try {
      const dataUrl = await compressAndReadImageFile(file, 600, 600, 0.76);
      if (!dataUrl) {
        throw new Error('Could not read image file. Please try a different photo.');
      }
      
      const updated = {
        ...data,
        babyPhotoUrl: dataUrl,
      };
      
      // Immediately reflect across UI and trigger cloud persistence
      onChange(updated, true);
      showSaveSuccess('Baby photo uploaded & saved to cloud database!');
    } catch (err: any) {
      console.error('Error uploading baby photo:', err);
      setUploadError(err?.message || 'Failed to process image file');
    } finally {
      setIsUploadingBabyPhoto(false);
      if (babyPhotoInputRef.current) {
        babyPhotoInputRef.current.value = '';
      }
    }
  };

  const handleBabyPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processAndApplyBabyPhoto(file);
    }
  };

  const handleDropBabyPhoto = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      processAndApplyBabyPhoto(file);
    }
  };

  // Upload handler for adding a new photo to the scrapbook gallery
  const handleGalleryPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingGalleryPhoto(true);
    setUploadError(null);
    setSaveSuccessMsg(null);

    try {
      const dataUrl = await compressAndReadImageFile(file, 600, 600, 0.75);
      if (!dataUrl) {
        throw new Error('Could not read image file.');
      }

      const newPhoto = {
        id: 'photo_' + Date.now(),
        url: dataUrl,
        caption: `Sweet Memory ${data.photos.length + 1}`,
        ageMonth: '',
      };
      const updated = {
        ...data,
        photos: [...data.photos, newPhoto],
      };
      onChange(updated, true);
      showSaveSuccess('New scrapbook photo uploaded and saved!');
    } catch (err: any) {
      console.error('Error uploading gallery photo:', err);
      setUploadError(err?.message || 'Failed to process image file');
    } finally {
      setIsUploadingGalleryPhoto(false);
      if (galleryPhotoInputRef.current) {
        galleryPhotoInputRef.current.value = '';
      }
    }
  };

  // Replace a specific gallery photo
  const handleReplaceGalleryPhoto = async (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    try {
      const dataUrl = await compressAndReadImageFile(file, 600, 600, 0.75);
      if (!dataUrl) return;

      const updatedPhotos = [...data.photos];
      updatedPhotos[idx] = {
        ...updatedPhotos[idx],
        url: dataUrl,
      };
      const updated = {
        ...data,
        photos: updatedPhotos,
      };
      onChange(updated, true);
      showSaveSuccess('Photo replaced and saved!');
    } catch (err: any) {
      console.error('Error replacing gallery photo:', err);
      setUploadError(err?.message || 'Failed to process image file');
    } finally {
      e.target.value = '';
    }
  };

  // Preset baby photos generated for the app
  const photoPresets = [
    {
      label: 'Baptism Christening Outfit',
      url: '/src/assets/images/baby_baptism_portrait_1791254793568.jpg',
    },
    {
      label: 'Sleeping Angel',
      url: '/src/assets/images/baby_sleeping_angel_1791254831082.jpg',
    },
    {
      label: 'Joyful 1-Year Teddy Memory',
      url: '/src/assets/images/baby_teddy_memory_1791254818642.jpg',
    },
    {
      label: 'Golden Cake Celebration',
      url: '/src/assets/images/baptism_cake_gold_1791254806162.jpg',
    },
  ];

  // Apply template
  const handleApplyTemplate = (tpl: TemplateStyle) => {
    onChange({
      ...data,
      templateId: tpl.id,
      primaryColor: tpl.theme.primaryColor,
      secondaryColor: tpl.theme.secondaryColor,
      accentColor: tpl.theme.accentColor,
      backgroundColor: tpl.theme.backgroundColor,
      cardBgColor: tpl.theme.cardBgColor,
      textColor: tpl.theme.textColor,
      subtextColor: tpl.theme.subtextColor,
      frameShape: tpl.theme.frameShape,
      fontHeading: tpl.theme.fontHeading,
      fontScript: tpl.theme.fontScript,
      fontBody: tpl.theme.fontBody,
    });
  };

  // Add Godparent
  const handleAddGodparent = () => {
    const newGp = {
      id: 'gp_' + Date.now(),
      name: 'New Sponsor',
      role: 'Godmother' as const,
      relationship: 'Friend',
    };
    updateField('godparents', [...data.godparents, newGp]);
  };

  // Remove Godparent
  const handleRemoveGodparent = (id: string) => {
    updateField(
      'godparents',
      data.godparents.filter((g) => g.id !== id)
    );
  };

  // Export RSVPs to CSV
  const handleExportRsvps = () => {
    if (guestRsvps.length === 0) return;
    const headers = ['Name', 'Attending', 'Message', 'Date'];
    const rows = guestRsvps.map((r) => [
      `"${r.name}"`,
      r.attending ? 'Yes' : 'No',
      `"${r.message || ''}"`,
      `"${r.submittedAt}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${data.babyName}_RSVP_List.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const attendingCount = guestRsvps.filter((r) => r.attending).length;

  return (
    <div className="w-full h-full flex flex-col bg-white border-r border-stone-200 font-montserrat select-none">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-stone-200 bg-stone-50/50 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] tracking-widest uppercase font-semibold text-amber-700 block">
              INVITATION DESIGN STUDIO
            </span>
            <h2 className="text-sm font-bold text-stone-800">
              {data.babyName}&apos;s Celebration
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {onSaveNow && (
              <button
                type="button"
                onClick={async () => {
                  await onSaveNow();
                  showSaveSuccess('All changes saved to centralized cloud database!');
                }}
                disabled={isSaving}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-800 bg-stone-100 hover:bg-stone-200 border border-stone-200 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                title="Save changes to cloud database"
              >
                <Save className="w-3.5 h-3.5 text-stone-600" />
                <span>{isSaving ? 'Saving...' : 'Save'}</span>
              </button>
            )}

            <button
              onClick={onOpenShare}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shadow-xs transition-all hover:opacity-95 active:scale-95 cursor-pointer"
              style={{ backgroundColor: data.accentColor }}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* Success / Status feedback notification */}
        {saveSuccessMsg && (
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fade-in shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium text-[11px]">{saveSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-5 p-1 bg-stone-100 border-b border-stone-200 text-xs">
        <button
          onClick={() => setActiveTab('invitation')}
          className={`py-2 px-1 text-center font-medium rounded-lg transition-all flex flex-col items-center gap-1 ${
            activeTab === 'invitation'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="text-[10px]">Event</span>
        </button>

        <button
          onClick={() => setActiveTab('design')}
          className={`py-2 px-1 text-center font-medium rounded-lg transition-all flex flex-col items-center gap-1 ${
            activeTab === 'design'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span className="text-[10px]">Design</span>
        </button>

        <button
          onClick={() => setActiveTab('family')}
          className={`py-2 px-1 text-center font-medium rounded-lg transition-all flex flex-col items-center gap-1 ${
            activeTab === 'family'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="text-[10px]">Family</span>
        </button>

        <button
          onClick={() => setActiveTab('gallery')}
          className={`py-2 px-1 text-center font-medium rounded-lg transition-all flex flex-col items-center gap-1 ${
            activeTab === 'gallery'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <Image className="w-4 h-4" />
          <span className="text-[10px]">Photos</span>
        </button>

        <button
          onClick={() => setActiveTab('rsvps')}
          className={`py-2 px-1 text-center font-medium rounded-lg transition-all flex flex-col items-center gap-1 relative ${
            activeTab === 'rsvps'
              ? 'bg-white text-stone-900 shadow-xs'
              : 'text-stone-500 hover:text-stone-900'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span className="text-[10px]">RSVP ({guestRsvps.length})</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* ========================================================================= */}
        {/* TAB 1: INVITATION & EVENT DETAILS                                         */}
        {/* ========================================================================= */}
        {activeTab === 'invitation' && (
          <div className="space-y-5">
            {/* Baby Information */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold tracking-wider uppercase text-stone-400">
                Baby &amp; Milestone
              </h3>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Baby&apos;s Full Name
                </label>
                <input
                  type="text"
                  value={data.babyName}
                  onChange={(e) => updateField('babyName', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:ring-1 focus:ring-stone-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Nickname / Call Name
                  </label>
                  <input
                    type="text"
                    value={data.babyNickname}
                    onChange={(e) => updateField('babyNickname', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">
                    Theme Affinity
                  </label>
                  <select
                    value={data.gender}
                    onChange={(e) => updateField('gender', e.target.value as Gender)}
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl bg-white"
                  >
                    <option value="boy">Little Prince (Boy)</option>
                    <option value="girl">Little Princess (Girl)</option>
                    <option value="neutral">Classic Neutral</option>
                  </select>
                </div>
              </div>

              {/* Baby Portrait Photo with Direct Upload */}
              <div className="space-y-3">
                <input
                  ref={babyPhotoInputRef}
                  type="file"
                  accept="image/*"
                  disabled={isUploadingBabyPhoto}
                  onChange={handleBabyPhotoUpload}
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = '';
                  }}
                  className="hidden"
                />

                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-stone-800">
                    Baby Portrait Photo
                  </label>
                  <button
                    type="button"
                    onClick={() => babyPhotoInputRef.current?.click()}
                    disabled={isUploadingBabyPhoto}
                    className="text-[11px] font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1 cursor-pointer hover:underline disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-700" />
                    <span>Upload from Device</span>
                  </button>
                </div>

                {uploadError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span className="font-medium">{uploadError}</span>
                  </div>
                )}

                {/* Upload Action Banner & Drag-and-Drop Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDropBabyPhoto}
                  className={`flex items-center gap-3.5 p-3.5 rounded-2xl border-2 transition-all ${
                    isDragging
                      ? 'border-amber-600 bg-amber-50/70 scale-[1.01]'
                      : 'border-dashed border-stone-300 bg-stone-50 hover:border-amber-500/80 hover:bg-stone-50/80'
                  }`}
                >
                  <div
                    onClick={() => babyPhotoInputRef.current?.click()}
                    className="relative w-18 h-18 rounded-2xl overflow-hidden shrink-0 border border-stone-200 bg-white shadow-xs cursor-pointer group"
                    title="Click to choose a new photo"
                  >
                    <img
                      key={data.babyPhotoUrl}
                      src={data.babyPhotoUrl}
                      alt="Baby Portrait"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[10px] font-medium">
                      <Camera className="w-4 h-4 mb-0.5" />
                      <span>Change</span>
                    </div>
                    {isUploadingBabyPhoto && (
                      <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-[9px] gap-1">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="block text-xs font-bold text-stone-900 truncate">
                        {data.babyPhotoUrl.startsWith('data:') ? 'Custom Uploaded Photo' : 'Current Portrait'}
                      </span>
                      {data.babyPhotoUrl.startsWith('data:') && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Active &amp; Saved
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 mb-2.5">
                      {isUploadingBabyPhoto ? 'Compressing and uploading photo...' : 'Click button below or drag and drop a photo here'}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => babyPhotoInputRef.current?.click()}
                        disabled={isUploadingBabyPhoto}
                        className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs active:scale-95 disabled:opacity-50"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>{isUploadingBabyPhoto ? 'Uploading...' : 'Choose / Upload Photo'}</span>
                      </button>

                      {data.babyPhotoUrl.startsWith('data:') && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = {
                              ...data,
                              babyPhotoUrl: photoPresets[0].url,
                            };
                            onChange(updated, true);
                            showSaveSuccess('Reset portrait to sample outfit.');
                          }}
                          className="text-[11px] text-stone-500 hover:text-rose-600 underline cursor-pointer px-1 py-1"
                        >
                          Reset to Sample
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preset Options */}
                <div className="pt-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                    Or Choose Sample Portrait
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {photoPresets.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...data,
                            babyPhotoUrl: p.url,
                          };
                          onChange(updated, true);
                          showSaveSuccess(`Applied ${p.label}`);
                        }}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          data.babyPhotoUrl === p.url
                            ? 'border-amber-600 ring-2 ring-amber-500/30'
                            : 'border-stone-200 opacity-75 hover:opacity-100 hover:border-stone-300'
                        }`}
                        title={p.label}
                      >
                        <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                        {data.babyPhotoUrl === p.url && (
                          <div className="absolute inset-0 bg-amber-700/35 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white stroke-[3]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Intro Invitation Message
                </label>
                <textarea
                  rows={2}
                  value={data.introText}
                  onChange={(e) => updateField('introText', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl resize-none"
                />
              </div>
            </div>

            {/* Baptism Ceremony */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-amber-800">
                <Calendar className="w-3.5 h-3.5" />
                <span>Holy Baptism Rite</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Date</label>
                  <input
                    type="text"
                    value={data.baptismDate}
                    onChange={(e) => updateField('baptismDate', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Time</label>
                  <input
                    type="text"
                    value={data.baptismTime}
                    onChange={(e) => updateField('baptismTime', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Church Name</label>
                <input
                  type="text"
                  value={data.baptismChurch}
                  onChange={(e) => updateField('baptismChurch', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Church Address</label>
                <input
                  type="text"
                  value={data.baptismAddress}
                  onChange={(e) => updateField('baptismAddress', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl"
                />
              </div>
            </div>

            {/* Birthday Reception */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase text-amber-800">
                <Clock className="w-3.5 h-3.5" />
                <span>1st Birthday Reception</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Date</label>
                  <input
                    type="text"
                    value={data.birthdayDate}
                    onChange={(e) => updateField('birthdayDate', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Time</label>
                  <input
                    type="text"
                    value={data.birthdayTime}
                    onChange={(e) => updateField('birthdayTime', e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Venue Name</label>
                <input
                  type="text"
                  value={data.birthdayVenue}
                  onChange={(e) => updateField('birthdayVenue', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Venue Address</label>
                <input
                  type="text"
                  value={data.birthdayAddress}
                  onChange={(e) => updateField('birthdayAddress', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl"
                />
              </div>
            </div>

            {/* Bible Verse */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <h3 className="text-xs font-bold tracking-wider uppercase text-stone-400">
                Inspirational Bible Verse
              </h3>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Verse Passage</label>
                <textarea
                  rows={2}
                  value={data.verseText}
                  onChange={(e) => updateField('verseText', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Citation</label>
                <input
                  type="text"
                  value={data.verseCitation}
                  onChange={(e) => updateField('verseCitation', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: DESIGN & TEMPLATES (8 Curated Visual Styles)                        */}
        {/* ========================================================================= */}
        {activeTab === 'design' && (
          <div className="space-y-6">
            {/* Template Selector Cards */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold tracking-wider uppercase text-stone-400">
                  Choose a Style (8 Themes)
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {TEMPLATES.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => handleApplyTemplate(tpl)}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      data.templateId === tpl.id
                        ? 'border-amber-600 bg-amber-50/40 ring-2 ring-amber-500/20'
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      {/* Color Bar */}
                      <div className="flex items-center gap-1.5 mb-2">
                        <span
                          className="w-4 h-4 rounded-full shadow-xs shrink-0"
                          style={{ backgroundColor: tpl.previewColor }}
                        />
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: tpl.theme.accentColor }}
                        />
                        <span
                          className="w-3 h-3 rounded-full shrink-0 border border-stone-200"
                          style={{ backgroundColor: tpl.theme.secondaryColor }}
                        />
                      </div>
                      <h4 className="text-xs font-bold text-stone-800 leading-tight">
                        {tpl.name}
                      </h4>
                      <p className="text-[10px] text-stone-500 mt-1 line-clamp-2 leading-snug">
                        {tpl.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      className={`mt-2.5 w-full py-1 rounded-lg text-[10px] font-semibold tracking-wide transition-colors ${
                        data.templateId === tpl.id
                          ? 'bg-amber-700 text-white'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {data.templateId === tpl.id ? 'Active' : 'Apply'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Frame Shape Selector */}
            <div className="pt-3 border-t border-stone-100">
              <label className="block text-xs font-bold tracking-wider uppercase text-stone-400 mb-2">
                Baby Photo Frame Shape
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {(['arch', 'oval', 'circle', 'scalloped', 'floral'] as FrameShape[]).map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => updateField('frameShape', shape)}
                    className={`py-2 px-1 text-center rounded-xl border text-[11px] font-medium capitalize transition-all ${
                      data.frameShape === shape
                        ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </div>

            {/* Color Swatches */}
            <div className="pt-3 border-t border-stone-100">
              <label className="block text-xs font-bold tracking-wider uppercase text-stone-400 mb-2">
                Accent Gold Swatches
              </label>
              <div className="flex items-center gap-2">
                {[
                  { name: 'Champagne Gold', val: '#C9A96A' },
                  { name: 'Antique Gold', val: '#B8924A' },
                  { name: 'Rose Gold', val: '#C49774' },
                  { name: 'Soft Olive', val: '#9A8E5C' },
                  { name: 'Muted Bronze', val: '#A87D43' },
                ].map((color) => (
                  <button
                    key={color.val}
                    onClick={() => updateField('accentColor', color.val)}
                    title={color.name}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      data.accentColor === color.val
                        ? 'border-stone-900 scale-110 shadow-sm'
                        : 'border-white hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.val }}
                  />
                ))}
              </div>
            </div>

            {/* Typography Selection */}
            <div className="pt-3 border-t border-stone-100 space-y-3">
              <label className="block text-xs font-bold tracking-wider uppercase text-stone-400">
                Font Pairings
              </label>

              <div>
                <span className="text-[11px] text-stone-600 block mb-1">Heading Style</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('fontHeading', 'cormorant')}
                    className={`p-2 rounded-xl border text-left font-cormorant text-base ${
                      data.fontHeading === 'cormorant'
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-800 border-stone-200'
                    }`}
                  >
                    Cormorant Garamond
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('fontHeading', 'playfair')}
                    className={`p-2 rounded-xl border text-left font-playfair text-sm ${
                      data.fontHeading === 'playfair'
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-800 border-stone-200'
                    }`}
                  >
                    Playfair Display
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-stone-600 block mb-1">Script Name Accent</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateField('fontScript', 'vibes')}
                    className={`p-2 rounded-xl border text-left font-vibes text-xl ${
                      data.fontScript === 'vibes'
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-800 border-stone-200'
                    }`}
                  >
                    Great Vibes
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField('fontScript', 'parisienne')}
                    className={`p-2 rounded-xl border text-left font-parisienne text-lg ${
                      data.fontScript === 'parisienne'
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-800 border-stone-200'
                    }`}
                  >
                    Parisienne
                  </button>
                </div>
              </div>
            </div>

            {/* Effects & Audio */}
            <div className="pt-3 border-t border-stone-100 space-y-2.5">
              <label className="block text-xs font-bold tracking-wider uppercase text-stone-400 mb-1">
                Ambient Effects &amp; Audio
              </label>

              <label className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl cursor-pointer">
                <span className="text-xs text-stone-700">Falling Soft Petals</span>
                <input
                  type="checkbox"
                  checked={data.showFloatingPetals}
                  onChange={(e) => updateField('showFloatingPetals', e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl cursor-pointer">
                <span className="text-xs text-stone-700">Soft Sparkles Animation</span>
                <input
                  type="checkbox"
                  checked={data.showSparkles}
                  onChange={(e) => updateField('showSparkles', e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-stone-50 rounded-xl cursor-pointer">
                <div className="flex items-center gap-2">
                  <Music className="w-3.5 h-3.5 text-stone-500" />
                  <span className="text-xs text-stone-700">Lullaby Harp Audio Player</span>
                </div>
                <input
                  type="checkbox"
                  checked={data.musicEnabled}
                  onChange={(e) => updateField('musicEnabled', e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
              </label>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: FAMILY & GODPARENTS (CIRCLE OF LOVE)                                */}
        {/* ========================================================================= */}
        {activeTab === 'family' && (
          <div className="space-y-5">
            {/* Parents */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold tracking-wider uppercase text-stone-400">
                Loving Parents
              </h3>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Father&apos;s Name</label>
                <input
                  type="text"
                  value={data.fatherName}
                  onChange={(e) => updateField('fatherName', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Mother&apos;s Name</label>
                <input
                  type="text"
                  value={data.motherName}
                  onChange={(e) => updateField('motherName', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Family Message</label>
                <textarea
                  rows={2}
                  value={data.parentsMessage}
                  onChange={(e) => updateField('parentsMessage', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl resize-none"
                />
              </div>
            </div>

            {/* Godparents List */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold tracking-wider uppercase text-stone-400">
                    Godparents ({data.godparents.length})
                  </h3>
                  <span className="text-[11px] text-stone-500">Circle of Love</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddGodparent}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              <div className="space-y-2">
                {data.godparents.map((gp, idx) => (
                  <div
                    key={gp.id}
                    className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-2"
                  >
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={gp.name}
                        onChange={(e) => {
                          const updated = [...data.godparents];
                          updated[idx].name = e.target.value;
                          updateField('godparents', updated);
                        }}
                        className="w-full px-2 py-1 text-xs bg-white border border-stone-200 rounded-lg font-medium"
                      />
                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={gp.role}
                          onChange={(e) => {
                            const updated = [...data.godparents];
                            updated[idx].role = e.target.value as 'Godmother' | 'Godfather' | 'Principal Sponsor';
                            updateField('godparents', updated);
                          }}
                          className="px-2 py-0.5 text-[11px] bg-white border border-stone-200 rounded-md"
                        >
                          <option value="Godmother">Godmother</option>
                          <option value="Godfather">Godfather</option>
                          <option value="Principal Sponsor">Principal Sponsor</option>
                        </select>
                        <input
                          type="text"
                          value={gp.relationship || ''}
                          placeholder="e.g. Aunt"
                          onChange={(e) => {
                            const updated = [...data.godparents];
                            updated[idx].relationship = e.target.value;
                            updateField('godparents', updated);
                          }}
                          className="px-2 py-0.5 text-[11px] bg-white border border-stone-200 rounded-md"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveGodparent(gp.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PHOTO MEMORIES & TIMELINE                                           */}
        {/* ========================================================================= */}
        {activeTab === 'gallery' && (
          <div className="space-y-5">
            {/* Gallery Photos with Upload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold tracking-wider uppercase text-stone-400">
                    Photo Scrapbook ({data.photos.length})
                  </h3>
                  <span className="text-[11px] text-stone-500">Milestone Memories</span>
                </div>

                <input
                  ref={galleryPhotoInputRef}
                  type="file"
                  accept="image/*"
                  disabled={isUploadingGalleryPhoto}
                  onChange={handleGalleryPhotoUpload}
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = '';
                  }}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => galleryPhotoInputRef.current?.click()}
                  disabled={isUploadingGalleryPhoto}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingGalleryPhoto ? 'Processing...' : 'Upload Photo'}</span>
                </button>
              </div>

              {uploadError && (
                <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-1.5 text-[11px] text-rose-700">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="space-y-2.5">
                {data.photos.map((photo, idx) => (
                  <div
                    key={photo.id}
                    className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center gap-3"
                  >
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-stone-200 group">
                      <img src={photo.url} alt="" className="w-full h-full object-cover" />
                      <label
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                        title="Click to replace photo"
                      >
                        <Camera className="w-4 h-4 text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleReplaceGalleryPhoto(idx, e)}
                          onClick={(e) => {
                            (e.target as HTMLInputElement).value = '';
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={photo.caption}
                        placeholder="Memory caption"
                        onChange={(e) => {
                          const updated = [...data.photos];
                          updated[idx].caption = e.target.value;
                          updateField('photos', updated);
                        }}
                        className="w-full px-2 py-1 text-xs bg-white border border-stone-200 rounded-lg"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={photo.ageMonth || ''}
                          placeholder="Tag (e.g. Month 8)"
                          onChange={(e) => {
                            const updated = [...data.photos];
                            updated[idx].ageMonth = e.target.value;
                            updateField('photos', updated);
                          }}
                          className="w-28 px-2 py-0.5 text-[10px] bg-white border border-stone-200 rounded-md"
                        />
                        <label className="text-[10px] text-amber-800 hover:text-amber-900 font-semibold cursor-pointer hover:underline flex items-center gap-1">
                          <Upload className="w-2.5 h-2.5" />
                          <span>Replace</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleReplaceGalleryPhoto(idx, e)}
                            onClick={(e) => {
                              (e.target as HTMLInputElement).value = '';
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const updated = data.photos.filter((_, pIdx) => pIdx !== idx);
                        onChange({ ...data, photos: updated }, true);
                        showSaveSuccess('Scrapbook photo removed.');
                      }}
                      className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Items */}
            <div className="space-y-3 pt-3 border-t border-stone-100">
              <h3 className="text-xs font-bold tracking-wider uppercase text-stone-400">
                Event Timeline Schedule
              </h3>
              <div className="space-y-2">
                {data.timelineItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.time}
                        onChange={(e) => {
                          const updated = [...data.timelineItems];
                          updated[idx].time = e.target.value;
                          updateField('timelineItems', updated);
                        }}
                        className="w-20 px-2 py-1 text-xs font-semibold bg-white border border-stone-200 rounded-lg"
                      />
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const updated = [...data.timelineItems];
                          updated[idx].title = e.target.value;
                          updateField('timelineItems', updated);
                        }}
                        className="flex-1 px-2 py-1 text-xs font-medium bg-white border border-stone-200 rounded-lg"
                      />
                    </div>
                    <input
                      type="text"
                      value={item.subtitle}
                      placeholder="Location/notes"
                      onChange={(e) => {
                        const updated = [...data.timelineItems];
                        updated[idx].subtitle = e.target.value;
                        updateField('timelineItems', updated);
                      }}
                      className="w-full px-2 py-0.5 text-[11px] bg-white border border-stone-200 rounded-md text-stone-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: GUEST RSVPS MANAGEMENT & STATS                                      */}
        {/* ========================================================================= */}
        {activeTab === 'rsvps' && (
          <div className="space-y-5">
            {/* RSVP Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-center">
                <span className="text-[10px] uppercase font-semibold text-stone-400 block">
                  Responses
                </span>
                <span className="text-xl font-bold text-stone-900 font-cormorant">
                  {guestRsvps.length}
                </span>
              </div>
              <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-center">
                <span className="text-[10px] uppercase font-semibold text-emerald-700 block">
                  Attending
                </span>
                <span className="text-xl font-bold text-emerald-900 font-cormorant">
                  {attendingCount}
                </span>
              </div>
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 text-center">
                <span className="text-[10px] uppercase font-semibold text-amber-700 block">
                  Declined
                </span>
                <span className="text-xl font-bold text-amber-900 font-cormorant">
                  {guestRsvps.filter((r) => !r.attending).length}
                </span>
              </div>
            </div>

            {/* Actions: Export & Reset */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportRsvps}
                disabled={guestRsvps.length === 0}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Guestlist CSV</span>
              </button>
              {guestRsvps.length > 0 && (
                <button
                  type="button"
                  onClick={onClearRsvps}
                  className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-stone-200"
                  title="Clear responses"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Guest list table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold tracking-wider uppercase text-stone-400">
                Confirmed Guests
              </h4>

              {guestRsvps.length === 0 ? (
                <div className="text-center py-8 px-4 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  <Heart className="w-6 h-6 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-stone-600">No RSVPs yet</p>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Test submitting an RSVP in the invitation preview to see it appear here!
                  </p>
                </div>
              ) : (
                guestRsvps.map((rsvp) => (
                  <div
                    key={rsvp.id}
                    className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-800">{rsvp.name}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          rsvp.attending
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-200 text-stone-600'
                        }`}
                      >
                        {rsvp.attending ? 'Attending' : 'Declined'}
                      </span>
                    </div>

                    {rsvp.message && (
                      <p className="text-[11px] italic text-stone-600 bg-white p-2 rounded-xl border border-stone-100">
                        &ldquo;{rsvp.message}&rdquo;
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
