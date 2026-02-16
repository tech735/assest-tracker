# Asset Compass

A comprehensive asset management system built with React, TypeScript, and Supabase. Track, manage, and monitor organizational assets across multiple locations with real-time insights and detailed reporting.

## 🚀 Features

### 📊 Dashboard
- **Real-time Statistics**: Overview of total assets, people, locations, and assignments
- **Recent Activity**: Track latest asset additions and assignments
- **Asset Distribution**: Visual breakdown by category with interactive charts
- **System Alerts**: Warranty expirations, lost assets, and maintenance reminders

### 🏢 Asset Management
- **Complete Asset Lifecycle**: Add, edit, clone, and delete assets
- **Bulk Operations**: CSV import and manual bulk asset addition
- **Smart Filtering**: Search by name, category, status, location, and more
- **Asset Cloning**: Duplicate assets with auto-generated tags
- **Status Tracking**: Available, Assigned, In Repair, Lost, Retired
- **Condition Monitoring**: New, Good, Fair, Poor condition levels

### 👥 People Management
- **People Directory**: Complete people profiles with contact information
- **Asset Assignment**: Assign/unassign assets with full history tracking
- **Department Organization**: Categorize people by department and position
- **Location Tracking**: Monitor people locations and asset assignments

### 📍 Location Management
- **Multi-Location Support**: Offices, warehouses, remote sites, and outlets
- **Detailed Location Views**: Complete asset and employee breakdowns
- **Location Analytics**: Asset utilization rates and category distribution
- **Smart Location Matching**: Automatic location assignment based on existing data

### 📈 Reports & Analytics
- **Inventory Reports**: Complete asset inventory with filtering options
- **Assignment Reports**: Asset assignment history and current status
- **Aging Reports**: Asset age analysis and depreciation tracking
- **Warranty Reports**: Warranty expiration monitoring and alerts
- **Location Summary**: Asset distribution across locations
- **Utilization Reports**: Asset usage and efficiency metrics
- **CSV Export**: Download any report in CSV format

### 🔧 Advanced Features
- **Auto-Generated Asset Tags**: Automatic unique identifier generation
- **Bulk Data Operations**: CSV import/export with validation
- **Real-time Updates**: Live data synchronization across all views
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Toast Notifications**: Real-time feedback for all operations
- **Error Handling**: Comprehensive error management and user feedback
- **Settings Management**: Application configuration and preferences

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development with full IntelliSense support
- **Vite**: Fast build tool and development server
- **React Router DOM**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Beautiful, accessible UI components
- **React Hook Form**: Performant forms with validation
- **Zod**: Schema validation and TypeScript inference
- **TanStack React Query**: Data fetching and state management
- **Recharts**: Data visualization and charting
- **Radix UI**: Primitive components for accessible design
- **Lucide React**: Icon library
- **Sonner**: Toast notifications

### Backend
- **Supabase**: Backend-as-a-Service with:
  - PostgreSQL database
  - Real-time subscriptions
  - Authentication & authorization
  - File storage
  - RESTful API

### Development Tools
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Vitest**: Testing framework
- **Testing Library**: React testing utilities
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixing

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for backend setup)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/asset-compass.git
cd asset-compass
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env` file in the root directory using the provided `.env.example`:

```env
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Database Setup

1. Create a new Supabase project
2. Follow the detailed setup instructions in `SUPABASE_SETUP.md`
3. Run the SQL schema from `supabase/schema.sql`
4. Set up the database triggers for asset tag generation
5. Configure Row Level Security (RLS) policies

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## 📁 Project Structure

