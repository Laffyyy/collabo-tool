import { writable } from 'svelte/store';
import { goto } from '$app/navigation';
import { authStore } from './auth.svelte';
import { apiClient } from '$lib/api/client';
import { API_CONFIG } from '$lib/api/config';

interface SessionInfo {
  expiresAt: string;
  timeRemaining: number;
  isActive: boolean;
  sessionTimeout: number; 
}

interface GlobalSettings {
  sessionTimeout: number;
  dateFormat: string;
  timeFormat: string;
  maxLoginAttempts: number;
  passwordPolicy: any;
}

class SessionManager {
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private warningShown = $state(false);
  private timeRemaining = $state(0);
  private showWarning = $state(false);
  private showTimeoutModal = $state(false);
  private idleTimeRemaining = $state(0);
  private showIdleWarning = $state(false);
  private activityListeners: (() => void)[] = [];
  private lastActivity: number = Date.now();

// Dynamic session configuration from database
  private sessionTimeoutMinutes = $state(10);
  
  // Session expiry thresholds
  private readonly WARNING_TIME = 60 * 1000; // 1 minute before expiry
  private readonly CHECK_INTERVAL = 10 * 1000; // Check every 10 seconds
  

  // Dynamic idle timeout based on session timeout
  get IDLE_TIMEOUT() {
    // Set idle timeout to 75% of session timeout (converted to milliseconds)
    return Math.min(this.sessionTimeoutMinutes * 60 * 1000 * 0.75, 30 * 60 * 1000); // Max 30 minutes idle
  }
  
  get IDLE_WARNING_TIME() {
    // Warning 5 minutes before idle timeout
    return Math.max(this.IDLE_TIMEOUT - (5 * 60 * 1000), this.IDLE_TIMEOUT * 0.75);
  }

  get timeoutMinutes() {
    return this.sessionTimeoutMinutes;
  }
  
  private readonly IDLE_CHECK_INTERVAL = 1000; // Check idle status every second
  
  // Activity events to monitor
  private readonly ACTIVITY_EVENTS = [
    'mousedown', 'mousemove', 'keypress', 'scroll', 
    'touchstart', 'click', 'keydown', 'wheel'
  ];
  
  get isWarningShown() {
    return this.showWarning;
  }
  
  get isIdleWarningShown() {
    return this.showIdleWarning;
  }

  get isTimeoutModalShown() { // Add this getter
    return this.showTimeoutModal;
  }
  
  get remainingTime() {
    return this.timeRemaining;
  }
  
  get idleRemainingTime() {
    return this.idleTimeRemaining;
  }
  
