# InterestHub API Features

InterestHub is a social content API for posts, profiles, comments, discovery, moderation, notifications, sharing, and admin operations.

## Authentication and Accounts

- User registration with generated or custom username support.
- Login, logout, refresh token, change password, forgot password, and reset password flows.
- Two-factor authentication fields are available on the user model.
- Account soft deletion using `isDeleted`.
- Account deactivation separate from deletion.
- Deactivated accounts cannot log in or use authenticated routes.
- Account reactivation with email and password.
- User profile completion score based on name, username, bio, profile picture, and interests.

## User Profiles

- Public and private profile support.
- Profile visibility rules:
  - Public profiles are visible to everyone.
  - Private profiles show restricted information unless the viewer is approved.
- Profile details include follower count, following count, post count, follow state, and follow request state.
- Profile owner receives profile completion details.
- Mutual followers summary for profile pages.
- Pinned post support on profiles.
- One pinned post per user.
- Archived, draft, or moderation-hidden posts cannot be pinned.

## Follow System

- Follow and unfollow users.
- Private profiles use follow requests instead of direct follow.
- Accept or reject follow requests.
- Prevent users from following themselves.
- Blocked users cannot follow each other.
- Followers and following lists are paginated.
- Suggested users based on interests, follower count, and existing relationships.

## Blocking, Muting, and Hiding

- Block and unblock users.
- Blocking removes follow relationships in both directions.
- Mute and unmute users without removing follow relationships.
- Hidden posts list for personalized post hiding.
- Unhide posts from the hidden list.

## Posts

- Create, read, update, and delete posts.
- Image upload support through Cloudinary.
- Public, private, and followers-only post visibility.
- Feed pagination.
- Following feed.
- Trending posts.
- Recommended posts.
- Search and advanced post search.
- Post likes and unlike.
- Paginated list of users who liked a post.
- Post view count.
- Post archiving and unarchiving.
- Under-review post visibility for owners.
- Draft posts before publishing.
- Publish draft posts.
- Pinned posts on user profiles.
- Lightweight post responses with:
  - `likesCount`
  - `commentsCount`
  - `isLikedByMe`
  - `isSavedByMe`

## Saved Posts

- Save and unsave posts.
- Saved posts list.
- Saved post collections.
- Create, rename, and delete saved collections.
- Add posts to collections.
- Remove posts from collections.
- Removing a normal bookmark also removes the post from saved collections.

## Recently Viewed Posts

- Recently viewed posts are tracked when authenticated users open posts.
- Recently viewed history is capped.
- Recently viewed posts endpoint returns paginated lightweight posts.

## Comments and Replies

- Create comments on posts.
- Edit comments.
- Soft delete comments.
- Soft deleted comments keep thread structure and show placeholder content.
- Like and unlike comments.
- Reply to comments.
- Edit replies.
- Soft delete replies.
- Like and unlike replies.
- Reply to replies.
- Comments are fetched separately from posts for cleaner architecture.
- Paginated comments by post.
- Private and followers-only post visibility rules are respected when fetching comments.

## Mentions and Hashtags

- `@username` mentions in posts and comments.
- Mentioned users receive notifications.
- Hashtag-style tags in post content.
- Hashtags are automatically extracted and merged into post tags.
- Tags are normalized and limited.

## Tags and Discovery

- Tag suggestions.
- Trending tags.
- Posts by tag.
- Tags are used in filtering, search, and discovery.
- Global search combines users, posts, and tags in one endpoint.

## Sharing

- Share posts with another user.
- Share profiles with another user.
- Share comments with another user.
- Share inbox for received shares.
- Sent shares list.
- Sharing respects visibility:
  - Private/followers-only post rules are checked.
  - Comment sharing checks the parent post visibility.
- Share notifications for post, profile, and comment shares.

## Notifications

- Notification inbox.
- Unread notification count.
- Mark one notification read or unread.
- Mark all notifications read.
- Mark all notifications unread.
- Delete one notification.
- Clear read notifications.
- Clear all notifications.
- Notifications include populated actor, post, comment, and target user data where relevant.
- Notification preferences allow users to enable or disable:
  - Likes
  - Comments
  - Replies
  - Follows
  - Follow requests
  - Mentions
  - Shares
  - Moderation notifications

## Activity Tracking

- User activity model.
- User activity history endpoint.
- Admin activity history endpoint.
- Tracked activities include login, post creation, follow actions, likes, reports, blocks, mutes, hides, and related user actions.

## Reporting and Moderation

- Users can report posts, comments, and users.
- Reports support reasons and details.
- Users can view their own reports.
- Admin report queue.
- Admin report status updates.
- Admin moderation actions from reports.
- Admin can hide or remove reported content.
- Admin can block users from moderation flows.
- Automatic moderation reports for bad language.

## Bad Language Detection

- Post titles/content and comments are checked before saving.
- Bad-language content is marked as `needsReview`.
- Moderation reason includes `bad_language`.
- Flagged posts/comments can be hidden from public view.
- Users receive a moderation indication when their content is under review.
- Owners can view their own under-review posts for editing.

## Admin Features

- Admin access check.
- Admin dashboard statistics.
- Admin user list with pagination and filters.
- Admin user detail view.
- Create admin users.
- Bulk create users.
- Update admin-managed users.
- Block and unblock users from admin.
- Delete users.
- Bulk delete users.
- Admin post list with pagination and filters.
- Admin post detail view.
- Bulk create posts.
- Delete posts.
- Bulk delete posts.
- Delete comments.
- Bulk delete comments.
- Delete replies.
- Admin report review and moderation.

## Search

- User search.
- Post search.
- Advanced post search.
- Tag search and suggestions.
- Global search endpoint combining:
  - Users
  - Posts
  - Tags

## Validation and API Consistency

- Request validation for auth, posts, comments, reports, shares, admin actions, and contact form.
- Tags validation:
  - Allows arrays such as `["tech"]`.
  - Allows empty array.
  - Rejects `null`, non-arrays, invalid strings, and `"null"`.
- Pagination utilities shared across list endpoints.
- Consistent paginated response format.

## Rate Limiting

- Global API rate limiting.
- Action-specific rate limits for:
  - Auth actions
  - Password reset
  - Post/content creation
  - Comment actions
  - Social actions
  - Reports
  - Shares

## Contact

- Contact form endpoint.
- Contact request validation.
- Contact email integration is planned for later.

## Infrastructure

- Dockerfile for containerizing the app.
- Compose file for local container setup.
- Swagger API documentation.
- Centralized logging.
- Request logging middleware.
- Error handling middleware.
- Jest test suite.
- TypeScript build.

## Planned or Deferred Features

- Email integration for registration, contact confirmation, and summaries.
- Mobile push notifications.
- AI-assisted moderation, tagging, summaries, and semantic search.
