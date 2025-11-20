JobIn - The Ultimate Job Application Tracker


![alt text](https://img.shields.io/vercel/deployment/bensunny0619/jobin1/main?label=Vercel%20Deployment&style=for-the-badge)

Live Demo: https://jobin1.vercel.app/

JobIn is a full-stack web application designed to streamline and organize the job search process. Moving beyond messy spreadsheets, it provides a clean, intuitive, and powerful platform for job seekers to track applications, discover opportunities, and analyze their fit for potential roles.

Table of Contents
Project Overview
Key Features
Tech Stack & Architecture
Local Development Setup
Environment Variables
Deployment
Future Roadmap
Contact


# Project Overview
The modern job search is complex and often overwhelming. JobIn was built to solve this problem by providing a centralized hub for all job-seeking activities. The application is designed with a user-centric approach, focusing on a clean UI, efficient workflows, and powerful features that provide tangible value. From initial job discovery to final offer, JobIn supports every stage of the application lifecycle.

Key Features
1. Intuitive Kanban Board & Grid View
Visualize your entire job pipeline at a glance. The drag-and-drop Kanban board allows you to seamlessly move applications between customizable stages (e.g., Saved, Applied, Interview, Offer, Rejected). For a more traditional view, toggle to the data-rich Grid layout.
2. Integrated Online Job Search
Discover new opportunities without leaving the application. JobIn integrates with external APIs to fetch job listings from sources like Google Jobs and RemoteOK, allowing you to search and save interesting roles directly to your "Saved" column.
3. AI-Powered Match Analysis
Gain a competitive edge. JobIn leverages a serverless function to analyze a job description against your resume or skills profile, providing a match score and keyword analysis. This helps you tailor your application and focus on the most relevant opportunities.
4. Detailed Application Tracking
Store all critical information in one place, including company details, position, job URL, application dates, interview schedules, and personal notes for each application.
5. Data Export to CSV

Your data is yours. Export your entire application history to a CSV file at any time for offline analysis, record-keeping, or migration.
Tech Stack & Architecture
This project was built using a modern, scalable, and type-safe technology stack, chosen for its developer experience and performance.
Category	Technology	Rationale
Frontend	React, TypeScript, Vite	For a fast, scalable, and type-safe component-based UI with an excellent development experience.
Styling	Tailwind CSS	A utility-first CSS framework for rapidly building responsive and custom user interfaces.
Backend & Database	Supabase	An open-source Firebase alternative providing a Postgres database, authentication, and instant APIs.
Serverless	Supabase Edge Functions	Used to run server-side logic in a scalable environment, specifically for the AI-powered match analysis feature.
Drag & Drop	dnd-kit	A lightweight, performant, and accessible toolkit for building modern drag-and-drop interfaces.
Deployment	Vercel	Provides a seamless CI/CD pipeline with automatic deployments, HTTPS, and global CDN for optimal performance.


## Local Development Setup
Follow these steps to get the project running on your local machine.
Prerequisites
Node.js (v18.x or later)
npm or yarn
1. Clone the Repository
code
Bash
git clone https://github.com/Bensunny0619/JobIn.git
cd JobIn
2. Install Dependencies
code
Bash
npm install
3. Set Up Environment Variables
You will need to connect the project to your own Supabase instance.
Create a .env file in the root of the project by copying the example file:
code
Bash
cp .env.example .env
Log in to your Supabase account and create a new project.
Go to Project Settings > API.
Find your Project URL and anon public key.
Add these values to your .env file.
4. Run the Development Server
code
Bash
npm run dev
The application should now be running on http://localhost:5173.


### Environment Variables
The following variables are required to be present in the .env file for the application to connect to Supabase.

VITE_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
Deployment
This application is deployed on Vercel. The production branch (main) is automatically built and deployed upon new commits. Vercel is configured to handle the environment variables for the production build.


#### Future Roadmap
JobIn is an ongoing project. Future enhancements being considered include:

Browser Extension: A Chrome extension to save jobs from any website directly into the app.

Enhanced Analytics: A more detailed analytics dashboard with insights into application success rates.

Resume Versioning: Ability to upload and attach different versions of a resume to specific applications.


##### Contact
Feel free to reach out if you have any questions, feedback, or suggestions!
Author: Benjamin
GitHub: @Bensunny0619
LinkedIn: [https://www.linkedin.com/in/gbenga-odudare]