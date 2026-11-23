/**
 * SCRIPT — "After-Tax Returns: The Metric Most Advisors Ignore" (Episode 3).
 * VO blocks are verbatim from After-Tax_Returns_MASTER_SCRIPT.md.
 * Every statistic carries its source chip (the script's retention device);
 * musicOut marks the score-drop moments (Betterment story, final lines).
 */

export interface BeatSpec {
  vo: string;
  pauseAfter?: number;
  scene: { type: string; sceneKey: string; [k: string]: any };
  voStyle?: 'calm' | 'neutral' | 'urgent' | 'reveal' | 'quote';
  /** on-screen source chip text (bottom-left, with the paper tick) */
  source?: string;
  /** duck the score to near-silence right before this beat's payoff */
  dropOut?: boolean;
  /** score drops out entirely for this beat */
  musicOut?: boolean;
  /** AUDIT R-04 — script-level gesture beats for key sentences: maps the
   *  0-based sentence index (splitSentences order) to a poseAt pool gesture
   *  (present · explain · open · count · weigh · chin · rest · sweep).
   *  Unlisted sentences keep the hash pick; the figure only renders where
   *  dataSceneFigure runs, so entries are placed on figure-bearing beats. */
  gestures?: Record<number, string>;
}

export interface ChapterSpec {
  id: string;
  title: string;
  beats: BeatSpec[];
}

const S1 = 'BlackRock 2026 Advisor Trends Survey · via InvestmentNews, Jan 2026';
const S2 = 'Cerulli Associates · fee-compression release, 2025';
const S3 = 'Schwab Center for Financial Research, Jul 2026';
const S4 = 'BlackRock analysis of Morningstar data, via FAJ';
const S5 = 'Vanguard, "When and how asset location matters," 2026';
const S6 = 'Vanguard 2026 · Goldman Sachs AM, Jun 2026';
const S7 = 'IRS Rev. Rul. 2008-5 · wash-sale in IRAs';
const S8 = 'Chaudhuri, Burnham & Lo, Financial Analysts Journal 76(3), 2020';
const S9 = 'Aperio (FAJ 2019) — vendor-affiliated study';
const S10 = 'Wealthfront, "How TLH Performed in 2025," Mar 2026';
const S11 = 'SEC Press Release 2023-80 (Betterment), Apr 2023';
const S12 = 'Bloomberg, Jun 7 2026 — ETF tax break estimate';
const S13 = 'State Street Investment Management, Feb 2026 (2025 data)';
const S14 = 'Vanguard ETF-patent expiry, May 2023 · SEC filings';
const S15 = 'White Coat Investor analysis, 2017';
const S16 = 'Schwab Intelligent Portfolios Premium disclosure';
const S17 = 'BlackRock exchange-fund estimate, 2026';
const S18 = 'Exchange-fund structure · qualified-purchaser rule';
const S19 = 'Elm Wealth, "Robbing Peter to Pay Paul," Apr 2026';
const S20 = '2025 US tax law — estate exemption, from 2026';
const S21 = 'Financial Analysts Journal simulations, 2020';

