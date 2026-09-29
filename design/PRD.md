# Product Requirements Document: Daily Few

Sep 26, 2026 · @Rossi

**Card content:** every deck, category and question lives in `Daily_Few_Card_Library.xlsx` (Cards tab), which is the source for loading content into the app.

## 1. Product Overview

**Product name:** Daily Few (working name)

**One-sentence description:** A free, solo-first reflection app where users pull question cards from themed decks, answer privately in writing, voice or photos, and look back on their answers month by month.

**Problem:** Meaningful self-reflection questions mostly live in physical card decks or scattered journaling prompts. Those only work in the moment, keep no record, and don't help people see how their thinking changes over time.

**Target users:** Adults (18+), primarily women, who want a guided, low-effort way to reflect on where they are in life. Users can be in any season of life, such as a new beginning, a transition, or a hard stretch.

**Core value proposition:**

- Pull a card and reflect in under a minute, or go deep with writing, voice memos and photos.
- Answers are fully private and build into a personal history, including how answers to the same question change over time.
- A new featured deck every month and life-season decks matched to what the user is going through.
- A monthly recap turns individual reflections into a record of the user's year.

**First deck:** "Somewhere in Between," 74 cards across 6 categories (Where You Started, Where You Are, What You're Carrying, What's Next, Connection, Body). Questions will be rewritten so they work at any time of year and for someone answering alone.

## 2. User Types & Roles

There are three kinds of people: visitors without an account, users, and one admin.

### Visitor (no account)

- **Description:** Someone who opened a shared card link but hasn't signed up.
- **Goals:** See the question a friend sent.
- **Permissions:** Can view only the single shared card. Cannot answer, browse decks, or see anything else.
- **Key actions:** View the shared card, then sign up on the website or get the app.

### User

- **Description:** A signed-up adult, 18 or older.
- **Goals:** Reflect privately, build a history of answers, and look back month by month.
- **Permissions:** Can browse all published decks, draw and answer cards, and manage only their own answers, monthly notes, profile, notification settings and account. Cannot see any other user's content.
- **Key actions:** Draw cards, answer or mark as reflected, skip, share a card by text, view card of the day, view answer history and monthly recaps, add monthly notes and photos, update season of life, delete account.

### Admin (single admin: the product owner)

- **Description:** The only person who manages content and sees business data.
- **Goals:** Publish and maintain decks, understand usage, and grow the user base.
- **Permissions:** Full control of decks, categories, cards and the season-of-life list. Can view user signup info and usage metrics, and export the user list. **Can never view any user's answers, voice memos, photos or monthly notes.**
- **Key actions:** Create, edit and archive content; assign monthly decks; manage seasons of life; view metrics; export users.

## 3. Core User Flows

### Flow A: Sign up

1. A new user taps "Start with me" on the landing page, or opens the app directly or from a shared card link.
2. **Step 1, name:** "First things first. What should we call you?" One field: first name. Button: "That's me."
3. **Step 2, season of life:** "Nice to meet you, \[Name\]. Where are you right now?" Subline: "No wrong answers. You can change this anytime." Large tappable options from the season list; one tap moves forward.
4. **Step 3, account details:** "Last thing. Let's keep your answers safe." Subline: "Your answers are private. Only you will ever see them." Fields: email (required), birthday (required), phone number (optional, labelled "for text updates"). Two consent checkboxes, both unchecked: email updates and text updates. Button: "Show me my first card."
5. If the birthday shows they are under 18, no account is created and they see: "This space is for adults 18 and up. We'd love to see you here when you're ready."
6. **Payoff:** "This one's for you, \[Name\]." The user goes straight to their first card, drawn from the life-season deck matching their chosen season (or the current monthly deck if that season has no deck). No tour or home screen first. If they arrived from a shared card, they land on that card instead.

### Flow B: Draw and answer a card

