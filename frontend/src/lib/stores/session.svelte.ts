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
  private isPageVisible = $state(true);
  private lastSessionCheck = 0;
  private isPaused = $state(false);

  // Dynamic session configuration from database
  private sessionTimeoutMinutes = $state(480); // Changed default to 8 hours
  
  // Session expiry thresholds - INCREASED INTERVALS
  private readonly WARNING_TIME = 60 * 1000; // 1 minute before expiry
  private readonly CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes instead of 5
  private readonly CACHE_DURATION = 5 * 60 * 1000; // Cache for 5 minutes instead of 2

  // Dynamic idle timeout based on session timeout
  get IDLE_TIMEOUT() {
    return Math.min(this.sessionTimeoutMinutes * 60 * 1000 * 0.75, 30 * 60 * 1000);
  }
  
  get IDLE_WARNING_TIME() {
    return Math.max(this.IDLE_TIMEOUT - (5 * 60 * 1000), this.IDLE_TIMEOUT * 0.75);
  }

  get timeoutMinutes() {
    return this.sessionTimeoutMinutes;
  }
  
  private readonly IDLE_CHECK_INTERVAL = 5000; // Check idle status every 5 seconds (was 1 second)
  
  // Activity events to monitor
  private readonly ACTIVITY_EVENTS = [
    'mousedown', 'mousemove', 'keypress', 'scroll', 
    'touchstart', 'click', 'keydown', 'wheel'
  ];
  
  // Getters remain the same...
  get isWarningShown() { return this.showWarning; }
  get isIdleWarningShown() { return this.showIdleWarning; }
  get isTimeoutModalShown() { return this.showTimeoutModal; }
  get remainingTime() { return this.timeRemaining; }
  get idleRemainingTime() { return this.idleTimeRemaining; }
  
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
    
    // Add page visibility listener
    this.addPageVisibilityListener();
    
    // Load session configuration from database first (only log if fails)
    await this.loadSessionConfig();
    
    // Start session expiry monitoring
    this.checkSession();
    this.checkInterval = setInterval(() => {
      // Only check if page is visible and not paused
      if (this.isPageVisible && !this.isPaused && this.isUserActive()) {
        this.checkSession();
      }
    }, this.CHECK_INTERVAL);
    
    // Start idle monitoring with updated configuration
    this.startIdleMonitoring();
  }
  
  /**
   * Pause session monitoring (useful for admin pages)
   */
  pauseMonitoring() {
    this.isPaused = true;
  }

  /**
   * Resume session monitoring
   */
  resumeMonitoring() {
    this.isPaused = false;
  }

  /**
   * Add page visibility listener to pause checking when tab is not active
   */
  private addPageVisibilityListener() {
    const handleVisibilityChange = () => {
      this.isPageVisible = !document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  /**
   * Check if user has been active recently
   */
  private isUserActive(): boolean {
    const timeSinceActivity = Date.now() - this.lastActivity;
    return timeSinceActivity < (10 * 60 * 1000); // Active within last 10 minutes
  }
  
  /**
   * Stop all monitoring
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this.stopIdleMonitoring();
    
    this.showWarning = false;
    this.warningShown = false;
    this.timeRemaining = 0;
  }
  
  /**
   * Start monitoring user activity for idle timeout
   */
  private startIdleMonitoring() {
    this.lastActivity = Date.now();
    this.stopIdleMonitoring();
    
    this.ACTIVITY_EVENTS.forEach(event => {
      const listener = () => this.handleActivity();
      document.addEventListener(event, listener, { passive: true, capture: true });
      this.activityListeners.push(() => {
        document.removeEventListener(event, listener, true);
      });
    });
    
    this.idleTimer = setInterval(() => {
      this.checkIdleStatus();
    }, this.IDLE_CHECK_INTERVAL);
  }

  /**
   * Stop idle monitoring
   */
  private stopIdleMonitoring() {
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
    
    this.activityListeners.forEach(removeListener => removeListener());
    this.activityListeners = [];
    
    this.showIdleWarning = false;
    this.idleTimeRemaining = 0;
  }

  /**
   * Handle user activity - reset idle timer
   */
  private handleActivity = () => {
    this.lastActivity = Date.now();
    
    if (this.showIdleWarning) {
      this.showIdleWarning = false;
    }
  };
  
  /**
   * Check current session status with silent operation
   */
  private async checkSession() {
    if (this.isPaused) {
      return; // Skip check if paused
    }

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
      
      const now = Date.now();
      
      // Enhanced caching - check if cache is still valid
      if (now - this.lastSessionCheck < this.CACHE_DURATION) {
        const cachedSession = localStorage.getItem('session_cache');
        if (cachedSession) {
          try {
            const sessionData = JSON.parse(cachedSession);
            const expiresAt = new Date(sessionData.expiresAt).getTime();
            
            // Only use cache if session hasn't expired
            if (expiresAt > now) {
              this.timeRemaining = Math.max(0, expiresAt - now);
              return; // Skip server call - use cached data
            } else {
              // Cache shows expired session, clear it and check server
              localStorage.removeItem('session_cache');
            }
          } catch (error) {
            localStorage.removeItem('session_cache');
          }
        }
      }

      // Make server call only when necessary
      const response = await apiClient.get<{ ok: boolean; data: SessionInfo }>(
        API_CONFIG.endpoints.auth.sessionInfo
      );
      
      if (!response.ok || !response.data) {
        // Silent logout for expired sessions - no console logs
        await this.handleSessionExpired();
        return;
      }
      
      const { timeRemaining, sessionTimeout } = response.data;
      
      // Cache the response with current timestamp
      localStorage.setItem('session_cache', JSON.stringify({
        expiresAt: response.data.expiresAt,
        cachedAt: now,
        timeRemaining
      }));
      
      this.lastSessionCheck = now;
      
      // Update session timeout if provided
      if (sessionTimeout && sessionTimeout > 0) {
        this.sessionTimeoutMinutes = sessionTimeout;
      }
      
      this.timeRemaining = timeRemaining;
      
      // Show warning if within warning time and not already shown
      if (timeRemaining <= this.WARNING_TIME && timeRemaining > 0 && !this.warningShown) {
        this.showWarning = true;
        this.warningShown = true;
        // Removed console.log for cleaner terminal
      }
      
      // Auto-logout if session expired
      if (timeRemaining <= 0) {
        // Removed console.log for cleaner terminal
        await this.handleSessionExpired();
      }
      
    } catch (error) {
      // Complete silence for session errors
      // The session will continue to work, just skip this check
    }
  }
  
  /**
   * Extend the current session
   */
  async extendSession() {
    try {
      const response = await apiClient.post<{ ok: boolean; data: SessionInfo }>(
        API_CONFIG.endpoints.auth.refreshSession,
        {}
      );
      
      if (response.ok) { // Fixed: Added missing opening parenthesis
        this.showWarning = false;
        this.warningShown = false;
        this.timeRemaining = response.data.timeRemaining;
        
        // Clear cache so next check gets fresh data
        localStorage.removeItem('session_cache');
        this.lastSessionCheck = 0;
        
        this.resetIdleTimer();
        
        return true;
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Handle session expiry
   */
  private async handleSessionExpired() {
    this.stopMonitoring();
    await apiClient.logout();
    await goto('/login?reason=expired');
  }
  
  /**
   * Dismiss the session warning
   */
  dismissWarning() {
    this.showWarning = false;
  }
  
  /**
   * Dismiss the idle warning and reset idle timer
   */
  dismissIdleWarning() {
    this.showIdleWarning = false;
    this.lastActivity = Date.now();
  }
  
  /**
   * Keep session active (for idle warning modal)
   */
  keepActive() {
    this.dismissIdleWarning();
    this.extendSession();
  }

  /**
   * Reset idle timer and last activity timestamp
   */
  private resetIdleTimer() {
    this.lastActivity = Date.now();
    this.idleTimeRemaining = this.IDLE_TIMEOUT;
    this.showIdleWarning = false;
  }

  /**
   * Check idle status
   */
  private checkIdleStatus() {
    const now = Date.now();
    const timeSinceActivity = now - this.lastActivity;
    
    this.idleTimeRemaining = Math.max(0, this.IDLE_TIMEOUT - timeSinceActivity);
    
    if (timeSinceActivity >= this.IDLE_WARNING_TIME && !this.showIdleWarning) {
      this.showIdleWarning = true;
    }
    
    if (timeSinceActivity >= this.IDLE_TIMEOUT) {
      this.handleIdleTimeout();
    }
  }

  /**
   * Handle idle timeout - show timeout modal then logout
   */
  private async handleIdleTimeout() {
    this.stopMonitoring();
    this.showTimeoutModal = true;
  }

  /**
   * Dismiss timeout modal and logout user
   */
  dismissTimeoutModal() {
    this.showTimeoutModal = false;
    
    authStore.update(store => {
      store.logout();
      return store;
    });
    
    goto('/login?reason=idle');
  }

  /**
   * Load session configuration from database - SILENT OPERATION
   */
  private async loadSessionConfig() {
    try {
      const response = await apiClient.get<{ success: boolean; data: string }>(
        '/api/v1/global-settings/general'
      );
      
      if (response.success && response.data) {
        const settings: GlobalSettings = typeof response.data === 'string' 
          ? JSON.parse(response.data) 
          : response.data;
        
        if (settings.sessionTimeout && settings.sessionTimeout > 0) {
          this.sessionTimeoutMinutes = settings.sessionTimeout;
        }
      }
    } catch (error) {
      // Silent operation - keep defaults if config loading fails
    }
  }
}

export const sessionManager = new SessionManager();