import { Link } from "@tanstack/react-router";
import { BookOpen, Clock, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type Props = {
  course: {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    level: string;
    cover_image_url: string | null;
  };
  progress?: number;
  meta?: { lessons?: number; modules?: number };
  to?: "course" | "teach";
};

const gradients = [
  "from-sky-500/30 via-indigo-500/20 to-purple-500/30",
  "from-emerald-500/30 via-teal-500/20 to-cyan-500/30",
  "from-amber-500/30 via-orange-500/20 to-rose-500/30",
  "from-fuchsia-500/30 via-pink-500/20 to-rose-500/30",
  "from-blue-500/30 via-cyan-500/20 to-emerald-500/30",
];

export function CourseCard({ course, progress, meta, to = "course" }: Props) {
  const seed = course.id.charCodeAt(0) + course.id.charCodeAt(1);
  const gradient = gradients[seed % gradients.length];
  const href = to === "teach" ? `/teach/${course.id}` : `/courses/${course.id}`;

  return (
    <Link
      to={to === "teach" ? "/teach/$courseId" : "/courses/$courseId"}
      params={{ courseId: course.id }}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition hover:-translate-y-0.5 hover:shadow-soft"
    >
      <div className={`relative aspect-[16/9] w-full bg-gradient-to-br ${gradient}`}>
        {course.cover_image_url ? (
          <img src={course.cover_image_url} alt={course.title} className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center">
            <BookOpen className="h-10 w-10 text-foreground/40" />
          </div>
        )}
        {course.category && (
          <Badge className="absolute left-3 top-3 bg-background/90 text-foreground hover:bg-background">
            {course.category}
          </Badge>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{course.level}</span>
          {meta?.modules != null && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" /> {meta.modules} modules</span>
            </>
          )}
          {meta?.lessons != null && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {meta.lessons} lessons</span>
            </>
          )}
        </div>
        <h3 className="line-clamp-2 text-base font-semibold leading-tight group-hover:text-primary">
          {course.title}
        </h3>
        {course.description && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
        )}
        {progress != null && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </div>
    </Link>
  );
}
