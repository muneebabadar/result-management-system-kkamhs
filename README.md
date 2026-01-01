# Result Management System (RMS)

A comprehensive academic management solution designed for **Khadija Kazi Ali Memorial High School**. This system facilitates the management of students, classes, and academic results with strict Role-Based Access Control (RBAC) for Administrators and Teachers.

**Live Demo:** [https://result-management-system-kkamhs-cnx13m3xt.vercel.app/](https://result-management-system-kkamhs-cnx13m3xt.vercel.app/)

---

## Technology Stack

* **Framework:** [Next.js 15+](https://nextjs.org/) (App Router)
* **Language:** [TypeScript](https://www.typescriptlang.org/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL)
* **Authentication:** Custom Auth with Supabase & LocalStorage
* **Deployment:** Vercel

---

## Key Features

### Core Infrastructure
* **Role-Based Access Control (RBAC):** Secure login flows that strictly differentiate between `Admin` and `Teacher` access privileges.
* **Real-time Synchronization:** Instant data retrieval and updates utilizing Supabase.

### Admin Dashboard
* **Academic Management:** Comprehensive tools to manage Students, Teachers, and Class structures.
* **Grade Configuration:** Flexible settings to define and adjust grade weightages.
* **Reporting:** Automated generation of academic reports.
* **Promotion Logic:** Built-in algorithms to draft and finalize student promotions based on academic performance data.

### Teacher Portal (In Development)
* **Grade Entry:** Dedicated interface for teachers to input and modify student grades.
* **Class Rosters:** View and manage assigned student lists.

---

## Getting Started

Follow these steps to set up the project locally for development.

### 1. Prerequisites
Ensure the following are installed on your machine:
* [Node.js](https://nodejs.org/) (v18 or higher)
* npm (Node Package Manager)

### 2. Clone the Repository
```bash
git clone [https://github.com/muneebabadar/result-management-system-kkamhs.git](https://github.com/muneebabadar/result-management-system-kkamhs.git)
cd result-management-system-kkamhs
```
### 3. Install Dependencies
``` npm install ```

### 4. Environment Configuration
Create a .env.local file in the root directory. Add the following Supabase credentials:
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

### 5. Launch Development Server
``` npm run dev ```
