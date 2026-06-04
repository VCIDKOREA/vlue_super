export type EscrowPaymentRequest = {
  orderId: string;
  buyerUserId: string;
  amountKrw: number;
  currency?: string;
};

export type EscrowPaymentResult = {
  provider: string;
  status: "held" | "failed";
  escrowRef: string;
  raw: Record<string, unknown>;
};

export interface PaymentProviderPort {
  holdEscrow(request: EscrowPaymentRequest): Promise<EscrowPaymentResult>;
}

export class MockEscrowProvider implements PaymentProviderPort {
  async holdEscrow(request: EscrowPaymentRequest): Promise<EscrowPaymentResult> {
    const now = Date.now();
    return {
      provider: "mock-escrow",
      status: "held",
      escrowRef: `mock_escrow_${request.orderId}_${now}`,
      raw: {
        message: "mock escrow hold completed",
        amountKrw: request.amountKrw,
        buyerUserId: request.buyerUserId
      }
    };
  }
}

export function resolvePaymentProvider(): PaymentProviderPort {
  const provider = (process.env.PG_PROVIDER || "mock").trim().toLowerCase();
  if (provider === "mock") return new MockEscrowProvider();
  // Real provider wiring point.
  return new MockEscrowProvider();
}

