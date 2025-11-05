import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { EventCard } from "@/components/EventCard";
import { CreateEventDialog } from "@/components/CreateEventDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: "BUSY" | "SWAPPABLE" | "SWAP_PENDING";
  user_id: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user!.id)
        .order("start_time", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const toggleSwappable = async (event: Event) => {
    const newStatus = event.status === "BUSY" ? "SWAPPABLE" : "BUSY";
    
    try {
      const { error } = await supabase
        .from("events")
        .update({ status: newStatus })
        .eq("id", event.id);

      if (error) throw error;
      
      toast.success(
        newStatus === "SWAPPABLE"
          ? "Event marked as swappable"
          : "Event marked as busy"
      );
      fetchEvents();
    } catch (error: any) {
      toast.error(error.message || "Failed to update event");
    }
  };

  const deleteEvent = async (event: Event) => {
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id);

      if (error) throw error;
      
      toast.success("Event deleted");
      fetchEvents();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete event");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Calendar</h1>
          <p className="text-muted-foreground">Manage your time slots and make them swappable</p>
        </div>
        <CreateEventDialog onEventCreated={fetchEvents} />
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">No events yet. Create your first event!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div key={event.id} className="space-y-2">
              <EventCard event={event} />
              <div className="flex gap-2">
                {event.status !== "SWAP_PENDING" && (
                  <Button
                    onClick={() => toggleSwappable(event)}
                    variant="outline"
                    className="flex-1"
                  >
                    {event.status === "BUSY" ? "Make Swappable" : "Mark as Busy"}
                  </Button>
                )}
                <Button
                  onClick={() => deleteEvent(event)}
                  variant="destructive"
                  className="flex-1"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
