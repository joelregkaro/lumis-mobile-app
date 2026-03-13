export const colors = {
  dark: {
    bg: { primary: "#080B1A", surface: "rgba(18, 16, 40, 0.65)", elevated: "rgba(30, 25, 60, 0.7)", input: "rgba(18, 16, 40, 0.65)", border: "rgba(36, 42, 66, 0.25)" },
    brand: { purple: "#7C3AED", purpleLight: "#A78BFA", purpleFaint: "#C4B5FD", teal: "#2DD4BF", gold: "#F5C542", coral: "#EC5B13", mint: "#4ADE80", indigo: "#4338CA", violet: "#8B5CF6" },
    text: { primary: "#F0EEFF", secondary: "#9B97C0", secondaryLight: "#C4C9D9", tertiary: "#5A5680" },
    bubble: { ai: "rgba(20, 18, 48, 0.7)", user: "#6D28D9" },
    status: { success: "#22C55E", warning: "#F59E0B", crisis: "#E07373" },
    gradient: { start: "#7C3AED", end: "#2DD4BF" },
    tab: { bg: "rgba(8, 11, 26, 0.85)", border: "rgba(139, 92, 246, 0.1)", inactive: "#5A5680" },
    glass: { bg: "rgba(18, 16, 40, 0.75)", border: "rgba(139, 92, 246, 0.1)" },
    cosmic: { glow: "#7C3AED30", stardust: "#C4B5FD", nebula: "#312E81", base: "#080B1A" },
  },
  light: {
    bg: { primary: "#F8F6F3", surface: "#FFFFFF", elevated: "#F0EDE8" },
    brand: { purple: "#6C2BD9", purpleLight: "#7C3AED", teal: "#0D9488", gold: "#D4A574" },
    text: { primary: "#1A1A2E", secondary: "#5A5A6E", tertiary: "#8B8B9E" },
    bubble: { ai: "#F0EDE8", user: "#6C2BD9" },
    status: { success: "#16A34A", warning: "#D97706", crisis: "#C97B7B" },
    gradient: { start: "#6C2BD9", end: "#0D9488" },
  },
  mood: {
    struggling: "#8B7EC8",
    tough: "#A8A0D6",
    low: "#7E9CC7",
    neutral: "#B8C5D6",
    okay: "#94C5B5",
    good: "#A8D5BA",
    energized: "#C5D7A0",
    great: "#7CB8A0",
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  bento: 24,
  bentoSm: 16,
  full: 9999,
} as const;

export const bento = {
  gap: 16,
  radius: 24,
  radiusSm: 16,
  padding: 20,
} as const;

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  hero: {
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 6,
  },
} as const;

export const typography = {
  hero: { fontSize: 32, lineHeight: 38.4, fontWeight: "700" as const, letterSpacing: -0.5 },
  h1: { fontSize: 28, lineHeight: 33.6, fontFamily: "Inter-SemiBold" },
  h2: { fontSize: 22, lineHeight: 28.6, fontFamily: "Inter-SemiBold" },
  h3: { fontSize: 18, lineHeight: 25.2, fontFamily: "Inter-SemiBold" },
  body: { fontSize: 16, lineHeight: 25.6, fontFamily: "Inter" },
  bodySm: { fontSize: 15, lineHeight: 22, fontWeight: "500" as const },
  chat: { fontSize: 16, lineHeight: 24, fontFamily: "Inter" },
  caption: { fontSize: 12, fontWeight: "500" as const },
  label: { fontSize: 13, lineHeight: 18.2, fontFamily: "Inter-Medium", textTransform: "uppercase" as const },
  sectionLabel: { fontSize: 10, fontWeight: "700" as const, letterSpacing: 2 },
  stat: { fontSize: 32, lineHeight: 38.4, fontFamily: "Inter-Bold" },
  statLg: { fontSize: 48, lineHeight: 57.6, fontFamily: "Inter-Bold" },
} as const;

export const animation = {
  moodSelection: { duration: 300 },
  companionBounce: { duration: 400, damping: 0.6, response: 0.4 },
  messageAppear: { duration: 200 },
  typingIndicator: { minDuration: 1000, maxDuration: 3000 },
  quickReplyStagger: { duration: 250, stagger: 50 },
  sessionComplete: { duration: 1500 },
  milestoneConfetti: { duration: 2500 },
  insightReveal: { duration: 500, damping: 0.8 },
  progressFill: { duration: 1200 },
  companionGlowPulse: { duration: 4000 },
  shareCardGenerate: { duration: 800 },
  moodCalendarDot: { duration: 150 },
} as const;

export const chatSpec = {
  aiBubbleRadius: { topLeft: 4, topRight: 16, bottomRight: 16, bottomLeft: 16 },
  userBubbleRadius: { topLeft: 16, topRight: 4, bottomRight: 16, bottomLeft: 16 },
  maxBubbleWidthPercent: 0.8,
  bubblePaddingH: 12,
  bubblePaddingV: 10,
  sameSenderSpacing: 8,
  switchSenderSpacing: 20,
  companionAvatarSize: 32,
} as const;
