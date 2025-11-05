import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ArrowLeftRight } from "lucide-react";
import { EventCard } from "@/components/EventCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Profile {
  id: string;
  name: string;
  email: string;
}

interface EventSlot {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface SwapRequest {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  created_at: string;

  requester: Profile | null;
  target_user: Profile | null;

  requester_slot: EventSlot | null;
  target_slot: EventSlot | null;
}

export default function Requests() {
  const { user } = useAuth();
  const [incomingRequests, setIncomingRequests] = useState<SwapRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const { data: requests, error: requestsError } = await supabase
        .from("swap_requests")
        .select(
          "id, status, created_at, requester_id, target_user_id, requester_slot_id, target_slot_id"
        )
        .or(`requester_id.eq.${user!.id},target_user_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (requestsError) throw requestsError;

      const userIds = new Set<string>();
      const eventIds = new Set<string>();

      requests?.forEach((req) => {
        if (req.requester_id) userIds.add(req.requester_id);
        if (req.target_user_id) userIds.add(req.target_user_id);
        if (req.requester_slot_id) eventIds.add(req.requester_slot_id);
        if (req.target_slot_id) eventIds.add(req.target_slot_id);
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", [...userIds]);

      const { data: events } = await supabase
        .from("events")
        .select("id, title, start_time, end_time, status")
        .in("id", [...eventIds]);

      const profilesMap = new Map(profiles?.map((p) => [p.id, p]));
      const eventsMap = new Map(events?.map((e) => [e.id, e]));

      const formatted = requests?.map((req) => ({
        id: req.id,
        status: req.status,
        created_at: req.created_at,
        requester: profilesMap.get(req.requester_id) || null,
        target_user: profilesMap.get(req.target_user_id) || null,
        requester_slot: eventsMap.get(req.requester_slot_id) || null,
        target_slot: eventsMap.get(req.target_slot_id) || null,
      }));

      const incoming = formatted.filter((r) => r.target_user?.id === user!.id);
      const outgoing = formatted.filter((r) => r.requester?.id === user!.id);

      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchRequests();
  }, [user]);

  const handleResponse = async (requestId: string, accepted: boolean) => {
    try {
      const request = incomingRequests.find((r) => r.id === requestId);
      if (!request) return;
  
      if (!request.requester || !request.target_user || !request.requester_slot || !request.target_slot) {
        toast.error("Missing data in request");
        return;
      }
  
      if (accepted) {
        const { error } = await supabase.rpc("perform_swap", {
          p_requester_slot_id: request.requester_slot.id,
          p_target_slot_id: request.target_slot.id,
          p_requester_id: request.requester.id,
          p_target_user_id: request.target_user.id,
          p_request_id: requestId,
        });
  
        if (error) throw error;
  
        toast.success("✅ Swap accepted!");
      } else {
        const { error } = await supabase.rpc("reject_swap", {
          p_requester_slot_id: request.requester_slot.id,
          p_target_slot_id: request.target_slot.id,
          p_request_id: requestId,
        });
  
        if (error) throw error;
  
        toast.success("❌ Request rejected!");
      }
  
      // ✅ IMPORTANT: Give supabase time to finish updates (titles, times, status)
      setTimeout(() => {
        fetchRequests();
      }, 1200); // ✅ FIXES TITLE + STATUS SYNC
  
    } catch (err: any) {
      toast.error(err.message);
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
      <h1 className="text-3xl font-bold">Swap Requests</h1>

      <Tabs defaultValue="incoming">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="incoming">Incoming</TabsTrigger>
          <TabsTrigger value="outgoing">History</TabsTrigger>
        </TabsList>

        {/* ✅ INCOMING — only pending have buttons */}
        <TabsContent value="incoming" className="space-y-4 mt-6">
          {incomingRequests.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">No requests</div>
          ) : (
            incomingRequests.map((req) => (
              <Card key={req.id}>
                <CardHeader>
                  <div className="flex justify-between">
                    <CardTitle>From: {req.requester?.name}</CardTitle>
                    {req.status === "PENDING" ? (
                      <Badge variant="outline">PENDING</Badge>
                    ) : req.status === "ACCEPTED" ? (
                      <Badge className="bg-green-600">ACCEPTED</Badge>
                    ) : (
                      <Badge className="bg-red-600">REJECTED</Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm mb-1">They Offer:</p>
                      {req.requester_slot && <EventCard event={req.requester_slot} showStatus={false} />}
                    </div>

                    <div className="flex justify-center items-center">
                      <ArrowLeftRight className="h-8 w-8 text-primary" />
                    </div>

                    <div>
                      <p className="text-sm mb-1">Your Slot:</p>
                      {req.target_slot && <EventCard event={req.target_slot} showStatus={false} />}
                    </div>
                  </div>

                  {/* ✅ Buttons only if pending */}
                  {req.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => handleResponse(req.id, true)}>
                        Accept
                      </Button>
                      <Button className="flex-1" variant="destructive" onClick={() => handleResponse(req.id, false)}>
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ✅ OUTGOING — full history, no buttons */}
        <TabsContent value="outgoing" className="space-y-4 mt-6">
          {outgoingRequests.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">No history</div>
          ) : (
            outgoingRequests.map((req) => (
              <Card key={req.id}>
                <CardHeader>
                  <div className="flex justify-between">
                    <CardTitle>To: {req.target_user?.name}</CardTitle>

                    {req.status === "PENDING" ? (
                      <Badge variant="outline">PENDING</Badge>
                    ) : req.status === "ACCEPTED" ? (
                      <Badge className="bg-green-600">ACCEPTED</Badge>
                    ) : (
                      <Badge className="bg-red-600">REJECTED</Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm mb-1">You Offered:</p>
                      {req.requester_slot && <EventCard event={req.requester_slot} showStatus={false} />}
                    </div>

                    <div className="flex justify-center items-center">
                      <ArrowLeftRight className="h-8 w-8 text-primary" />
                    </div>

                    <div>
                      <p className="text-sm mb-1">For Their Slot:</p>
                      {req.target_slot && <EventCard event={req.target_slot} showStatus={false} />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
