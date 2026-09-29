// Generated — do not edit.
import type { AccessRules } from "~stencil/data/types";

export const accessRules: AccessRules = {
  "version": 1,
  "tables": {
    "answers": {
      "slug": "answers",
      "columns": {
        "id": "text",
        "card_id": "text",
        "category_name": "text",
        "created_by": "text",
        "deck_name": "text",
        "month": "text",
        "photos": "json",
        "question_text": "text",
        "reflected": "integer",
        "text": "text",
        "voice_duration": "real",
        "voice_memo": "text",
        "created_at": "text",
        "updated_at": "text"
      },
      "refs": {
        "card_id": "cards"
      },
      "access": {
        "read": [],
        "create": [],
        "update": [],
        "delete": [],
        "hidden": []
      }
    },
    "cards": {
      "slug": "cards",
      "columns": {
        "id": "text",
        "category": "text",
        "created_by": "text",
        "deck_id": "text",
        "is_card_of_day": "integer",
        "question": "text",
        "sort_order": "real",
        "created_at": "text",
        "updated_at": "text"
      },
      "refs": {
        "deck_id": "decks"
      },
      "access": {
        "read": [],
        "create": [],
        "update": [],
        "delete": [],
        "hidden": []
      }
    },
    "decks": {
      "slug": "decks",
      "columns": {
        "id": "text",
        "art_style": "text",
        "created_by": "text",
        "description": "text",
        "is_current": "integer",
        "month": "text",
        "name": "text",
        "season": "text",
        "sort_order": "real",
        "type": "text",
        "created_at": "text",
        "updated_at": "text"
      },
      "refs": {},
      "access": {
        "read": [],
        "create": [],
        "update": [],
        "delete": [],
        "hidden": []
      }
    },
    "monthly-notes": {
      "slug": "monthly-notes",
      "columns": {
        "id": "text",
        "created_by": "text",
        "month": "text",
        "photos": "json",
        "text": "text",
        "created_at": "text",
        "updated_at": "text"
      },
      "refs": {},
      "access": {
        "read": [],
        "create": [],
        "update": [],
        "delete": [],
        "hidden": []
      }
    },
    "settings": {
      "slug": "settings",
      "columns": {
        "id": "text",
        "birthday": "text",
        "consented_at": "text",
        "created_by": "text",
        "daily_reminder": "integer",
        "email_updates": "integer",
        "full_name": "text",
        "onboarded_at": "text",
        "phone": "text",
        "reminder_time": "text",
        "season": "text",
        "text_updates": "integer",
        "created_at": "text",
        "updated_at": "text"
      },
      "refs": {},
      "access": {
        "read": [],
        "create": [],
        "update": [],
        "delete": [],
        "hidden": []
      }
    }
  }
};