1. From home, the user picks a deck from the library.
2. They pick a category within that deck.
3. The app shows one random card from that category, choosing from cards they haven't answered yet first.
4. The user chooses one of:
   - **Skip:** a new random card appears. Unlimited.
   - **Mark as reflected:** they answered in their head. The card counts as answered, with no content saved.
   - **Answer:** they add any mix of written text, one voice memo (up to 5 minutes) and up to 3 photos, then save.
   - **Share:** send the card by text (Flow D).
5. If the card has past answers, the user sees them, dated and newest first, before adding a new one.
6. After saving, they can draw another card from the same category, switch categories, or go home.

### Flow C: Card of the day

1. Home shows today's card of the day, the same card for every user.
2. The user can answer it, mark it as reflected, or share it, exactly like any drawn card.
3. If they turned on the daily reminder, a push notification at their chosen time opens straight to this card.

### Flow D: Share a card by text

1. From any card, the user taps Share.
2. The phone's share options open with a prefilled message: the question text plus a link to the card.
3. The recipient taps the link:
   - **Has the app and is signed in:** the card opens in the app, ready to answer.
   - **Doesn't have the app:** they see the card on the website with a prompt to sign up there (or get the app once it launches). After signing up, they land on that card.
4. The share is recorded for the admin's "signups from shared links" metric.

### Flow E: Look back

1. The user opens their history.
2. They can browse by month or by card, and open any answer to view, edit or delete it.
3. During the current month they can add to that month's note (text and photos) at any time.
4. When a month ends, they get a push prompt to open that month's recap and add or edit their monthly note.

### Flow F: Manage profile and account

1. The user can edit their name, phone, season of life, marketing consent choices and daily reminder settings.
2. Changing season of life changes which life-season deck is recommended on home.
3. Delete account: the user confirms, and everything they created is permanently deleted.

## 4. Features & Functionality

### 4.1 Deck library

- **Purpose:** Let users find something to reflect on.
- **User actions:** Browse published decks, open a deck to see its categories, pick a category to draw from.
- **Information required:** Deck name, description, type (monthly, life-season or Body), categories, card counts.
- **Business rules:** Only published, non-archived decks appear. The current month's deck is featured at the top. The life-season deck matching the user's season of life is recommended on home. Past monthly decks remain in the library for everyone.
- **Result:** The user reaches a category and draws a card.
- **Edge cases:** A deck or category with no published cards is hidden. If no life-season deck matches the user's season, no recommendation is shown.

### 4.2 Card draw

- **Purpose:** Give the user one question at a time.
- **User actions:** Draw, skip, answer, mark as reflected, share.
- **Information required:** Which cards in the category the user has already answered.
- **Business rules:** Random pick from cards the user hasn't answered in that category. Once every card in the category is answered, all cards are back in the pool. Skips are unlimited, and a skipped card is not counted as answered. Skips are recorded for the "most skipped" metric.
- **Result:** One card on screen with its past answers (if any) and the actions above.
- **Edge cases:** A category with only one card shows that card again on skip. Archived cards are never drawn.

### 4.3 Answering

- **Purpose:** Capture a private reflection.
- **User actions:** Add written text, record one voice memo, attach photos, save; or tap "Mark as reflected."
- **Information required:** Answer content, date, the card, and the question wording at the time of answering.
- **Business rules:** An answer needs at least one of: text, voice memo, photo. Voice memo up to 5 minutes. Up to 3 photos per answer. A card can have unlimited answers over time, each dated. "Mark as reflected" creates a content-free answer that counts as answered. Users can edit or delete any of their answers at any time. Answers are visible only to their owner.
- **Result:** The answer is saved to the card's history and to the current month.
- **Edge cases:** Leaving mid-answer without saving discards it (confirm before discarding). A voice recording stops automatically at 5 minutes and stays saved.

### 4.4 Card of the day

- **Purpose:** A daily reason to open the app.
- **User actions:** View, answer, mark as reflected, share.
- **Business rules:** Picked automatically from the current month's deck. Same card for all users. Changes at midnight in each user's local time. A card can't be card of the day again within 90 days. If the month has no monthly deck, the pick comes from the full library.
- **Result:** Answers to card of the day are saved to that card's normal history.

### 4.5 Share by text

