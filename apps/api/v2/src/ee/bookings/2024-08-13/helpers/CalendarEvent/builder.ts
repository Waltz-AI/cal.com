import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Prisma } from "@prisma/client";

import { getTranslation } from "@calcom/platform-libraries";
import { getUid, WEBAPP_URL } from "@calcom/platform-libraries/app-store";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

import { CalendarEventClass } from "./class";

const userSelect = Prisma.validator<Prisma.UserArgs>()({
  select: {
    id: true,
    email: true,
    name: true,
    username: true,
    timeZone: true,
    credentials: true,
    bufferTime: true,
    destinationCalendar: true,
    locale: true,
  },
});

type User = Omit<Prisma.UserGetPayload<typeof userSelect>, "selectedCalendars">;
type PersonAttendeeCommonFields = Pick<User, "id" | "email" | "name" | "locale" | "timeZone" | "username">;
interface ICalendarEventBuilder {
  calendarEvent: CalendarEventClass;
  eventType: Awaited<ReturnType<CalendarEventBuilder["getEventFromEventId"]>>;
  users: Awaited<ReturnType<CalendarEventBuilder["getUserById"]>>[];
  attendeesList: PersonAttendeeCommonFields[];
  teamMembers: Awaited<ReturnType<CalendarEventBuilder["getTeamMembers"]>>;
  rescheduleLink: string;
}

export class CalendarEventBuilder implements ICalendarEventBuilder {
  calendarEvent!: CalendarEventClass;
  eventType!: ICalendarEventBuilder["eventType"];
  users!: ICalendarEventBuilder["users"];
  attendeesList: ICalendarEventBuilder["attendeesList"] = [];
  teamMembers: ICalendarEventBuilder["teamMembers"] = [];
  rescheduleLink!: string;

  constructor(private readonly prismaReadService: PrismaReadService) {
    this.reset();
    this.prismaReadService = prismaReadService;
  }

  private reset() {
    this.calendarEvent = new CalendarEventClass();
  }

  public init(initProps: CalendarEventClass) {
    this.calendarEvent = new CalendarEventClass(initProps);
  }

  public setEventType(eventType: ICalendarEventBuilder["eventType"]) {
    this.eventType = eventType;
  }

  public async buildEventObjectFromInnerClass(eventId: number) {
    const resultEvent = await this.getEventFromEventId(eventId);
    if (resultEvent) {
      this.eventType = resultEvent;
    }
  }

  public async buildUsersFromInnerClass() {
    if (!this.eventType) {
      throw new Error("exec BuildEventObjectFromInnerClass before calling this function");
    }
    const users = this.eventType.users;

    /* If this event was pre-relationship migration */
    if (!users.length && this.eventType.userId) {
      const eventTypeUser = await this.getUserById(this.eventType.userId);
      if (!eventTypeUser) {
        throw new Error("buildUsersFromINnerClass.eventTypeUser.notFound");
      }
      users.push(eventTypeUser);
    }
    this.setUsers(users);
  }

  public buildAttendeesList() {
    // Language Function was set on builder init
    this.attendeesList = [
      ...(this.calendarEvent.attendees as unknown as PersonAttendeeCommonFields[]),
      ...this.teamMembers,
    ];
  }

