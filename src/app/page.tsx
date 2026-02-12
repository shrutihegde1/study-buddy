import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  LayoutDashboard,
  ListTodo,
  RefreshCw,
  Columns3,
  GraduationCap,
  Zap,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-gray-50">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-24 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
            <GraduationCap className="h-4 w-4" />
            Built for students, by students
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 tracking-tight">
            All your deadlines.
            <br />
            <span className="text-primary">One place.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop juggling Canvas, syllabi, and sticky notes. Study Buddy syncs
            your assignments, tests, and tasks into a single dashboard so you
            never miss a deadline again.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-lg hover:opacity-90 transition-all shadow-lg shadow-primary/25"
            >
              <Zap className="h-5 w-5" />
              Get Started Free
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            No credit card required. Works with Canvas.
          </p>
        </div>
      </header>

      {/* Features Grid */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything you need to stay on track
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto">
            Four powerful views to organize your academic life, plus automatic
            syncing with your LMS.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            icon={LayoutDashboard}
            title="Dashboard"
            description="At-a-glance stats showing overdue, due today, and upcoming items. Click any tile to drill down."
            color="blue"
          />
          <FeatureCard
            icon={Calendar}
            title="Calendar"
            description="Month view with all your deadlines. See what's coming and plan ahead with ease."
            color="green"
          />
          <FeatureCard
            icon={ListTodo}
            title="Due List"
            description="Chronological list of everything due, grouped by date. Check items off as you complete them."
            color="orange"
          />
          <FeatureCard
            icon={Columns3}
            title="Board"
            description="Kanban-style board to track progress. Drag items between Pending, In Progress, and Done."
            color="purple"
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white border-y">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How it works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Step
              number="1"
              title="Connect Canvas"
              description="Link your Canvas account with an API token. Takes less than a minute."
            />
            <Step
              number="2"
              title="Sync your courses"
              description="Study Buddy pulls in all your assignments, quizzes, and events automatically."
            />
            <Step
              number="3"
              title="Stay organized"
              description="View deadlines your way, mark items complete, and never miss a due date."
            />
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Focus on learning, not logistics
            </h2>
            <div className="space-y-4">
              <Benefit
                icon={RefreshCw}
                title="Auto-sync with Canvas"
                description="Assignments appear automatically. Manual entry optional for personal tasks."
              />
              <Benefit
                icon={CheckCircle2}
                title="Track completion"
                description="Mark items done and watch your completed count grow. Satisfying progress tracking."
              />
              <Benefit
                icon={Calendar}
                title="Multiple views"
                description="Dashboard, calendar, list, or board — pick the view that fits how you think."
              />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl p-8 aspect-square flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl font-bold text-primary mb-2">4</div>
              <div className="text-gray-600 font-medium">
                Views to organize
                <br />
                your academic life
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to get organized?
          </h2>
          <p className="text-primary-foreground/80 mb-8 text-lg">
            Join students who are staying on top of their deadlines.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all"
          >
            Create Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 border-t">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-gray-500 text-sm">
          <p>Study Buddy — Your unified academic calendar</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  color,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  color: "blue" | "green" | "orange" | "purple";
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow">
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${colors[color]}`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-primary text-white font-bold text-xl flex items-center justify-center mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function Benefit({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </div>
  );
}
