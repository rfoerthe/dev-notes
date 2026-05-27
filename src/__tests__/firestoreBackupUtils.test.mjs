import {
  FirestoreBackupInputError,
  prepareDocumentsForRestore
} from '../../scripts/firestore-backup-utils.mjs';

describe('prepareDocumentsForRestore', () => {
  it('repairs legacy blog authorUsername fields from restored user profiles', () => {
    const documents = [
      {
        path: 'users/user-1',
        exists: true,
        data: {
          uid: 'user-1',
          username: 'rfoerthe',
          firstName: 'Roland',
          lastName: 'Foerthe',
          role: 'user'
        }
      },
      {
        path: 'users/admin-1',
        exists: true,
        data: {
          uid: 'admin-1',
          username: 'admin',
          firstName: 'Blog',
          lastName: 'Admin',
          role: 'admin'
        }
      },
      {
        path: 'blogs/post-by-id',
        exists: true,
        data: {
          title: 'By UID',
          authorId: 'user-1',
          authorName: 'Roland Foerthe'
        }
      },
      {
        path: 'blogs/post-by-name',
        exists: true,
        data: {
          title: 'By Name',
          authorId: 'admin-uid',
          authorName: 'Blog Admin'
        }
      }
    ];

    const prepared = prepareDocumentsForRestore(documents);

    expect(prepared.report).toMatchObject({
      addedBlogAuthorUsernames: 2,
      inferredFromAuthorId: 1,
      inferredFromAuthorName: 1
    });
    expect(prepared.documents.find((document) => document.path === 'blogs/post-by-id').data.authorUsername)
      .toBe('rfoerthe');
    expect(prepared.documents.find((document) => document.path === 'blogs/post-by-name').data.authorUsername)
      .toBe('admin');
  });

  it('rejects legacy blog documents when ownership cannot be inferred', () => {
    const documents = [
      {
        path: 'blogs/orphaned-post',
        exists: true,
        data: {
          title: 'Orphaned',
          authorId: 'missing-user',
          authorName: 'Missing User'
        }
      }
    ];

    expect(() => prepareDocumentsForRestore(documents)).toThrow(FirestoreBackupInputError);
  });
});
