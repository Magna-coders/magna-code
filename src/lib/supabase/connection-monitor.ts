import { subscriptionManager } from './subscription-manager';
import { getCacheStats } from './query-optimizer';

interface CacheStats {
  size: number;
  keys: string[];
  totalMemory: number;
}

interface ConnectionStats {
  activeSubscriptions: number;
  cacheHits: number;
  cacheMisses: number;
  totalQueries: number;
  dataTransferred: number;
  lastActivity: Date;
}

class ConnectionMonitor {
  private static instance: ConnectionMonitor;
  private stats: ConnectionStats = {
    activeSubscriptions: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalQueries: 0,
    dataTransferred: 0,
    lastActivity: new Date()
  };

  static getInstance(): ConnectionMonitor {
    if (!ConnectionMonitor.instance) {
      ConnectionMonitor.instance = new ConnectionMonitor();
    }
    return ConnectionMonitor.instance;
  }

  /**
   * Track a database query
   */
  trackQuery(dataSize: number, fromCache: boolean = false): void {
    this.stats.totalQueries++;
    this.stats.dataTransferred += dataSize;
    this.stats.lastActivity = new Date();
    
    if (fromCache) {
      this.stats.cacheHits++;
    } else {
      this.stats.cacheMisses++;
    }
  }

  /**
   * Get current connection statistics
   */
  getStats(): ConnectionStats & { cacheStats: CacheStats } {
    return {
      ...this.stats,
      activeSubscriptions: subscriptionManager.getActiveSubscriptionCount(),
      cacheStats: getCacheStats()
    };
  }

  /**
   * Check if usage is within reasonable limits
   */
  checkUsageHealth(): {
    healthy: boolean;
    warnings: string[];
    recommendations: string[];
  } {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // Check subscription count
    if (this.stats.activeSubscriptions > 10) {
      warnings.push(`High subscription count: ${this.stats.activeSubscriptions}`);
      recommendations.push('Consider consolidating real-time subscriptions');
    }
    
    // Check cache hit ratio
    const cacheHitRatio = this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses);
    if (cacheHitRatio < 0.3) {
      warnings.push(`Low cache hit ratio: ${(cacheHitRatio * 100).toFixed(1)}%`);
      recommendations.push('Implement more aggressive caching strategies');
    }
    
    // Check data transfer
    if (this.stats.dataTransferred > 10 * 1024 * 1024) { // 10MB
      warnings.push(`High data transfer: ${(this.stats.dataTransferred / 1024 / 1024).toFixed(2)}MB`);
      recommendations.push('Implement pagination and reduce query payload sizes');
    }

    return {
      healthy: warnings.length === 0,
      warnings,
      recommendations
    };
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.stats = {
      activeSubscriptions: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalQueries: 0,
      dataTransferred: 0,
      lastActivity: new Date()
    };
  }

  /**
   * Log usage report to console (for development)
   */
  logReport(): void {
    const stats = this.getStats();
    const health = this.checkUsageHealth();
    
    console.group('🔍 Supabase Usage Report');
    console.log('📊 Statistics:', stats);
    console.log('🏥 Health Check:', health);
    
    if (health.warnings.length > 0) {
      console.warn('⚠️ Warnings:', health.warnings);
      console.info('💡 Recommendations:', health.recommendations);
    }
    
    console.groupEnd();
  }
}

export const connectionMonitor = ConnectionMonitor.getInstance();

// Auto-log report every 5 minutes in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    connectionMonitor.logReport();
  }, 5 * 60 * 1000);
}