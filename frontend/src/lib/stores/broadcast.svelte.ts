import { writable } from "svelte/store"

interface Broadcast {
  id: string
  title: string
  content: string
  priority: "low" | "medium" | "high"
  targetRoles: string[]
  targetOUs: string[]
  createdBy: string
  createdAt: Date
  scheduledFor?: Date
  requiresAcknowledgment: boolean
  eventDate?: Date
  acknowledgments: { userId: string; acknowledgedAt: Date; attending?: boolean }[]
  isActive: boolean
}

class BroadcastStore {
  broadcasts = $state<Broadcast[]>([]);
  templates = $state<any[]>([]);
  isLoading = $state(false);

  get sortedBroadcasts() {
    return this.broadcasts.sort((a, b) => {
      if (a.priority === "high" && b.priority !== "high") return -1
      if (b.priority === "high" && a.priority !== "high") return 1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    });
  }

  get unreadBroadcasts() {
    // For notification purposes - broadcasts from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.broadcasts.filter(b => 
      new Date(b.createdAt) > oneDayAgo && 
      b.isActive
    );
  }

  addBroadcast(broadcast: Broadcast) {
    this.broadcasts = [...this.broadcasts, broadcast];
  }

  setBroadcasts(broadcasts: Broadcast[]) {
    this.broadcasts = broadcasts;
  }

  acknowledgeBroadcast(broadcastId: string, userId: string, attending?: boolean) {
    this.broadcasts = this.broadcasts.map((b) => {
      if (b.id === broadcastId) {
        const existingAck = b.acknowledgments.find((a) => a.userId === userId)
        if (existingAck) {
          existingAck.attending = attending
        } else {
          b.acknowledgments.push({
            userId,
            acknowledgedAt: new Date(),
            attending,
          })
        }
      }
      return b
    });
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  // Initialize with mock data
  constructor() {
    this.broadcasts = [
      {
        id: "1",
        title: "Team Meeting Tomorrow",
        content: "Don't forget about our team meeting tomorrow at 2 PM in the conference room.",
        priority: "medium",
        targetRoles: ["admin", "manager", "supervisor"],
        targetOUs: ["Engineering"],
        createdBy: "admin",
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        requiresAcknowledgment: true,
        acknowledgments: [],
        isActive: true
      },
      {
        id: "2", 
        title: "System Maintenance Alert",
        content: "Scheduled system maintenance will occur this weekend. Please save your work frequently.",
        priority: "high",
        targetRoles: ["admin", "manager", "supervisor", "support", "frontline"],
        targetOUs: ["All"],
        createdBy: "admin",
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        requiresAcknowledgment: false,
        acknowledgments: [],
        isActive: true
      }
    ];
  }
}

export const broadcastStore = writable(new BroadcastStore());
