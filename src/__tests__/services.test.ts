import { describe, it, expect, beforeEach } from 'vitest';
import { 
  registerUser, 
  loginUser, 
  isUsernameAvailable, 
  isEmailAvailable,
  hashPassword,
  bootstrapMockAdmin,
  canBootstrapMockAdmin,
  resetMockAdmin,
  updateUserProfile,
  deleteUserRegistration,
  getUserProfile
} from '../services/authService';
import { 
  createBlog, 
  getBlogs, 
  getBlogsByAuthorUsername,
  calculateReadTime,
  updateBlog,
  deleteBlog,
  deleteBlogs,
  sortBlogPostsNewestFirst
} from '../services/blogService';
import { MOCK_USERS_KEY, MOCK_BLOGS_KEY, setMockData } from '../services/firebase';
import { MIN_PASSWORD_LENGTH } from '../services/securityValidation';

const PBKDF2_HASH_PATTERN = /^pbkdf2-sha256:\d+:[A-Za-z0-9+/]+=*:[A-Za-z0-9+/]+=*$/;

const hashPasswordLegacySha256 = async (password: string): Promise<string> => {
  return crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(password)
  ).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));
};

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
      expect(passwords['admin@example.local']).toMatch(PBKDF2_HASH_PATTERN);
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

    it('should reset the local mock admin and allow bootstrapping again', async () => {
      await bootstrapMockAdmin({
        firstName: 'Local',
        lastName: 'Admin',
        username: 'admin',
        email: 'admin@example.local',
        password: 'LocalPassword123!'
      });

      expect(canBootstrapMockAdmin()).toBe(false);
      expect(localStorage.getItem('devblog_mock_current_user')).not.toBeNull();

      await expect(resetMockAdmin()).resolves.toBe(true);

      expect(canBootstrapMockAdmin()).toBe(true);
      expect(await isUsernameAvailable('admin')).toBe(true);
      expect(await isEmailAvailable('admin@example.local')).toBe(true);
      expect(localStorage.getItem('devblog_mock_current_user')).toBeNull();

      const newAdmin = await bootstrapMockAdmin({
        firstName: 'Fresh',
        lastName: 'Admin',
        username: 'admin',
        email: 'admin@example.local',
        password: 'AnotherPassword123!'
      });

      expect(newAdmin.firstName).toBe('Fresh');
      expect(newAdmin.role).toBe('admin');
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

    it('should keep saved theme settings on the matching user profile', async () => {
      const firstUser = {
        uid: 'first-user-uid',
        firstName: 'First',
        lastName: 'User',
        username: 'firstuser',
        email: 'first@example.com',
        role: 'user' as const,
        status: 'approved' as const,
        createdAt: new Date().toISOString(),
        themeMode: 'dark' as const
      };
      const secondUser = {
        uid: 'second-user-uid',
        firstName: 'Second',
        lastName: 'User',
        username: 'seconduser',
        email: 'second@example.com',
        role: 'user' as const,
        status: 'approved' as const,
        createdAt: new Date().toISOString(),
        themeMode: 'light' as const
      };

      setMockData(MOCK_USERS_KEY, [firstUser, secondUser]);
      setMockData('devblog_mock_usernames', {
        [firstUser.username]: firstUser.uid,
        [secondUser.username]: secondUser.uid
      });
      setMockData('devblog_mock_passwords', {
        [firstUser.email]: await hashPassword('Password123!'),
        [secondUser.email]: await hashPassword('Password123!')
      });

      const firstProfile = await loginUser(firstUser.username, 'Password123!');
      const secondProfile = await loginUser(secondUser.username, 'Password123!');

      expect(firstProfile.themeMode).toBe('dark');
      expect(secondProfile.themeMode).toBe('light');

      await updateUserProfile({
        uid: secondUser.uid,
        firstName: secondUser.firstName,
        lastName: secondUser.lastName,
        operatingSystem: 'linux',
        themeMode: 'system'
      });

      expect((await getUserProfile(firstUser.uid))?.themeMode).toBe('dark');
      expect((await getUserProfile(secondUser.uid))?.themeMode).toBe('system');
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

    it('should sort blog posts strictly newest first with a stable tie-breaker', () => {
      const oldest = {
        id: 'post-c',
        title: 'Oldest',
        summary: 'Oldest post',
        content: 'Old content',
        tags: ['Sort'],
        authorName: 'Sort Author',
        authorUsername: 'sortauthor',
        createdAt: '2024-01-01T12:00:00.000Z',
        readTime: 1
      };
      const newest = {
        ...oldest,
        id: 'post-a',
        title: 'Newest',
        createdAt: '2024-01-03T12:00:00.000Z'
      };
      const sameTimestamp = {
        ...oldest,
        id: 'post-b',
        title: 'Same timestamp as newest',
        createdAt: '2024-01-03T12:00:00.000Z'
      };

      expect(sortBlogPostsNewestFirst([oldest, sameTimestamp, newest]).map(blog => blog.id)).toEqual([
        'post-a',
        'post-b',
        'post-c'
      ]);
    });

    it('should successfully create and retrieve blog posts', async () => {
      await createBlog({
        title: 'Building Premium UIs with MUI',
        summary: 'Learn glassmorphism styling in MUI',
        content: 'This is a premium article about how to customize Material-UI with glassmorphism panels, gradients, and custom components.',
        tags: ['MUI', 'Design', 'React'],
        authorId: 'some-author-uid',
        authorName: 'Creative Dev',
        authorUsername: 'creativedev'
      });

      const blogs = await getBlogs();
      expect(blogs.length).toBe(1);
      expect(blogs[0].title).toBe('Building Premium UIs with MUI');
      expect(blogs[0].readTime).toBe(1);
      expect(blogs[0].tags).toContain('MUI');
      expect(blogs[0].authorUsername).toBe('creativedev');
    });

    it('should retrieve only posts from the requested author username in newest-first order', async () => {
      const olderPost = {
        id: 'older-author-post',
        title: 'Older Author Post',
        summary: 'This belongs to the selected author',
        content: 'A short author post.',
        tags: ['Author'],
        authorId: 'old-author-uid',
        authorName: 'Author A',
        authorUsername: 'authora',
        createdAt: '2024-01-01T12:00:00.000Z',
        readTime: 1
      };
      const otherPost = {
        id: 'other-author-post',
        title: 'Other Author Post',
        summary: 'This belongs to someone else',
        content: 'A short unrelated post.',
        tags: ['Other'],
        authorId: 'author-a',
        authorName: 'Author B',
        authorUsername: 'authorb',
        createdAt: '2024-01-03T12:00:00.000Z',
        readTime: 1
      };
      const newestPost = {
        id: 'newest-author-post',
        title: 'Newest Author Post',
        summary: 'This also belongs to the selected author',
        content: 'Another short author post.',
        tags: ['Author'],
        authorId: 'new-author-uid',
        authorName: 'Author A',
        authorUsername: 'authora',
        createdAt: '2024-01-02T12:00:00.000Z',
        readTime: 1
      };
      setMockData(MOCK_BLOGS_KEY, [olderPost, otherPost, newestPost]);

      const authorPosts = await getBlogsByAuthorUsername('authora');

      expect(authorPosts.map(blog => blog.id)).toEqual([newestPost.id, olderPost.id]);
      expect(authorPosts.some(blog => blog.id === otherPost.id)).toBe(false);
    });

    it('should successfully edit an existing blog post and recalculate reading time', async () => {
      const created = await createBlog({
        title: 'Original Title',
        summary: 'Original Summary',
        content: 'Short content.',
        tags: ['OriginalTag'],
        authorId: 'some-author-uid',
        authorName: 'Creative Dev',
        authorUsername: 'creativedev'
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
        authorName: 'Creative Dev',
        authorUsername: 'creativedev'
      });

      expect((await getBlogs()).length).toBe(1);

      await deleteBlog(created.id);

      const remainingBlogs = await getBlogs();
      expect(remainingBlogs.some(blog => blog.id === created.id)).toBe(false);
    });

    it('should successfully delete multiple existing blog posts', async () => {
      const first = await createBlog({
        title: 'Bulk Delete Me',
        summary: 'This post should be deleted in a group',
        content: 'Temporary content.',
        tags: ['Temporary'],
        authorId: 'some-author-uid',
        authorName: 'Creative Dev',
        authorUsername: 'creativedev'
      });
      const second = await createBlog({
        title: 'Bulk Delete Me Too',
        summary: 'This post should also be deleted in a group',
        content: 'More temporary content.',
        tags: ['Temporary'],
        authorId: 'some-author-uid',
        authorName: 'Creative Dev',
        authorUsername: 'creativedev'
      });
      const keep = await createBlog({
        title: 'Keep Me',
        summary: 'This post should remain',
        content: 'Persistent content.',
        tags: ['Persistent'],
        authorId: 'some-author-uid',
        authorName: 'Creative Dev',
        authorUsername: 'creativedev'
      });

      await deleteBlogs([first.id, second.id]);

      const remainingBlogs = await getBlogs();
      expect(remainingBlogs.map(blog => blog.id)).toEqual([keep.id]);
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
        authorName: 'Old Author',
        authorUsername: profile.username
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

      // Password must be PBKDF2-hashed with salt and NOT plain text.
      expect(storedPassword).not.toBe('MySecretPassword123!');
      expect(storedPassword).toMatch(PBKDF2_HASH_PATTERN);
    });

    it('should migrate legacy mock SHA-256 password hashes after successful login', async () => {
      const user = {
        uid: 'legacy-user-uid',
        firstName: 'Legacy',
        lastName: 'User',
        username: 'legacyuser',
        email: 'legacy@example.com',
        role: 'user' as const,
        status: 'approved' as const,
        createdAt: new Date().toISOString()
      };

      setMockData(MOCK_USERS_KEY, [user]);
      setMockData('devblog_mock_usernames', { [user.username]: user.uid });
      setMockData('devblog_mock_passwords', {
        [user.email]: await hashPasswordLegacySha256('Password123!')
      });

      await expect(loginUser(user.username, 'Password123!')).resolves.toMatchObject({
        uid: user.uid
      });

      const passwords = JSON.parse(localStorage.getItem('devblog_mock_passwords')!);
      expect(passwords[user.email]).toMatch(PBKDF2_HASH_PATTERN);
      expect(passwords[user.email]).not.toHaveLength(64);
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

    it('should enforce stronger password and username validation before storing users', async () => {
      await expect(
        registerUser({
          firstName: 'Weak',
          lastName: 'Password',
          username: 'weakpass',
          email: 'weak@password.com',
          password: 'short'
        })
      ).rejects.toThrow(`Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`);

      await expect(
        registerUser({
          firstName: 'Bad',
          lastName: 'Username',
          username: 'Bad User!',
          email: 'bad@username.com',
          password: 'StrongPassword123!'
        })
      ).rejects.toThrow('Der Benutzername muss 3 bis 30 Zeichen lang sein');
    });

    it('should reject invalid blog tags before persisting posts', async () => {
      await expect(
        createBlog({
          title: 'Invalid Tags',
          summary: 'This post should not be stored',
          content: 'Content with an invalid tag.',
          tags: ['Security', 'bad<tag'],
          authorId: 'some-author-uid',
          authorName: 'Creative Dev',
          authorUsername: 'creativedev'
        })
      ).rejects.toThrow('bad<tag');

      const blogs = await getBlogs();
      expect(blogs.some(blog => blog.title === 'Invalid Tags')).toBe(false);
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
        newPassword: 'NewPassword123!',
        themeMode: 'dark'
      });

      // Fetch the mock user profile directly
      const rawUsers = localStorage.getItem('devblog_mock_users');
      const users = JSON.parse(rawUsers!) as Array<{ uid: string; firstName: string; lastName: string; username: string; email: string; themeMode?: string }>;
      const updatedUser = users.find((u) => u.uid === profile.uid);

      expect(updatedUser?.firstName).toBe('NewFirst');
      expect(updatedUser?.lastName).toBe('NewLast');
      expect(updatedUser?.username).toBe('updatable'); // Should remain unchanged
      expect(updatedUser?.email).toBe('update@profile.com'); // Should remain unchanged
      expect(updatedUser?.themeMode).toBe('dark');

      // Validate the hashed password
      const rawPasswords = localStorage.getItem('devblog_mock_passwords');
      const passwords = JSON.parse(rawPasswords!);
      const storedPasswordHash = passwords['update@profile.com'];

      expect(storedPasswordHash).not.toBe('NewPassword123!');
      expect(storedPasswordHash).toMatch(PBKDF2_HASH_PATTERN);
    });
  });
});
