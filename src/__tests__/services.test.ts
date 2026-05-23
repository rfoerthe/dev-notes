import { describe, it, expect, beforeEach } from 'vitest';
import { 
  seedAdminUser, 
  registerUser, 
  loginUser, 
  isUsernameAvailable, 
  isEmailAvailable,
  ADMIN_CREDENTIALS
} from '../services/authService';
import { 
  createBlog, 
  getBlogs, 
  calculateReadTime,
  updateBlog
} from '../services/blogService';
import { MOCK_USERS_KEY, MOCK_BLOGS_KEY, setMockData } from '../services/firebase';

describe('Developer\'s Blog Service Layer (Mock Mode)', () => {
  beforeEach(() => {
    // Clear localStorage mock databases before each test
    localStorage.clear();
    setMockData(MOCK_USERS_KEY, []);
    setMockData(MOCK_BLOGS_KEY, []);
  });

  describe('Authentication & User Management', () => {
    it('should successfully seed the predefined admin user', async () => {
      await seedAdminUser();
      
      const adminAvailable = await isUsernameAvailable(ADMIN_CREDENTIALS.username);
      expect(adminAvailable).toBe(false); // Admin should exist, so username is NOT available

      const emailAvailable = await isEmailAvailable(ADMIN_CREDENTIALS.email);
      expect(emailAvailable).toBe(false); // Email should be taken
    });

    it('should verify username and email availability correctly', async () => {
      const usernameAvailableBefore = await isUsernameAvailable('newdeveloper');
      expect(usernameAvailableBefore).toBe(true);

      await registerUser({
        firstName: 'John',
        lastName: 'Doe',
        username: 'newdeveloper',
        email: 'john@doe.com',
        password: 'Password123!'
      });

      const usernameAvailableAfter = await isUsernameAvailable('newdeveloper');
      expect(usernameAvailableAfter).toBe(false); // Now taken
    });

    it('should register a new user in "pending" status', async () => {
      const profile = await registerUser({
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        email: 'jane@smith.com',
        password: 'Password123!'
      });

      expect(profile.username).toBe('janesmith');
      expect(profile.status).toBe('pending'); // Must be pending
      expect(profile.role).toBe('user'); // Default role is user
    });

    it('should allow the predefined admin to log in successfully', async () => {
      await seedAdminUser();
      
      const profile = await loginUser(ADMIN_CREDENTIALS.username, ADMIN_CREDENTIALS.password);
      
      expect(profile.username).toBe(ADMIN_CREDENTIALS.username);
      expect(profile.role).toBe('admin');
      expect(profile.status).toBe('approved');
    });

    it('should prevent pending users from logging in', async () => {
      await registerUser({
        firstName: 'Max',
        lastName: 'Mustermann',
        username: 'maxdev',
        email: 'max@dev.com',
        password: 'Password123!'
      });

      // Attempting to log in as a pending user should throw an error
      await expect(loginUser('maxdev', 'Password123!')).rejects.toThrow(
        'Dein Account wurde noch nicht freigegeben. Bitte warte auf die Admin-Genehmigung.'
      );
    });

    it('should throw error for incorrect password or invalid user', async () => {
      await seedAdminUser();
      
      await expect(loginUser('admin', 'WrongPassword')).rejects.toThrow(
        'Ungültiger Benutzername oder Passwort.'
      );

      await expect(loginUser('nonexistentuser', 'SomePassword')).rejects.toThrow(
        'Ungültiger Benutzername oder Passwort.'
      );
    });
  });

  describe('Blog Management', () => {
    it('should calculate reading time accurately based on word count', () => {
      const shortText = 'React 19 is great.'; // 4 words
      expect(calculateReadTime(shortText)).toBe(1);

      // Create a text with ~300 words
      const words = Array(300).fill('word').join(' ');
      expect(calculateReadTime(words)).toBe(2); // 300 / 200 = 1.5 -> rounded up is 2 minutes
    });

    it('should successfully create and retrieve blog posts', async () => {
      await createBlog({
        title: 'Building Premium UIs with MUI',
        summary: 'Learn glassmorphism styling in MUI',
        content: 'This is a premium article about how to customize Material-UI with glassmorphism panels, gradients, and custom components.',
        tags: ['MUI', 'Design', 'React'],
        authorId: 'some-author-uid',
        authorName: 'Creative Dev'
      });

      const blogs = await getBlogs();
      expect(blogs.length).toBe(1);
      expect(blogs[0].title).toBe('Building Premium UIs with MUI');
      expect(blogs[0].readTime).toBe(1);
      expect(blogs[0].tags).toContain('MUI');
    });

    it('should successfully edit an existing blog post and recalculate reading time', async () => {
      const created = await createBlog({
        title: 'Original Title',
        summary: 'Original Summary',
        content: 'Short content.',
        tags: ['OriginalTag'],
        authorId: 'some-author-uid',
        authorName: 'Creative Dev'
      });

      expect(created.title).toBe('Original Title');
      expect(created.readTime).toBe(1);

      // Now update the blog post
      const updatedText = Array(450).fill('updated').join(' '); // 450 words -> 3 min read time
      const updated = await updateBlog({
        id: created.id,
        title: 'New Edited Title',
        summary: 'New Summary',
        content: updatedText,
        tags: ['NewTag', 'Edited']
      });

      expect(updated.id).toBe(created.id);
      expect(updated.title).toBe('New Edited Title');
      expect(updated.summary).toBe('New Summary');
      expect(updated.tags).toContain('Edited');
      expect(updated.readTime).toBe(3); // Recalculated reading time

      // Verify in list
      const blogs = await getBlogs();
      expect(blogs.length).toBe(1);
      expect(blogs[0].title).toBe('New Edited Title');
      expect(blogs[0].readTime).toBe(3);
    });
  });
});
