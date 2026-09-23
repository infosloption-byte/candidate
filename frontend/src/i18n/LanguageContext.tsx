import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren, type ReactNode } from 'react';

export type AppLanguage = 'en' | 'he';

const STORAGE_KEY = 'buildhire.language';

const he: TranslationMap = {
  "Mobile navigation": "ניווט בנייד",
  "Close navigation": "סגור ניווט",
  "BuildHire": "BuildHire",
  "Workspace": "סביבת עבודה",
  "Primary navigation": "ניווט ראשי",
  "Dev role": "תפקיד פיתוח",
  "Notifications": "התראות",
  "Close": "סגור",
  "No notifications yet.": "אין התראות עדיין.",
  "Sign out": "התנתקות",
  "Open navigation": "פתיחת ניווט",
  "System administration": "ניהול מערכת",
  "Platform access": "גישה לפלטפורמה",
  "System Users": "משתמשי מערכת",
  "Manage Admin and Agency accounts. Interviewers are maintained in their own tab.": "ניהול חשבונות מנהל וסוכנות. המראיינים מנוהלים בלשונית נפרדת.",
  "Add system user": "הוספת משתמש מערכת",
  "Workspaces": "סביבות עבודה",
  "Agencies": "סוכנויות",
  "Create and manage agency workspaces without opening a separate user screen.": "יצירה וניהול של סביבות עבודה של סוכנויות ללא פתיחת מסך משתמשים נפרד.",
  "Add agency": "הוספת סוכנות",
  "Interview panel pool": "מאגר צוותי ראיון",
  "Interviewers": "מראיינים",
  "Add interviewer": "הוספת מראיין",
  "Cancel": "ביטול",
  "Close dialog": "סגירת חלון",
  "Users & Agencies": "משתמשים וסוכנויות",
  "Loading administration": "טוען נתוני ניהול",
  "Administration action failed": "פעולת הניהול נכשלה",
  "Saved": "נשמר",
  "Administration sections": "מקטעי ניהול",
  "No system users": "אין משתמשי מערכת",
  "No agencies": "אין סוכנויות",
  "No interviewers": "אין מראיינים",
  "Operations Manager": "מנהל תפעול",
  "manager@example.com": "manager@example.com",
  "Example Recruitment": "Example Recruitment",
  "example-recruitment": "example-recruitment",
  "David Perera": "David Perera",
  "interviewer@example.com": "interviewer@example.com",
  "Mason, Welder…": "לבנאי, רתך…",
  "Masonry, Tile, Plaster": "בנאות, ריצוף, טיח",
  "you@example.com": "you@example.com",
  "Today": "היום",
  "All status": "כל הסטטוסים",
  "Scheduled": "מתוזמן",
  "In progress": "בתהליך",
  "Completed": "הושלם",
  "Cancelled": "בוטל",
  "No show": "לא הגיע",
  "All types": "כל הסוגים",
  "Screening": "סינון",
  "Technical": "טכני",
  "Practical": "מעשי",
  "Final": "סופי",
  "Clear": "נקה",
  "No matching events in this month.": "אין אירועים תואמים בחודש זה.",
  "Interview details": "פרטי ראיון",
  "Loading interview": "טוען ראיון",
  "Calendar": "לוח שנה",
  "Previous month": "חודש קודם",
  "Next month": "חודש הבא",
  "Search candidate, passport, job or interviewer…": "חיפוש מועמד, דרכון, משרה או מראיין…",
  "Search calendar": "חיפוש בלוח השנה",
  "Loading calendar": "טוען לוח שנה",
  "Calendar unavailable": "לוח השנה אינו זמין",
  "Close interview details": "סגירת פרטי הראיון",
  "Loading interview details": "טוען פרטי ראיון",
  "Documents": "מסמכים",
  "Document storage is available when the application is connected to the backend API.": "אחסון מסמכים זמין כאשר האפליקציה מחוברת ל-API של השרת.",
  "No documents uploaded yet.": "עדיין לא הועלו מסמכים.",
  "Download": "הורדה",
  "Delete": "מחיקה",
  "Loading documents": "טוען מסמכים",
  "Document action failed": "פעולת המסמך נכשלה",
  "Open": "פתיחה",
  "Candidate full profile": "פרופיל מועמד מלא",
  "Interviews": "ראיונות",
  "Submitted scorecards": "טפסי הערכה שנשלחו",
  "Latest average": "ממוצע אחרון",
  "Agency": "סוכנות",
  "Workspace that owns this candidate record.": "סביבת העבודה שאליה רשומת המועמד שייכת.",
  "Linked account": "חשבון מקושר",
  "Interviewee login connected to this candidate, when available.": "חשבון התחברות של המועמד המקושר למועמד, כאשר זמין.",
  "No linked login account.": "אין חשבון התחברות מקושר.",
  "Record management": "ניהול רשומה",
  "The actions available in the original candidate details popup are available here too.": "הפעולות שהיו זמינות בחלון פרטי המועמד המקורי זמינות גם כאן.",
  "Passport expiry": "תוקף דרכון",
  "Experience years": "שנות ניסיון",
  "Skills": "מיומנויות",
  "Lifecycle status": "סטטוס מחזור חיים",
  "Reason / decision note": "סיבה / הערת החלטה",
  "A final decision can be recorded only after a completed interview and when no other interview is still scheduled.": "ניתן לתעד החלטה סופית רק לאחר ראיון שהושלם וכאשר אין ראיון אחר שנותר מתוזמן.",
  "Record metadata": "מטא-נתוני הרשומה",
  "System timestamps for the candidate record.": "חותמות הזמן של הרשומה במערכת.",
  "No skills recorded.": "לא נרשמו מיומנויות.",
  "Interview history & scorecards": "היסטוריית ראיונות וטפסי הערכה",
  "Every interview, panel assignment and available evaluation for this candidate.": "כל ראיון, שיוך צוות וכל הערכה זמינה עבור מועמד זה.",
  "No interview history yet.": "אין עדיין היסטוריית ראיונות.",
  "Panel average": "ממוצע צוות",
  "Interview notes": "הערות ראיון",
  "Interview panel": "צוות ראיון",
  "Evaluator scorecards": "טפסי הערכה של מעריכים",
  "No evaluator scorecard is available for this interview.": "אין טופס הערכה של מעריך זמין לראיון זה.",
  "Candidate timeline": "ציר זמן של המועמד",
  "Status changes, interview lifecycle events and recorded candidate activity.": "שינויי סטטוס, אירועי מחזור הראיון ופעילות מועמד מתועדת.",
  "No timeline activity yet.": "אין עדיין פעילות בציר הזמן.",
  "Close candidate profile": "סגירת פרופיל המועמד",
  "Minimize candidate profile": "מזעור פרופיל המועמד",
  "Minimize": "מזער",
  "Candidate profile sections": "מקטעי פרופיל מועמד",
  "Loading candidate history": "טוען היסטוריית מועמד",
  "Candidate history unavailable": "היסטוריית המועמד אינה זמינה",
  "Optional note": "הערה אופציונלית",
  "New candidate": "מועמד חדש",
  "Add candidate to pool": "הוספת מועמד למאגר",
  "Select availability": "בחירת זמינות",
  "Immediately": "מיידית",
  "Within 2 weeks": "בתוך שבועיים",
  "Within 1 month": "בתוך חודש",
  "Not available": "לא זמין",
  "Select status": "בחירת סטטוס",
  "Available": "זמין",
  "Required": "חובה",
  "In process": "בתהליך",
  "Expired": "פג תוקף",
  "Not applicable": "לא רלוונטי",
  "Select an agency": "בחירת סוכנות",
  "Bulk onboarding": "קליטה מרוכזת",
  "Import candidates": "ייבוא מועמדים",
  "Choose where the candidates belong, then select the CSV file.": "בחרו לאן שייכים המועמדים, ולאחר מכן בחרו קובץ CSV.",
  "Current agency": "הסוכנות הנוכחית",
  "Your account is limited to its assigned agency.": "החשבון שלך מוגבל לסוכנות שהוקצתה לו.",
  "Imported candidates will be created under the selected agency.": "המועמדים שיובאו ייווצרו תחת הסוכנות שנבחרה.",
  "CSV file": "קובץ CSV",
  "Max 2 MB": "עד 2MB",
  "CSV format only": "פורמט CSV בלבד",
  "Remove": "הסרה",
  "Reference": "אסמכתא",
  "Profile details": "פרטי פרופיל",
  "Keep your contact, passport, location, work status, profession, experience, and skills up to date.": "יש לעדכן את פרטי הקשר, הדרכון, המיקום, סטטוס העבודה, המקצוע, הניסיון והמיומנויות.",
  "Search candidates": "חיפוש מועמדים",
  "Status": "סטטוס",
  "Sort": "מיון",
  "Country": "מדינה",
  "Profession": "מקצוע",
  "Availability": "זמינות",
  "Visa / work status": "סטטוס ויזה / עבודה",
  "Location": "מיקום",
  "candidate(s)": "מועמד(ים)",
  "Experience": "ניסיון",
  "Contact": "פרטי קשר",
  "Passport": "דרכון",
  "Onboarding": "קליטה",
  "Open candidate": "פתיחת מועמד",
  "Candidate profile": "פרופיל מועמד",
  "Mark complete": "סמן כהושלם",
  "Full profile": "פרופיל מלא",
  "Edit profile": "עריכת פרופיל",
  "Update the candidate's contact, identity, location, work status, profession, experience, and skills.": "עדכון פרטי הקשר, הזהות, המיקום, סטטוס העבודה, המקצוע, הניסיון והמיומנויות של המועמד.",
  "Email": "דוא״ל",
  "Work readiness": "מוכנות לעבודה",
  "Update the recruitment stage and record an optional reason.": "עדכון שלב הגיוס ותיעוד סיבה אופציונלית.",
  "Reason": "סיבה",
  "Save": "שמירה",
  "Interview history": "היסטוריית ראיונות",
  "Past and scheduled interviews for this candidate.": "ראיונות קודמים ומתוזמנים עבור מועמד זה.",
  "Candidate documents": "מסמכי המועמד",
  "Manage documents attached to this candidate profile.": "ניהול מסמכים המצורפים לפרופיל המועמד.",
  "Activity history": "היסטוריית פעילות",
  "Status changes and other recorded candidate actions.": "שינויי סטטוס ופעולות נוספות שנרשמו עבור המועמד.",
  "Status history": "היסטוריית סטטוס",
  "No status history recorded.": "לא נרשמה היסטוריית סטטוס.",
  "Activity log": "יומן פעילות",
  "No candidate activity recorded yet.": "עדיין לא נרשמה פעילות עבור המועמד.",
  "Download CSV template": "הורדת תבנית CSV",
  "Import candidates from CSV": "ייבוא מועמדים מ-CSV",
  "Candidate action failed": "פעולת המועמד נכשלה",
  "Loading candidates": "טוען מועמדים",
  "Close new candidate dialog": "סגירת חלון מועמד חדש",
  "Sri Lanka": "סרי לנקה",
  "Passport number": "מספר דרכון",
  "Colombo, Sri Lanka": "קולומבו, סרי לנקה",
  "Close import candidates dialog": "סגירת חלון ייבוא מועמדים",
  "Immediately / Within 2 weeks": "מיידית / בתוך שבועיים",
  "Available / Required / In process": "זמין / חובה / בתהליך",
  "Profile not linked": "הפרופיל אינו מקושר",
  "Name, reference, passport, contact, location or skill…": "שם, אסמכתא, דרכון, קשר, מיקום או מיומנות…",
  "Clear filters": "ניקוי מסננים",
  "Candidate list view": "תצוגת רשימת מועמדים",
  "Card view": "תצוגת כרטיסים",
  "Table view": "תצוגת טבלה",
  "Close candidate details": "סגירת פרטי מועמד",
  "Optional decision note": "הערת החלטה אופציונלית",
  "Live workspace": "סביבת עבודה פעילה",
  "Candidate pipeline": "צינור מועמדים",
  "Every candidate lifecycle stage in the current scope.": "כל שלב במחזור החיים של המועמד בהיקף הנוכחי.",
  "Interview status": "סטטוס ראיונות",
  "Operational workload by interview state.": "עומס תפעולי לפי מצב הראיון.",
  "Interview mix": "התפלגות ראיונות",
  "Volume by interview type.": "כמות לפי סוג ראיון.",
  "Upcoming interviews": "ראיונות קרובים",
  "The next panel sessions requiring attention.": "מושבי הצוות הבאים הדורשים תשומת לב.",
  "No upcoming interviews.": "אין ראיונות קרובים.",
  "Evaluation workload": "עומס הערכות",
  "Panel scoring activity in your scope.": "פעילות ניקוד צוותי בהיקף שלך.",
  "Submitted": "נשלח",
  "Drafts": "טיוטות",
  "Average submitted criterion score:": "ממוצע ניקוד הקריטריונים שנשלח:",
  "Decision queue": "תור החלטות",
  "Candidates that reached interview completion.": "מועמדים שהגיעו להשלמת ראיון.",
  "My interview desk": "שולחן הראיונות שלי",
  "Keep the panel moving from scheduled to submitted.": "קידום הצוות ממתוזמן ועד שליחת ההערכות.",
  "Loading dashboard": "טוען לוח בקרה",
  "Dashboard unavailable": "לוח הבקרה אינו זמין",
  "Interview setup": "הגדרת ראיון",
  "New criterion": "קריטריון חדש",
  "New group": "קבוצה חדשה",
  "Select criteria": "בחירת קריטריונים",
  "Only active criteria can be added": "ניתן להוסיף רק קריטריונים פעילים",
  "Create at least one active criterion first.": "יש ליצור תחילה לפחות קריטריון פעיל אחד.",
  "Groups": "קבוצות",
  "Criteria": "קריטריונים",
  "Reusable scorecards": "טפסי הערכה לשימוש חוזר",
  "Criteria groups": "קבוצות קריטריונים",
  "Choose one of these groups when scheduling an interview.": "בחרו אחת מהקבוצות הללו בעת תזמון ראיון.",
  "Score": "ניקוד",
  "View": "צפייה",
  "Edit": "עריכה",
  "Scoring library": "ספריית ניקוד",
  "Deactivate individual criteria instead of deleting them so older scorecards remain readable.": "השבתת קריטריונים בודדים במקום מחיקתם, כדי שטפסי הערכה ישנים יישארו קריאים.",
  "Max": "מקסימום",
  "Maximum score": "ניקוד מרבי",
  "Used in scorecards": "בשימוש בטפסי הערכה",
  "Scorecards using this criterion": "טפסי הערכה המשתמשים בקריטריון זה",
  "Edit criterion": "עריכת קריטריון",
  "Max score": "ניקוד מרבי",
  "Criteria in this scorecard": "הקריטריונים בטופס הערכה זה",
  "Edit group": "עריכת קבוצה",
  "Interview criteria": "קריטריוני ראיון",
  "Interview setup action failed": "פעולת הגדרת הראיון נכשלה",
  "Loading interview setup": "טוען הגדרות ראיון",
  "Technical skill": "מיומנות טכנית",
  "What should the interviewer assess?": "מה על המראיין להעריך?",
  "Mason — Technical interview": "בנאי — ראיון טכני",
  "Masonry / Skilled Trades": "בנאות / מקצועות מיומנים",
  "What this interview scorecard is intended to assess…": "מה טופס ההערכה של הראיון הזה נועד להעריך…",
  "Interview criteria sections": "מקטעי קריטריוני ראיון",
  "No criteria groups configured": "לא הוגדרו קבוצות קריטריונים",
  "No criteria configured": "לא הוגדרו קריטריונים",
  "Criterion details": "פרטי קריטריון",
  "Criteria group details": "פרטי קבוצת קריטריונים",
  "Date & time": "תאריך ושעה",
  "Duration": "משך",
  "Job": "משרה",
  "Notes": "הערות",
  "Assigned scorecard": "טופס הערכה שהוקצה",
  "No panel information available.": "אין מידע זמין על הצוות.",
  "Final score & interviewer comparison": "ציון סופי והשוואת מראיינים",
  "Average final score": "ממוצע סופי",
  "Criterion": "קריטריון",
  "Average": "ממוצע",
  "Total": "סה״כ",
  "No submitted interviewer scorecards yet.": "עדיין לא נשלחו טפסי הערכה של מראיינים.",
  "Scorecards": "טפסי הערכה",
  "No scorecards submitted yet.": "עדיין לא נשלחו טפסי הערכה.",
  "Create interview": "יצירת ראיון",
  "Search interviews": "חיפוש ראיונות",
  "Schedule": "תזמון",
  "Interview type": "סוג ראיון",
  "interview(s)": "ראיון(ות)",
  "Interview scheduling": "תזמון ראיון",
  "Assign candidates, choose the interview setup, then select the panel.": "שייכו מועמדים, בחרו את הגדרת הראיון ולאחר מכן בחרו את הצוות.",
  "Select visible": "בחירת הנראים",
  "Select an agency workspace to load candidates.": "בחרו סביבת עבודה של סוכנות כדי לטעון מועמדים.",
  "No candidates match this agency or search.": "אין מועמדים התואמים לסוכנות או לחיפוש זה.",
  "No active agency or global interviewers are available.": "אין מראייני סוכנות פעילים או מראיינים גלובליים זמינים.",
  "Start interview": "התחלת ראיון",
  "Open interview panel": "פתיחת פאנל הראיון",
  "Candidate": "מועמד",
  "Type": "סוג",
  "Panel": "צוות",
  "Actions": "פעולות",
  "No panel": "ללא צוות",
  "Progress": "התקדמות",
  "My total": "הסך שלי",
  "Panel submissions": "שליחות צוות",
  "Final average": "ממוצע סופי",
  "Access": "גישה",
  "All panel scores": "כל ציוני הצוות",
  "Decision recorded": "החלטה נרשמה",
  "Final candidate decision": "החלטה סופית לגבי המועמד",
  "Record the candidate outcome": "תיעוד תוצאת המועמד",
  "The final score is calculated from the interviewer panel. Record the decision here so the system keeps who made it.": "הציון הסופי מחושב מצוות המראיינים. תעדו כאן את ההחלטה כדי שהמערכת תשמור מי קיבל אותה.",
  "Select final status": "בחירת סטטוס סופי",
  "Update status": "עדכון סטטוס",
  "Interview action failed": "פעולת הראיון נכשלה",
  "Loading interviews": "טוען ראיונות",
  "Search any candidate, passport, job, interviewer, status or detail…": "חיפוש לפי מועמד, דרכון, משרה, מראיין, סטטוס או פרט…",
  "Interview list view": "תצוגת רשימת ראיונות",
  "Close interview form": "סגירת טופס ראיון",
  "Search candidates to add…": "חיפוש מועמדים להוספה…",
  "Search candidates…": "חיפוש מועמדים…",
  "Interview room / online": "חדר ראיון / מקוון",
  "Interview instructions or notes…": "הוראות ראיון או הערות…",
  "No interviews": "אין ראיונות",
  "Edit interview": "עריכת ראיון",
  "Mark as no show": "סימון כלא הגיע",
  "Cancel interview": "ביטול ראיון",
  "Close interview workspace": "סגירת סביבת עבודת הראיון",
  "Minimize interview workspace": "מזעור סביבת עבודת הראיון",
  "Enter interview observations, strengths, concerns and final notes…": "הזנת תצפיות, חוזקות, חששות והערות סופיות לראיון…",
  "Reason or decision note": "סיבה או הערת החלטה",
  "New job": "משרה חדשה",
  "Job search": "חיפוש משרות",
  "Search by title, location, description, or status.": "חיפוש לפי כותרת, מיקום, תיאור או סטטוס.",
  "Openings": "משרות פתוחות",
  "Published": "פורסם",
  "Jobs": "משרות",
  "Loading jobs": "טוען משרות",
  "Job action failed": "פעולת המשרה נכשלה",
  "Search jobs…": "חיפוש משרות…",
  "Search jobs": "חיפוש משרות",
  "e.g. Mason — Dubai Project": "לדוגמה: בנאי — פרויקט דובאי",
  "Dubai, UAE": "דובאי, איחוד האמירויות",
  "No jobs to show": "אין משרות להצגה",
  "Download CSV": "הורדת CSV",
  "Print / Save PDF": "הדפסה / שמירת PDF",
  "Candidate lifecycle": "מחזור חיי מועמד",
  "Current candidate distribution.": "התפלגות המועמדים הנוכחית.",
  "Interview performance": "ביצועי ראיונות",
  "Status and type breakdown.": "פירוט לפי סטטוס וסוג.",
  "Recent interviews": "ראיונות אחרונים",
  "CSV downloads the complete metric breakdown. Print / Save PDF uses the browser's native PDF printing.": "קובץ CSV מוריד את פירוט המדדים המלא. הדפסה / שמירת PDF משתמשת בהדפסת ה-PDF המובנית בדפדפן.",
  "Loading reports": "טוען דוחות",
  "Reports unavailable": "הדוחות אינם זמינים",
  "Reports & exports": "דוחות וייצוא",
  "Settings": "הגדרות",
  "Dashboard": "לוח בקרה",
  "Reports": "דוחות",
  "Candidates": "מועמדים",
  "criteria": "קריטריונים",
  "Agencies & Users": "סוכנויות ומשתמשים",
  "Admin": "מנהל מערכת",
  "Interviewee": "מועמד",
  "System administrator": "מנהל מערכת",
  "Agency workspace": "סביבת סוכנות",
  "Interview desk": "שולחן ראיון",
  "Candidate portal": "פורטל מועמדים",
  "Operations": "תפעול",
  "Administration": "ניהול",
  "My Interviews": "הראיונות שלי",
  "My Profile": "הפרופיל שלי",
  "My recruitment": "הגיוס שלי",
  "Language": "שפה",
  "unread notifications": "התראות שלא נקראו"
} as const;

