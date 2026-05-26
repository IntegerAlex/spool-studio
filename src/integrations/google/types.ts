import "server-only";

export type GoogleOAuthTokens = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
  id_token?: string;
};

export type CalendarReminderMethod = "email" | "popup";

export type CalendarReminderOverride = {
  method: CalendarReminderMethod;
  minutes: number;
};

export type CalendarReminderInput = {
  useDefault?: boolean;
  overrides?: CalendarReminderOverride[];
};

export type CalendarEventInput = {
  userId: string;
  title: string;
  description?: string | null;
  startDateTime: string;
  endDateTime: string;
  reminders?: CalendarReminderInput;
};

export type CalendarEventUpdateInput = {
  userId: string;
  eventId: string;
  title?: string;
  description?: string | null;
  startDateTime?: string;
  endDateTime?: string;
  reminders?: CalendarReminderInput;
};

export type CalendarEventResult = {
  eventId: string;
  htmlLink: string | null;
  status: string | null;
};

export type CalendarDeleteResult = {
  deleted: boolean;
  status: "deleted" | "not_found";
};
