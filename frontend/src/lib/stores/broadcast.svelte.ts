// src/lib/stores/broadcast.svelte.ts
import { writable } from 'svelte/store';
import { receivedBroadcastAPI } from '$lib/api/received-broadcasts';
import type { ReceivedBroadcast } from '$lib/api/types';

interface BroadcastNotification {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  requiresAcknowledgment: boolean;
  responseType: string;
  targetRoles?: string[];
  isRead: boolean;
  readAt?: Date;
}

class BroadcastStore {
  notifications = $state<BroadcastNotification[]>([]);
  isLoading = $state(false);
  lastFetchTime = $state<Date>(new Date());

  constructor() {
    // Initialize with any stored data
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  // Get unread notifications (for badge count)
  get unreadBroadcasts() {
    return this.notifications.filter(n => !n.isRead);
  }

  // Get visible notifications (not older than 2 days)
  get visibleNotifications() {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    return this.notifications.filter(n => n.createdAt > twoDaysAgo);
  }

  async loadReceivedBroadcasts() {
    // Don't run on server side
    if (typeof window === 'undefined') return;
    
    if (this.isLoading) return; // Prevent multiple simultaneous calls
    
    this.isLoading = true;
    
    try {
      const response = await receivedBroadcastAPI.getReceivedBroadcasts({
        limit: 20, // Get more broadcasts to cover 2-day window
        page: 1
      });

      if (response.success && response.broadcasts) {
        // Filter to only show broadcasts from last 2 days
        const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
        
        const recentBroadcasts = response.broadcasts
          .filter(broadcast => {
            const broadcastDate = new Date(broadcast.createdAt);
            return broadcastDate > twoDaysAgo;
          })
          .slice(0, 10) // Limit to 10 most recent for performance
          .map(broadcast => {
            const existingNotification = this.notifications.find(n => n.id === broadcast.id);
            return {
              id: broadcast.id,
              title: broadcast.title,
              content: broadcast.content,
              priority: broadcast.priority,
              createdAt: new Date(broadcast.createdAt),
              requiresAcknowledgment: broadcast.requiresAcknowledgment || false,
              responseType: broadcast.responseType || 'none',
              targetRoles: broadcast.targetRoles,
              // Preserve existing read status if notification already exists
              isRead: existingNotification?.isRead || false,
              readAt: existingNotification?.readAt
            };
          });

        this.notifications = recentBroadcasts;
        this.lastFetchTime = new Date();
        this.saveToStorage();
      }
    } catch (error) {
      console.error('Error loading received broadcasts for notifications:', error);
      // Don't throw error to prevent breaking other functionality
    } finally {
      this.isLoading = false;
    }
  }

  markAsRead(broadcastId: string) {
    const notification = this.notifications.find(n => n.id === broadcastId);
    if (notification && !notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      this.markReadInStorage(broadcastId);
      this.saveToStorage();
    }
  }

  markAllAsRead() {
    const unreadNotifications = this.notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) return;
    
    const now = new Date();
    unreadNotifications.forEach(notification => {
      notification.isRead = true;
      notification.readAt = now;
      this.markReadInStorage(notification.id);
    });
    
    this.saveToStorage();
  }

  private markReadInStorage(broadcastId: string) {
    if (typeof window === 'undefined') return;
    try {
      const readBroadcasts = JSON.parse(localStorage.getItem('readBroadcastNotifications') || '[]');
      if (!readBroadcasts.includes(broadcastId)) {
        readBroadcasts.push(broadcastId);
        localStorage.setItem('readBroadcastNotifications', JSON.stringify(readBroadcasts));
      }
    } catch (error) {
      console.error('Error saving read status:', error);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('broadcastNotifications', JSON.stringify({
        notifications: this.notifications,
        lastFetchTime: this.lastFetchTime.toISOString()
      }));
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('broadcastNotifications');
      if (stored) {
        const data = JSON.parse(stored);
        this.notifications = data.notifications?.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          readAt: n.readAt ? new Date(n.readAt) : undefined
        })) || [];
        this.lastFetchTime = data.lastFetchTime ? new Date(data.lastFetchTime) : new Date();
      }
    } catch (error) {
      console.error('Error loading broadcast notifications from storage:', error);
      // Reset to defaults on error
      this.notifications = [];
      this.lastFetchTime = new Date();
    }
  }
}

export const broadcastStore = writable(new BroadcastStore());