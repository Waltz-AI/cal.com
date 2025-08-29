import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Logger } from "@nestjs/common";
import { Prisma, User, WebhookTriggerEvents, WorkflowMethods } from "@prisma/client";

import { teamMetadataSchema } from "@calcom/platform-libraries";
import {
  getOrgFullOrigin,
  GetSubscriberOptions,
  subdomainSuffix,
  tasker,
  twilio,
  WEBSITE_URL,
} from "@calcom/platform-libraries/app-store";

export type PersonAttendeeCommonFields = Pick<
  User,
  "id" | "email" | "name" | "locale" | "timeZone" | "username"
> & { phoneNumber?: string | null };

export class RequestRescheduleHelpers {
  private readonly logger = new Logger("RequestRescheduleHelpers");

  constructor(
    private readonly prismaReadService: PrismaReadService,
    private readonly prismaWriteService: PrismaWriteService
  ) {
    this.prismaReadService = prismaReadService;
    this.prismaWriteService = prismaWriteService;
  }

  async deleteScheduledEmailReminder(reminderId: number) {
    const workflowReminder = await this.prismaReadService.prisma.workflowReminder.findUnique({
      where: {
        id: reminderId,
      },
    });

    if (!workflowReminder) {
      console.error("Workflow reminder not found");
      return;
    }

    const { uuid, referenceId } = workflowReminder;
    if (uuid) {
      try {
        const taskId = await tasker.cancelWithReference(uuid, "sendWorkflowEmails");
        if (taskId) {
          await this.prismaWriteService.prisma.workflowReminder.delete({
            where: {
              id: reminderId,
            },
          });

          return;
        }
      } catch (error) {
        this.logger.error(`Error canceling/deleting reminder with tasker. Error: ${error}`);
      }
    }

    /**
     * @deprecated only needed for SendGrid, use SMTP with tasker instead
     */
    try {
      if (!referenceId) {
        await this.prismaWriteService.prisma.workflowReminder.delete({
          where: {
            id: reminderId,
          },
        });

        return;
      }

      await this.prismaWriteService.prisma.workflowReminder.update({
        where: {
          id: reminderId,
        },
        data: {
          cancelled: true,
        },
      });
    } catch (error) {
      this.logger.error(`Error canceling reminder with error ${error}`);
    }
  }

  async deleteScheduledSMSReminder(reminderId: number, referenceId: string | null) {
    try {
      if (referenceId) {
        await twilio.cancelSMS(referenceId);
      }

      await this.prismaWriteService.prisma.workflowReminder.delete({
        where: {
          id: reminderId,
        },
      });
    } catch (error) {
      this.logger.error(`Error canceling reminder with error ${error}`);
    }
  }

  async deleteScheduledWhatsappReminder(reminderId: number, referenceId: string | null) {
    try {
      if (referenceId) {
        await twilio.cancelSMS(referenceId);
      }

      await this.prismaWriteService.prisma.workflowReminder.delete({
        where: {
          id: reminderId,
        },
      });
    } catch (error) {
      this.logger.error(`Error canceling reminder with error ${error}`);
    }
  }

  async deleteAllWorkflowReminders(
    remindersToDelete:
      | {
          id: number;
          referenceId: string | null;
          method: string;
        }[]
      | null
  ) {
    const reminderMethods: {
      [x: string]: (id: number, referenceId: string | null) => void;
    } = {
      [WorkflowMethods.EMAIL]: (id, referenceId) => this.deleteScheduledEmailReminder(id),
      [WorkflowMethods.SMS]: (id, referenceId) => this.deleteScheduledSMSReminder(id, referenceId),
      [WorkflowMethods.WHATSAPP]: (id, referenceId) => this.deleteScheduledWhatsappReminder(id, referenceId),
    };

    if (!remindersToDelete) return Promise.resolve();

    const results = await Promise.allSettled(
      remindersToDelete.map((reminder) => {
        return reminderMethods[reminder.method](reminder.id, reminder.referenceId);
      })
    );

    results.forEach((result, index) => {
      if (result.status !== "fulfilled") {
        this.logger.error(
          `An error occurred when deleting reminder ${remindersToDelete[index].id}, method: ${remindersToDelete[index].method}`,
          result.reason
        );
      }
    });
  }

  async getBrand(orgId: number | null) {
    if (!orgId) {
      return null;
    }
    const org = await this.prismaReadService.prisma.team.findFirst({
      where: {
        id: orgId,
      },
      select: {
        logoUrl: true,
        name: true,
        slug: true,
        metadata: true,
        isPlatform: true,
      },
    });
    if (!org) {
      return null;
    }

    // platform orgs don't have a brand nor a domain
    if (org.isPlatform) {
      return null;
    }

    const metadata = teamMetadataSchema.parse(org.metadata);
    const slug = (org.slug || metadata?.requestedSlug) as string;
    const fullDomain = getOrgFullOrigin(slug);
    const domainSuffix = subdomainSuffix();

    return {
      ...org,
      metadata,
      slug,
      fullDomain,
      domainSuffix,
    };
  }

