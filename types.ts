
export type PostStatus = 'publish' | 'draft' | 'pending' | 'trash';

export type UserRole = 'admin' | 'editor' | 'reviewer' | 'user';

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: PostStatus;
  author_id: string;
  created_at: string;
  updated_at: string;
  category_id?: string;
  featured_image?: string;
  type: 'post' | 'page';
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface UserProfile {
  id: string;
  display_name: string;
  username: string;
  bio?: string;
  avatar_url?: string;
  role: UserRole;
  status: 'active' | 'banned' | 'suspended';
}

export interface Comment {
  id: string;
  post_id: string;
  author_name: string;
  author_email: string;
  content: string;
  status: 'approved' | 'pending' | 'spam';
  created_at: string;
}