  private async getUserById(userId: number) {
    let resultUser: User | null;
    try {
      resultUser = await this.prismaReadService.prisma.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        ...userSelect,
      });
    } catch (error) {
      throw new Error("getUsersById.users.notFound");
    }
    return resultUser;
  }

  private async getEventFromEventId(eventTypeId: number) {
    let resultEventType;
    try {
      resultEventType = await this.prismaReadService.prisma.eventType.findUniqueOrThrow({
        where: {
          id: eventTypeId,
        },
        select: {
          id: true,
          users: userSelect,
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          description: true,
          slug: true,
          teamId: true,
          title: true,
          length: true,
          eventName: true,
          schedulingType: true,
          periodType: true,
          periodStartDate: true,
          periodEndDate: true,
          periodDays: true,
          periodCountCalendarDays: true,
          requiresConfirmation: true,
          userId: true,
          price: true,
          currency: true,
          metadata: true,
          destinationCalendar: true,
          hideCalendarNotes: true,
          hideCalendarEventDetails: true,
        },
      });
    } catch (error) {
      throw new Error("Error while getting eventType");
    }
    return resultEventType;
  }

  public async buildTeamMembers() {
    this.teamMembers = await this.getTeamMembers();
  }

  private async getTeamMembers() {
    // Users[0] its organizer so we are omitting with slice(1)
    const teamMemberPromises = this.users.slice(1).map(async function (user) {
      return {
        id: user.id,
        username: user.username,
        email: user.email || "", // @NOTE: Should we change this "" to teamMemberId?
        name: user.name || "",
        timeZone: user.timeZone,
        language: {
          translate: await getTranslation(user.locale ?? "en", "common"),
          locale: user.locale ?? "en",
        },
        locale: user.locale,
      } as PersonAttendeeCommonFields;
    });
    return await Promise.all(teamMemberPromises);
  }

  public setLocation(location: CalendarEventClass["location"]) {
    this.calendarEvent.location = location;
  }

  public setUId(uid: CalendarEventClass["uid"]) {
    this.calendarEvent.uid = uid;
  }

  public setDestinationCalendar(destinationCalendar: CalendarEventClass["destinationCalendar"]) {
    this.calendarEvent.destinationCalendar = destinationCalendar;
  }

  public setHideCalendarNotes(hideCalendarNotes: CalendarEventClass["hideCalendarNotes"]) {
    this.calendarEvent.hideCalendarNotes = hideCalendarNotes;
  }

  public setHideCalendarEventDetails(
    hideCalendarEventDetails: CalendarEventClass["hideCalendarEventDetails"]
  ) {
    this.calendarEvent.hideCalendarEventDetails = hideCalendarEventDetails;
  }

  public setDescription(description: CalendarEventClass["description"]) {
    this.calendarEvent.description = description;
  }

  public setNotes(notes: CalendarEvent["additionalNotes"]) {
    this.calendarEvent.additionalNotes = notes;
  }

  public setCancellationReason(cancellationReason: CalendarEventClass["cancellationReason"]) {
    this.calendarEvent.cancellationReason = cancellationReason;
  }

  public setUsers(users: User[]) {
    this.users = users;
  }

  public async setUsersFromId(userId: User["id"]) {
    let resultUser: User | null;
    try {
      resultUser = await this.prismaReadService.prisma.user.findUniqueOrThrow({
        where: {
          id: userId,
        },
        ...userSelect,
      });
      this.setUsers([resultUser]);
    } catch (error) {
      throw new Error("getUsersById.users.notFound");
    }
  }

  public buildRescheduleLink({
    allowRescheduleForCancelledBooking = false,
    eventTypeEmail,
    slug,
  }: {
    allowRescheduleForCancelledBooking?: boolean;
    eventTypeEmail?: string;
    slug?: string;
  } = {}) {
    try {
      this.rescheduleLink = this.getRescheduleLink({
        calEvent: this.calendarEvent,
        allowRescheduleForCancelledBooking,
        eventTypeEmail,
        slug,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`buildRescheduleLink.error: ${error.message}`);
      }
    }
  }

  public getRescheduleLink = ({
    calEvent,
    allowRescheduleForCancelledBooking = false,
    eventTypeEmail,
    slug,
    attendee,
  }: {
    calEvent: Parameters<typeof getUid>[0] &
      Parameters<typeof getSeatReferenceId>[0] &
      Parameters<typeof getPlatformRescheduleLink>[0] &
      Pick<CalendarEvent, "bookerUrl" | "platformClientId">;
    allowRescheduleForCancelledBooking?: boolean;
    attendee?: Person;
    eventTypeEmail?: string;
    slug?: string;
  }): string => {
    const Uid = getUid(calEvent);
    const seatUid = getSeatReferenceId(calEvent);

    if (calEvent.platformClientId) {
      return getPlatformRescheduleLink(calEvent, Uid, seatUid);
    }

    const url = new URL(`${calEvent.bookerUrl ?? WEBAPP_URL}/cal/${eventTypeEmail}/${slug}?bookingId=${Uid}`);
    if (allowRescheduleForCancelledBooking) {
      url.searchParams.append("allowRescheduleForCancelledBooking", "true");
    }
    if (attendee?.email) {
      url.searchParams.append("rescheduledBy", attendee.email);
    }

    return url.toString();
  };
}

const getSeatReferenceId = (calEvent: Pick<CalendarEvent, "attendeeSeatId">): string => {
  return calEvent.attendeeSeatId ? calEvent.attendeeSeatId : "";
};

const getPlatformRescheduleLink = (
  calEvent: Pick<CalendarEvent, "platformRescheduleUrl" | "type" | "organizer" | "team">,
  bookingUid: string,
  seatUid?: string
): string => {
  if (calEvent.platformRescheduleUrl) {
    const platformRescheduleLink = new URL(
      `${calEvent.platformRescheduleUrl}/${seatUid ? seatUid : bookingUid}`
    );
    platformRescheduleLink.searchParams.append("slug", calEvent.type);
    calEvent.organizer.username &&
      platformRescheduleLink.searchParams.append("username", calEvent.organizer.username);
    platformRescheduleLink.searchParams.append("reschedule", "true");
    if (calEvent?.team) platformRescheduleLink.searchParams.append("teamId", calEvent.team.id.toString());
    return platformRescheduleLink.toString();
  }
  return "";
};
