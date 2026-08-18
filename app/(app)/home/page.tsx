import Link from "next/link";

// Placeholder data — replace with real data from Prisma once the schema lands (see prisma/schema.prisma)
const dailyTasks = [
  { id: 1, label: "Move over 10,000 steps", done: true },
  { id: 2, label: "Consume 180g of protein", done: true },
  { id: 3, label: "Five servings of vegetables", done: false },
  { id: 4, label: "Daily workout", done: true },
  { id: 5, label: "No alcohol or sweets after 7pm", done: false },
];

const goals = [
  "Lose 22 pounds",
  "Reduce body fat below 20%",
  "Increase muscle mass by 10%+",
  "Enjoy my diet and be social",
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-md px-5 pb-32 pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-ember-dark">Today</p>
          <h1 className="text-3xl leading-none">Good morning, Jim</h1>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-xs font-extrabold text-white">
          🔥 12-day streak
        </span>
      </div>
      <p className="mt-1 text-sm text-ink-70">
        Here&rsquo;s what matters today. Tap SOS any time you need backup.
      </p>

      <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold">My daily tasks</h2>
        <div className="mt-2 divide-y divide-canvas">
          {dailyTasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 py-2.5">
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border ${
                  task.done ? "border-ember bg-ember text-white" : "border-ink-30"
                }`}
              >
                {task.done && "✓"}
              </span>
              <span className={`text-sm ${task.done ? "text-ink-70 line-through" : ""}`}>
                {task.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-3 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-base font-bold">My goals</h2>
        <div className="mt-2 space-y-2">
          {goals.map((goal) => (
            <div key={goal} className="flex items-center gap-3 text-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ember-tint text-ember-dark">
                🎯
              </span>
              {goal}
            </div>
          ))}
        </div>
      </section>

      <Link
        href="/sos"
        className="mt-3 flex items-center gap-3 rounded-2xl bg-ink p-4 text-white shadow-sm"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ember">🆘</span>
        <div>
          <p className="text-sm font-bold">Feeling shaky, or something coming up?</p>
          <p className="text-xs text-white/70">Tap SOS — day or night.</p>
        </div>
      </Link>
    </main>
  );
}
