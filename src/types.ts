export type AppStatus = 'applied' | 'interview' | 'offer' | 'rejected';


export interface Application {
id: string;
user_id: string;
company: string;
position: string;
status: AppStatus;
date_applied: string; // ISO date
location?: string | null;
job_url?: string | null;
notes?: string | null;
created_at: string;
updated_at: string;
}