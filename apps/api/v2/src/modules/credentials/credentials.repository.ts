import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { APPS_TYPE_ID_MAPPING } from "@calcom/platform-constants";
import { credentialForCalendarServiceSelect } from "@calcom/platform-libraries";
import {
  buildNonDelegationCredential,
  decryptServiceAccountKey,
  serviceAccountKeySchema,
} from "@calcom/platform-libraries/app-store";

@Injectable()
export class CredentialsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async upsertUserAppCredential(
    type: keyof typeof APPS_TYPE_ID_MAPPING,
    key: Prisma.InputJsonValue,
    userId: number,
    credentialId?: number | null
  ) {
    return this.dbWrite.prisma.credential.upsert({
      create: {
        type,
        key,
        userId,
        appId: APPS_TYPE_ID_MAPPING[type],
      },
      update: {
        key,
        invalid: false,
      },
      where: {
        id: credentialId ?? 0,
      },
    });
  }

  async upsertTeamAppCredential(
    type: keyof typeof APPS_TYPE_ID_MAPPING,
    key: Prisma.InputJsonValue,
    teamId: number,
    credentialId?: number | null
  ) {
    return this.dbWrite.prisma.credential.upsert({
      create: {
        type,
        key,
        teamId,
        appId: APPS_TYPE_ID_MAPPING[type],
      },
      update: {
        key,
        invalid: false,
      },
      where: {
        id: credentialId ?? 0,
      },
    });
  }

  findCredentialByTypeAndUserId(type: string, userId: number) {
    return this.dbWrite.prisma.credential.findFirst({ where: { type, userId } });
  }

  findAllCredentialsByTypeAndUserId(type: string, userId: number) {
    return this.dbWrite.prisma.credential.findMany({ where: { type, userId } });
  }

  findCredentialByTypeAndTeamId(type: string, teamId: number) {
    return this.dbWrite.prisma.credential.findFirst({ where: { type, teamId } });
  }

  findAllCredentialsByTypeAndTeamId(type: string, teamId: number) {
    return this.dbWrite.prisma.credential.findMany({ where: { type, teamId } });
  }

  getAllUserCredentialsByTypeAndId(type: string, userId: number) {
    return this.dbRead.prisma.credential.findMany({ where: { type, userId } });
  }

  getUserCredentialsByIds(userId: number, credentialIds: number[]) {
    return this.dbRead.prisma.credential.findMany({
      where: {
        id: {
          in: credentialIds,
        },
        userId: userId,
      },
      select: {
        id: true,
        type: true,
        key: true,
        userId: true,
        teamId: true,
        appId: true,
        invalid: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });
  }

  async getAllUserCredentialsById(userId: number) {
    return await this.dbRead.prisma.credential.findMany({
      where: {
        userId,
      },
      select: credentialForCalendarServiceSelect,
      orderBy: {
        id: "asc",
      },
    });
  }

  async getUserCredentialById(userId: number, credentialId: number, type: string) {
    return await this.dbRead.prisma.credential.findUnique({
      where: {
        userId,
        type,
        id: credentialId,
      },
      select: {
        id: true,
        type: true,
        key: true,
        userId: true,
        teamId: true,
        appId: true,
        invalid: true,
        user: {
          select: {
            email: true,
          },
        },
      },
    });
  }

  async deleteUserCredentialById(userId: number, credentialId: number) {
    return await this.dbWrite.prisma.credential.delete({
      where: { id: credentialId, userId },
    });
  }

  async findFirstByIdWithKeyAndUser({ id }: { id: number }) {
    const credential = await this.dbRead.prisma.credential.findFirst({
      where: { id },
      select: { ...credentialForCalendarServiceSelect, key: true },
    });
    return buildNonDelegationCredential(credential);
  }

  async findManyByUserId({ userId }: { userId: number }) {
    return await this.dbRead.prisma.credential.findMany({
      where: { userId },
      select: credentialForCalendarServiceSelect,
      orderBy: {
        id: "asc",
      },
    });
  }

  async findDelegationCredentialUniqueByOrgMemberEmailIncludeSensitiveServiceAccountKey({
    email,
  }: {
    email: string;
  }) {
    const organization = await this.dbRead.prisma.team.findFirst({
      where: {
        isOrganization: true,
        members: {
          some: {
            user: { email },
          },
        },
      },
    });

    if (!organization) {
      return null;
    }

    const emailDomain = email.split("@")[1];
    const delegationCredential = await this.dbRead.prisma.delegationCredential.findUnique({
      where: {
        organizationId_domain: {
          organizationId: organization.id,
          domain: emailDomain,
        },
      },
      select: {
        id: true,
        enabled: true,
        domain: true,
        createdAt: true,
        updatedAt: true,
        organizationId: true,
        workspacePlatform: {
          select: {
            name: true,
            slug: true,
          },
        },
        serviceAccountKey: true,
      },
    });

    if (!delegationCredential) {
      return null;
    }

    const { serviceAccountKey, ...rest } = delegationCredential;

    // Decrypt the service account key if it exists
    const decryptedKey = decryptServiceAccountKey(serviceAccountKey);
    const parsedServiceAccountKey = serviceAccountKeySchema.safeParse(decryptedKey);

    return {
      ...rest,
      serviceAccountKey: parsedServiceAccountKey.success ? parsedServiceAccountKey.data : null,
    };
  }

  async findFirstByUserIdAndType({ userId, type }: { userId: number; type: string }) {
    return this.dbRead.prisma.credential.findFirst({ where: { userId, type } });
  }

  async create({
    userId,
    type,
    key,
    appId,
  }: {
    userId: number;
    type: string;
    key: Prisma.InputJsonValue;
    appId: string;
  }) {
    return this.dbWrite.prisma.credential.create({
      data: { userId, type, key, appId },
    });
  }

  async deleteById({ id }: { id: number }) {
    return this.dbWrite.prisma.credential.delete({ where: { id } });
  }
}

export type CredentialsWithUserEmail = Awaited<
  ReturnType<typeof CredentialsRepository.prototype.getUserCredentialsByIds>
>;