  async getBookerBaseUrl(organizationId: number | null) {
    const orgBrand = await this.getBrand(organizationId);
    return orgBrand?.fullDomain ?? WEBSITE_URL;
  }

  async getTeamIdFromEventType({
    eventType,
  }: {
    eventType: { team: { id: number | null } | null; parentId: number | null };
  }) {
    if (!eventType) {
      return null;
    }

    if (eventType?.team?.id) {
      return eventType.team.id;
    }

    // If it's a managed event we need to find the teamId for it from the parent
    if (eventType?.parentId) {
      const managedEvent = await this.prismaReadService.prisma.eventType.findFirst({
        where: {
          id: eventType.parentId,
        },
        select: {
          teamId: true,
        },
      });

      return managedEvent?.teamId;
    }
  }

  async getOrgIdFromMemberOrTeamId(args: { memberId?: number | null; teamId?: number | null }) {
    const userId = args.memberId ?? 0;
    const teamId = args.teamId ?? 0;

    const orgId = await this.prismaReadService.prisma.team.findFirst({
      where: {
        OR: [
          {
            AND: [
              {
                members: {
                  some: {
                    userId,
                    accepted: true,
                  },
                },
              },
              {
                isOrganization: true,
              },
            ],
          },
          {
            AND: [
              {
                children: {
                  some: {
                    id: teamId,
                  },
                },
              },
              {
                isOrganization: true,
              },
            ],
          },
        ],
      },
      select: {
        id: true,
      },
    });
    return orgId?.id;
  }

  async getWebhooks(options: GetSubscriberOptions) {
    const teamId = options.teamId;
    const userId = options.userId ?? 0;
    const eventTypeId = options.eventTypeId ?? 0;
    const teamIds = Array.isArray(teamId) ? teamId : [teamId ?? 0];
    const orgId = options.orgId ?? 0;
    const oAuthClientId = options.oAuthClientId ?? "";

    const managedChildEventType = await this.prismaReadService.prisma.eventType.findFirst({
      where: {
        id: eventTypeId,
        parentId: {
          not: null,
        },
      },
      select: {
        parentId: true,
      },
    });

    const managedParentEventTypeId = managedChildEventType?.parentId ?? 0;

    // if we have userId and teamId it is a managed event type and should trigger for team and user
    const allWebhooks = await this.prismaReadService.prisma.webhook.findMany({
      where: {
        OR: [
          {
            platform: true,
          },
          {
            userId,
          },
          {
            eventTypeId,
          },
          {
            eventTypeId: managedParentEventTypeId,
          },
          {
            teamId: {
              in: [...teamIds, orgId],
            },
          },
          { platformOAuthClientId: oAuthClientId },
        ],
        AND: {
          eventTriggers: {
            has: options.triggerEvent,
          },
          active: {
            equals: true,
          },
        },
      },
      select: {
        id: true,
        subscriberUrl: true,
        payloadTemplate: true,
        appId: true,
        secret: true,
        time: true,
        timeUnit: true,
        eventTriggers: true,
      },
    });

    return allWebhooks;
  }

  async _deleteWebhookScheduledTriggers({
    booking,
    appId,
    triggerEvent,
    webhookId,
    userId,
    teamId,
    isDryRun = false,
  }: {
    booking?: { id: number; uid: string };
    appId?: string | null;
    triggerEvent?: WebhookTriggerEvents;
    webhookId?: string;
    userId?: number;
    teamId?: number;
    isDryRun?: boolean;
  }) {
    if (isDryRun) return;
    try {
      if (appId && (userId || teamId)) {
        const where: Prisma.BookingWhereInput = {};
        if (userId) {
          where.eventType = { userId };
        } else {
          where.eventType = { teamId };
        }
        await this.prismaWriteService.prisma.webhookScheduledTriggers.deleteMany({
          where: {
            appId: appId,
            booking: where,
          },
        });
      } else {
        if (booking) {
          await this.prismaWriteService.prisma.webhookScheduledTriggers.deleteMany({
            where: {
              bookingId: booking.id,
            },
          });
        } else if (webhookId) {
          const where: Prisma.WebhookScheduledTriggersWhereInput = { webhookId: webhookId };

          if (triggerEvent) {
            const shouldContain = `"triggerEvent":"${triggerEvent}"`;
            where.payload = { contains: shouldContain };
          }

          await this.prismaWriteService.prisma.webhookScheduledTriggers.deleteMany({
            where,
          });
        }
      }
    } catch (error) {
      console.error("Error deleting webhookScheduledTriggers ", error);
    }
  }
}
