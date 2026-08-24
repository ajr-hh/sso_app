export const demoUser = {
  name: "Jim",
  streak: 12,
  goals: [
    "Lose 22 pounds",
    "Reduce body fat below 20%",
    "Increase muscle mass by 10%+",
    "Enjoy my diet and be social",
  ],
  whyFailed: [
    "Didn't ask for help",
    "Didn't have a plan",
    "Didn't know the consequences of what I was eating",
  ],
  kryptonite: [
    "Ice cream",
    "Cheese",
    "Desserts",
    "Bread",
    "Oversized portions",
  ],
};

export const initialDailyTasks = [
  { id: 1, label: "Move over 10,000 steps", done: true },
  { id: 2, label: "Consume 180g of protein", done: true },
  { id: 3, label: "Five servings of vegetables", done: false },
  { id: 4, label: "Daily workout", done: true },
  { id: 5, label: "No alcohol or sweets after 7pm", done: false },
];

export const initialJournal = [
  {
    mood: "good" as const,
    text: "Lost 6 pounds and I'm sleeping better than ever. Haven't had heartburn in 2 weeks.",
  },
  {
    mood: "good" as const,
    text: "Had a craving for ice cream. Had an apple instead. It was delicious and satisfied the craving.",
  },
];

export const railsOptions = [
  {
    href: "/sos/why",
    icon: "favorite",
    title: "Remember Your Why",
    sub: "Your goals and reasons, front and center.",
  },
  {
    href: "/sos/hard-truths",
    icon: "bolt",
    title: "Hard Truths",
    sub: "No cheerleading. Your own stakes, stated plainly.",
  },
  {
    href: "/sos/stats",
    icon: "monitoring",
    title: "The Numbers",
    sub: "What the research says, plainly stated.",
  },
  {
    href: "/sos/rewards",
    icon: "redeem",
    title: "Small Wins",
    sub: "See how close you are to your next reward.",
  },
  {
    href: "/sos/food",
    icon: "nutrition",
    title: "Better Choices",
    sub: "Swap suggestions for your usual slip-up foods.",
  },
  {
    href: "/sos/call",
    icon: "call",
    title: "Talk to Someone",
    sub: "A live call from a coach or a loved one.",
  },
  {
    href: "/sos/messages",
    icon: "chat",
    title: "Coach Messages",
    sub: "A short message from your coach style of choice.",
  },
] as const;

export const foodSwaps: Record<string, string[]> = {
  "Ice cream": [
    "Apple with a little peanut butter",
    "Protein shake with a few berries",
    "Celery with almond butter",
    "Frozen banana, blended",
  ],
  Cheese: [
    "Cottage cheese with pepper",
    "Part-skim string cheese",
    "Nutritional yeast on vegetables",
    "A few slices of extra-sharp cheddar, slowly",
  ],
  Desserts: [
    "Greek yogurt with berries",
    "One square of dark chocolate",
    "Baked apple with cinnamon",
    "Protein brownie bite",
  ],
  Bread: [
    "Lettuce wrap",
    "High-protein tortilla",
    "Cloud bread",
    "Cucumber rounds",
  ],
  "Oversized portions": [
    "Use a salad plate",
    "Protein first, then pause",
    "Box half before you start",
    "Eat, wait ten minutes, decide again",
  ],
};

export const plannedTips = [
  { icon: "restaurant", text: "Eat a protein-forward snack before you arrive." },
  { icon: "local_bar", text: "Pick one drink you'll actually enjoy, and stop there." },
  { icon: "chat", text: "Tell one person there what you're working on." },
];

export const stats = [
  {
    num: "27%",
    title: "Higher heart attack risk",
    body: "Carrying extra weight can raise cardiovascular risk by more than a quarter, even in people who are otherwise healthy.",
  },
  {
    num: "17%",
    title: "Per unit of BMI",
    body: "Each one-unit rise in BMI is associated with roughly a 17% increase in heart failure risk.",
  },
  {
    num: "2×",
    title: "Heart's workload",
    body: "Every extra pound means your heart pumps more blood, with greater force, to circulate through fat tissue.",
  },
];

export const rewards = [
  {
    milestone: "Lose 10 pounds",
    tag: "Earned",
    earned: true,
    icon: "checkroom",
    reward: "A new shirt you picked out",
  },
  {
    milestone: "Lose 20 pounds",
    tag: "6 lbs to go",
    earned: false,
    icon: "directions_car",
    reward: "A weekend driving experience",
  },
];

export const hardTruthPhotos = [
  {
    tag: "proud of this",
    tagIcon: "favorite",
    caption: "Walking my daughter down the aisle without stopping to catch my breath.",
    warm: true,
  },
  {
    tag: "never again",
    tagIcon: "block",
    caption: "The night before my physical, dreading the scale. Not doing that again.",
    warm: false,
  },
];

export const communityPosts = [
  {
    initials: "RT",
    name: "Rachel T.",
    text: "You got this. We're all behind you. Love your progress!",
    muted: false,
  },
  {
    initials: "DP",
    name: "David P.",
    text: "Day 42 here too. One bad meal isn't a bad month. Keep going.",
    muted: true,
  },
];

export const aliasSwaps = {
  "A little better": {
    title: "Apple pie with Greek yogurt",
    sub: "Same pie-shop flavor, less of the crust and cream.",
  },
  Mid: {
    title: "Baked apple with cinnamon",
    sub: "Same comfort, a fraction of the sugar",
  },
  "Very healthy": {
    title: "Warm stewed apple, no sweetener",
    sub: "Cinnamon and a squeeze of lemon. That's the whole recipe.",
  },
} as const;

export const toastLines = [
  "Nice. One less thing to think about.",
  "That's the streak talking.",
  "Small win. Those add up.",
  "Look at you go.",
];
