## ✅ **Overview**
SlotSwapper is a calendar-based time-slot management tool that enables users to **swap events with others** in a controlled, secure way.  
Each user has calendar events, and they may mark some of them as *SWAPPABLE*. Other users can then browse available swappable slots and request an exchange.
## ✅ **Key Features**
### ✅ User Authentication (Supabase Auth)
- Email login  
- Auto-generated user profiles  
- Protected routes  

### ✅ Calendar Event Management
- Create calendar events  
- Mark event as **busy** or **swappable**  
- Update or delete events  

### ✅ Marketplace
- Browse swappable time slots from other users  
- View event details in card view  

### ✅ Swap Requests System
- Send swap requests  
- Incoming requests tab  
- Outgoing/history tab  
- Accept or reject swaps  

### ✅ Advanced Swap Logic (Server-side RPC)
- Only `start_time` and `end_time` are swapped  
- Event titles remain unchanged  
- Full RLS security  
- SQL functions with `SECURITY DEFINER`
## ✅ **Technology Stack**
### Frontend  
- React + TypeScript  
- Vite  
- TailwindCSS  
- shadcn/ui components  
- React Router  
- React Query  

### Backend  
- Supabase  
  - Auth  
  - Database  
  - Row Level Security  
  - RPC Functions (`perform_swap`, `reject_swap`) 
  
---

## ✅ **Setup & Installation**

### ✅ 1. Clone the repository
```bash
git clone https://github.com/your-username/SlotSwapper.git
cd SlotSwapper
npm install
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_public_anon_key
npm run dev

### ENVIRONMENT VARIABLES
| Variable                 | Description                       |
| ------------------------ | --------------------------------- |
| `VITE_SUPABASE_URL`      | Your Supabase project URL         |
| `VITE_SUPABASE_ANON_KEY` | Public anon key for client access |
✅ API Endpoints (Supabase RPC + Queries)
✅ Fetch User Events
GET /events?user_id={id}

✅ Create Event
POST /events
{
  title,
  start_time,
  end_time,
  status
}

✅ Mark Event Swappable
PATCH /events/{id}
{
  status: "SWAPPABLE"
}

✅ Fetch Marketplace Events
GET /events?status=SWAPPABLE

✅ Create Swap Request
POST /swap_requests
{
  requester_id,
  target_user_id,
  requester_slot_id,
  target_slot_id
}

✅ Accept Swap (RPC)
POST /rpc/perform_swap

✅ Reject Swap (RPC)
POST /rpc/reject_swap
✅ Challenges Faced
✅ 1. Complex Supabase Relationship Mapping

Supabase struggled with:

duplicate requester columns

ambiguous joins

multi-table embedding

✅ Solved by rewriting queries using lookup map merging.

✅ 2. Row Level Security Blocking RPC Updates

Supabase blocked event updates when swapping owners.
✅ Fixed using SECURITY DEFINER SQL functions.

✅ 3. Event Title Changing After Swap

Originally React was fetching stale event data.
✅ Fixed by adding timed re-fetch + correct mapping.

✅ 4. State Crashes (White Screen)

React crashed due to null EventCards.
✅ Fixed with safety checks.