type TranslationMap = Record<string, string>;

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (value: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const translateNode = (node: Node, translations: TranslationMap) => {
  const owner = node.parentElement;
  if (owner && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(owner.tagName)) return;

  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    const parent = textNode.parentElement;
    if (parent && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName) && !parent.closest('[data-i18n-ignore]')) {
      textNodes.push(textNode);
    }
    current = walker.nextNode();
  }

  for (const textNode of textNodes) {
    const source = textNode.nodeValue ?? '';
    const trimmed = source.trim();
    const replacement = translations[trimmed];
    if (!replacement || replacement === trimmed) continue;
    const start = source.indexOf(trimmed);
    const end = start + trimmed.length;
    textNode.nodeValue = source.slice(0, start) + replacement + source.slice(end);
  }
};

const translateAttributes = (root: Element, translations: TranslationMap) => {
  const elements = [root, ...Array.from(root.querySelectorAll('*'))];
  for (const element of elements) {
    if (element.closest('[data-i18n-ignore]')) continue;
    for (const attribute of ['placeholder', 'title', 'aria-label', 'alt']) {
      const value = element.getAttribute(attribute);
      const replacement = value ? translations[value.trim()] : undefined;
      if (value && replacement && replacement !== value) {
        element.setAttribute(attribute, replacement);
      }
    }
  }
};

const translateDocument = (language: AppLanguage) => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = language === 'he' ? 'he' : 'en';
  document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  const translations = language === 'he' ? he : {};
  translateNode(document.body, translations);
  translateAttributes(document.body, translations);
};

export const LanguageProvider = ({ children }: PropsWithChildren) => {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    if (typeof window === 'undefined') return 'en';
    return window.localStorage.getItem(STORAGE_KEY) === 'he' ? 'he' : 'en';
  });

  const setLanguage = (next: AppLanguage) => {
    setLanguageState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  useEffect(() => {
    translateDocument(language);

    const observer = new MutationObserver(() => translateDocument(language));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    t: (value) => language === 'he' ? (he[value] ?? value) : value,
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      <LanguageRerenderBoundary language={language}>{children}</LanguageRerenderBoundary>
    </LanguageContext.Provider>
  );
};

const LanguageRerenderBoundary = ({ language, children }: { language: AppLanguage; children: ReactNode }) => (
  <div key={language} className="contents">{children}</div>
);

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider.');
  return context;
};
