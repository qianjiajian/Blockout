/** User-supplied profile slices, copied byte-for-byte from the approved artwork. */
export const PROFILE_SUPPLIED_ART = {
  statsPanel: "assets/art/ui/profile-supplied-v2/stats-panel.png",
  editorPanel: "assets/art/ui/profile-supplied-v2/editor-panel.png",
  renamePanel: "assets/art/ui/profile-supplied-v2/rename-panel.png",
  titleZh: "assets/art/ui/profile-supplied-v2/title-zh.png",
  titleEn: "assets/art/ui/profile-supplied-v2/title-en.png",
  close: "assets/art/ui/profile-supplied-v2/close.png",
  idField: "assets/art/ui/profile-supplied-v2/id-field.png",
  statCard: "assets/art/ui/profile-supplied-v2/stat-card.png",
  statValue: "assets/art/ui/profile-supplied-v2/stat-value.png",
  statHighest: "assets/art/ui/profile-supplied-v2/stat-highest.png",
  statStars: "assets/art/ui/profile-supplied-v2/stat-stars.png",
  statRank: "assets/art/ui/profile-supplied-v2/stat-rank.png",
  editBadge: "assets/art/ui/profile-supplied-v2/edit-badge.png",
  editName: "assets/art/ui/profile-supplied-v2/edit-name.png",
  copy: "assets/art/ui/profile-supplied-v2/copy.png",
  sparkle: "assets/art/ui/profile-supplied-v2/sparkle.png",
  joined: "assets/art/ui/profile-supplied-v2/joined.png",
  avatarPage: "assets/art/ui/profile-supplied-v2/avatar-page.png",
  framePage: "assets/art/ui/profile-supplied-v2/frame-page.png",
  catalogPanel: "assets/art/ui/profile-supplied-v2/catalog-panel.png",
  tabButton: "assets/art/ui/profile-supplied-v2/tab-button.png",
  selected: "assets/art/ui/profile-supplied-v2/selected.png",
  saveButton: "assets/art/ui/profile-supplied-v2/save-button.png",
  renameButton: "assets/art/ui/profile-supplied-v2/rename-button.png",
  renameInput: "assets/art/ui/profile-supplied-v2/rename-input.png",
  coin: "assets/art/ui/profile-supplied-v2/coin.png",
} as const;

export type ProfileSuppliedArtKey = keyof typeof PROFILE_SUPPLIED_ART;
export type ProfileSuppliedArt = { [Key in ProfileSuppliedArtKey]: HTMLImageElement };
