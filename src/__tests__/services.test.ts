import { describe, it, expect, beforeEach } from 'vitest';
import { 
  registerUser, 
  loginUser, 
  isUsernameAvailable, 
  isEmailAvailable,
  hashPassword,
  bootstrapMockAdmin,
  canBootstrapMockAdmin,
  updateUserProfile,
  deleteUserRegistration
} from '../services/authService';
import { 
  createBlog, 
  getBlogs, 
  calculateReadTime,
  updateBlog,
  deleteBlog
} from '../services/blogService';
import { MOCK_USERS_KEY, MOCK_BLOGS_KEY, setMockData } from '../services/firebase';

const seedApprovedMockUser = async () => {
  const user = {
    uid: 'approved-user-uid',
    firstName: 'Approved',
    lastName: 'User',
    username: 'approveduser',
    email: 'approved@example.com',
    role: 'user' as const,
    status: 'approved' as const,
    createdAt: new Date().toISOString()
  };

  setMockData(MOCK_USERS_KEY, [user]);
  setMockData('devblog_mock_usernames', { [user.username]: user.uid });
  setMockData('devblog_mock_passwords', {
    [user.email]: await hashPassword('Password123!')
  });

  return user;
};

describe('Developer\'s Blog Service Layer (Mock Mode)', () => {
  beforeEach(() => {
    // Clear localStorage mock databases before each test
    localStorage.clear();
    setMockData(MOCK_USERS_KEY, []);
    setMockData(MOCK_BLOGS_KEY, []);
  });

  describe('Authentication & User Management', () => {
    it('should bootstrap a local mock admin with a self-assigned password', async () => {
      expect(canBootstrapMockAdmin()).toBe(true);

      const admin = await bootstrapMockAdmin({
        firstName: 'Local',
        lastName: 'Admin',
        username: 'admin',
        email: 'admin@example.local',
        password: 'LocalPassword123!'
      });

      expect(admin.role).toBe('admin');
      expect(admin.status).toBe('approved');
      expect(canBootstrapMockAdmin()).toBe(false);

      const profile = await loginUser('admin', 'LocalPassword123!');
      expect(profile.role).toBe('admin');

      const rawPasswords = localStorage.getItem('devblog_mock_passwords');
      const passwords = JSON.parse(rawPasswords!);
      expect(passwords['admin@example.local']).not.toBe('LocalPassword123!');
      expect(passwords['admin@example.local']).toHaveLength(64);
    });

    it('should not bootstrap a second local mock admin', async () => {
      await bootstrapMockAdmin({
        firstName: 'Local',
        lastName: 'Admin',
        username: 'admin',
        email: 'admin@example.local',
        password: 'LocalPassword123!'
      });

      await expect(
        bootstrapMockAdmin({
          firstName: 'Second',
          lastName: 'Admin',
          username: 'admin2',
          email: 'admin2@example.local',
          password: 'LocalPassword123!'
        })
      ).rejects.toThrow('Es existiert bereits ein lokaler Admin-Benutzer.');
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

    it('should allow approved users to log in successfully', async () => {
      const approvedUser = await seedApprovedMockUser();
      const profile = await loginUser(approvedUser.username, 'Password123!');
      
      expect(profile.username).toBe(approvedUser.username);
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
      await seedApprovedMockUser();
      
      await expect(loginUser('approveduser', 'WrongPassword')).rejects.toThrow(
        'Ungültiger Benutzername oder Passwort.'
      );

      await expect(loginUser('nonexistentuser', 'SomePassword')).rejects.toThrow(
        'Ungültiger Benutzername oder Passwort.'
      );
    });

    it('should permanently delete a rejected user registration and free up their username and email', async () => {
      const profile = await registerUser({
        firstName: 'Rejected',
        lastName: 'Dev',
        username: 'rejecteddev',
        email: 'rejected@dev.com',
        password: 'Password123!'
      });

      // Confirm registration exists and is pending
      expect(profile.username).toBe('rejecteddev');
      expect(await isUsernameAvailable('rejecteddev')).toBe(false);
      expect(await isEmailAvailable('rejected@dev.com')).toBe(false);

      // Permanently delete registration
      await deleteUserRegistration(profile.uid, profile.username);

      // Verify profile is removed and username + email are available again
      expect(await isUsernameAvailable('rejecteddev')).toBe(true);
      expect(await isEmailAvailable('rejected@dev.com')).toBe(true);
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

    it('should successfully delete an existing blog post', async () => {
      const created = await createBlog({
        title: 'Delete Me',
        summary: 'This post should be deleted',
        content: 'Temporary content.',
        tags: ['Temporary'],
        authorId: 'some-author-uid',
        authorName: 'Creative Dev'
      });

      expect((await getBlogs()).length).toBe(1);

      await deleteBlog(created.id);

      const remainingBlogs = await getBlogs();
      expect(remainingBlogs.some(blog => blog.id === created.id)).toBe(false);
    });

    it('should update author names on existing blog posts when the profile name changes', async () => {
      const profile = await registerUser({
        firstName: 'Old',
        lastName: 'Author',
        username: 'oldauthor',
        email: 'old@author.com',
        password: 'Password123!'
      });

      const created = await createBlog({
        title: 'Author Snapshot',
        summary: 'The author name should follow profile changes',
        content: 'A short post.',
        tags: ['Profile'],
        authorId: profile.uid,
        authorName: 'Old Author'
      });

      await updateUserProfile({
        uid: profile.uid,
        firstName: 'New',
        lastName: 'Author'
      });

      const blogs = await getBlogs();
      const updatedBlog = blogs.find(blog => blog.id === created.id);

      expect(updatedBlog?.authorName).toBe('New Author');
    });
  });

  describe('Security & Hashing (Mock Mode)', () => {
    it('should hash passwords and never store them in plain text', async () => {
      await registerUser({
        firstName: 'Secure',
        lastName: 'Dev',
        username: 'securedev',
        email: 'secure@dev.com',
        password: 'MySecretPassword123!'
      });

      // Retrieve local passwords database
      const rawPasswords = localStorage.getItem('devblog_mock_passwords');
      expect(rawPasswords).toBeTruthy();

      const passwords = JSON.parse(rawPasswords!);
      const storedPassword = passwords['secure@dev.com'];

      // Password must be hashed (64-char hex string) and NOT plain text
      expect(storedPassword).not.toBe('MySecretPassword123!');
      expect(storedPassword).toHaveLength(64); // SHA-256 is 64 hex characters
      expect(storedPassword).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should enforce default role and pending status on user registration', async () => {
      const profile = await registerUser({
        firstName: 'Jane',
        lastName: 'Doe',
        username: 'janedoe',
        email: 'jane@doe.com',
        password: 'Password123!'
      });

      // In alignment with firestore.rules 'create' security checks,
      // registered users MUST be forced to 'user' role and 'pending' status.
      expect(profile.role).toBe('user');
      expect(profile.status).toBe('pending');
    });

    it('should block registration if username is already reserved', async () => {
      await registerUser({
        firstName: 'First',
        lastName: 'User',
        username: 'duplicate',
        email: 'first@user.com',
        password: 'Password123!'
      });

      // Attempt to register another account with the same username
      await expect(
        registerUser({
          firstName: 'Second',
          lastName: 'User',
          username: 'duplicate',
          email: 'second@user.com',
          password: 'Password123!'
        })
      ).rejects.toThrow('Dieser Benutzername ist bereits vergeben.');
    });

    it('should successfully update user profile names and secure password hashing', async () => {
      const profile = await registerUser({
        firstName: 'OldFirst',
        lastName: 'OldLast',
        username: 'updatable',
        email: 'update@profile.com',
        password: 'OldPassword123!'
      });

      expect(profile.firstName).toBe('OldFirst');

      // Update name and password
      await updateUserProfile({
        uid: profile.uid,
        firstName: 'NewFirst',
        lastName: 'NewLast',
        newPassword: 'NewPassword123!'
      });

      // Fetch the mock user profile directly
      const rawUsers = localStorage.getItem('devblog_mock_users');
      const users = JSON.parse(rawUsers!);
      const updatedUser = users.find((u: any) => u.uid === profile.uid);

      expect(updatedUser.firstName).toBe('NewFirst');
      expect(updatedUser.lastName).toBe('NewLast');
      expect(updatedUser.username).toBe('updatable'); // Should remain unchanged
      expect(updatedUser.email).toBe('update@profile.com'); // Should remain unchanged

      // Validate the hashed password
      const rawPasswords = localStorage.getItem('devblog_mock_passwords');
      const passwords = JSON.parse(rawPasswords!);
      const storedPasswordHash = passwords['update@profile.com'];

      const expectedNewHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode('NewPassword123!')
      ).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));

      expect(storedPasswordHash).toBe(expectedNewHash);
      expect(storedPasswordHash).not.toBe('NewPassword123!');
    });
  });
});
