import type { AppState } from './schema'

/**
 * Motivational quotes (US-064). The built-in pack is deliberately original and
 * UNATTRIBUTED: decision D5 forbids fabricated attributions, so rather than risk
 * mis-crediting a real person these are house lines written for the app. Users
 * may add their own (optionally attributed) quotes and disable any they dislike;
 * both live in user data and survive export/import.
 *
 * IDs are stable and append-only — never renumber, or a user's disabledIds would
 * silently re-enable the wrong quote.
 */

export interface Quote {
  id: string
  text: string
  author?: string
}

export const BUILTIN_QUOTES: Quote[] = [
  { id: 'q001', text: 'Show up before you feel ready — readiness is built, not found.' },
  { id: 'q002', text: 'The rep you almost skipped is the one that changes you.' },
  { id: 'q003', text: "Sweat now so tomorrow's you says thank you." },
  { id: 'q004', text: "Consistency is just discipline repeated until it's who you are." },
  { id: 'q005', text: 'Your only competition is the person you were yesterday.' },
  { id: 'q006', text: 'Press play — momentum starts the second you begin.' },
  { id: 'q007', text: 'Form first, ego last; the body keeps score honestly.' },
  { id: 'q008', text: 'Ninety days is short. Wasting one is shorter thinking.' },
  { id: 'q009', text: 'Rest is part of the work, not a break from it.' },
  { id: 'q010', text: 'Small reps, stacked daily, move mountains of you.' },
  { id: 'q011', text: "Discomfort is just growth you haven't finished yet." },
  { id: 'q012', text: "Don't count the days; make the days count you in." },
  { id: 'q013', text: "The mat doesn't care how you feel — step on it anyway." },
  { id: 'q014', text: 'Strong is a habit you rehearse, not a mood you wait for.' },
  { id: 'q015', text: 'Finish the set you started; half-reps build half a you.' },
  { id: 'q016', text: 'Motivation gets you dressed; discipline gets you done.' },
  { id: 'q017', text: 'Every drop of sweat is a vote for the body you want.' },
  { id: 'q018', text: "You can't skip today and still call it a streak." },
  { id: 'q019', text: "Breathe through the burn; it's shorter than the regret." },
  { id: 'q020', text: "Progress hides in the days you didn't want to train." },
  { id: 'q021', text: "Lift a little heavier than yesterday's excuse." },
  { id: 'q022', text: 'The plan works when you do; open it and move.' },
  { id: 'q023', text: 'Fatigue lies. Push one more clean rep and see.' },
  { id: 'q024', text: 'Your future is built in reps nobody claps for.' },
  { id: 'q025', text: 'Recovery earned is performance owed back to you.' },
  { id: 'q026', text: "Show the workout who's scheduling whom." },
  { id: 'q027', text: 'Doubt does push-ups too — outlast it.' },
  { id: 'q028', text: 'Day one or one day: pick the one that starts now.' },
  { id: 'q029', text: 'The hardest lift is the front door; open it.' },
  { id: 'q030', text: 'Chase form, not failure, and strength follows quietly.' },
  { id: 'q031', text: 'Tired is temporary; quitting stays on the scoreboard.' },
  { id: 'q032', text: "Train the body you have into the body you're becoming." },
  { id: 'q033', text: 'A missed rep beats a skipped session every time.' },
  { id: 'q034', text: 'Intensity is a choice you renew every round.' },
  { id: 'q035', text: "Water, sleep, reps — repeat until it's just who you are." },
  { id: 'q036', text: "The clock is neutral; your effort isn't." },
  { id: 'q037', text: 'Sore today, unstoppable by phase three.' },
  { id: 'q038', text: "You don't rise to your goals; you fall to your training." },
  { id: 'q039', text: 'Make peace with the burn and it becomes a friend.' },
  { id: 'q040', text: 'One honest set is worth ten you talked about.' },
  { id: 'q041', text: "Stack a good day on a good day; that's the whole secret." },
  { id: 'q042', text: 'The body adapts to what you repeat, so repeat the hard part.' },
  { id: 'q043', text: 'Quitting is loud; keep going quietly and win.' },
  { id: 'q044', text: 'Your excuses are in great shape from all that lifting.' },
  { id: 'q045', text: 'Effort you can’t see today shows up in the mirror later.' },
  { id: 'q046', text: 'Beat the version of you that wanted to sit back down.' },
  { id: 'q047', text: 'The last rep is where the workout actually starts.' },
  { id: 'q048', text: 'Show up ugly if you must, but show up.' },
  { id: 'q049', text: 'Strength is just consistency wearing muscle.' },
  { id: 'q050', text: "Don't negotiate with the snooze button; you'll lose." },
  { id: 'q051', text: 'Every phase forgets the pain and keeps the progress.' },
  { id: 'q052', text: "Train like tomorrow's you is watching — because they are." },
  { id: 'q053', text: "The grind isn't punishment; it's the price of proud." },
  { id: 'q054', text: 'Move today so age has to work harder to catch you.' },
  { id: 'q055', text: 'Sweat is just weakness filing its resignation.' },
  { id: 'q056', text: 'Commit to the rep, not the outcome, and both improve.' },
  { id: 'q057', text: 'You have exactly enough time to start right now.' },
  { id: 'q058', text: 'Comfort is a nice place that grows nothing.' },
  { id: 'q059', text: 'Do the work bored, do it tired, just do it daily.' },
  { id: 'q060', text: 'Big changes are small reps that refused to quit.' },
  { id: 'q061', text: 'The scale is a snapshot; your habits are the movie.' },
  { id: 'q062', text: 'Half-hearted still counts more than not at all.' },
  { id: 'q063', text: 'Your body believes what your reps tell it.' },
  { id: 'q064', text: 'Push play, push limits, push past the story in your head.' },
  { id: 'q065', text: 'Momentum is expensive to build and cheap to keep — keep it.' },
  { id: 'q066', text: 'Earn the shower.' },
  { id: 'q067', text: 'The plan is patient; be stubborn right back.' },
  { id: 'q068', text: 'Turn “I can’t” into “I can’t yet,” then bury the “yet.”' },
  { id: 'q069', text: 'Strong mornings are just decisions made the night before.' },
  { id: 'q070', text: 'Nobody regrets the workout they finished.' },
  { id: 'q071', text: 'Let the sweat do the talking today.' },
  { id: 'q072', text: 'Trade the excuse for a rep; the exchange rate is generous.' },
  { id: 'q073', text: 'Choose what you want most, not what you want this minute.' },
  { id: 'q074', text: "The reps don't know you're tired; keep them honest." },
  { id: 'q075', text: 'Start slow, start ugly, but start.' },
  { id: 'q076', text: 'Every recovery week is a promise you keep to next month.' },
  { id: 'q077', text: "You're not stuck; you're mid-rep. Finish it." },
  { id: 'q078', text: 'Consistency turns “someday” into “day thirty-one.”' },
  { id: 'q079', text: "Feel the burn and thank it — that's change with the lights on." },
  { id: 'q080', text: "Your goals can't hear you talk; they only read your reps." },
  { id: 'q081', text: 'The workout is only 45 minutes; the pride lasts all day.' },
  { id: 'q082', text: 'Sweat today, strut tomorrow.' },
  { id: 'q083', text: 'Progress is a stubborn person doing boring reps well.' },
  { id: 'q084', text: 'When it gets hard, get precise, not desperate.' },
  { id: 'q085', text: 'The hardest part is already behind you: deciding.' },
  { id: 'q086', text: "Do it for the day-90 photo you haven't taken yet." },
  { id: 'q087', text: 'Fall in love with the reps and the results chase you.' },
  { id: 'q088', text: "You can rest at the top; don't stop at the bottom." },
  { id: 'q089', text: 'Weakness leaves quietly when you show up loudly.' },
  { id: 'q090', text: 'Make the healthy choice the easy choice: just press play.' },
  { id: 'q091', text: 'One more rep is a full sentence; say it.' },
  { id: 'q092', text: 'The body you want is built from the sessions you almost skipped.' },
  { id: 'q093', text: 'Train the mind by finishing when the body asks to fold.' },
  { id: 'q094', text: "Turn today's soreness into tomorrow's swagger." },
  { id: 'q095', text: 'Showing up is a skill; practice it daily.' },
  { id: 'q096', text: 'The streak survives on the days you carry it.' },
]

