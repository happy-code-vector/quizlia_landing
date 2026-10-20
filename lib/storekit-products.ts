// StoreKit product IDs → subscriptions field + plan tier.
// ⚠ Values MUST match Appconstants.swift (isProduct*Id) and
// planFromSubscriptions in lib/quota.ts. They are gitignored on the iOS
// side, so they are mirrored here explicitly.
export const PRODUCT_FIELD_BY_ID: Record<string, { field: string; plan: "individual" | "family" }> = {
  // isProductFamilyYearlyId:
  "com.quizliai.premium.family.yearly": { field: "family_yearly", plan: "family" },
  // isProductYearlyId (legacy annual):
  "com.test.QuickNote.premium.yearly": { field: "yearly", plan: "family" },
  // isProductYearlyDiscountId:
  "com.test.QuickNote.premium.discountyearly": { field: "yearlyOffer", plan: "family" },
  // isProductIndividualYearlyId:
  "com.quizliai.premium.individual.yearly": { field: "individual_yearly", plan: "individual" },
  // isProductLatestWeeklyId:
  "com.test.QuickNote.premium.weekly": { field: "weekly", plan: "individual" },
};