- **Purpose:** Spread questions and bring in new users.
- **User actions:** Tap Share on any card.
- **Business rules:** The message contains the question text and a link to that card. The link shows the card to anyone. Answering requires signing up, on the website or in the app. Only the question is shared, never the user's answer.
- **Result:** A signup that came through a shared link is counted as such.
- **Edge cases:** If a shared card is later archived, the link shows a message that the card is no longer available, plus the download prompt.

### 4.6 Answer history

- **Purpose:** Let users see how they've changed.
- **User actions:** Browse answers by month or by card, open, edit, delete.
- **Business rules:** Each answer displays the question as worded when answered. Archived cards and decks still appear in history.

### 4.7 Monthly notes and recap

- **Purpose:** The light tracker: capture a month's big moments and look back.
- **User actions:** Add or edit the current month's note (text and photos) any time; edit past months' notes; view past recaps.
- **Information required:** The month, note text, photos.
- **Business rules:** Each month has one note per user. When a month ends, a recap is generated showing number of cards answered, decks used, all that month's answers (tappable) and the monthly note. Recaps are kept permanently, browsable month by month.
- **Edge cases:** A month with no answers and no note still generates a recap, stating that nothing was recorded, with the option to add a note.

### 4.8 Season of life

- **Purpose:** Personalize which deck is recommended and give the admin audience insight.
- **Business rules:** Chosen at signup from the admin-managed list; editable any time in profile. Each season can be linked to one life-season deck.

### 4.9 Daily reminder

- **Purpose:** Build a habit.
- **Business rules:** Off by default. User turns it on and picks a time. Sent as a push notification that opens card of the day.

### 4.10 Account deletion

- **Purpose:** Give users full control of their private data.
- **Business rules:** Requires a confirmation step. Permanently deletes profile, answers, voice memos, photos and monthly notes. Anonymous usage totals remain in metrics. Cannot be undone.

### 4.11 Website version and landing page

- **Purpose:** Let people use the full product in a web browser now, before the iPhone app launches.
- **User actions:** Everything available in the app: sign up, browse decks, draw and answer cards, card of the day, share, history, monthly notes and recaps, profile and account deletion.
- **Landing page:** Visitors who aren't signed in see a dramatic, emotional landing page with one clear call to action to sign up (headline: "When's the last time someone asked about you?"; button: "Start with me"). It shows a sample card to demonstrate the experience.
- **Business rules:** Web and app share the same account, content and answers. Anything saved on one appears on the other. Once the app launches, the website shows a "Get the app" prompt, but the website stays fully usable.
- **Web differences:** Voice recording and photos use the browser's microphone and photo permissions. Push notifications on the web are less reliable, especially on iPhone browsers.
- **Open question:** Should web-only users get the daily reminder and month-end recap prompt by email instead of push?

### 4.12 Seasons of life and the Body section

**Season-of-life options at signup** (each links to one life-season deck):

| Season | Who it's for |
| --- | --- |
| Starting over | A fresh chapter after something ended |
| In a transition | Between two versions of life |
| Healing my heart | Heartbreak, a breakup, a friendship that ended |
| Grieving something | Loss of a person, a plan, or who you used to be |
| Running on empty | Burnout, giving more than you have |
| Building something | A career move, a business, a big goal |
| Falling in love | A new relationship, or opening up again |
| Becoming a mom | Pregnancy, new motherhood, or thinking about it |
| Figuring it out | Unsure what's next |
| Just checking in | Nothing big going on. Uses the current monthly deck; no deck of its own. |

**Body section:** a separate section of the deck library for understanding your body. Body decks are available to everyone and are never tied to a user's profile or signup.

| Body deck | What it explores |
| --- | --- |
| Listening to my body | Noticing signals, rest, trusting what you feel. Entry point for everyone. |
| My cycle | How your month actually feels, patterns you've noticed |
| Perimenopause and beyond | A changing body, identity, what you want from this stage |
| After baby | The postpartum body and meeting yourself again |
| Looking for answers | When something feels off and you're still connecting the dots |
| Energy and rhythm | When you feel most like yourself, what drains and refuels you |