export const SCRIPT: ChapterSpec[] = [
  // ─────────────────────────────────────────────────────────── COLD OPEN ──
  {
    id: 'ch0',
    title: 'The $5.1M Gap',
    beats: [
      {
        vo: 'Two investors. Same two million dollars. Same portfolio. Same eight percent return for twenty-five years. One ends with thirteen point seven million. The other ends with eight point six million.',
        pauseAfter: 500,
        voStyle: 'reveal',
        scene: { type: 'coldOpen', sceneKey: 'c0-numbers', mode: 'split' },
      },
      {
        vo: 'No crash. No bad pick. No scandal. Five point one million dollars of difference — and it never left through the front door. It left through the tax line. A line almost nobody reports.',
        pauseAfter: 450,
        voStyle: 'reveal',
        dropOut: true,
        scene: { type: 'coldOpen', sceneKey: 'c0-numbers', mode: 'numbers' },
      },
      {
        vo: "BlackRock's 2026 advisor survey found that ninety-two percent of advisors to wealthy clients are constantly asked for tax guidance. Only seventeen percent let after-tax returns actually drive portfolio decisions. That gap is the most expensive silence in wealth management.",
        pauseAfter: 450,
        voStyle: 'calm',
        source: S1,
        scene: { type: 'gapBars', sceneKey: 'c0-gap', closeup: { x: 180, y: 300, w: 1680, h: 500 } },
      },
      {
        vo: 'Today: the four levers that close the gap, the real numbers behind each one, and where the tax-alpha industry is selling you something — because some of it is. Stay to the end for five questions to ask whoever manages your money, and the one case where the best tax strategy is to do nothing at all.',
        pauseAfter: 420,
        voStyle: 'neutral',
        scene: { type: 'host', sceneKey: 'c0-intro', headline: 'Four levers. Real numbers. Both sides.', kicker: 'Episode 3 · After-Tax Returns', gesture: 'present', entrance: 'walk', walkMs: 1600, companion: { kind: 'coin' } },
      },
    ],
  },
  // ─────────────────────────────────────────────────────────────── FRAME ──
  {
    id: 'ch1',
    title: 'How to Read This Video',
    beats: [
      {
        vo: 'Quick frame before the numbers.',
        pauseAfter: 200,
        voStyle: 'calm',
        scene: { type: 'titleCard', sceneKey: 'c1-title', title: 'AFTER-TAX RETURNS', sub: 'The metric most advisors ignore' },
      },
      {
        vo: "This channel looks at both sides of every trade — so for each strategy you'll get the evidence for it, the evidence against it, and the specific situation where it actually pays. The mechanics here are US tax code; that's where most of you file. If you're in London, Zurich, Toronto, or Sydney, the framework travels even when the rates don't. And one line of housekeeping: this is education, not tax advice. Your CPA should be a co-author of your portfolio, not an afterthought.",
        pauseAfter: 380,
        voStyle: 'neutral',
        scene: { type: 'host', sceneKey: 'c1-frame', headline: 'Both sides. Every strategy. Every time.', kicker: 'The house rules', gesture: 'weigh', companion: { kind: 'weigh', left: 'EVIDENCE FOR', right: 'EVIDENCE AGAINST' } },
      },
    ],
  },
  // ─────────────────────────────────────────────── ACT I — WRONG SCOREBOARD ──
  {
    id: 'ch2',
    title: 'The Wrong Scoreboard',
    beats: [
      {
        vo: "Here's a number you've never seen: your portfolio's after-tax return. Not because it's secret. Because nobody computes it. Your statement shows performance before tax. Morningstar stars are awarded before tax. Your advisor's pitch deck — before tax.",
        pauseAfter: 300,
        voStyle: 'calm',
        scene: { type: 'brokerageStatement', sceneKey: 'c2-statement', mode: 'reveal' },
      },
      {
        vo: "The entire industry keeps score in a currency you can't spend.",
        pauseAfter: 900,
        voStyle: 'reveal',
        dropOut: true,
        scene: { type: 'statement', sceneKey: 'c2-statement2', lines: ['The industry keeps score', 'in a currency you can’t spend.'], accent: ['currency'] },
      },
      {
        vo: 'Why? Start with incentives. Cerulli projects that by 2026, eighty-three percent of advisors will charge under one percent on clients with five million or more — average fees heading toward two-thirds of a point. When the fee compresses, time goes to whatever justifies the fee: planning, estates, insurance, hand-holding. Tax management is expensive to deliver — the software to scan hundreds of accounts daily can cost a small firm five figures a year — and invisible when delivered. Nobody claps for a tax that didn\'t happen.',
        pauseAfter: 420,
        voStyle: 'calm',
        source: S2,
        scene: { type: 'feeChips', sceneKey: 'c2-fees', closeup: { x: 130, y: 160, w: 1790, h: 680 } },
      },
      {
        vo: 'Then compliance. Many firms draw a hard legal line between tax planning and tax advice. Cross it without a CPA and the liability is real; errors-and-omissions policies often exclude it. So the rational advisor stays quiet. And then the human part: advisors are people. Loss aversion makes selling a loser feel like failure even when it\'s a win. Motivated reasoning makes the pre-tax number — the one that sells — feel like the real one.',
        pauseAfter: 380,
        voStyle: 'calm',
        scene: { type: 'memoCard', sceneKey: 'c2-memo', closeup: { x: 130, y: 160, w: 1790, h: 680 } },
      },
      {
        vo: 'To be fair: seventeen percent is not zero. The best firms do this beautifully, usually arm-in-arm with a CPA. And the survey measures what drives decisions, not what gets mentioned at lunch. But the structure is the point. Wealthy families now hold roughly fifty-four percent of US household financial assets — this is the industry\'s main event, not a niche. And yet you are scored on gross, your advisor is paid on gross, and the tax line is nobody\'s job. Unless you make it somebody\'s.',
        pauseAfter: 500,
        voStyle: 'neutral',
        source: S1,
        scene: { type: 'host', sceneKey: 'c2-fair', headline: 'Scored on gross. Paid on gross.', kicker: 'The structure is the point', stat: { big: '54%', label: 'of US household financial assets held by wealthy families', tone: 'gold' } },
      },
      {
        vo: "So what does that line actually cost? Let's use research, not vibes.",
        pauseAfter: 700,
        voStyle: 'reveal',
        dropOut: true,
        scene: { type: 'turnCard', sceneKey: 'c2-turn', lines: ['Research,', 'not vibes.'] },
      },
    ],
  },
  // ─────────────────────────────────────────────── ACT II — ANATOMY OF DRAG ──
  {
    id: 'ch3',
    title: 'The Anatomy of Tax Drag',
    beats: [
      {
        vo: "Schwab's Center for Financial Research modeled a portfolio earning six percent in capital gains, held thirty years, taxed at top federal rates — forty point eight percent on short-term gains, twenty-three point eight on long-term. That's the thirty-seven percent top bracket plus the three-point-eight investment-income surtax. In California, add thirteen point three — long-term gains run past thirty-seven percent there.",
        pauseAfter: 400,
        voStyle: 'calm',
        source: S3,
        scene: { type: 'taxRates', sceneKey: 'c3-rates', closeup: { x: 140, y: 290, w: 1640, h: 560 } },
      },
      {
        vo: 'Now vary one thing: turnover. Sell and replace five percent of the portfolio a year — barely trading — and taxes shave about zero point seven percentage points off your annual return. Turn over the whole portfolio every year — normal for many active funds — and the drag nearly triples, to about one point nine.',
        pauseAfter: 380,
        voStyle: 'neutral',
        source: S3,
        scene: { type: 'turnoverBars', sceneKey: 'c3-turnover' },
      },
      {
        vo: 'In dollars: a hundred thousand dollars, same six percent, same thirty years. The low-turnover version ends near four hundred seventy thousand. The high-turnover version: three hundred thirty. A hundred forty thousand dollars — thirty percent of the ending wealth — gone. Not to the market. To the calendar. And that\'s before state tax.',
        pauseAfter: 500,
        voStyle: 'reveal',
        dropOut: true,
        source: S3,
        gestures: { 1: 'present', 3: 'weigh', 5: 'chin' },
        scene: { type: 'growthCurves', sceneKey: 'c3-curves', closeup: { x: 130, y: 160, w: 1790, h: 680 } },
      },
      {
        vo: "Two mechanics drive this. First, every sale realizes a gain — and gains held under a year are taxed like salary. Second, the character of a return matters as much as its size. Bond interest is ordinary income. Most REIT distributions, ordinary. Qualified dividends and long-term gains get the discount. BlackRock's analysis of Morningstar data puts it bluntly: taxable bonds carry a similar five-year tax cost to equities — but on a much smaller pre-tax return. Taxes eat a far bigger share of a bond's return than a stock's.",
        pauseAfter: 420,
        voStyle: 'calm',
        source: S4,
        scene: { type: 'characterMatrix', sceneKey: 'c3-character' },
      },
      {
        vo: 'Now scale it up. Two million, eight percent gross, twenty-five years: thirteen point seven million if the full return compounds. Let two points a year leak — roughly Schwab\'s high-turnover drag at top rates — and you compound at six: eight point six million. The five point one million from the opening isn\'t a scare number. It\'s arithmetic. And the first lever to stop it costs nothing to implement.',
        pauseAfter: 600,
        voStyle: 'reveal',
        dropOut: true,
        source: S3,
        gestures: { 1: 'present', 3: 'weigh' },
        scene: { type: 'signatureCurve', sceneKey: 'c3-signature', closeup: { x: 600, y: 240, w: 1300, h: 560 }, hold: 4200 },
      },
    ],
  },
  // ─────────────────────────────────────────── ACT III — ASSET LOCATION ──
  {
    id: 'ch4',
    title: 'Lever 1 — Asset Location',
    beats: [
      {
        vo: "Lever one: asset location. Not allocation — location. Same assets, different accounts. The rule is simple: put the tax-ugly stuff where the IRS can't reach it annually. Taxable bonds, TIPS, REITs, high-turnover active funds — into the IRA, the 401(k), the tax-deferred sleeve. Broad index ETFs and growth stocks — into the taxable account, where low turnover and qualified dividends already tax them gently. And your highest-expected-growth assets belong in the Roth, because that growth is never taxed again.",
        pauseAfter: 420,
        voStyle: 'neutral',
        scene: { type: 'locationMap', sceneKey: 'c4-map', mode: 'build' },
      },
      {
        vo: "Two traps the pros still step in. Municipal bonds in an IRA: you take tax-exempt interest and convert it into fully taxable withdrawals. You've laundered a tax advantage into a tax bill. Munis live in taxable accounts — that's the whole point of them.",
        pauseAfter: 380,
        voStyle: 'calm',
        source: S5,
        scene: { type: 'trapTile', sceneKey: 'c4-traps', which: 'muni' },
      },
      {
        vo: "Trap two: location changes your real risk. A million in a traditional IRA is not a million — at a thirty percent future rate, it's seven hundred thousand of your money and three hundred thousand of the government's. Park all your bonds in the IRA and your taxable account — the one you actually spend from — is now all equity. Your after-tax allocation is riskier than the spreadsheet says.",
        pauseAfter: 400,
        voStyle: 'calm',
        gestures: { 2: 'open', 3: 'weigh' },
        scene: { type: 'iraSplit', sceneKey: 'c4-ira' },
      },
      {
        vo: "How much is location worth? Vanguard's simulations: up to about thirty basis points a year. Goldman Sachs Asset Management models more than forty-five for high brackets when combined with strategic allocation. Real money — but modest, and capped by how much tax-advantaged space you have. For most of you, most of your wealth is taxable. Which is why the next lever matters more.",
        pauseAfter: 420,
        voStyle: 'neutral',
        source: S6,
        scene: { type: 'bpsCompare', sceneKey: 'c4-bps', closeup: { x: 140, y: 300, w: 1640, h: 500 } },
      },
    ],
  },
  // ───────────────────────────────────── ACT IV — TAX-LOSS HARVESTING ──
  {
    id: 'ch5',
    title: 'Lever 2 — Tax-Loss Harvesting',
    beats: [
      {
        vo: "Lever two: tax-loss harvesting. The most studied — and most oversold — tool in the kit. The mechanic: sell a position that's down, bank the loss against gains elsewhere, reinvest immediately in something similar but not substantially identical. You keep the market exposure; the loss becomes a tax asset. Losses offset gains without limit, then up to three thousand dollars of ordinary income a year, and carry forward indefinitely.",
        pauseAfter: 400,
        voStyle: 'neutral',
        scene: { type: 'tlhMechanic', sceneKey: 'c5-mechanic', mode: 'mechanic' },
      },
      {
        vo: 'The guardrail is the wash-sale rule: buy the same thing back within thirty days — before or after the sale, a sixty-one-day window — and the loss vanishes. Swapping between two S&P 500 ETFs is common practice, but the IRS has never blessed it; conservative harvesters switch index families entirely. And here\'s the trap that catches even professionals: trigger a wash sale by repurchasing inside your IRA — or your spouse\'s — and the loss isn\'t deferred. It\'s destroyed. Permanently. The IRS ruled on this in 2008; there\'s no basis adjustment on the other side.',
        pauseAfter: 500,
        voStyle: 'reveal',
        dropOut: true,
        source: S7,
        scene: { type: 'washSale', sceneKey: 'c5-wash' },
      },
      {
        vo: 'So what is harvesting actually worth? The independent benchmark is a 2020 study in the Financial Analysts Journal — Chaudhuri, Burnham, and Andrew Lo — simulating monthly harvesting on the five hundred largest US stocks from 1926 to 2018. Average alpha: about one point one percent a year. Force it to obey the wash-sale rule: zero point eight. Subtract trading costs: about zero point nine five.',
        pauseAfter: 400,
        voStyle: 'calm',
        source: S8,
        gestures: { 1: 'sweep', 2: 'count', 4: 'weigh' },
        scene: { type: 'waterfall', sceneKey: 'c5-faj', closeup: { x: 130, y: 160, w: 1790, h: 680 } },
      },
      {
        vo: "And the average hides the story. Two point one percent a year through the Depression's volatility. Zero point five through the calm postwar boom. Harvesting is a volatility strategy. It feeds on dispersion. In a straight-line bull market, it starves.",
        pauseAfter: 420,
        voStyle: 'calm',
        source: S8,
        gestures: { 1: 'count', 3: 'explain', 5: 'chin' },
        scene: { type: 'eraBars', sceneKey: 'c5-eras' },
      },
      {
        vo: "The vendors' numbers are bigger — up to two point three percent in one widely cited study. But read the footnote: that study came from Aperio, a firm that sells direct indexing, now owned by BlackRock — and the authors themselves say the result depends on having short-term gains to offset. Independent research says zero point eight to one. Vendor research says two-plus. Both are real. Only one is disinterested.",
        pauseAfter: 420,
        voStyle: 'calm',
        source: S9,
        scene: { type: 'vendorCompare', sceneKey: 'c5-vendor', closeup: { x: 150, y: 300, w: 1620, h: 480 } },
      },
      {
        vo: "What does it look like in production? Wealthfront publishes its results — rare in this industry. In 2025, an estimated one hundred sixty-one million dollars of client tax savings. During the tariff selloff in April, its software harvested a hundred million dollars of losses in three days. That's the frequency argument in one number: a year-end review would have missed almost all of it.",
        pauseAfter: 400,
        voStyle: 'neutral',
        source: S10,
        scene: { type: 'wealthfrontCase', sceneKey: 'c5-wealthfront' },
      },
      {
        vo: "But their own data shows the catch. Brand-new accounts harvested losses worth nearly eight percent of portfolio value in 2025. Older accounts: far less. As markets rise, your cost basis rises, and the harvest thins. Tax alpha decays. And the deepest truth: harvesting is deferral, not forgiveness. Every harvested loss lowers your basis — a bigger gain waiting later. It becomes permanent only if those shares are eventually donated, or stepped up at death. More on that in a minute.",
        pauseAfter: 420,
        voStyle: 'calm',
        source: S10,
        scene: { type: 'decayCurve', sceneKey: 'c5-decay' },
      },
      {
        vo: "One more warning, from the SEC's own files. In 2023, Betterment paid nine million dollars over its tax-loss harvesting service — coding errors and undisclosed changes that cost more than twenty-five thousand client accounts roughly four million dollars in tax benefits. The strategy was real. The execution wasn't. Tax alpha you can't verify is just a brochure.",
        pauseAfter: 800,
        voStyle: 'reveal',
        musicOut: true,
        source: S11,
        gestures: { 1: 'count', 3: 'open' },
        scene: { type: 'secCase', sceneKey: 'c5-sec' },
      },
      {
        vo: '',
        pauseAfter: 1100,
        scene: { type: 'quietBeat', sceneKey: 'c5-quiet', label: 'The strategy was real. The execution wasn’t.' },
      },
    ],
  },
  // ───────────────────────────────────────────── ACT V — THE WRAPPER ──
  {
    id: 'ch6',
    title: 'Lever 3 — The Wrapper',
    beats: [
      {
        vo: 'Before the wrapper — a promise. The last five minutes of this video hand you the five questions that lock all four levers into one written plan. Stay for them.',
        pauseAfter: 500,
        voStyle: 'reveal',
        scene: { type: 'rehook', sceneKey: 'c6-rehook', ghost: '5' },
      },
      {
        vo: 'Lever three: the wrapper. Same index, same stocks — different tax outcome, depending on the legal structure you hold them through. Here\'s the mechanism most investors never learn. When you redeem a mutual fund, the manager often has to sell holdings to pay you out — and those gains get distributed to everyone who stayed. You can buy a fund in December and owe taxes on gains it realized in March, before you owned a single share.',
        pauseAfter: 420,
        voStyle: 'neutral',
        scene: { type: 'plumbing', sceneKey: 'c6-plumbing', mode: 'mutual' },
      },
      {
        vo: "An ETF works differently. Redemptions happen in-kind — a large institutional partner swaps ETF shares for a basket of the underlying stocks. No sale. No realized gain. The fund can even hand out its lowest-basis shares on the way out, quietly washing embedded gains out of the structure. The industry calls the bigger versions heartbeat trades — and Bloomberg estimates this machinery now costs the US Treasury around forty-eight billion dollars a year, with the top one percent collecting most of the benefit. File that away. We'll come back to it.",
        pauseAfter: 420,
        voStyle: 'neutral',
        source: S12,
        scene: { type: 'heartbeat', sceneKey: 'c6-heartbeat' },
      },
      {
        vo: "The scoreboard: State Street's 2026 analysis found that in 2025, fifty-seven percent of equity mutual funds paid out capital-gains distributions. Among equity ETFs: six percent. That's not a rounding error. That's a structural moat. And it's about to get wider — Vanguard's patent on pairing an ETF share class with a mutual fund expired in May 2023; dozens of firms have since filed to copy it.",
        pauseAfter: 400,
        voStyle: 'neutral',
        source: S13,
        gestures: { 0: 'count', 1: 'count', 3: 'weigh' },
        scene: { type: 'distribBars', sceneKey: 'c6-distrib', closeup: { x: 80, y: 180, w: 1660, h: 560 } },
      },
      {
        vo: "What about funds literally labeled tax-managed? Here the evidence is humbler than the marketing. A 2017 White Coat Investor analysis compared Vanguard's tax-managed small-cap fund to its plain small-cap index fund: ten-year after-tax returns of seven point one six versus six point seven six. An edge — but his own verdict was that most of it came from tracking a different index, and the large-cap tax-managed version added essentially nothing over a plain index fund. The lesson: a low-turnover index fund is already a tax-managed fund. The label matters less than the turnover, the yield, and the wrapper.",
        pauseAfter: 400,
        voStyle: 'calm',
        source: S15,
        gestures: { 2: 'count', 3: 'weigh', 4: 'present', 5: 'chin' },
        scene: { type: 'taxManaged', sceneKey: 'c6-taxmanaged', closeup: { x: 150, y: 290, w: 1700, h: 480 } },
      },
      {
        vo: "And one honest caveat on the whole ETF story: that forty-eight billion is a policy choice, not a law of physics. Congress has noticed. The wrapper's advantage is real today — but it exists at the pleasure of the tax code. Build on it. Don't worship it.",
        pauseAfter: 700,
        voStyle: 'reveal',
        dropOut: true,
        source: S12,
        scene: { type: 'policyRisk', sceneKey: 'c6-policy', lines: ['Build on it.', 'Don’t worship it.'] },
      },
    ],
  },
  // ───────────────────────────────────────── ACT VI — ADVANCED TIER ──
  {
    id: 'ch7',
    title: 'Lever 4 — The Advanced Tier',
    beats: [
      {
        vo: "Lever four is where the private banks live: direct indexing, exchange funds, and tax-aware long-short. If your net worth is north of five million, someone has pitched you one of these. Let's separate the engineering from the sales deck.",
        pauseAfter: 380,
        voStyle: 'neutral',
        scene: { type: 'pitchDeck', sceneKey: 'c7-deck', closeup: { x: 1290, y: 300, w: 640, h: 420 } },
      },
      {
        vo: 'Direct indexing: instead of one ETF, you own the hundreds of stocks inside it. Why? Because the index can be up while fifty of its members are down — and you can harvest those fifty losses individually. You can also exclude the stock you already work for, and gift your most-appreciated lots to charity. It is genuinely powerful — for the right person. The right person has a high marginal rate, ongoing gains to offset — a business sale, a concentrated position unwinding — and fresh cash coming in.',
        pauseAfter: 400,
        voStyle: 'neutral',
        scene: { type: 'diMosaic', sceneKey: 'c7-di' },
        gestures: { 0: 'open', 3: 'weigh' },
      },
      {
        vo: "The costs, from Schwab's own disclosure: thirty to forty basis points a year, versus a few basis points for a broad index ETF. Hundreds of cost-basis lots to administer. And — their words — diminishing tax benefits over time as the portfolio appreciates. How fast does it decay? In one study's simulations, the tax benefit averaged sixty-nine basis points a year in years one through five — and nine basis points in years six through ten. Pay forty basis points forever to harvest a benefit that decays: that's the trade. Run the math on your situation, not the brochure's.",
        pauseAfter: 420,
        voStyle: 'calm',
        source: S16,
        scene: { type: 'diDecay', sceneKey: 'c7-decay' },
      },
      {
        vo: "Exchange funds solve a different problem. BlackRock estimates over a trillion dollars of US household wealth sits in low-basis single stock — founders and early employees who can't diversify without a tax event. You contribute your concentrated shares into a private pool alongside other people's concentrated shares, and get back a diversified basket carrying your old basis. No tax today. The price: typically a seven-year lockup, a qualified-purchaser gate — five million in investments — a slice of the fund parked in illiquid assets like real estate to satisfy the tax rules, and fees on top. It's deferral with handcuffs. Sometimes exactly right.",
        pauseAfter: 420,
        voStyle: 'calm',
        source: S17,
        gestures: { 1: 'open', 3: 'present', 5: 'count', 6: 'chin' },
        scene: { type: 'exchangeFund', sceneKey: 'c7-xfund', closeup: { x: 320, y: 250, w: 1360, h: 480 } },
      },
      {
        vo: 'And the exotic one: tax-aware long-short. Long a basket, short another, harvesting losses from both sides in any market. The engineering is real: a peer-reviewed 2020 study in the Financial Analysts Journal found the structure more tax-efficient than comparable long-only active strategies — and later simulations found the tax benefit can be worth more than double the pre-tax return it sacrifices.',
        pauseAfter: 380,
        voStyle: 'calm',
        source: S21,
        gestures: { 0: 'present', 1: 'sweep', 2: 'weigh' },
        scene: { type: 'longShort', sceneKey: 'c7-ls', closeup: { x: 1150, y: 330, w: 700, h: 420 } },
      },
      {
        vo: 'But in April 2026, Elm Wealth — the quant firm founded by Victor Haghani of Long-Term Capital Management fame — ran the numbers on the typical pitch. Base case: fees consumed more than half the tax benefit, and the investor ended with a lower after-tax expected return than if she had just sold the stock, paid the tax, and bought an index fund. Even granting the manager half a point of stock-picking alpha, it was roughly a coin flip.',
        pauseAfter: 500,
        voStyle: 'reveal',
        source: S19,
        scene: { type: 'elmVerdict', sceneKey: 'c7-elm' },
      },
      {
        vo: "Their exceptions are telling. It can make sense if a step-up at death is near — or you're about to move from a high-tax state to a low-tax one. Notice what those exceptions have in common: the strategy isn't creating returns. It's moving gains across time and tax rates. Which brings us to the quietest, most powerful fact in this entire video.",
        pauseAfter: 700,
        voStyle: 'reveal',
        dropOut: true,
        gestures: { 2: 'explain', 4: 'open' },
        scene: { type: 'host', sceneKey: 'c7-bridge', headline: 'The quietest, most powerful fact', kicker: 'Before the synthesis', gesture: 'catch', companion: { kind: 'gapbar', value: '$5.1M' } },
      },
    ],
  },
  // ───────────────────────────────────────── ACT VII — SYNTHESIS ──
  {
    id: 'ch8',
    title: 'The Synthesis',
    beats: [
      {
        vo: 'Here it is: the best tax strategy in America is often patience. Under current law, assets in your taxable account held until death get a stepped-up basis — every embedded gain, wiped. The 2025 tax law set the estate exemption at fifteen million per person, thirty per couple, starting 2026 — so for most of you watching, there\'s no estate tax either. Donate appreciated shares instead of cash, and the gain disappears too, with a deduction on top.',
        pauseAfter: 420,
        voStyle: 'calm',
        source: S20,
        gestures: { 1: 'present', 2: 'count', 3: 'explain' },
        scene: { type: 'stepUp', sceneKey: 'c8-stepup' },
      },
      {
        vo: "Which means a plain, low-turnover index ETF — held for decades, donated or inherited — is already one of the most tax-efficient structures ever designed. Its drag is roughly the tax on its dividends: at today's yields, about a third of a point a year. Before you buy complexity, beat that benchmark. Most pitches can't.",
        pauseAfter: 400,
        voStyle: 'calm',
        gestures: { 0: 'open', 2: 'present', 3: 'chin' },
        scene: { type: 'benchmarkBar', sceneKey: 'c8-benchmark', closeup: { x: 150, y: 280, w: 1560, h: 430 } },
      },
      {
        vo: 'So here\'s the hierarchy. Screenshot this. Tier one, do first: asset location, and systematic, wash-sale-aware loss harvesting across every account you own. Combined, the independent evidence supports something like a quarter to a full point a year — more in volatile markets, less in calm ones, decaying as portfolios age. Tier two: the wrapper. ETFs or low-turnover index funds in taxable; ordinary-income assets sheltered; tax-managed labels optional. Tier three, situational: direct indexing, exchange funds, long-short — only with a specific problem to solve. A concentration. A liquidity event. Gains that need offsetting. Complexity is a cost you pay every year for a benefit that may not show up every year.',
        pauseAfter: 900,
        voStyle: 'calm',
        gestures: { 0: 'present', 1: 'open', 4: 'count', 7: 'count', 10: 'weigh' },
        scene: { type: 'hierarchy', sceneKey: 'c8-hierarchy', closeup: { x: 160, y: 150, w: 1680, h: 650 }, hold: 5200 },
      },
      {
        vo: "And the five questions. Send these to whoever manages your money. One: show me my after-tax return for the last three years. Two: what did distributions cost me last year, in dollars? Three: where is my asset location written down — and why? Four: how often do you scan for losses, across which accounts — including my spouse's and my IRAs — and who checks the wash sales? Five: if I liquidated today, what's the embedded tax bill, and what's the plan to shrink it?",
        pauseAfter: 500,
        voStyle: 'calm',
        gestures: { 0: 'open', 2: 'open', 3: 'count', 4: 'explain', 5: 'count', 6: 'weigh' },
        scene: { type: 'fiveQuestions', sceneKey: 'c8-questions' },
      },
      {
        vo: "A good advisor answers all five without flinching. A great one already sent you the answers. If yours stalls on question one, you've learned something worth more than this video.",
        pauseAfter: 420,
        voStyle: 'calm',
        gestures: { 0: 'present', 1: 'chin', 2: 'open' },
        scene: { type: 'host', sceneKey: 'c8-advisor', headline: 'A great advisor already sent the answers.', kicker: 'The test', gesture: 'present', companion: { kind: 'statement', lines: ['Q1–Q5 · answered', 'in writing, every year'] } },
      },
      {
        vo: 'Tell me in the comments what happens when you ask — I read them all. And if you know someone who brags about their returns every December, send them this.',
        pauseAfter: 400,
        voStyle: 'neutral',
        scene: { type: 'circleBack', sceneKey: 'c8-circle', mode: 'comments' },
      },
      {
        vo: 'Gross returns are what you brag about. After-tax returns are what you spend. The market doesn\'t keep score of what you earned. Only what you kept.',
        pauseAfter: 800,
        voStyle: 'reveal',
        musicOut: true,
        dropOut: true,
        scene: { type: 'finalLines', sceneKey: 'c8-final', closeup: { x: 130, y: 160, w: 1790, h: 680 } },
      },
      {
        vo: '',
        pauseAfter: 600,
        scene: { type: 'endScreen', sceneKey: 'c8-end' },
      },
    ],
  },
];

export const VIDEO_TITLE = 'The $5.1 Million Line Item Your Advisor Never Shows You';
export const CHANNEL_NAME_DEFAULT = 'Beyond Gross Alpha';
export const NEXT_VIDEO_TITLE = 'Episode 4: The Next Hidden Number';
export const TAGS = [
  'after-tax returns', 'tax efficient investing', 'tax loss harvesting', 'asset location',
  'direct indexing', 'exchange funds', 'high net worth', 'wealth management', 'tax drag',
  'ETF vs mutual fund taxes', 'step up basis', 'financial advisor questions',
];

export function totalBeats(): number {
  return SCRIPT.reduce((a, c) => a + c.beats.length, 0);
}
