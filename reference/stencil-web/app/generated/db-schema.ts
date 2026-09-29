import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

/** Table for the "answers" entity (Answers) */
export const answers = sqliteTable("answers", {
  id: text("id").primaryKey(),
  cardId: text("card_id").references((): AnySQLiteColumn => cards.id).notNull(),
  categoryName: text("category_name"),
  createdBy: text("created_by").notNull(),
  deckName: text("deck_name"),
  month: text("month").notNull(),
  photos: text("photos", { mode: "json" }),
  questionText: text("question_text").notNull(),
  reflected: integer("reflected", { mode: "boolean" }),
  text: text("text"),
  voiceDuration: real("voice_duration"),
  voiceMemo: text("voice_memo"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Table for the "cards" entity (Cards) */
export const cards = sqliteTable("cards", {
  id: text("id").primaryKey(),
  category: text("category"),
  createdBy: text("created_by").notNull(),
  deckId: text("deck_id").references((): AnySQLiteColumn => decks.id).notNull(),
  isCardOfDay: integer("is_card_of_day", { mode: "boolean" }),
  question: text("question").notNull(),
  sortOrder: real("sort_order"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Table for the "decks" entity (Decks) */
export const decks = sqliteTable("decks", {
  id: text("id").primaryKey(),
  artStyle: text("art_style"),
  createdBy: text("created_by").notNull(),
  description: text("description"),
  isCurrent: integer("is_current", { mode: "boolean" }),
  month: text("month"),
  name: text("name").notNull(),
  season: text("season"),
  sortOrder: real("sort_order"),
  type: text("type").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Table for the "monthly-notes" entity (Monthly notes) */
export const monthlyNotes = sqliteTable("monthly-notes", {
  id: text("id").primaryKey(),
  createdBy: text("created_by").notNull(),
  month: text("month").notNull(),
  photos: text("photos", { mode: "json" }),
  text: text("text"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Table for the "settings" entity (Settings) */
export const settings = sqliteTable("settings", {
  id: text("id").primaryKey(),
  birthday: text("birthday"),
  consentedAt: text("consented_at"),
  createdBy: text("created_by").notNull(),
  dailyReminder: integer("daily_reminder", { mode: "boolean" }),
  emailUpdates: integer("email_updates", { mode: "boolean" }),
  fullName: text("full_name"),
  onboardedAt: text("onboarded_at"),
  phone: text("phone"),
  reminderTime: text("reminder_time"),
  season: text("season"),
  textUpdates: integer("text_updates", { mode: "boolean" }),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

/** Type registry mapping slugs to row types */
export type EntityRegistry = {
  "answers": typeof answers.$inferSelect;
  "cards": typeof cards.$inferSelect;
  "decks": typeof decks.$inferSelect;
  "monthly-notes": typeof monthlyNotes.$inferSelect;
  "settings": typeof settings.$inferSelect;
};

/** Foreign keys per table: camelCase column → the referenced table's slug (from `x-ref`) */
export type EntityRefs = {
  "answers": { cardId: "cards" };
  "cards": { deckId: "decks" };
  "decks": {};
  "monthly-notes": {};
  "settings": {};
};

