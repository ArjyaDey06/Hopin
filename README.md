# 🎫 Hopin - Event Management & Ticketing System

An indigenous event management and ticketing system built for the IEEE APSIT Student Branch. Hopin simplifies event creation, registration, and attendance tracking with QR code scanning and real-time analytics.

**🚀 [Live Demo](https://hopin-teal.vercel.app)**

---

## ✨ Features

### 🎪 Event Management
- **Create & Manage Events** - Intuitive event creation with customizable details
- **Real-time Analytics** - Track registrations, attendance, and event metrics
- **Multi-admin Support** - Role-based access control with admin and superadmin tiers
- **Event Details View** - Comprehensive event information and attendee management

### 🎟️ Registration & Ticketing
- **Student Registration** - Simple signup process with validation
- **QR Code Generation** - Unique QR codes for ticket verification
- **QR Code Scanning** - Real-time check-in using device camera
- **Event Discovery** - Browse and register for upcoming events

### 📊 Analytics & Insights
- **Attendance Tracking** - Live attendance statistics
- **Registration Analytics** - Monitor registration trends
- **Admin Dashboard** - Centralized control panel for event management
- **Feedback Collection** - Gather post-event feedback from attendees

### 🔒 Security & Authentication
- **Secure Authentication** - User login and signup with validation
- **Role-based Access** - Admin-only features protected with authentication
- **Supabase Integration** - Backend database with PostgreSQL

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend Framework** | React 19.2.4 |
| **Build Tool** | Vite 8.0.4 |
| **Routing** | React Router DOM 7.14.0 |
| **Backend / Database** | Supabase (PostgreSQL) |
| **UI/Animation** | Framer Motion 12.38.0 |
| **QR Code** | html5-qrcode 2.3.8 & qrcode.react 4.2.0 |
| **Icons** | Lucide React 1.7.0 |
| **Code Quality** | ESLint 9.39.4 |
| **Package Manager** | npm |

---

## 📋 Project Structure

```
src/
├── pages/                 # Page components
│   ├── Login.jsx         # User authentication
│   ├── Signup.jsx        # User registration
│   ├── AdminDashboard.jsx # Main admin interface
│   ├── Analytics.jsx     # Event analytics
│   ├── CreateEvent.jsx   # Event creation form
│   ├── EventRegistration.jsx # Student registration
│   ├── EventDetails.jsx  # Event information & attendee management
│   ├── QRScanner.jsx     # Check-in QR scanner
│   ├── ManageAdmins.jsx  # Admin user management
│   └── FeedbackForm.jsx  # Post-event feedback
├── components/           # Reusable components
│   └── Navbar.jsx       # Navigation header
├── context/             # React Context
│   └── AuthContext.jsx  # Authentication state management
├── App.jsx              # Main app component with routing
└── index.css            # Global styles
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ArjyaDey06/Hopin.git
   cd Hopin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the project root:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`

---

## 📦 Available Scripts

```bash
# Start development server with HMR
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run ESLint code quality checks
npm run lint
```

---

## 🔑 Key Routes

### Public Routes
| Route | Purpose |
|-------|---------|
| `/login` | User authentication |
| `/signup` | New user registration |
| `/event/:id` | Event registration page |
| `/feedback/:id` | Feedback submission form |

### Protected Admin Routes
| Route | Purpose |
|-------|---------|
| `/admin` | Main admin dashboard |
| `/admin/event/new` | Create new event |
| `/admin/event/:id` | View/edit event details |
| `/admin/scan/:id` | QR code check-in scanner |
| `/admin/analytics` | Event analytics & statistics |
| `/admin/manage` | Manage admin users |

---

## 🔐 Authentication & Authorization

The app implements role-based access control (RBAC):

- **Student** - Can register for events and submit feedback
- **Admin** - Can create/manage events, view analytics, scan QR codes
- **Superadmin** - Full system access including admin management

Protected routes verify user authentication and role before rendering admin content.

---

## 🗄️ Database Schema

The application uses Supabase (PostgreSQL) with tables for:
- Users (authentication & profiles)
- Events (event details & metadata)
- Registrations (ticket records)
- Attendees (check-in records)
- Feedback (post-event surveys)

---

## 🎨 UI/UX Features

- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Dark Mode Ready** - CSS variables for theme customization
- **Smooth Animations** - Framer Motion for polished interactions
- **QR Code Integration** - Real-time camera access for mobile check-in
- **Loading States** - Spinner animations during data fetching

---

## 🐛 Known Limitations & Future Enhancements

- [ ] Email notifications for event updates
- [ ] SMS reminders before events
- [ ] Export attendance reports as CSV/PDF
- [ ] Batch QR code generation
- [ ] Event templates for recurring events
- [ ] Payment gateway integration
- [ ] Mobile app (React Native)

---

## 🤝 Contributing

Contributions are welcome! Here's how to help:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure your code passes linting:
```bash
npm run lint
```

---

## 📝 License

This project is open source. See LICENSE file for details.

---

## 👨‍💻 Author

**Arjya Dey** - [@ArjyaDey06](https://github.com/ArjyaDey06)

---

## 🙏 Acknowledgments

- **IEEE APSIT Student Branch** - For the opportunity to build this system
- **React & Vite Communities** - For excellent development tools
- **Supabase** - For reliable backend infrastructure

---

## 📞 Support & Feedback

Found a bug? Have a suggestion? [Open an issue](https://github.com/ArjyaDey06/Hopin/issues) on GitHub.

---

**Made with ❤️ for the IEEE APSIT Community**
