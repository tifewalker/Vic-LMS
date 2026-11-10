/** Shapes returned by the API for programmes, classes and assessments. */

export type ClassItem = {
  id: string;
  programme_id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  youtube_url: string | null;
  recording_url: string | null;
  status: "scheduled" | "live" | "ended";
  programme?: { id?: string; title: string } | null;
  /** Only in tutor and admin responses. */
  zoom_url?: string | null;
  zoom_passcode?: string | null;
};

export type Assessment = {
  id: string;
  programme_id: string;
  class_id: string | null;
  title: string;
  instructions: string;
  attachment_path: string | null;
  due_at: string | null;
  max_score: number;
  mode: "digital" | "paper";
  published: boolean;
  created_at: string;
  submission_count?: number;
  programme?: { title: string } | null;
};

export type MySubmission = {
  id: string;
  text: string | null;
  link: string | null;
  has_file: boolean;
  status: "submitted" | "late" | "received_paper" | "graded";
  submitted_at: string;
  grade: { score: number; feedback: string; graded_at: string } | null;
};

export type StudentAssessment = Assessment & { my_submission: MySubmission | null };

export type People = Record<string, { full_name: string; role: string }>;

export const submissionLabel: Record<string, string> = {
  submitted: "Submitted",
  late: "Submitted late",
  received_paper: "Paper received",
  graded: "Graded",
};
