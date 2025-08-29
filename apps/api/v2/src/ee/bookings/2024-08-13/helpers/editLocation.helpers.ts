import { OrganizerDefaultConferencingAppType } from "@/constants/booking.constant";
import { Attendee, DestinationCalendar, Prisma } from "@prisma/client";
import { z } from "zod";

import { getTranslation, parseRecurringEvent } from "@calcom/platform-libraries";
import { getEventLocationType, getUid, WEBAPP_URL } from "@calcom/platform-libraries/app-store";
import { type userMetadata } from "@calcom/prisma/zod-utils";
import { AdditionalInformation, CalendarEvent } from "@calcom/types/Calendar";

export type UserMetadata = z.infer<typeof userMetadata>;

export type Organizer = {
  email: string;
  name: string | null;
  timeZone: string;
  locale: string | null;
};

type EventType = {
  title: string;
  recurringEvent: Prisma.JsonValue | null;
  seatsPerTimeSlot: number | null;
  seatsShowAttendees: boolean | null;
  hideOrganizerEmail: boolean;
  customReplyToEmail: string | null;
};

export type Booking = {
  title: string;
  description: string | null;
  startTime: Date | null;
  endTime: Date | null;
  userPrimaryEmail: string | null;
  uid: string;
  destinationCalendar: DestinationCalendar;
  user: {
    destinationCalendar: DestinationCalendar;
  } | null;
  attendees: Attendee[];
  eventType: EventType | null;
};

export function getLocationForOrganizerDefaultConferencingAppInEvtFormat({
  organizer,
}: {
  organizer: {
    name: string;
    metadata: UserMetadata;
  };
}) {
  const organizerMetadata = organizer.metadata;
  const defaultConferencingApp = organizerMetadata?.defaultConferencingApp;
  if (!defaultConferencingApp) {
    throw new Error(`Default conferencing app not found for organizer ${organizer.name}`);
  }
  const defaultConferencingAppSlug = defaultConferencingApp.appSlug;
  const app = {
    appData: {
      location: {
        type: "conferencing",
      },
    },
  };
  if (!app) {
    throw new Error(`Default conferencing app ${defaultConferencingAppSlug} not found`);
  }
  const defaultConferencingAppLocationType = app.appData?.location?.type;
  if (!defaultConferencingAppLocationType) {
    throw new Error("Default conferencing app has no location type");
  }

  const location = defaultConferencingAppLocationType;
  const locationType = getEventLocationType(location);
  if (!locationType) {
    throw new Error(`Location type not found: ${location}`);
  }

  if (locationType.linkType === "dynamic") {
    return location;
  }

  const appLink = defaultConferencingApp.appLink;
  if (!appLink) {
    throw new Error(`Default conferencing app ${defaultConferencingAppSlug} has no app link`);
  }
  return appLink;
}

export async function getLocationInEvtFormatOrThrow({
  location,
  organizer,
}: {
  location: string;
  organizer: {
    name: string | null;
    metadata: UserMetadata;
  };
}) {
  if (location !== OrganizerDefaultConferencingAppType) {
    return location;
  }

  try {
    return getLocationForOrganizerDefaultConferencingAppInEvtFormat({
      organizer: {
        name: organizer.name ?? "Organizer",
        metadata: organizer.metadata,
      },
    });
  } catch (e) {
    throw e;
  }
}

export const buildCalEventFromBooking = async ({
  booking,
  organizer,
  location,
  conferenceCredentialId,
}: {
  booking: Booking;
  organizer: Organizer;
  location: string;
  conferenceCredentialId: number | null;
}) => {
  const attendeesList = await Promise.all(
    booking.attendees.map(async (attendee) => {
      return {
        name: attendee.name,
        email: attendee.email,
        timeZone: attendee.timeZone,
        language: {
          translate: await getTranslation(attendee.locale ?? "en", "common"),
          locale: attendee.locale ?? "en",
        },
      };
    })
  );

  const tOrganizer = await getTranslation(organizer.locale ?? "en", "common");

  return {
    title: booking.title || "",
    type: (booking.eventType?.title as string) || booking.title || "",
    description: booking.description || "",
    startTime: booking.startTime ? new Date(booking.startTime).toISOString() : "",
    endTime: booking.endTime ? new Date(booking.endTime).toISOString() : "",
    organizer: {
      email: booking.userPrimaryEmail ?? organizer.email,
      name: organizer.name ?? "Nameless",
      timeZone: organizer.timeZone,
      language: { translate: tOrganizer, locale: organizer.locale ?? "en" },
    },
    attendees: attendeesList,
    hideOrganizerEmail: booking.eventType?.hideOrganizerEmail,
    uid: booking.uid,
    recurringEvent: parseRecurringEvent(booking.eventType?.recurringEvent),
    location,
    conferenceCredentialId: conferenceCredentialId ?? undefined,
    destinationCalendar: booking.destinationCalendar
      ? [booking.destinationCalendar]
      : booking.user?.destinationCalendar
      ? [booking.user?.destinationCalendar]
      : [],
    seatsPerTimeSlot: booking.eventType?.seatsPerTimeSlot,
    seatsShowAttendees: booking.eventType?.seatsShowAttendees,
    customReplyToEmail: booking.eventType?.customReplyToEmail,
  };
};

export function extractAdditionalInformation(result: {
  updatedEvent: AdditionalInformation;
}): AdditionalInformation {
  const additionalInformation: AdditionalInformation = {};
  if (result) {
    additionalInformation.hangoutLink = result.updatedEvent?.hangoutLink;
    additionalInformation.conferenceData = result.updatedEvent?.conferenceData;
    additionalInformation.entryPoints = result.updatedEvent?.entryPoints;
  }
  return additionalInformation;
}

export const isDailyVideoCall = (calEvent: Pick<CalendarEvent, "videoCallData">): boolean => {
  return calEvent?.videoCallData?.type === "daily_video";
};

export const getPublicVideoCallUrl = (calEvent: Pick<CalendarEvent, "uid">): string => {
  return `${WEBAPP_URL}/video/${getUid(calEvent)}`;
};

export const getVideoCallUrlFromCalEvent = (
  calEvent: Parameters<typeof getPublicVideoCallUrl>[0] &
    Pick<CalendarEvent, "videoCallData" | "additionalInformation" | "location">
): string => {
  if (calEvent.videoCallData) {
    if (isDailyVideoCall(calEvent)) {
      return getPublicVideoCallUrl(calEvent);
    }
    return calEvent.videoCallData.url;
  }
  if (calEvent.additionalInformation?.hangoutLink) {
    return calEvent.additionalInformation.hangoutLink;
  }
  if (calEvent.location?.startsWith("http")) {
    return calEvent.location;
  }
  return "";
};
