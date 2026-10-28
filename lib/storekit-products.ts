// StoreKit product IDs → subscriptions field + plan tier.
// ⚠ Values MUST match Appconstants.swift (isProduct*Id) and
// planFromSubscriptions in lib/quota.ts. They are gitignored on the iOS
// side, so they are mirrored here explicitly.
//
// The ASC lineup REUSES existing products (no com.quizliai.* IDs were
// created): discountyearly IS Individual Annual, yearly IS Family Annual.
export const PRODUCT_FIELD_BY_ID: Record<string, { field: string; plan: "individual" | "family" }> = {
  // isProductFamilyYearlyId (the reused yearly product):
  "com.test.QuickNote.premium.yearly": { field: "family_yearly", plan: "family" },
  // isProductIndividualYearlyId (the reused discountyearly product):
  "com.test.QuickNote.premium.discountyearly": { field: "individual_yearly", plan: "individual" },
  // isProductLatestWeeklyId:
  "com.test.QuickNote.premium.weekly": { field: "weekly", plan: "individual" },
};