  get formattedTime() {
    const minutes = Math.floor(this.timeRemaining / (1000 * 60));
    const seconds = Math.floor((this.timeRemaining % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  get formattedIdleTime() {
    const seconds = Math.floor(this.idleTimeRemaining / 1000);
    return `${seconds}`;
  }
  
  /**
   * Start monitoring session expiry and idle timeout
   */
  async startMonitoring() {
    if (this.checkInterval) {
      this.stopMonitoring();
    }
    
    console.log('[Session Manager] Starting session and idle monitoring');
    
    // Load session configuration from database first
    await this.loadSessionConfig();
    
    // Start session expiry monitoring
    this.checkSession();
    this.checkInterval = setInterval(() => {
      this.checkSession();
    }, this.CHECK_INTERVAL);
    
    // Start idle monitoring with updated configuration
    this.startIdleMonitoring();
  }
  
  /**
   * Stop all monitoring
   */
  stopMonitoring() {
    // Stop session monitoring
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    // Stop idle monitoring
    this.stopIdleMonitoring();
    
    this.showWarning = false;
    this.warningShown = false;
    this.timeRemaining = 0;
    
    console.log('[Session Manager] Stopped all monitoring');
  }
  
  
  /**
   * Start monitoring user activity for idle timeout
   */
  private startIdleMonitoring() {
    console.log('🟢 Starting idle monitoring');
    
    // Initialize last activity
    this.lastActivity = Date.now();
    
    // Remove any existing listeners first
    this.stopIdleMonitoring();
    
    // Add event listeners for user activity
    this.ACTIVITY_EVENTS.forEach(event => {
      const listener = () => this.handleActivity();
      document.addEventListener(event, listener, { passive: true, capture: true });
      this.activityListeners.push(() => {
        document.removeEventListener(event, listener, true);
      });
      console.log(`👂 Added listener for: ${event}`);
    });
    
    // Start checking idle status every second
    this.idleTimer = setInterval(() => {
      this.checkIdleStatus();
    }, this.IDLE_CHECK_INTERVAL);
    
    console.log(`⏰ Idle monitoring started - Warning at ${this.IDLE_WARNING_TIME/1000}s, Timeout at ${this.IDLE_TIMEOUT/1000}s`);
  }

  /**
   * Stop idle monitoring
   */
  private stopIdleMonitoring() {
    console.log('🔴 Stopping idle monitoring');
    
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
    
    // Remove all activity listeners
    this.activityListeners.forEach(removeListener => removeListener());
    this.activityListeners = [];
    
    this.showIdleWarning = false;
    this.idleTimeRemaining = 0;
  }

  /**
   * Handle user activity - reset idle timer
   */
  private handleActivity = () => {
    console.log('🎯 Activity detected at:', new Date().toLocaleTimeString());
    this.lastActivity = Date.now();
    
    // Reset idle warning if it was showing
    if (this.showIdleWarning) {
      console.log('🔄 Resetting idle warning due to activity');
      this.showIdleWarning = false;
    }
  };
  
  
  /**
   * Check current session status (existing method)
   */
  private async checkSession() {
    try {
      // Only check if user is authenticated
      let isAuthenticated = false;
      authStore.subscribe(store => {
        isAuthenticated = store.isAuthenticated;
      })();
      if (!isAuthenticated) {
        this.stopMonitoring();
        return;
      }
      
      const response = await apiClient.get<{ ok: boolean; data: SessionInfo }>(
        API_CONFIG.endpoints.auth.sessionInfo
      );
      
      if (!response.ok || !response.data) {
        console.warn('[Session Manager] Invalid session response, logging out');
        await this.handleSessionExpired();
        return;
      }
      
      const { timeRemaining } = response.data;
      this.timeRemaining = timeRemaining;
      
      // Show warning if within warning time and not already shown
      if (timeRemaining <= this.WARNING_TIME && timeRemaining > 0 && !this.warningShown) {
        this.showWarning = true;
        this.warningShown = true;
        console.log(`[Session Manager] Session expires in ${Math.floor(timeRemaining / 1000)} seconds`);
      }
      
      // Auto-logout if session expired
      if (timeRemaining <= 0) {
        console.log('[Session Manager] Session expired, logging out');
        await this.handleSessionExpired();
      }
      
    } catch (error) {
      console.error('[Session Manager] Session check failed:', error);
      // Don't auto-logout on network errors, just log
    }
  }
  
  /**
   * Extend the current session (existing method)
   */
  async extendSession() {
    try {
      const response = await apiClient.post<{ ok: boolean; data: SessionInfo }>(
        API_CONFIG.endpoints.auth.refreshSession,
        {}
      );
      
      if (response.ok) {
        this.showWarning = false;
        this.warningShown = false;
        this.timeRemaining = response.data.timeRemaining;
        
        // Also reset idle timer when session is extended
        this.resetIdleTimer();
        
        console.log('[Session Manager] Session extended successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[Session Manager] Failed to extend session:', error);
      return false;
    }
  }
  
  /**
   * Handle session expiry (existing method)
   */
  private async handleSessionExpired() {
    this.stopMonitoring();
    
    // Logout user
    await apiClient.logout();
    
    // Navigate to login with session expired message
    await goto('/login?reason=expired');
  }
  
  /**
   * Dismiss the session warning (existing method)
   */
  dismissWarning() {
    this.showWarning = false;
  }
  
   /**
   * Dismiss the idle warning and reset idle timer
   */
  dismissIdleWarning() {
    console.log('✋ Dismissing idle warning');
    this.showIdleWarning = false;
    this.lastActivity = Date.now(); // Reset activity timer
  }
  
  /**
   * Keep session active (for idle warning modal)
   */
  keepActive() {
    console.log('🔄 Keeping session active');
    this.dismissIdleWarning();
    // Optionally extend session as well
    this.extendSession();
  }

  /**
   * Reset idle timer and last activity timestamp
   */
  private resetIdleTimer() {
    this.lastActivity = Date.now();
    this.idleTimeRemaining = this.IDLE_TIMEOUT;
    this.showIdleWarning = false;
    console.log('🔄 Idle timer reset');
  }



/**
   * Check idle status (called every second)
   */
  private checkIdleStatus() {
    const now = Date.now();
    const timeSinceActivity = now - this.lastActivity;
    
    console.log(`⏱️ Idle check - Time since activity: ${timeSinceActivity}ms (${Math.floor(timeSinceActivity/1000)}s)`);
    
    // Update remaining time for UI display
    this.idleTimeRemaining = Math.max(0, this.IDLE_TIMEOUT - timeSinceActivity);
    
    // Check if should show warning
    if (timeSinceActivity >= this.IDLE_WARNING_TIME && !this.showIdleWarning) {
      console.log('⚠️ Showing idle warning');
      this.showIdleWarning = true;
    }
    
    // Check if should logout
    if (timeSinceActivity >= this.IDLE_TIMEOUT) {
      console.log('🚪 Logging out due to idle timeout');
      this.handleIdleTimeout();
    }
  }

   /**
   * Handle idle timeout - show timeout modal then logout
   */
  private async handleIdleTimeout() {
    console.log('🚪 Session timed out due to inactivity');
    this.stopMonitoring();
    
    // Show timeout modal instead of immediate logout
    this.showTimeoutModal = true;
  }

  /**
   * Dismiss timeout modal and logout user
   */
  dismissTimeoutModal() {
    this.showTimeoutModal = false;
    
    // Logout user
    authStore.update(store => {
      store.logout();
      return store;
    });
    
    // Navigate to login with idle timeout message
    goto('/login?reason=idle');
  }

    /**
   * Load session configuration from database
   */
  private async loadSessionConfig() {
    try {
      console.log('[Session Manager] Loading session configuration from database');
      
      const response = await apiClient.get<{ success: boolean; data: string }>(
        '/api/v1/global-settings/general'
      );
      
      if (response.success && response.data) {
        const settings: GlobalSettings = typeof response.data === 'string' 
          ? JSON.parse(response.data) 
          : response.data;
        
        if (settings.sessionTimeout && settings.sessionTimeout > 0) {
          this.sessionTimeoutMinutes = settings.sessionTimeout;
          console.log(`[Session Manager] Session timeout configured to ${this.sessionTimeoutMinutes} minutes`);
          console.log(`[Session Manager] Idle timeout set to ${Math.floor(this.IDLE_TIMEOUT / 60000)} minutes`);
          console.log(`[Session Manager] Idle warning at ${Math.floor(this.IDLE_WARNING_TIME / 60000)} minutes`);
        }
      }
    } catch (error) {
      console.warn('[Session Manager] Failed to load session config, using defaults:', error);
      // Keep default values if API call fails
    }
  }

}



export const sessionManager = new SessionManager();