```
asset-compass/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── assets/         # Asset-related components
│   │   ├── dashboard/      # Dashboard components
│   │   ├── layout/         # Layout components
│   │   ├── locations/      # Location-related components
│   │   ├── people/         # People-related components
│   │   └── ui/            # Base UI components (shadcn/ui)
│   ├── pages/              # Main application pages
│   │   ├── Dashboard.tsx   # Main dashboard
│   │   ├── Assets.tsx      # Asset management
│   │   ├── People.tsx      # People management
│   │   ├── Locations.tsx   # Location management
│   │   ├── Reports.tsx     # Reports and analytics
│   │   ├── Settings.tsx    # Application settings
│   │   └── NotFound.tsx    # 404 page
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API and data services
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── lib/                # Library configurations
│   │   └── supabase.ts     # Supabase client configuration
│   ├── data/               # Static data and constants
│   └── test/               # Test utilities
├── supabase/               # Database schema and migrations
│   └── schema.sql          # Complete database schema
├── public/                 # Static assets
├── .env.example            # Environment variables template
├── SUPABASE_SETUP.md       # Detailed Supabase setup guide
└── package.json            # Dependencies and scripts
```

## 🔧 Configuration

### Database Schema

The application uses the following main tables:

- **assets**: Asset information and metadata
- **people**: People profiles and assignments
- **locations**: Physical locations and sites
- **assignments**: Asset assignment history

### Key Features Implementation

#### Asset Tag Generation
Assets automatically receive unique tags (e.g., AST-0001) via database triggers.

#### Location Matching
Smart location matching handles variations like:
- "Warehouse" ↔ "Central Warehouse"
- Case-insensitive matching
- Whitespace trimming

#### Bulk Operations
- CSV import with validation
- Manual bulk addition with dropdowns
- Error handling for partial failures

## 📊 Reports Guide

### Available Reports

1. **Inventory Report**
   - Complete asset list
   - Filter by category, status, location
   - Export to CSV

2. **Assignment Report**
   - Current asset assignments
   - Assignment history
   - People asset summary

3. **Aging Report**
   - Asset age analysis
   - Purchase date tracking
   - Depreciation insights

4. **Warranty Report**
   - Warranty expiration tracking
   - Upcoming expirations
   - Maintenance scheduling

5. **Location Summary**
   - Asset distribution
   - Location utilization
   - People counts

6. **Utilization Report**
   - Asset usage metrics
   - Efficiency analysis
   - Performance indicators

## 🚀 Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Preview production build
npm run preview
```

## 🎯 Usage Guide

### Adding Assets
1. Navigate to Assets page
2. Click "Add Asset"
3. Fill in asset details
4. Select location and category
5. Save asset (auto-generates tag)

### Bulk Asset Addition
1. Click "Add Asset" → "Bulk Addition"
2. Choose CSV upload or manual entry
3. Map fields correctly
4. Review and confirm

### Asset Cloning
1. Find asset to clone
2. Click menu (⋮) → "Clone asset"
3. Edit cloned details
4. Save as new asset

### People Management
1. Navigate to People page
2. View all people and their asset assignments
3. Add/edit people profiles
4. Assign/unassign assets to people

### Location Management
1. Navigate to Locations page
2. View asset counts per location
3. Click "View details" for comprehensive breakdown
4. Add/edit locations as needed

### Report Generation
1. Navigate to Reports page
2. Select report type
3. Configure filters
4. Generate and download CSV

### Settings
1. Navigate to Settings page
2. Configure application preferences
3. Manage system settings
4. View application information

## 🧪 Testing

The project includes a comprehensive testing setup:

- **Vitest**: Fast unit test framework
- **Testing Library**: React component testing utilities
- **jsdom**: DOM environment for testing

Run tests with:
```bash
npm run test          # Run all tests once
npm run test:watch    # Run tests in watch mode
```

## 🔍 Troubleshooting

### Common Issues

**Assets not showing in locations**
- Check location name matching
- Use "Fix Location Data" button
- Verify asset location field

**CSV import failures**
- Ensure required fields are present
- Check date format (YYYY-MM-DD)
- Validate location names

**Asset tag generation**
- Verify database triggers
- Check asset_tag uniqueness
- Review schema constraints

### Debug Mode

Enable console logging by checking browser dev tools for detailed operation logs.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the database schema

---

**Built with ❤️ using React, TypeScript, and Supabase**
