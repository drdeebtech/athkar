export type SectionId =
  | "daily"
  | "prayer"
  | "home"
  | "food"
  | "travel"
  | "distress"
  | "illness"
  | "nature"
  | "social"
  | "hajj"
  | "dhikr"
  | "ruqyah"
  | "misc";

export interface Zekr {
  readonly id: string;
  readonly text: string;
  readonly count: number;
  readonly virtue?: string;
  readonly reference?: string;
}

export interface Category {
  readonly id: number;
  readonly title: string;
  readonly sectionId: SectionId;
  readonly items: readonly Zekr[];
}

export interface Section {
  readonly id: SectionId;
  readonly title: string;
  readonly icon: string;
}

export interface SectionWithCategories extends Section {
  readonly categories: readonly Category[];
}
