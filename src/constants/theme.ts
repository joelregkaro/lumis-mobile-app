export const colors = {
  dark: {
    bg: { primary: "#0C1120", surface: "#1A1F35", elevated: "#242A42", input: "#1A1F35", border: "#242A4240" },
    brand: { purple: "#7C3AED", purpleLight: "#A78BFA", teal: "#2DD4BF", gold: "#F5C542" },
    text: { primary: "#EAEDF3", secondary: "#8B92A8", tertiary: "#5A6178" },
    bubble: { ai: "#1E2440", user: "#7C3AED" },
    status: { success: "#22C55E", warning: "#F59E0B", crisis: "#E07373" },
    gradient: { start: "#7C3AED", end: "#2DD4BF" },
    tab: { bg: "#0C1120", border: "#1A1F35", inactive: "#5A6178" },
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
  full: 9999,
} as const;

export const typography = {
  h1: { fontSize: 28, lineHeight: 33.6, fontFamily: "Inter-SemiBold" },
  h2: { fontSize: 22, lineHeight: 28.6, fontFamily: "Inter-SemiBold" },
  h3: { fontSize: 18, lineHeight: 25.2, fontFamily: "Inter-SemiBold" },
  body: { fontSize: 16, lineHeight: 25.6, fontFamily: "Inter" },
  chat: { fontSize: 16, lineHeight: 24, fontFamily: "Inter" },
  label: { fontSize: 13, lineHeight: 18.2, fontFamily: "Inter-Medium", textTransform: "uppercase" as const },
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
