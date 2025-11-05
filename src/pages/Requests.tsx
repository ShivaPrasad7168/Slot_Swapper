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

interface SwapRequest {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  created_at: string;
  requester_slot: any;
  target_slot: any;
  requester: any;
  target_user: any;
}

export default function Requests() {
  const { user } = useAuth();
  const [incomingRequests, setIncomingRequests] = useState<SwapRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      // Fetch incoming requests
      const { data: incoming, error: incomingError } = await supabase
        .from("swap_requests")
        .select(`
          *,
          requester_slot:requester_slot_id(id, title, start_time, end_time, status),
          target_slot:target_slot_id(id, title, start_time, end_time, status),
          requester:requester_id(id, name, email),
          target_user:target_user_id(id, name, email)
        `)
        .eq("target_user_id", user!.id)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });

      if (incomingError) throw incomingError;

      // Fetch outgoing requests
      const { data: outgoing, error: outgoingError } = await supabase
        .from("swap_requests")
        .select(`
          *,
          requester_slot:requester_slot_id(id, title, start_time, end_time, status),
          target_slot:target_slot_id(id, title, start_time, end_time, status),
          requester:requester_id(id, name, email),
          target_user:target_user_id(id, name, email)
        `)
        .eq("requester_id", user!.id)
        .order("created_at", { ascending: false });

      if (outgoingError) throw outgoingError;

      setIncomingRequests(incoming || []);
      setOutgoingRequests(outgoing || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const handleResponse = async (requestId: string, accepted: boolean) => {
    try {
      const request = incomingRequests.find((r) => r.id === requestId);
      if (!request) return;

      if (accepted) {
        // Swap the user_id of both events
        const { error: update1 } = await supabase
          .from("events")
          .update({ 
            user_id: request.target_user.id,
            status: "BUSY" 
          })
          .eq("id", request.requester_slot.id);

        if (update1) throw update1;

        const { error: update2 } = await supabase
          .from("events")
          .update({ 
            user_id: request.requester.id,
            status: "BUSY" 
          })
          .eq("id", request.target_slot.id);

        if (update2) throw update2;

        // Update swap request status
        const { error: requestError } = await supabase
          .from("swap_requests")
          .update({ status: "ACCEPTED" })
          .eq("id", requestId);

        if (requestError) throw requestError;

        toast.success("Swap accepted! Events have been exchanged.");
      } else {
        // Reject: Set both slots back to SWAPPABLE
        const { error: update1 } = await supabase
          .from("events")
          .update({ status: "SWAPPABLE" })
          .eq("id", request.requester_slot.id);

        if (update1) throw update1;

        const { error: update2 } = await supabase
          .from("events")
          .update({ status: "SWAPPABLE" })
          .eq("id", request.target_slot.id);

        if (update2) throw update2;

        // Update swap request status
        const { error: requestError } = await supabase
          .from("swap_requests")
          .update({ status: "REJECTED" })
          .eq("id", requestId);

        if (requestError) throw requestError;

        toast.success("Swap request rejected");
      }

      fetchRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to process request");
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
        <h1 className="text-3xl font-bold">Swap Requests</h1>
        <p className="text-muted-foreground">Manage your incoming and outgoing swap requests</p>
      </div>

      <Tabs defaultValue="incoming">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="incoming">
            Incoming ({incomingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="outgoing">
            Outgoing ({outgoingRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="space-y-4 mt-6">
          {incomingRequests.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No incoming swap requests</p>
            </div>
          ) : (
            incomingRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Swap Request from {request.requester.name}
                    </CardTitle>
                    <Badge variant="outline">Pending</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">They offer:</p>
                      <EventCard event={request.requester_slot} showStatus={false} />
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowLeftRight className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">For your:</p>
                      <EventCard event={request.target_slot} showStatus={false} />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleResponse(request.id, true)}
                      className="flex-1"
                    >
                      Accept Swap
                    </Button>
                    <Button
                      onClick={() => handleResponse(request.id, false)}
                      variant="destructive"
                      className="flex-1"
                    >
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="outgoing" className="space-y-4 mt-6">
          {outgoingRequests.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No outgoing swap requests</p>
            </div>
          ) : (
            outgoingRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Swap Request to {request.target_user.name}
                    </CardTitle>
                    <Badge
                      className={
                        request.status === "ACCEPTED"
                          ? "bg-success text-success-foreground"
                          : request.status === "REJECTED"
                          ? "bg-destructive text-destructive-foreground"
                          : ""
                      }
                    >
                      {request.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-2">You offered:</p>
                      <EventCard event={request.requester_slot} showStatus={false} />
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowLeftRight className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">For their:</p>
                      <EventCard event={request.target_slot} showStatus={false} />
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
