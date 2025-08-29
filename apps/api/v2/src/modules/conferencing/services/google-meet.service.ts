import { getEnv } from "@/env";
import { AppsRepository } from "@/modules/apps/apps.repository";
import { ConferencingRepository } from "@/modules/conferencing/repositories/conferencing.repository";
import { CredentialsRepository } from "@/modules/credentials/credentials.repository";
import { calendar_v3 } from "@googleapis/calendar";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { OAuth2Client } from "googleapis-common";

import { GOOGLE_CALENDAR_TYPE, GOOGLE_MEET_TYPE } from "@calcom/platform-constants";
import {
  getInstalledAppPath,
  getSafeRedirectUrl,
  GoogleCalendarService,
  renewSelectedCalendarCredentialId,
  SCOPE_USERINFO_PROFILE,
} from "@calcom/platform-libraries/app-store";

import { OAuthCallbackState } from "../controllers/conferencing.controller";
import { GOOGLE_CALENDAR_SCOPES } from "../helpers/constant";
import { googleAppKeysSchema } from "../helpers/keys";

@Injectable()
export class GoogleMeetService {
  private logger = new Logger("GoogleMeetService");

  constructor(
    private readonly conferencingRepository: ConferencingRepository,
    private readonly credentialsRepository: CredentialsRepository,
    private readonly appsRepository: AppsRepository
  ) {}

  async connectGoogleMeetToUser(userId: number) {
    await this.validateGoogleCalendarConnection(userId, "user");

    const googleMeetExists = await this.conferencingRepository.findGoogleMeet(userId);
    if (googleMeetExists) {
      throw new BadRequestException("Google Meet is already connected for this user.");
    }

    return this.credentialsRepository.upsertUserAppCredential(GOOGLE_MEET_TYPE, {}, userId);
  }

  async connectGoogleMeetToTeam(teamId: number) {
    await this.validateGoogleCalendarConnection(teamId, "team");

    const googleMeetExists = await this.credentialsRepository.findCredentialByTypeAndTeamId(
      GOOGLE_MEET_TYPE,
      teamId
    );
    if (googleMeetExists) {
      throw new BadRequestException("Google Meet is already connected for this team.");
    }

    return this.credentialsRepository.upsertTeamAppCredential(GOOGLE_MEET_TYPE, {}, teamId);
  }

  /**
   * Validate that Google Calendar is connected and valid for either a user or a team.
   */
  private async validateGoogleCalendarConnection(id: number, entity: "user" | "team") {
    const googleCalendar =
      entity === "user"
        ? await this.credentialsRepository.findCredentialByTypeAndUserId(GOOGLE_CALENDAR_TYPE, id)
        : await this.credentialsRepository.findCredentialByTypeAndTeamId(GOOGLE_CALENDAR_TYPE, id);

    if (!googleCalendar) {
      throw new BadRequestException("Google Meet requires a Google Calendar connection.");
    }

    if (googleCalendar.invalid) {
      throw new BadRequestException(
        "Google Meet requires a valid Google Calendar connection. Please reconnect Google Calendar."
      );
    }
  }

  async getGoogleAppKeys(slug: string) {
    const app = await this.appsRepository.getAppBySlug(slug);
    const appKeys = app?.keys as Prisma.JsonObject;
    return googleAppKeysSchema.parse(appKeys);
  }

