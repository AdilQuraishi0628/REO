import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { PKPass } from "passkit-generator";
import { appleWalletConfigured } from "@/lib/loyalty";

export const runtime = "nodejs";

function certificate(name: string) {
  const value = process.env[name];
  return value ? Buffer.from(value, "base64") : null;
}

export async function GET(request: Request) {
  if (!appleWalletConfigured()) {
    return NextResponse.json(
      { error: "Apple Wallet pass signing is not configured." },
      { status: 503 },
    );
  }

  const memberId = new URL(request.url).searchParams.get("memberId");
  if (!memberId || !/^[0-9a-f-]{36}$/i.test(memberId)) {
    return NextResponse.json({ error: "A valid loyalty card is required." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Loyalty pass storage is not configured." },
      { status: 503 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: member, error: memberError } = await supabase
    .from("loyalty_members")
    .select("id, full_name, stamps, reward_goal, restaurant_id")
    .eq("id", memberId)
    .maybeSingle();

  if (memberError) {
    console.error("Could not load Apple Wallet member:", memberError.message);
    return NextResponse.json({ error: "Could not load your loyalty card." }, { status: 500 });
  }
  if (!member) {
    return NextResponse.json({ error: "Loyalty card not found." }, { status: 404 });
  }

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("name")
    .eq("id", member.restaurant_id)
    .maybeSingle();
  if (restaurantError || !restaurant) {
    console.error("Could not load Apple Wallet restaurant:", restaurantError?.message);
    return NextResponse.json({ error: "Could not load your loyalty card." }, { status: 500 });
  }

  const wwdr = certificate("APPLE_WWDR_CERT_BASE64");
  const signerCert = certificate("APPLE_SIGNER_CERT_BASE64");
  const signerKey = certificate("APPLE_SIGNER_KEY_BASE64");
  if (!wwdr || !signerCert || !signerKey) {
    return NextResponse.json({ error: "Apple Wallet certificates are incomplete." }, { status: 503 });
  }

  try {
    const modelPath = path.join(process.cwd(), "wallet", "apple");
    const pass = await PKPass.from(
      {
        model: modelPath,
        certificates: {
          wwdr,
          signerCert,
          signerKey,
          signerKeyPassphrase: process.env.APPLE_SIGNER_KEY_PASSPHRASE,
        },
      },
      {
        passTypeIdentifier: process.env.APPLE_PASS_TYPE_IDENTIFIER,
        teamIdentifier: process.env.APPLE_TEAM_IDENTIFIER,
        organizationName: restaurant.name,
        description: `${restaurant.name} loyalty card`,
        serialNumber: member.id,
        logoText: restaurant.name,
        foregroundColor: "rgb(34, 45, 32)",
        backgroundColor: "rgb(248, 247, 242)",
        labelColor: "rgb(83, 101, 67)",
      },
    );
    const progressField = pass.primaryFields.find((field) => field.key === "progress");
    const memberField = pass.secondaryFields.find((field) => field.key === "member");
    const rewardField = pass.auxiliaryFields.find((field) => field.key === "reward");
    if (!progressField || !memberField || !rewardField) {
      throw new Error("Apple Wallet template is missing a loyalty card field.");
    }

    progressField.value = `${member.stamps} / ${member.reward_goal}`;
    memberField.value = member.full_name;
    rewardField.value = `A treat after ${member.reward_goal} stamps`;
    pass.setBarcodes({
      format: "PKBarcodeFormatQR",
      message: member.id,
      altText: "Present this card to the team",
      messageEncoding: "iso-8859-1",
    });

    const templateFiles = ["icon.png", "icon@2x.png"];
    for (const fileName of templateFiles) {
      pass.addBuffer(
        fileName,
        await readFile(path.join(modelPath, fileName)),
      );
    }

    return new Response(new Uint8Array(pass.getAsBuffer()), {
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="${member.id}.pkpass"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Could not generate Apple Wallet pass:", error);
    return NextResponse.json(
      { error: "We couldn't create your Apple Wallet pass. Please try again." },
      { status: 500 },
    );
  }
}
