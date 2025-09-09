import { writable } from 'svelte/store';

type BroadcastTargetType = 'role' | 'ou' | 'user';

interface BroadcastTarget {
  dtargettype: BroadcastTargetType;
  dtargetid?: string | null;
  dtargetname: string;
}

export interface ReceivedBroadcast {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  createdBy: string;
  targets: BroadcastTarget[];
  requiresAcknowledgment: boolean;
  status: 'active' | 'archived';
}

class ReceivedBroadcastsStore {
  broadcasts = $state<ReceivedBroadcast[]>([]);

  constructor() {
    // Demo data: each broadcast has targets like tblbroadcasttargets
    this.broadcasts = [
      {
        id: 'b1',
        title: 'System Maintenance',
        content: 'Scheduled maintenance on Friday at 10pm.',
        priority: 'high',
        createdAt: new Date('2025-08-20T09:00:00Z'),
        createdBy: 'admin',
        targets: [
          { dtargettype: 'role', dtargetname: 'manager' },
          { dtargettype: 'role', dtargetname: 'support' }
        ],
        requiresAcknowledgment: true,
        status: 'active'
      },
      {
        id: 'b2',
        title: 'Team Lunch',
        content: 'Lunch for all support staff next Wednesday.',
        priority: 'medium',
        createdAt: new Date('2025-08-18T12:00:00Z'),
        createdBy: 'supervisor',
        targets: [
          { dtargettype: 'role', dtargetname: 'support' }
        ],
        requiresAcknowledgment: false,
        status: 'archived'
      },
      {
        id: 'b3',
        title: 'Admin Only Notice',
        content: 'Admins meeting at 3pm.',
        priority: 'high',
        createdAt: new Date('2025-08-19T15:00:00Z'),
        createdBy: 'admin',
        targets: [
          { dtargettype: 'role', dtargetname: 'admin' }
        ],
        requiresAcknowledgment: false,
        status: 'active'
      }
    ];
  }

  // Returns broadcasts where any target is type 'role' and dtargetname matches userRole
  getForRole(userRole: string) {
    return this.broadcasts.filter(b =>
      b.targets.some(
        t => t.dtargettype === 'role' && t.dtargetname === userRole
      )
    );
  }
}

export const receivedBroadcastsStore = writable(new ReceivedBroadcastsStore());