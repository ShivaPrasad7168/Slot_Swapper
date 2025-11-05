import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { EventCard } from "@/components/EventCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

export default function Marketplace() {
  const { user } = useAuth();
  const [availableSlots, setAvailableSlots] = useState<Event[]>([]);
  const [mySwappableSlots, setMySwappableSlots] = useState<Event[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchSlots = async () => {
    try {
      // Fetch available slots from other users
      const { data: available, error: availableError } = await supabase
        .from("events")
        .select("*")
        .eq("status", "SWAPPABLE")
        .neq("user_id", user!.id)
        .order("start_time", { ascending: true });

      if (availableError) throw availableError;

      // Fetch my swappable slots
      const { data: mySlots, error: mySlotsError } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "SWAPPABLE")
        .order("start_time", { ascending: true });

      if (mySlotsError) throw mySlotsError;

      setAvailableSlots(available || []);
      setMySwappableSlots(mySlots || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch slots");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, [user]);

  const handleRequestSwap = (slot: Event) => {
    if (mySwappableSlots.length === 0) {
      toast.error("You need to have at least one swappable slot to request a swap");
      return;
    }
    setSelectedSlot(slot);
    setDialogOpen(true);
  };

  const createSwapRequest = async (mySlotId: string) => {
    try {
      // Update both slots to SWAP_PENDING
      const { error: updateError } = await supabase
        .from("events")
        .update({ status: "SWAP_PENDING" })
        .in("id", [mySlotId, selectedSlot!.id]);

      if (updateError) throw updateError;

      // Create swap request
      const { error: insertError } = await supabase
        .from("swap_requests")
        .insert({
          requester_slot_id: mySlotId,
          target_slot_id: selectedSlot!.id,
          requester_id: user!.id,
          target_user_id: selectedSlot!.user_id,
          status: "PENDING",
        });

      if (insertError) throw insertError;

      toast.success("Swap request sent!");
      setDialogOpen(false);
      fetchSlots();
    } catch (error: any) {
      toast.error(error.message || "Failed to create swap request");
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
      <div>
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <p className="text-muted-foreground">Browse available time slots from other users</p>
      </div>

      {availableSlots.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No swappable slots available at the moment</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableSlots.map((slot) => (
            <EventCard
              key={slot.id}
              event={slot}
              onAction={handleRequestSwap}
              actionLabel="Request Swap"
              actionVariant="default"
              showStatus={false}
            />
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Your Slot to Swap</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {mySwappableSlots.map((slot) => (
              <EventCard
                key={slot.id}
                event={slot}
                onAction={() => createSwapRequest(slot.id)}
                actionLabel="Swap This Slot"
                actionVariant="default"
                showStatus={false}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
