# **App Name**: CampusFlow

## Core Features:

- Superadmin Login: initially while opening this app a login page should be appear where only superadmin having credentials can login and add schools and admin so superadmin credetioals is fixed and store in mongodb database
- Role-Based Dashboards: Role-based dashboards: Provide tailored interfaces for Super Admin, Admin, Teacher, and Student roles, each displaying relevant information and functionalities, utilizing Next.js for server-side rendering and improved performance.
- School Management: Configurable School Settings: Enable Super Admins to create and manage schools, configure class-wise fees (tuition, bus, canteen), and upload school logos, using a form-based UI that integrates smoothly with Next.js form handling.
- Fee Records: Fee Management: Admins can manage student fees, auto-filling configured amounts and generating downloadable PDF receipts via client-side PDF generation libraries.
- Attendance Records: Attendance Tracking: Teachers can mark student attendance, reflected in Admin and Student views, using an interactive, real-time updating attendance interface.
- Responsive UI: Responsive Card-Based Layout: Employ a responsive, card-based layout for clear data presentation and intuitive navigation across devices, utilizing Next.js's built-in CSS support.
- Real-Time Data: Real-Time Updates: Use client-side state management with real-time data binding to provide live updates on attendance percentages and fee status in the Student dashboard, using a Next.js context provider to store real-time info.

## Style Guidelines:

- Primary color: Google Blue (#4285F4) for trustworthiness and clarity.
- Background color: Light gray (#F0F4F9), offering a neutral and clean backdrop.
- Accent color: Google Green (#34A853) used to highlight interactive elements.
- Body and headline font: 'Inter' (sans-serif) for clean readability.
- Top Navigation: A persistent top navbar (header) will be visible always. Page content reflows dynamically in response to the logged-in user's roles, showing only allowed elements. Cards with rounded corners create sections within each dashboard.
- Use Google's Material Design icons throughout the application to maintain a consistent and recognizable visual language.
- Subtle transition animations to give feedback on state change.