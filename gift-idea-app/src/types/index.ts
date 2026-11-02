export type Occasion =
  | "Birthday"
  | "Anniversary"
  | "Christmas"
  | "Valentine's Day"
  | "Mother's Day"
  | "Father's Day"
  | "Wedding"
  | "Graduation"
  | "Housewarming"
  | "Just Because"
  | "Other";

export type Relationship =
  | "Partner / Spouse"
  | "Parent"
  | "Child"
  | "Sibling"
  | "Friend"
  | "Coworker"
  | "Boss"
  | "Other Family"
  | "Other";

export interface RecipientProfile {
  id: string;
  name: string;
  occasion: Occasion;
  relationship: Relationship;
  ageRange: string;
  interests: string;
  personality: string;
  budget: string;
  avoid: string;
  extraNotes: string;
  createdAt: string;
}

export interface GiftIdea {
  title: string;
  description: string;
  whyItFits: string;
  estimatedPrice: string;
  searchQuery: string;
  category: string;
}

export interface GenerateRequest {
  occasion: string;
  relationship: string;
  ageRange: string;
  interests: string;
  personality: string;
  budget: string;
  avoid: string;
  extraNotes: string;
  recipientName?: string;
}
