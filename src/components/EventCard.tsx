import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: "BUSY" | "SWAPPABLE" | "SWAP_PENDING";
  user_id?: string;
}

interface EventCardProps {
  event: Event;
  onAction?: (event: Event) => void;
  actionLabel?: string;
  actionVariant?: "default" | "secondary" | "destructive" | "outline";
  showStatus?: boolean;
}

export const EventCard = ({
  event,
  onAction,
  actionLabel,
  actionVariant = "default",
  showStatus = true,
}: EventCardProps) => {
  const statusColors = {
    BUSY: "bg-muted text-muted-foreground",
    SWAPPABLE: "bg-success text-success-foreground",
    SWAP_PENDING: "bg-warning text-warning-foreground",
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-lg">{event.title}</h3>
          {showStatus && (
            <Badge className={statusColors[event.status]}>
              {event.status.replace("_", " ")}
            </Badge>
          )}
        </div>
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{format(new Date(event.start_time), "PPP")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>
              {format(new Date(event.start_time), "p")} -{" "}
              {format(new Date(event.end_time), "p")}
            </span>
          </div>
        </div>
        {onAction && actionLabel && (
          <Button
            onClick={() => onAction(event)}
            variant={actionVariant}
            className="w-full"
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