/** Built-in pack plus the user's custom quotes, minus any they disabled. */
export function activeQuotes(quotes: AppState['quotes']): Quote[] {
  const disabled = new Set(quotes.disabledIds)
  return [...BUILTIN_QUOTES, ...quotes.custom].filter((q) => !disabled.has(q.id))
}

/**
 * Deterministic quote for a given seed (the program-day number): the same day
 * always yields the same quote across reloads, and it only changes if the user
 * edits their pack. Returns null when every quote has been disabled.
 */
export function quoteOfDay(seed: number, quotes: AppState['quotes']): Quote | null {
  const active = activeQuotes(quotes)
  if (active.length === 0) return null
  const index = ((Math.trunc(seed) % active.length) + active.length) % active.length
  return active[index]
}

/**
 * Custom-quote list invariants (US-064): text is trimmed and never empty;
 * deleting a quote also clears its disabled flag; disabling is idempotent.
 * The caller supplies ids so the domain stays free of randomness.
 */
type QuoteList = AppState['quotes']

export function addQuote(quotes: QuoteList, id: string, text: string, author?: string): void {
  const trimmed = text.trim()
  if (trimmed === '') return
  const trimmedAuthor = author?.trim()
  quotes.custom.push({ id, text: trimmed, ...(trimmedAuthor ? { author: trimmedAuthor } : {}) })
}

export function updateQuote(quotes: QuoteList, id: string, text: string, author?: string): void {
  const quote = quotes.custom.find((q) => q.id === id)
  if (quote === undefined) return
  const trimmed = text.trim()
  if (trimmed === '') return
  quote.text = trimmed
  const trimmedAuthor = author?.trim()
  if (trimmedAuthor) quote.author = trimmedAuthor
  else delete quote.author
}

export function deleteQuote(quotes: QuoteList, id: string): void {
  quotes.custom = quotes.custom.filter((q) => q.id !== id)
  quotes.disabledIds = quotes.disabledIds.filter((d) => d !== id)
}

export function setQuoteDisabled(quotes: QuoteList, id: string, disabled: boolean): void {
  const has = quotes.disabledIds.includes(id)
  if (disabled && !has) quotes.disabledIds.push(id)
  else if (!disabled && has) quotes.disabledIds = quotes.disabledIds.filter((d) => d !== id)
}
