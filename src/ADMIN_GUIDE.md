# Stoic AF Admin Panel Guide

## Overview

The Stoic AF admin panel provides a secure interface for managing users, granting track access, and generating redemption codes. It's designed to be separate from the main user experience while sharing the same infrastructure.

## Access Methods

### 1. URL Parameter Access
Add `?admin=true` to any URL while logged in as an admin:
```
https://your-app-url.com/?admin=true
```

### 2. Admin Button (Optional)
Include the `AdminAccess` component anywhere in your app for quick access.

## Admin Users

Admin access is controlled by email address in the server code. Currently configured admin emails:
- `admin@stoicaf.com`
- `brad@stoicaf.com`

To add more admins, update the `isAdminUser` function in `/supabase/functions/server/index.tsx`:

```typescript
const isAdminUser = (email: string): boolean => {
  const adminEmails = ['admin@stoicaf.com', 'brad@stoicaf.com', 'your-email@domain.com'];
  return adminEmails.includes(email.toLowerCase());
};
```

## Features

### 1. User Management
- View all registered users
- See each user's purchased tracks
- View current track progress
- See user join dates and activity

### 2. Grant Access
- Select multiple users
- Select multiple tracks
- Grant immediate access to tracks
- Bulk operations for efficiency

### 3. Access Code Generation
- Create redemption codes for tracks
- Set expiration dates (1-365 days)
- Set usage limits (1-100 uses)
- Track code usage and redemptions

### 4. Code Management
- View all generated codes
- See usage statistics
- Monitor expiration dates
- Track who redeemed codes

## Usage Workflows

### Granting Direct Access
1. Go to Admin Panel → Grant Access tab
2. Select users from the left panel
3. Select tracks from the right panel
4. Click "Grant Access"
5. Users immediately gain access to selected tracks

### Creating Access Codes
1. Go to Admin Panel → Access Codes tab
2. Select tracks to include in the code
3. Set expiration (default: 30 days)
4. Set usage limit (default: 1 use)
5. Click "Generate Access Code"
6. Share the generated code with users

### Code Redemption (User Side)
Users can redeem codes in two ways:
1. **Profile View**: Go to Profile → Redeem Access Code section
2. **Admin Panel**: Admins can test redemption in the "Redeem Code" tab

## API Endpoints

The admin panel uses these server endpoints:

- `GET /admin/users` - List all users with profile data
- `POST /admin/grant-access` - Grant tracks to users
- `POST /admin/revoke-access` - Remove track access
- `POST /admin/generate-code` - Create access codes
- `GET /admin/codes` - List all access codes
- `POST /admin/redeem-code` - Redeem an access code

## Security

- Admin access is restricted by email address
- All requests require valid authentication tokens
- Admin status is verified on every request
- Regular users cannot access admin endpoints

## Code Examples

### Generating a Code for All Tracks
```json
{
  "trackNames": ["Money", "Relationships", "Discipline", "Ego"],
  "expiresInDays": 30,
  "usageLimit": 1
}
```

### Granting Access to Multiple Users
```json
{
  "userId": "user-id-123",
  "trackNames": ["Money", "Discipline"]
}
```

## Troubleshooting

### "Admin access required" Error
- Verify your email is in the admin list
- Ensure you're logged in with an admin account
- Check the server logs for authentication issues

### Code Redemption Fails
- Verify the code hasn't expired
- Check if usage limit has been reached
- Ensure the code was generated correctly

### Users Not Showing Up
- Check if users have completed registration
- Verify KV store connectivity
- Refresh the admin panel data

## Best Practices

1. **Regular Code Cleanup**: Monitor and clean up expired codes
2. **Bulk Operations**: Use bulk grant access for efficiency
3. **Code Documentation**: Keep track of what codes were issued and why
4. **Regular Audits**: Periodically review user access levels
5. **Secure Sharing**: Share access codes through secure channels

## Development Notes

The admin panel is designed to:
- Not impact regular user performance
- Reuse existing authentication infrastructure
- Provide comprehensive user management
- Support both direct access and code-based distribution
- Scale with your user base

All admin functionality is contained within the existing backend and doesn't require additional infrastructure.