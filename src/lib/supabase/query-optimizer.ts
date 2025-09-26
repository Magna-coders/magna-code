import { supabase } from './client';
import type { PostgrestError } from '@supabase/supabase-js';

// Interface for cached data
interface CachedData<T = unknown> {
  data: T | null;
  timestamp: number;
  ttl: number;
}

// Cache for frequently accessed data
const queryCache = new Map<string, CachedData<unknown>>();

/**
 * Cached query wrapper to reduce redundant database calls
 */
export async function cachedQuery<T>(
  cacheKey: string,
  queryFn: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  ttlMs: number = 30000 // 30 seconds default
): Promise<{ data: T | null; error: PostgrestError | null }> {
  const cached = queryCache.get(cacheKey);
  const now = Date.now();

  // Return cached data if still valid
  if (cached && (now - cached.timestamp) < cached.ttl) {
    return { data: cached.data as T | null, error: null };
  }

  // Execute query
  const result = await queryFn();
  
  // Cache successful results
  if (!result.error && result.data) {
    queryCache.set(cacheKey, {
      data: result.data,
      timestamp: now,
      ttl: ttlMs
    });
  }

  return result;
}

/**
 * Optimized conversation fetching with pagination and caching
 */
export async function getOptimizedConversations(userId: string, limit: number = 20, offset: number = 0) {
  const cacheKey = `conversations:${userId}:${limit}:${offset}`;
  
  return cachedQuery(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("friend_conversations")
        .select(`
          id,
          user1_id,
          user2_id,
          created_at
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      return { data, error };
    },
    60000 // 1 minute cache
  );
}

/**
 * Optimized message fetching with pagination
 */
export async function getOptimizedMessages(conversationId: string, limit: number = 50, offset: number = 0) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      sender_id,
      content,
      created_at,
      sender:users!inner(id, username, avatar_url)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { data: data?.reverse() || [], error };
}

/**
 * Optimized user profile fetching with caching
 */
export async function getOptimizedUserProfile(userId: string) {
  const cacheKey = `user_profile:${userId}`;
  
  return cachedQuery(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, avatar_url, bio")
        .eq("id", userId)
        .single();

      return { data, error };
    },
    300000 // 5 minutes cache for user profiles
  );
}

/**
 * Clear cache for specific keys or all cache
 */
export function clearCache(pattern?: string): void {
  if (pattern) {
    for (const key of queryCache.keys()) {
      if (key.includes(pattern)) {
        queryCache.delete(key);
      }
    }
  } else {
    queryCache.clear();
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  return {
    size: queryCache.size,
    keys: Array.from(queryCache.keys()),
    totalMemory: JSON.stringify(Array.from(queryCache.values())).length
  };
}