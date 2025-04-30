
export type AddonType = "Custom" | "Q&A" | "Poll" | "Quiz";

export interface AddonState {
  type: AddonType;
  isActive: boolean;
  data?: unknown;
}

export type ActiveAddons = Record<AddonType, AddonState>;

// Updated AddonType to include Quiz
// type AddonType = "Custom" | "Q&A" | "Poll" | "Quiz";

// interface AddonState {
//   type: AddonType;
//   isActive: boolean;
//   data?: unknown;
// }

// // Define the ActiveAddons type explicitly to avoid TypeScript errors
// type ActiveAddons = Record<AddonType, AddonState>;