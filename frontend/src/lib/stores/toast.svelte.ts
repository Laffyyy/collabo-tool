import { v4 as uuidv4 } from 'uuid';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

class ToastStore {
  // Changed to have a single toast instead of an array
  currentToast = $state<Toast | null>(null);
  
  show(message: string, type: ToastType = 'info', duration: number = 5000) {
    const id = uuidv4();
    
    // Clear any existing toast timer
    if (this.currentToast) {
      this.dismiss(this.currentToast.id);
    }
    
    // Set the new toast
    this.currentToast = { id, type, message, duration };
    
    return id;
  }
  
  success(message: string, duration: number = 5000) {
    return this.show(message, 'success', duration);
  }
  
  error(message: string, duration: number = 5000) {
    return this.show(message, 'error', duration);
  }
  
  info(message: string, duration: number = 5000) {
    return this.show(message, 'info', duration);
  }
  
  dismiss(id: string) {
    // Only dismiss if the ID matches (or we don't care about the ID)
    if (this.currentToast && (this.currentToast.id === id || !id)) {
      this.currentToast = null;
    }
  }
  
  dismissAll() {
    this.currentToast = null;
  }
}

export const toastStore = new ToastStore();