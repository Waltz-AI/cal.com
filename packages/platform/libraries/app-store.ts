import getInstalledAppPath from "@calcom/app-store/_utils/getInstalledAppPath";
import GoogleCalendarService from "@calcom/app-store/googlecalendar/lib/CalendarService";
import getApps from "@calcom/app-store/utils";
import { getCalEventResponses } from "@calcom/features/bookings/lib/getCalEventResponses";
import handleDeleteCredential from "@calcom/features/credentials/handleDeleteCredential";
import * as twilio from "@calcom/features/ee/workflows/lib/reminders/providers/twilioProvider";
import tasker from "@calcom/features/tasker";
import { deleteWebhookScheduledTriggers } from "@calcom/features/webhooks/lib/scheduleTrigger";
import sendPayload from "@calcom/features/webhooks/lib/sendPayload";
import { getRescheduleLink, getVideoCallUrlFromCalEvent } from "@calcom/lib/CalEventParser";
import getEnabledAppsFromCredentials from "@calcom/lib/apps/getEnabledAppsFromCredentials";
import CrmManager from "@calcom/lib/crmManager/crmManager";
import CRMScheduler from "@calcom/lib/crmManager/tasker/crmScheduler";
import {
  enrichUserWithDelegationCredentialsIncludeServiceAccountKey,
  getDelegationCredentialOrRegularCredential,
} from "@calcom/lib/delegationCredential/server";
import { isPrismaObjOrUndefined } from "@calcom/lib/isPrismaObj";
import addDelegationCredential from "@calcom/trpc/server/routers/viewer/delegationCredential/add.handler";

export type { TDependencyData } from "@calcom/app-store/_appRegistry";

export { CalendarService as IcsFeedCalendarService } from "@calcom/app-store/ics-feedcalendar/lib";
export type { CredentialOwner } from "@calcom/app-store/types";
export { getAppFromSlug } from "@calcom/app-store/utils";
export type { CredentialDataWithTeamName, LocationOption } from "@calcom/app-store/utils";

export { WEBAPP_URL } from "@calcom/lib/constants";

export { getCalendar } from "@calcom/app-store/_utils/getCalendar";

export { CalendarService } from "@calcom/app-store/applecalendar/lib";

export { getApps };

export { handleDeleteCredential };

export type { App } from "@calcom/types/App";

export { getEnabledAppsFromCredentials };

export { getConnectedApps } from "@calcom/lib/getConnectedApps";

export type { ConnectedApps } from "@calcom/lib/getConnectedApps";

export type { AppsStatus } from "@calcom/types/Calendar";

export type { CredentialPayload } from "@calcom/types/Credential";

export { addDelegationCredential };

export {
  CalendarAppDelegationCredentialClientIdNotAuthorizedError,
  CalendarAppDelegationCredentialConfigurationError,
  CalendarAppDelegationCredentialError,
  CalendarAppDelegationCredentialInvalidGrantError,
  CalendarAppDelegationCredentialNotSetupError,
  CalendarAppError,
} from "@calcom/lib/CalendarAppError";
export { enrichUserWithDelegationConferencingCredentialsWithoutOrgId } from "@calcom/lib/delegationCredential/server";
export { toggleDelegationCredentialEnabled } from "@calcom/trpc/server/routers/viewer/delegationCredential/toggleEnabled.handler";

export { appStoreMetadata } from "@calcom/app-store/bookerAppsMetaData";
export { getEventLocationType } from "@calcom/app-store/locations";
export { buildNonDelegationCredential } from "@calcom/lib/delegationCredential/clientAndServer";
export { enrichUserWithDelegationCredentialsIncludeServiceAccountKey, getVideoCallUrlFromCalEvent };

export { decryptServiceAccountKey, serviceAccountKeySchema } from "@calcom/lib/server/serviceAccountKey";

export {
  _buildDelegatedCalendarCredential,
  _buildDelegatedConferencingCredential,
  buildAllCredentials,
} from "@calcom/lib/delegationCredential/server";

export { FAKE_DAILY_CREDENTIAL } from "@calcom/app-store/dailyvideo/lib/VideoApiAdapter";
export { appKeysSchema as calVideoKeysSchema } from "@calcom/app-store/dailyvideo/zod";
export { getLocationFromApp, MeetLocationType } from "@calcom/app-store/locations";
export { FeaturesRepository } from "@calcom/features/flags/features.repository";
export { getUid } from "@calcom/lib/CalEventParser";
export { createEvent, deleteEvent, updateEvent } from "@calcom/lib/CalendarManager";
export { isDelegationCredential } from "@calcom/lib/delegationCredential/clientAndServer";
export { CredentialRepository } from "@calcom/lib/server/repository/credential";
export { createMeeting, deleteMeeting, updateMeeting } from "@calcom/lib/videoClient";
export { CrmManager, CRMScheduler };

export { createdEventSchema } from "@calcom/prisma/zod-utils";
export type { EventTypeAppMetadataSchema } from "@calcom/prisma/zod-utils";

export { tasker, twilio };

export { deleteWebhookScheduledTriggers };

export { CalendarEventBuilder } from "@calcom/lib/builders/CalendarEvent/builder";

export { getBookerBaseUrl } from "@calcom/lib/getBookerUrl/server";

export { getOrgFullOrigin } from "@calcom/features/ee/organizations/lib/orgDomains";

export { subdomainSuffix } from "@calcom/features/ee/organizations/lib/orgDomains";

export { sendPayload };

export { type GetSubscriberOptions } from "@calcom/features/webhooks/lib/getWebhooks";

export { getCalEventResponses };

export { isPrismaObjOrUndefined };

export { getDelegationCredentialOrRegularCredential };

export { getRescheduleLink };

export { WEBSITE_URL } from "@calcom/lib/constants";

export { getGoogleAppKeys } from "@calcom/app-store/googlecalendar/lib/getGoogleAppKeys";
export { GOOGLE_CALENDAR_SCOPES, SCOPE_USERINFO_PROFILE, WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";

export { getSafeRedirectUrl } from "@calcom/lib/getSafeRedirectUrl";
export { getInstalledAppPath };

export { GoogleCalendarService };

export { renewSelectedCalendarCredentialId } from "@calcom/lib/connectedCalendar";
