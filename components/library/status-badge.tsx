import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { DocumentStatus } from "@/lib/types";

export function StatusBadge({
  status,
  className,
}: {
  status: DocumentStatus;
  className?: string;
}) {
  if (status === "ready") {
    return (
      <Badge className={className}>
        <span className="size-1.5 bg-ink" />
        Ready
      </Badge>
    );
  }
  if (status === "processing") {
    return (
      <Badge variant="muted" className={className}>
        <span className="size-1.5 animate-pulse bg-ink" />
        Processing
      </Badge>
    );
  }
  return (
    <Badge className={cn("border-accent text-accent", className)}>
      <span className="size-1.5 bg-accent" />
      Failed
    </Badge>
  );
}