**Rules:**

- Health topics never appear as season-of-life options, so no health information is attached to user profiles or the admin export.
- Body decks need at least 10 active cards to publish, like life-season decks.
- Every Body deck shows a short note: these questions are for reflection, not medical advice.
- Content guideline: no questions about food, weight or body size.
- Answers to Body decks are private like all answers. Marketing is never based on what users wrote.

## 5. Business Objects

The product tracks eight things. Only the admin creates content objects; only users create answers and notes.

| Object | Key information | Created / edited by | Visible to | Statuses |
| --- | --- | --- | --- | --- |
| User | Name, email, birthday, phone (optional), season of life, email consent, text consent, daily reminder on/off and time, signup date, whether they signed up via a shared link | User (admin can view signup info only) | Owner; admin (signup info only) | Active, Deleted |
| Deck | Name, description, type (Monthly, Life-season or Body), assigned month and year (monthly only), linked season of life (life-season only), categories | Admin | All users when published | Draft, Published, Archived |
| Category | Name, deck it belongs to, display order | Admin | All users when its deck is published | Active, Archived |
| Card | Question text, category, deck | Admin | All users when published; anyone via a shared link | Active, Archived |
| Answer | User, card, question wording at time of answering, date, text, voice memo, photos, or "reflected" flag | Owning user | Owning user only. Never the admin. | Saved, Deleted |
| Monthly note | User, month and year, text, photos | Owning user | Owning user only | (none) |
| Monthly recap | User, month and year, cards answered count, decks used, that month's answers, monthly note | Generated automatically at month end | Owning user only | (none) |
| Season of life | Name, linked life-season deck, display order | Admin | All users (as signup and profile options) | Active, Archived |

**Activity records** (for metrics only, anonymous in reports): card drawn, card skipped, card answered, card shared, card of the day answered, signup from a shared link, daily and monthly app opens.

**Relationships:** a deck has many categories; a category has many cards; a user has many answers; each answer belongs to one card; each user has one monthly note and one recap per month; each season of life links to at most one life-season deck.

## 6. Business Logic & Rules

### Eligibility and access

- Users must be 18 or older, based on birthday at signup. Under 18 is blocked and no account is created.
- An account is required for everything except viewing a single shared card.
- The app is free. There is no paid tier at launch.

### Privacy

- Answers, voice memos, photos, monthly notes and recaps are visible only to their owner.
- The admin can never view answer content, only anonymous usage counts.
- Shared links carry only the question, never an answer.

### Decks and content

- A monthly deck needs at least 31 active cards to be published and is assigned to one specific month and year. Only one monthly deck per month.
- A life-season deck needs at least 10 active cards to be published; 20 is a guideline, not a cap. The same applies to Body decks.
- When its month ends, a monthly deck stays in the library for all users and stops being featured.
- Draft decks are invisible to users.

### Drawing

- Draw randomly from the user's unanswered cards in the chosen category.
- When all cards in the category are answered by that user, every card becomes eligible again.
- "Answered" means the user saved an answer with content or tapped "Mark as reflected."
- Skips are unlimited and don't count as answered.

### Answers

- An answer contains at least one of text, a voice memo or a photo, or is a "reflected" mark.
- Maximum one voice memo of 5 minutes and 3 photos per answer.
- Unlimited dated answers per card per user.
- Each answer stores the question wording at the moment it was answered. If the admin later edits the card, old answers keep the old wording and future draws show the new wording.
- Users can edit or delete their own answers any time. Editing does not change the answer's original date.

### Card of the day

- Chosen automatically from the current month's monthly deck; the same card for every user.
- Rolls over at midnight in each user's local time.
- A card cannot be card of the day again within 90 days.
- If no monthly deck exists for the month, choose from all active cards in the library, still honouring the 90-day rule.

### Monthly notes and recaps

