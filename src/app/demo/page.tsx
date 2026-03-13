import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen, Video, Dumbbell, Sparkles, Settings } from "lucide-react";

const sections = [
  {
    title: "Library",
    description:
      "Browse published teacher videos. Search by move name, filter by role and difficulty, then pick a video to practice.",
    href: "/library",
    cta: "Browse library",
    icon: Video,
  },
  {
    title: "Encyclopedia",
    description:
      "Move registry with categories, biomechanical signatures, and teacher tips. Explore how moves are defined for analysis.",
    href: "/encyclopedia",
    cta: "Open encyclopedia",
    icon: BookOpen,
  },
  {
    title: "Practice",
    description:
      "Webcam capture and analysis. Follow a teacher video, get real-time posture comparison and a score. Save attempts and view AI coaching tips.",
    href: "/practice",
    cta: "Go to practice",
    icon: Dumbbell,
  },
  {
    title: "AI Coaching",
    description:
      "After each practice session, AI generates genre-specific Pro Tips (On1, Frame, Cuban Motion) from your comparison metrics.",
    href: "/library",
    cta: "Practice to get tips",
    icon: Sparkles,
  },
  {
    title: "Admin",
    description:
      "Upload and label teacher videos, manage the biomechanical dictionary. For instructors and content curators.",
    href: "/admin",
    cta: "Admin dashboard",
    icon: Settings,
  },
];

export default function DemoPage() {
  return (
    <main className="container max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <h1 className="font-serif text-3xl font-bold text-foreground">
          What DanceAI can do
        </h1>
        <p className="text-muted-foreground mt-2">
          Capabilities and where to find them in the app.
        </p>
      </div>
      <div className="space-y-6">
        {sections.map(({ title, description, href, cta, icon: Icon }) => (
          <Card
            key={title}
            className="rounded-2xl border-border/50 bg-card shadow-sm overflow-hidden"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="font-serif text-xl">{title}</CardTitle>
              </div>
              <CardDescription className="text-base mt-1">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={href}
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
              >
                {cta}
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="mt-10 text-center text-sm text-muted-foreground">
        <Link href="/" className="underline hover:text-foreground">
          ← Back to home
        </Link>
      </p>
    </main>
  );
}
