# Daily Few app: layout spec

Frame: iPhone 390×844 pt. All values are pt (= CSS px). Token names are defined in `tokens/tokens.json`. The interactive prototype (`prototype/`) is the reference for every state below.

---

## 1. Global

**Theme.** The app is dark (`app.background` #280E1A) with a soft plum glow at the top and a sparse, static star field. Two surfaces are **light** on purpose: bottom sheets (pale cream #FEFCF2) and the shared-link web page. They mark moments that leave the private space.

**Screen scaffold.**
- Content is a vertical stack. Padding: top 64 (58 on screens with a back button), sides 22, bottom 124 (clears the nav).
- Gap between sections: 24–30.
- Each screen scrolls independently. Scroll resets to the top on navigation.

**Status bar.** 50 tall, cream text (dark on the shared web page). Dynamic Island: 122×35 at top 11.

**Bottom nav** (Home, Library, History, Profile; hidden on Sign up, Answer, Recap, Shared).
- Container: 100 tall, pinned to the bottom, background `app.navFade`, items `space-around`, top padding 22, side padding 18.
- Items are icon-only circles, 46Ø. Active: bg rgba(209,219,255,.16), icon lilac #D1DBFF. Inactive: transparent, icon cream @60%.
- Centre item "Pull a card" is a 54Ø solid pale-cream circle with a burgundy `plus` icon.
- Order and icons: `moon` Home · `layers` Library · `plus` Pull a card · `book-open` History · `user-round` Profile.
- Icons are 22, stroke 1.5.
- Every item needs an accessibility label.

**Section label (eyebrow).** Mono 10.5/500, tracking .16em, uppercase, cream @66%. Always sits 12–14 above its content.

**Buttons.**
| Variant | Spec |
|---|---|
| Primary on dark | Pill, pale cream #FEFCF2 fill, burgundy text, Jost 500 uppercase, tracking .04em. Height 54 (lg, 14px text) or 44 (md, 12px). Hover → cream #F4F0DC. Press → translateY(1px). Disabled → cream-300 fill, cream-500 text. |
| Outline on dark | Pill, 1px border cream @40%, cream text. Hover inverts: cream fill, burgundy text. |
| Round icon (dark) | 54Ø circle, 1px border cream @28%, 20 icon. Hover bg cream @8%. |
| Primary on light | Pill, burgundy #4C1C31 fill, pale cream text. Hover #6B2743. |
| Secondary on light | Pill, 1px burgundy border, burgundy text. Hover inverts. |
| Destructive (light) | Pill, 1px #9B2C2C border and text. Hover fills #9B2C2C. |

**Question card** (the core object, used on Home, Draw, Shared).
- Radius 24, background `gradient.card`, 1px border rgba(209,219,255,.32), padding 26, shadow `shadow.questionCard`.
- Three-row column, `space-between`, centred:
  - Top: submark (white, 26 wide, 85% opacity) or the category label.
  - Middle: question in `type.cardQuestion`, balanced wrap.
  - Bottom: the deck · category label, mono 10, tracking .18em, cream @80–82%.

**Toast.** Pill, top 58, centred. Pale cream fill, burgundy Jost 500 13. Shadow `shadow.toast`. Stays 2.2s. Copy is past tense, one clause ("Saved to September.").

**Bottom sheet.**
- Veil: `app.sheetVeil`.
- Sheet: pale cream, radius 28 on the top corners, padding 14/24/40, gap 18. Grabber 40×4 in cream-300.
- Title: display 30/300, burgundy.
- Tapping the veil closes the sheet.

**Motion.**
- Card change on Draw (skip or new draw): the current card fades to 0 and drops 14 over 180ms, the text swaps, then it fades and rises back in (opacity 240ms, transform 420ms, `easeOut`).
- Controls: 160ms `easeStandard`.
- Interactive cards lift 2 on hover or press-hold.

---

## 2. Screens

### 01 Sign up (`screens/01-signup.png`)
- Padding 72/24/48, gap 28.
- White wordmark, 20 tall, left.
- Only when the user arrived from a shared link: a banner (lilac tint 12%, radius 14, padding 12/14, `mail-open` icon) reading "Sign up and we'll open the card you were sent."
- Headline: display 44/1.04/300, "A few questions," + line break + italic "just for you." This roman-plus-italic pairing is used once only.
- Subhead: Jost 15/300, cream @78%.
- Fields (gap 18): Name, Email, Birthday (native date picker), Phone.
  - Label: mono eyebrow.
  - Input: 48 tall, radius 8, `app.inputBg`, `app.inputBorder`, Jost 16.
  - Error state: border #F2B8C6 with a 12px error line under the field.
- Season of life: wrapping chips. Pill, padding 9/14, Jost 13. Selected: lilac fill, burgundy text. Unselected: 1px border cream @24%.
- Consent: two custom checkboxes (20×20, radius 4), **both unchecked by default**. Checked: lilac fill with a burgundy `check`.
- Primary lg full-width "Create account". Below it, caption 12 centred: "You must be 18 or older. Your answers are only ever visible to you."
- **Validation copy:** "Add your name." · "That email is missing an @." · "Add your birthday." · "Add a 10-digit phone number." · "Pick the one that fits best right now."
- **Under 18:** the form is replaced by display 44 "Come back when you're *18.*", body "Daily Few is for adults 18 and older. We didn't create an account or keep any of your details.", and a "Back" button. No account is created.

### 02 Home (`screens/02-home.png`)
1. **Header row.** Left stack (gap 8): mono label "Saturday · Sep 26", then the greeting in display 34. Right: white submark, 30 wide.
2. **Month ring**, 286×286, centred.
   - One dot per day of the month, radius 128, starting at 12 o'clock and running clockwise.
   - Past day, reflected: 9Ø lilac.
   - Past day, not reflected: 9Ø cream @16%.
   - Future day: 9Ø, transparent fill, 1px border cream @28%.
   - Today: 16Ø with a 1px cream border and a glow (`0 0 0 4px rgba(209,219,255,.18), 0 0 18px rgba(209,219,255,.6)`).
   - Centre: lilac mono "September", display 52 "4 days", Jost 13 "until your September recap" (max width 150).
3. **Card of the day.**
   - Label row: "Card of the day" left; caption "Same card for everyone" right-aligned.
   - Question card, 300 tall.
   - Actions row (gap 10): primary lg "Answer" (flex 1), round `check` (Mark as reflected), round `send` (Share).
   - After answering today, the actions become a lilac-tint pill: `check` "Answered today" (or "Reflected today"), plus a text button "Add another".
4. **This month's deck.** Label, then a deck row card.
5. **For your season · {season}.** Label, then a deck row card. Hidden when the season has no linked deck.

**Deck row card.**
- Radius 20, `app.surface`, 1px `app.surfaceBorder`, padding 16, gap 18.
- Left art: a 62×86 stack of two cards, radius 10. The back card is rotated −8°. Monthly decks use `monthlyDeckArt`; life-season decks use `seasonDeckArt`.
- Right text: name in display 25, description Jost 13 @72%, lilac mono meta "MONTHLY · 31 CARDS".

### 03 Library (`screens/03-library.png`)
- Label "Library", then title display 38 "Pick a deck".
- **Segmented control.** Track pill `app.segmentedTrack`, padding 4. Segments 34 tall, mono 10.5 uppercase. Selected: pale cream fill, burgundy text. Segments: All / Monthly / Life season.
- **Deck tiles** (radius 22, surface, border, clipped):
  - Art band on top: 170 tall for the current monthly deck, 120 for the others. Deck name in display 30 at the bottom-left, padding 16/18.
  - Optional badge at top-left: pale cream pill, burgundy mono 10. Text is "This month" or "For your season".
  - Body (padding 14/18/18): description Jost 13, then lilac mono meta.
- Order: current month first, then the others. Only published decks with active cards appear.

### 04 Deck (`screens/04-deck.png`)
- **Full-bleed hero** in the deck's art gradient. Padding 60/22/28.
  - Back button: 40Ø, 1px border cream @30%, bg rgba(40,14,26,.2).
  - Then: mono type · tag, name in display 44, description Jost 15/300, mono meta "74 CARDS · 6 CATEGORIES".
- **"Choose a category"** list (gap 10). Each row: radius 18, padding 16/18.
  - Category name in display 23, `chevron-right` on the right.
  - Progress: a 3-tall bar (track cream @14%, fill lilac) with mono "3 of 13" beside it.

### 05 Draw (`screens/05-draw.png`)
- **Top bar.** Back 40Ø on the left. Centre is a tappable stack: mono deck name, Jost 15 category name, `chevron-down`. Tapping it opens the Switch category sheet.
- **Card stage**, 392 tall. Two back cards (rotated −5° and +4°, `cardStackBack1/2`) sit under the front question card (question 34, category label at top, submark at bottom). The card-change animation is in §1.
- **Actions.**
  - A row of three labelled round buttons (gap 34): `rotate-cw` Skip · `check` Reflected · `send` Share. Labels mono 10.
  - Then primary lg full-width "Answer".
- **After saving or reflecting**, the actions are replaced by a panel (lilac tint 10%, radius 22, padding 22):
  - Lilac check disc (34Ø) and display 26 "Saved to September." or "Marked as reflected."
  - Primary "Draw another".
  - Row: outline "Switch category" + ghost "Home".
- **Past answers** (only when they exist). Label "You've answered this 2 times", then rows (radius 16, padding 14/16): lilac mono date (44 wide) and a Jost 14 preview. Tapping a row opens the answer sheet. Newest first.

### 06 Answer (`screens/06-answer.png`), no nav
- **Top bar.** `x` close 40Ø; centre mono "New answer" (or "Edit answer").
- **Question panel.** Gradient brand, radius 22, padding 22. Mono deck · category, then question in display 27.
- **Text field.** Borderless textarea, min 170 tall, Jost 18/300. Placeholder "Write as much or as little as you want."
- **Voice memo.** Label "Voice memo · up to 5 min", then a pill row (1px border cream @16%, lilac while recording):
  - Record button: 46Ø. Idle: cream fill, burgundy `mic`. Recording: plum #8A365A fill, cream `square`.
  - 26 waveform bars (3 wide, gap 3). Lilac shows progress.
  - Mono timer "0:12 / 5:00".
  - `trash-2` appears once a recording exists.
  - Recording auto-stops at 5:00 and is kept, with the toast "Five minutes. Recording saved."
- **Photos.** Label "Photos · 1 of 3", then a 3-column grid of square slots (radius 16).
  - Filled slot: lilac tint 16% with a remove `x`.
  - Next empty slot: `plus` "Add".
  - Remaining slots: faint `image`.
- **Save.** Primary lg "Save answer", disabled until there's text, a voice memo or a photo. Under it: `lock` "Only you can see this."
- **Closing with unsaved content** opens the sheet "Discard this answer?" with primary "Keep going" and secondary "Discard".

### 07 Shared link, visitor web page (`screens/07-shared-web.png`)
- Light page (#FEFCF2).
- Safari-style URL pill: cream #F4F0DC, radius 12, 40 tall, showing `lock` and "dailyfew.app/c/…".
- Burgundy wordmark, centred; label "Someone sent you a question".
- Question card, 330 tall.
- Body 15: "Answer it privately in the Daily Few app. Your answer stays with you…"
- Primary (burgundy) lg "Get the app to answer" → sign up (the shared-link banner shows) → lands on that card.
- Link "Already have it? Open in app".
- **Archived card state (not drawn in the prototype):** swap the card for "This card is no longer available." and keep the download prompt.

### 08 History (`screens/08-history.png`)
- Label "Look back", title display 38 "Your history". Segmented control: By month / By card.
- **By month.** For each month: display 26 month name plus lilac mono "N answered".
  - **Current month:** the monthly note card (lilac tint 12%, radius 20, padding 18). Lilac mono "September note" with `pencil`, the note text in Jost 14, mono photo count. Tapping it opens the note sheet.
  - **Past months:** a recap card (gradient with a lilac corner glow, radius 20) with mono "Monthly recap", display 24 "Your August, looked back on", and `arrow-right`.
  - Answer rows (divider cream @10%, padding 14/4):
    - Date block, 34 wide: mono month (9.5) over display 24 day.
    - Question in display 19; preview Jost 13, 2-line clamp.
    - Lilac 14px format icons: `pen-line`, `mic`, `image`, `check` (reflected).
- **By card.** Rows (radius 18): question in display 20, lilac mono "2 ANSWERS · LAST SEP 24", `chevron-right`. Tapping a row opens that card on Draw with its full history.
- **Answer sheet.** Mono date · deck, question as worded when answered (display 28), text, voice pill (`play` + mm:ss), 84×84 photo thumbnails.
  - Buttons: primary "Edit", secondary "Delete".
  - Delete confirms with "Delete this answer?" and "It's removed from your history and recap. This can't be undone."

### 09 Monthly recap (`screens/09-recap.png`), no nav
- **Full-bleed hero:** `gradient.card` variant, padding 58/22/30.
  - Back button, then mono "Monthly recap · 2026".
  - Display 64/0.98: "Your" + line break + italic "August".
  - 2-column stat tiles (bg rgba(40,14,26,.28), radius 16, padding 14/16): display 40 number over mono label. Tiles: "Cards answered", "Decks used".
- **Month note:** label + Edit, note text in display 20/1.45, 2 photo slots (4:5, radius 20).
- **What you answered:** answer rows, same as History; tapping opens the answer sheet.
- **Empty month:** "Nothing recorded in {Month}." plus an "Add a note" button (not drawn).

### 10 Profile (`screens/10-profile.png`)
- **Header:** 64Ø gradient avatar with the initial (display 28), name in display 32, email Jost 13.
- **Season of life:** chips as on Sign up. Caption "Changes which deck we recommend on home." Changing it shows a toast naming the new recommendation.
- **Reminders and updates:** switch rows (divider cream @10%, padding 14/0).
  - Row text: Jost 15 label + 12 description.
  - Switch: 46×28 track, 22Ø knob. On: lilac track, burgundy knob. Off: cream @18% track, cream knob.
  - Rows: Daily reminder (reveals time chips 7:30 AM · 12:30 PM · 8:00 PM · 9:30 PM), Email updates, Text updates.
- **Account:** "Sign out" (`log-out`); "Delete account" in #F2B8C6 (`trash-2`).
  - Delete sheet: "Delete your account?" with body "This permanently deletes your profile, answers, voice memos, photos and monthly notes. It can't be undone."
  - Buttons: primary "Keep my account", destructive "Delete everything".

---

## 3. Sheets index
Discard answer · Share card (message-bubble preview of question + link, with "Only the question is shared. Never your answer.", then "Send by text" which opens the native share sheet in production, and "Preview what they'll see") · Answer detail · Delete answer · Monthly note (textarea, light input: 1px cream-300, radius 8, focus burgundy-500 + ring) · Switch category · Delete account.

## 4. Icons (Lucide, stroke 1.5)
moon, layers, plus, book-open, user-round, chevron-left, chevron-right, chevron-down, check, send, rotate-cw, x, mic, square, play, trash-2, image, lock, pencil, pen-line, arrow-right, log-out, mail-open, signal, wifi, battery-full (status bar only).

## 5. Copy rules
- Sentence case everywhere.
- Uppercase comes from styling only (labels, buttons).
- No em dashes, no emoji.
- Toasts are past tense, one clause.
- Never use: journey, empower, holistic, glow.

## 6. Behaviour notes tied to the PRD
- Draw picks a random unanswered card in the category. Once all are answered, the whole pool resets. Skip never counts as answered.
- "Mark as reflected" saves a content-free answer.
- Each answer stores the question wording at the time it was answered.
- The card of the day is the same for everyone and rolls over at local midnight.
- The ring shows the current month. Recap countdown = days left until the 1st.
