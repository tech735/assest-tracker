# Supabase Setup Guide

This guide will help you set up Supabase for the Asset Compass application.

## Prerequisites

- A Supabase account (sign up at [supabase.com](https://supabase.com))
- Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in your project details:
   - **Name**: Asset Compass (or your preferred name)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the region closest to your users
4. Click "Create new project"
5. Wait for your project to be provisioned (this may take a few minutes)

## Step 2: Get Your API Credentials

1. In your Supabase project dashboard, click on the **Settings** icon (gear icon) in the sidebar
2. Navigate to **API** section
3. You'll find two important values:
   - **Project URL**: This is your `VITE_SUPABASE_URL`
   - **anon/public key**: This is your `VITE_SUPABASE_ANON_KEY`

## Step 3: Configure Environment Variables

1. Open the `.env` file in the root of your project
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> **Important**: Never commit your `.env` file to version control. It's already added to `.gitignore`.

## Step 4: Run the Database Schema

1. In your Supabase project dashboard, click on the **SQL Editor** icon in the sidebar
2. Click "New query"
3. Copy the entire contents of `supabase/schema.sql` from this project
4. Paste it into the SQL editor
5. Click "Run" to execute the schema

This will create all necessary tables:
- `locations` - Physical and remote locations
- `employees` - Employee information
- `assets` - Asset inventory
- `assignments` - Asset-to-employee assignments
- `alerts` - System alerts and notifications

## Step 5: Seed Initial Data (Optional)

You can add some initial data to test the application:

### Add Locations

```sql
INSERT INTO locations (name, type, address) VALUES
  ('HQ Office', 'office', '123 Tech Boulevard, San Francisco, CA 94107'),
  ('IT Storage', 'warehouse', '456 Storage Lane, San Francisco, CA 94110'),
  ('Downtown Outlet', 'outlet', '789 Market St, San Francisco, CA 94103'),
  ('Remote', 'remote', NULL),
  ('Warehouse A', 'warehouse', '789 Industrial Park, Oakland, CA 94607');
```

### Add Employees

```sql
INSERT INTO employees (name, email, department, position, location, join_date) VALUES
  ('Sarah Chen', 'sarah.chen@company.com', 'Engineering', 'Senior Developer', 'HQ Office', '2022-03-15'),
  ('Michael Park', 'michael.park@company.com', 'Marketing', 'Marketing Manager', 'HQ Office', '2021-08-20'),
  ('Emily Rodriguez', 'emily.rodriguez@company.com', 'Design', 'UX Designer', 'Remote', '2023-01-10');
```

### Add Sample Assets

```sql
INSERT INTO assets (
  asset_tag, serial_number, name, brand, model, category, 
  status, condition, location, purchase_date, purchase_cost, vendor
) VALUES
  ('AST-001', 'SN-MBP-2024-001', 'MacBook Pro 16"', 'Apple', 'MacBook Pro 16-inch M3 Max', 
   'laptop', 'available', 'new', 'IT Storage', '2024-01-15', 3499, 'Apple Store'),
  ('AST-002', 'SN-DELL-2024-002', 'Dell XPS 15', 'Dell', 'XPS 15 9530', 
   'laptop', 'available', 'new', 'IT Storage', '2024-02-10', 1899, 'Dell Direct');
```

## Step 6: Start the Application

1. Install dependencies (if you haven't already):
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to the local development URL (usually `http://localhost:5173`)

## Verification

You should now see:
- ✅ Dashboard loading with real data from Supabase
- ✅ Assets page showing your assets
- ✅ No console errors related to Supabase connection

## Troubleshooting

### Error: "Missing Supabase environment variables"

**Solution**: Make sure your `.env` file exists and contains both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Restart your development server after adding environment variables.

### Error: "relation 'assets' does not exist"

**Solution**: You haven't run the database schema yet. Go to Step 4 and execute the `schema.sql` file in the Supabase SQL Editor.

### Data not loading / Infinite loading state

**Solution**: 
1. Check your browser console for errors
2. Verify your API credentials are correct in `.env`
3. Make sure Row Level Security (RLS) policies are set correctly (the schema includes permissive policies)
4. Check the Supabase dashboard logs for any errors

### CORS errors

**Solution**: This shouldn't happen with Supabase's default configuration, but if it does:
1. Go to your Supabase project settings
2. Navigate to API > CORS
3. Make sure your local development URL is allowed

## Next Steps

- **Add more data**: Use the Supabase Table Editor to add more assets, employees, and locations
- **Customize RLS policies**: Update the Row Level Security policies in `schema.sql` for production use
- **Enable real-time**: Supabase supports real-time subscriptions for live updates across clients
- **Add authentication**: Integrate Supabase Auth for user management and access control

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [React Query Documentation](https://tanstack.com/query/latest)

## Support

If you encounter any issues not covered in this guide, please:
1. Check the Supabase logs in your project dashboard
2. Review the browser console for error messages
3. Consult the Supabase documentation
