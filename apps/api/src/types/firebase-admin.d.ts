declare module "firebase-admin" {
  export const apps: { length: number }[];

  export function messaging(): Messaging;

  export function initializeApp(options: unknown): AdminApp;

  export namespace credential {
    function applicationDefault(): unknown;
    function cert(options: unknown): unknown;
  }

  export interface Messaging {
    send(message: unknown): Promise<string>;
    sendEachForMulticast(message: unknown): Promise<{
      successCount: number;
      failureCount: number;
      responses: Array<{ success: boolean; error?: { code?: string } }>;
    }>;
  }

  export interface AdminApp {
    messaging(): Messaging;
  }
}
