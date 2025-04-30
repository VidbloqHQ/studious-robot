import { CallType, StreamFundingType, StreamSessionType, UserType, Agenda } from "./stream";
import { Tenant } from "./tenant";

export interface TenantResponse {
  tenant: Tenant;
}

export interface TokenResponse {
  token: string;
  userType: UserType;
}

export interface GetStreamResponse {
  id: string;
  name: string;
  userId: string;
  title: string | null;
  callType: CallType;
  streamSessionType: StreamSessionType;
  scheduledFor: string | null;
  creatorWallet: string;
  hasHost: boolean;
  recording: boolean;
  recordId: string | null;
  recordLink: string | null;
  tenantId: string;
  isLive: boolean;
  startedAt: null;
  endedAt: null;
  isPublic: boolean;
  fundingType: StreamFundingType;
  agenda: Agenda[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  participants: any[];
}

export interface CreateStreamResponse {
  id: string;
  name: string;
  title?: string;
  callType: CallType;
  creatorWallet: string;
  streamSessionType: StreamSessionType;
  fundingType: StreamFundingType;
  isPublic: boolean;
  scheduledFor: string | null;
  tenantId: string;
  userId: string;
  hasHost?: boolean;
  recording?: boolean;
  recordId?: string;
  recordLink?: string;
  isLive?: boolean;
  startedAt?: string;
  endedAt?: string;
}

// {
//     "tenant": {
//       "id": "cm9rmd95k000001j3jz3x7n75",
//       "name": null,
//       "theme": null,
//       "primaryColor": null,
//       "secondaryColor": null,
//       "logo": null,
//       "templateId": null,
//       "rpcEndpoint": null,
//       "networkCluster": null,
//       "creatorWallet": "9XAyBX199vN6dA14jKz6T5BpVvZPr31DmSDUdDfPuVaq",
//       "createdAt": "2025-04-21T22:00:07.831Z",
//       "updatedAt": "2025-04-21T22:00:07.831Z",
//       "defaultStreamType": "Meeting",
//       "defaultFundingType": "Live",
//       "enabledStreamTypes": {
//         "enableStream": true,
//         "enableMeeting": true,
//         "enablePodcast": false
//       },
//       "authorizedDomains": []
//     }
//   }