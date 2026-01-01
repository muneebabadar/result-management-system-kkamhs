# Result Management System (RMS)

A comprehensive academic management solution designed for **Khadija Kazi Ali Memorial High School**. This system facilitates the management of students, classes, and academic results with strict Role-Based Access Control (RBAC) for Administrators and Teachers.

## 🚀 Tech Stack

* **Framework:** [Next.js 15+](https://nextjs.org/) (App Router)
* **Language:** [TypeScript](https://www.typescriptlang.org/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL)
* **Authentication:** Custom Auth with Supabase & LocalStorage
* **Deployment:** Vercel

## ✨ Key Features

* **🔐 Role-Based Access Control:** Secure login flows distinguishing between `Admin` and `Teacher` roles.
* **📊 Admin Dashboard:**
    * Manage Students, Teachers, and Classes.
    * Configure Grade Weightages.
    * Generate Reports.
* **🎓 Promotion Logic:** Automated system to draft and finalize student promotions based on academic performance.
* **🏫 Teacher Portal:** (In Progress) Interface for teachers to input grades and view class rosters.
* **⚡ Real-time Data:** Instant data retrieval and updates using Supabase.

## 🛠️ Getting Started

Follow these steps to set up the project locally.

### 1. Prerequisites
Ensure you have the following installed:
* [Node.js](https://nodejs.org/) (v18 or higher)
* npm or yarn

### 2. Clone the Repository
```bash
git clone [https://github.com/muneebabadar/result-management-system-kkamhs.git](https://github.com/muneebabadar/result-management-system-kkamhs.git)
cd result-management-system-kkamhs
```

### 3. Environment Variables
Create a .env.local file in the root directory. You need to add your Supabase credentials here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key


### 4. Run the Development Server
npm run dev

## 🚀 Live Demo

The application is deployed on Vercel and is currently live. You can access the production environment here:

🔗 **[Click here to view the Result Management System]([https://your-project-name.vercel.app](https://result-management-system-kkamhs-cnx13m3xt.vercel.app/))**