  async generateGoogleMeetAuthUrl(state: string) {
    const { client_id, client_secret } = await this.getGoogleAppKeys("google-calendar");
    const redirect_uri = `${getEnv("API_URL")}/conferencing/google-meet/oauth/callback`;
    const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uri);

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [SCOPE_USERINFO_PROFILE, ...GOOGLE_CALENDAR_SCOPES],
      prompt: "consent",
      state,
    });

    return { url: authUrl };
  }

  async connectGoogleMeetApp(
    state: OAuthCallbackState,
    code: string,
    userId: number
  ): Promise<{ url: string }> {
    const { client_id, client_secret } = await this.getGoogleAppKeys("google-calendar");

    const redirect_uri = `${getEnv("API_URL")}/conferencing/google-meet/oauth/callback`;
    const oAuth2Client = new OAuth2Client(client_id, client_secret, redirect_uri);

    if (code) {
      const token = await oAuth2Client.getToken(code);
      const key = token.tokens;
      const grantedScopes = token.tokens.scope?.split(" ") ?? [];
      // Check if we have granted all required permissions
      const hasMissingRequiredScopes = GOOGLE_CALENDAR_SCOPES.some((scope) => !grantedScopes.includes(scope));
      if (hasMissingRequiredScopes) {
        if (state?.fromApp) {
          throw new Error("You must grant all permissions to use this integration");
        }
        return {
          url: state?.returnTo ?? getInstalledAppPath({ variant: "calendar", slug: "google-calendar" }),
        };
      }
      oAuth2Client.setCredentials(key);

      const gcalCredential = await this.credentialsRepository.findCredentialByTypeAndUserId(
        "google_calendar",
        userId
      );

      let credentialToUse = gcalCredential;
      if (!gcalCredential) {
        credentialToUse = await this.credentialsRepository.create({
          userId,
          key: key as Prisma.InputJsonValue,
          appId: "google-calendar",
          type: "google_calendar",
        });
      }

      if (!credentialToUse) {
        throw new Error("Failed to find or create Google Calendar credential.");
      }

      const gCalService = new GoogleCalendarService({
        ...credentialToUse,
        user: null,
        delegatedTo: null,
      });

      const calendar = new calendar_v3.Calendar({
        auth: oAuth2Client,
      });

      const primaryCal = await gCalService.getPrimaryCalendar(calendar);

      // If we still don't have a primary calendar skip creating the selected calendar.
      // It can be toggled on later.
      if (!primaryCal?.id) {
        return {
          url: state?.returnTo ?? getInstalledAppPath({ variant: "calendar", slug: "google-calendar" }),
        };
      }

      const selectedCalendarWhereUnique = {
        userId,
        externalId: primaryCal.id,
        integration: "google_calendar",
      };

      try {
        await gCalService.upsertSelectedCalendar({
          // First install should add a user-level selectedCalendar only.
          eventTypeId: null,
          externalId: selectedCalendarWhereUnique.externalId,
        });
      } catch (error) {
        let errorMessage = "something_went_wrong";
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          // it is possible a selectedCalendar was orphaned, in this situation-
          // we want to recover by connecting the existing selectedCalendar to the new Credential.
          if (await renewSelectedCalendarCredentialId(selectedCalendarWhereUnique, credentialToUse.id)) {
            return {
              url: state?.returnTo ?? getInstalledAppPath({ variant: "calendar", slug: "google-calendar" }),
            };
          }
          // else
          errorMessage = "account_already_linked";
        }
        await this.credentialsRepository.deleteById({ id: credentialToUse.id });
        return {
          url:
            getSafeRedirectUrl(state?.onErrorReturnTo) ??
            getInstalledAppPath({ variant: "calendar", slug: "google-calendar" }),
        };
      }
    }

    if (!state?.installGoogleVideo) {
      return {
        url:
          getSafeRedirectUrl(state?.returnTo) ??
          getInstalledAppPath({ variant: "calendar", slug: "google-calendar" }),
      };
    }

    const existingGoogleMeetCredential = await this.credentialsRepository.findFirstByUserIdAndType({
      userId,
      type: "google_video",
    });

    if (existingGoogleMeetCredential) {
      return {
        url: state?.returnTo ?? getInstalledAppPath({ variant: "conferencing", slug: "google-meet" }),
      };
    }

    // Create a new google meet credential
    await this.credentialsRepository.create({
      userId,
      type: "google_video",
      key: {},
      appId: "google-meet",
    });

    return {
      url: state?.returnTo ?? getInstalledAppPath({ variant: "conferencing", slug: "google-meet" }),
    };
  }
}
