import type { UserProfile } from './authService';
import type { BlogPost } from './blogService';

export function canManageBlogPost(blog: BlogPost, userProfile: UserProfile | null): boolean {
  if (!userProfile) {
    return false;
  }

  return userProfile.role === 'admin' || blog.authorUsername === userProfile.username;
}
