export type ThemePresetId = 'daylight' | 'ocean' | 'evening' | 'emirati';
export type LayoutColumns = 2 | 3;
export type ViewLayoutMode = 'grid' | 'list';
export type CardShapeStyle = 'rounded' | 'circle' | 'compact';
export type FontSizeScale = 'normal' | 'large' | 'xlarge';

export interface AppearanceConfig {
  themePreset: ThemePresetId;
  primaryAccent: string;
  columns: LayoutColumns;
  viewMode: ViewLayoutMode;
  cardStyle: CardShapeStyle;
  fontSize: FontSizeScale;
  showCategoriesBar: boolean;
  showFeaturedSection: boolean;
  showChannelLinks: boolean;
  showOriginalPdfButton: boolean;
}

export type ActivityModuleType =
  | 'qa_flashcards'
  | 'aqeedah_activities_pack'
  | 'adhkar_cards'
  | 'story_chapters'
  | 'problem_solution_guide'
  | 'smart_cards';

export type ThemeMotif =
  | 'ocean'
  | 'activities'
  | 'morning'
  | 'evening'
  | 'desert'
  | 'guide';

export interface QAItem {
  id: string;
  number: number;
  question: string;
  answer: string;
}

export interface DhikrItem {
  id: string;
  number: number;
  text: string;
  source?: string;
  repeatCount: number;
  repeatLabel?: string;
}

export interface StoryChapter {
  id: string;
  partLabel: string;
  title: string;
  paragraphs: string[];
  youtubeUrl?: string;
}

export interface StoryLesson {
  id: string;
  number: number;
  text: string;
  footnote?: string;
}

export interface ProblemSolutionData {
  intro: string;
  whyTitle: string;
  whyPoints: string[];
  mistakesTitle: string;
  mistakesPoints: string[];
  solutionTitle: string;
  solutionPoints: string[];
  scheduleLabel: string;
  rememberTitle: string;
  rememberLines: string[];
  expectTitle: string;
  firstDaysTitle: string;
  firstDaysPoints: string[];
  naturalNoteTitle: string;
  naturalNoteText: string;
  gradualTitle: string;
  gradualPoints: string[];
  closingQuote: string;
}

export interface SmartFlashcard {
  id: string;
  front: string;
  back: string;
}

export interface SmartQuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export interface SmartMatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface SmartSection {
  id: string;
  heading?: string;
  items: string[];
}

export interface SmartConvertedActivity {
  mode: 'flashcards' | 'quiz' | 'adhkar' | 'story' | 'checklist';
  verbatimTextBlocks: string[];
  sections: SmartSection[];
  flashcards: SmartFlashcard[];
  quizQuestions: SmartQuizQuestion[];
  matchingPairs?: SmartMatchingPair[];
  drawingPrompt?: string;
}

export interface ExternalLinkItem {
  label: string;
  url: string;
}

export interface MaterialItem {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  category: string;
  activityType: ActivityModuleType;
  accentColor: string;
  themeMotif: ThemeMotif;
  published: boolean;
  featured: boolean;
  order: number;
  sourceUrl?: string;
  sourceMimeType?: string;
  sourceFileName?: string;
  externalLinks?: ExternalLinkItem[];
  createdAt: string;
  qaItems?: QAItem[];
  dhikrItems?: DhikrItem[];
  storyChapters?: StoryChapter[];
  storyLessonsIntro?: string;
  storyLessonsHeading?: string;
  storyLessons?: StoryLesson[];
  problemSolution?: ProblemSolutionData;
  smartActivity?: SmartConvertedActivity;
}

export interface PlatformStore {
  appearance: AppearanceConfig;
  materials: MaterialItem[];
}