- One note per user per month, editable during and after the month.
- The recap is generated at the end of each month (user's local time) and kept permanently.

### Archiving

- Archived cards, categories and decks are removed from draws, the library and card of the day selection.
- They remain visible in users' history and recaps with answers intact.

### Season of life

- Each user has exactly one current season of life.
- The linked life-season deck is recommended on home; if the season has no linked deck, nothing is recommended.

### Marketing consent

- Email consent and text consent are separate, both unchecked by default, and changeable in the profile. Phone number is optional; text consent can only be given if a phone number is entered.
- Only users who opted in are marked as contactable for that channel in the admin export.

### Account deletion

- Permanently deletes the user's profile and all of their content after confirmation.
- Anonymous activity totals stay in metrics with no link to the person.

## 7. Admin Functionality

There is one admin, the product owner. The admin manages content and sees business data, never user reflections.

### Content management

- Create, edit and archive decks, including name, description and type (Monthly, Life-season or Body).
- For a monthly deck, assign the month and year. Block publishing if it has fewer than 31 active cards or if that month already has a monthly deck.
- For a life-season deck, link it to a season of life. Block publishing if it has fewer than 10 active cards. Body decks follow the same minimum, aren't linked to a season, and show the reflection-not-medical-advice note.
- Create, edit, reorder and archive categories within a deck.
- Create, edit and archive cards within a category, including moving a card to another category.
- Save decks as Draft before publishing.
- See, per deck, how many active cards it has and which months are covered by a monthly deck, so gaps are visible ahead of time.

### Season-of-life list

- Add, rename, reorder and archive seasons of life.
- Link each season to a life-season deck.
- Archiving a season removes it from the signup and profile options. Users already on it keep it until they change it.

### Users

- View a list of users with name, email, birthday, phone, season of life, signup date, whether they came from a shared link, and email and text consent status.
- Export the user list to a spreadsheet, including consent status for each channel.
- No access to any user's answers, voice memos, photos or notes.

### Metrics dashboard (MVP)

- **Growth:** total users; new signups over time (day, week, month); signups from shared links.
- **Engagement:** daily active users, monthly active users, cards answered per day.
- **Content:** most-answered cards, most-skipped cards, most-used decks and categories, and the percentage of active users who answered card of the day.

All metrics are counts and totals only.

## 8. Notifications & Automations

All user notifications are push notifications. There are two in the MVP.

| Trigger | Action | Who | MVP? |
| --- | --- | --- | --- |
| User's chosen reminder time each day (only if reminder is on) | Push: "Today's card is waiting." Opens card of the day. | Users who turned it on | Yes |
| Month ends (user's local time) | Generate that month's recap; push: "Your \[Month\] is ready. Take a look back." Opens the recap and monthly note. | All users | Yes |
| Midnight, user's local time | Card of the day changes (automatic, no notification) | All users | Yes |
| 1st of the month | Current monthly deck becomes featured; previous one stays in library (automatic, no notification) | All users | Yes |
| New monthly deck goes live | Push: new deck announcement | All users | Later (V1) |
| No app open for 7 days | Gentle re-engagement push | Inactive users | Later (V1) |
| One year since a card was answered | Push: revisit this card | Users with year-old answers | Later (V1) |

## 9. MVP Scope

### Must Have (MVP)

- Three-step signup (name; season of life; email, birthday and optional phone) ending on the user's first card; 18+ gate; separate email and text marketing consent.
- Deck library with monthly and life-season decks; featured monthly deck; recommended life-season deck.
- Draw flow: deck, then category, then random card, unanswered first, unlimited skips.
- Answering with any mix of text, voice memo (5 min) and photos (up to 3), or "Mark as reflected."
- Multiple dated answers per card; past answers shown on draw; edit and delete.
- Card of the day from the monthly deck, with the 90-day rule and library fallback.
- Share a card by text with a link; web view of the card for non-users; signup attribution. Full website version with a landing page (4.11).
- Answer history by month and by card.
- Monthly note (text and photos) and automatic monthly recap.
- Push notifications: daily reminder (opt-in, user-chosen time) and end-of-month recap prompt.
- Profile editing and permanent account deletion.
- Admin: content management with publishing rules, season-of-life list, user list and export, MVP metrics.

### Should Have (V1)

- Push notifications for new monthly decks, 7-day re-engagement and answer anniversaries.
- Secondary metrics: answer format mix, audience by season and age, most-shared cards.
- Users can download their own answers.

### Future

- Friends mode (playing together, in person or remotely).
- Full life tracker beyond monthly notes.
- Paid tier or premium decks.
- Admin override to schedule a specific card of the day on a specific date.
- Additional admins or content editors.

## 10. Edge Cases & Open Questions

### Edge cases (decided)

- **Under 18 at signup:** blocked, no account created.
- **Shared link to an archived card:** shows "no longer available" plus the download prompt.
- **Signed-in user taps a shared link:** opens the card directly in the app.
- **All cards in a category answered:** every card becomes eligible again.
- **Admin edits a card that has answers:** old answers keep the old wording.
- **Admin archives content with answers:** removed from draws and library; stays in users' history.
- **No monthly deck for the current month:** card of the day comes from the full library; nothing is featured.
- **Month with no activity:** recap still generated, showing nothing recorded, with the option to add a note.
- **Voice memo hits 5 minutes:** recording stops and is kept.
- **User leaves mid-answer:** confirm before discarding unsaved content.
- **Season with no linked deck:** no recommendation shown.

### Open questions

- [x] Write the 9 life-season decks and 6 Body decks. Drafted: see Daily_Few_Card_Library.xlsx (pending final review).
- [x] Rewrite the time- and room-specific "Somewhere in Between" questions. Drafted in Daily_Few_Card_Library.xlsx.
- [ ] Monthly deck content: October 2026 ("Let It Fall", 31 cards) is drafted; later months still needed.
- [ ] Final product name. "Daily Few" is a working name and matches the existing supplement brand; confirm whether the app is a brand extension or needs its own name.
- [ ] Timing of the daily reminder when it's first turned on (suggested default time).
- [ ] Whether the user can see their own simple stats (for example, cards answered this month) outside the recap.

## 11. Acceptance Criteria

**Signup**

- A user with a birthday showing age 18+ can create an account with name, season of life, email and birthday, with phone optional, and lands on their first card.
- A user under 18 cannot create an account.
- Email and text consent are separate checkboxes, unchecked by default, and saved correctly.

**Deck library**

- Only published, non-archived decks appear.
- The current month's deck is featured; last month's deck is still in the library.
- The life-season deck linked to the user's season appears as recommended.

**Card draw**

- Draws come only from the chosen category.
- A card the user has answered doesn't reappear until every card in that category is answered.
- Skipping any number of times always shows another card and never counts as answered.

**Answering**

- A user can save an answer with any combination of text, one voice memo up to 5 minutes, and up to 3 photos.
- "Mark as reflected" counts the card as answered with no content.
- Answering a card again adds a new dated answer; previous answers remain and are shown.
- Users can edit and delete their own answers.
- No other user and not the admin can view an answer.

**Card of the day**

- All users see the same card on the same date.
- It changes at local midnight and comes from the current monthly deck.
- No card repeats as card of the day within 90 days.
- With no monthly deck, it still shows a card from the library.

**Sharing**

- Share opens the phone's share options with the question and a working link.
- A non-user opening the link sees the card and a prompt to sign up on the website, and after signup lands on that card.
- The signup is counted as coming from a shared link.

**History, notes and recap**

- Users can browse their answers by month and by card, showing the wording as answered.
- Users can add to the current month's note at any time and edit past notes.
- At month end every user gets a recap and the push prompt; past recaps remain available.

**Notifications**

- The daily reminder is off by default, fires at the chosen time when on, and opens card of the day.

**Account deletion**

- After confirmation, all of the user's content is permanently removed and they can't sign back in to that account.

**Admin**

- A monthly deck with fewer than 31 cards, or a second deck for the same month, can't be published.
- A life-season deck with fewer than 10 cards can't be published.
- Editing or archiving a card doesn't change or remove any user's past answers.
- The user export includes signup info and consent status for each channel.
- The metrics dashboard shows all MVP growth, engagement and content metrics.
- The admin has no way to view answer content.
