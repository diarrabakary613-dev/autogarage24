/** Permessi granulari dello staff (tabella role_permissions). */
export const PERMISSIONS = [
  "users.view", "users.manage", "roles.manage", "roles.manage_admins", "listings.moderate", "professionals.verify",
  "reports.manage", "reviews.moderate", "support.manage", "content.manage", "neo_rules.manage", "field.manage",
  "categories.manage", "audit.view", "conversations.moderate", "stats.view", "plans.manage", "gdpr.manage",
  "acquisition.manage", "marketing.manage", "analytics.view",
  "offers.moderate", "services.manage", "insurance.manage", "valuations.manage", "bookings.manage", "business.manage", "settings.manage",
  "rewards.manage", "growth.manage", "seo.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
