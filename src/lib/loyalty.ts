import { SignJWT, importPKCS8 } from "jose";

export const LOYALTY_REWARD_GOAL = 5;

export type LoyaltyMember = {
  id: string;
  restaurant_id: string;
  full_name: string;
  email: string | null;
  phone: string;
  stamps: number;
  reward_goal: number;
};

export function appleWalletConfigured() {
  return Boolean(
    process.env.APPLE_WWDR_CERT_BASE64 &&
      process.env.APPLE_SIGNER_CERT_BASE64 &&
      process.env.APPLE_SIGNER_KEY_BASE64 &&
      process.env.APPLE_PASS_TYPE_IDENTIFIER &&
      process.env.APPLE_TEAM_IDENTIFIER,
  );
}

export async function createGoogleWalletSaveUrl({
  member,
  restaurantName,
}: {
  member: LoyaltyMember;
  restaurantName: string;
}) {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const classId = process.env.GOOGLE_WALLET_CLASS_ID;
  const serviceAccountEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_WALLET_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!issuerId || !classId || !serviceAccountEmail || !privateKey) {
    return null;
  }

  const key = await importPKCS8(privateKey, "RS256");
  const objectId = `${issuerId}.${member.id}`;
  const token = await new SignJWT({
    iss: serviceAccountEmail,
    aud: "google",
    origins: [],
    typ: "savetowallet",
    payload: {
      genericObjects: [
        {
          id: objectId,
          classId,
          genericType: "GENERIC_TYPE_UNSPECIFIED",
          cardTitle: {
            defaultValue: { language: "en", value: restaurantName },
          },
          header: {
            defaultValue: { language: "en", value: "Loyalty member" },
          },
          subheader: {
            defaultValue: { language: "en", value: member.full_name },
          },
          textModulesData: [
            {
              id: "stamps",
              header: "STAMPS",
              body: `${member.stamps} of ${member.reward_goal}`,
            },
            {
              id: "reward",
              header: "YOUR REWARD",
              body: `Complete ${member.reward_goal} stamps for a treat on us`,
            },
          ],
          barcode: {
            type: "QR_CODE",
            value: member.id,
            alternateText: "Present this card to the team",
          },
        },
      ],
    },
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt()
    .sign(key);

  return `https://pay.google.com/gp/v/save/${token}`;
}
