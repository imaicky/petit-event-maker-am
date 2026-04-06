import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEventCreator, canManageEvent } from "@/lib/check-event-access";
import { randomBytes } from "crypto";

// POST /api/events/[id]/admins — invite a co-admin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Only the creator can invite admins
    const isCreator = await isEventCreator(supabase, eventId, user.id);
    if (!isCreator) {
      return NextResponse.json(
        { error: "共同管理者を追加する権限がありません" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : null;

    const admin = createAdminClient();

    if (email) {
      // Email-based invite
      // Check if already invited
      const { data: existing } = await admin
        .from("event_admins")
        .select("id, status")
        .eq("event_id", eventId)
        .eq("email", email)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: "このメールアドレスは既に招待済みです" },
          { status: 409 }
        );
      }

      const inviteToken = randomBytes(32).toString("hex");

      const { data: inserted, error: insertError } = await admin
        .from("event_admins")
        .insert({
          event_id: eventId,
          email,
          invite_token: inviteToken,
          status: "pending",
        })
        .select("id, email, invite_token, status, created_at")
        .single();

      if (insertError) {
        console.error("[POST /api/events/[id]/admins] Insert error:", insertError);
        return NextResponse.json(
          { error: "共同管理者の招待に失敗しました" },
          { status: 500 }
        );
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://petit-event-maker-am.vercel.app";
      const inviteUrl = `${baseUrl}/invite/${inviteToken}`;

      return NextResponse.json({
        admin: inserted,
        invite_url: inviteUrl,
      });
    } else {
      // Link-based invite (no email)
      const inviteToken = randomBytes(32).toString("hex");

      const { data: inserted, error: insertError } = await admin
        .from("event_admins")
        .insert({
          event_id: eventId,
          invite_token: inviteToken,
          status: "pending",
        })
        .select("id, invite_token, status, created_at")
        .single();

      if (insertError) {
        console.error("[POST /api/events/[id]/admins] Insert error:", insertError);
        return NextResponse.json(
          { error: "招待リンクの生成に失敗しました" },
          { status: 500 }
        );
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://petit-event-maker-am.vercel.app";
      const inviteUrl = `${baseUrl}/invite/${inviteToken}`;

      return NextResponse.json({
        admin: inserted,
        invite_url: inviteUrl,
      });
    }
  } catch (err) {
    console.error("[POST /api/events/[id]/admins] Error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// GET /api/events/[id]/admins — list co-admins
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const hasAccess = await canManageEvent(supabase, eventId, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "このイベントへのアクセス権がありません" },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { data: admins, error } = await admin
      .from("event_admins")
      .select("id, event_id, user_id, email, status, created_at")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "共同管理者の取得に失敗しました" },
        { status: 500 }
      );
    }

    // Enrich with profile display names
    const userIds = (admins ?? [])
      .map((a) => a.user_id)
      .filter(Boolean) as string[];

    let profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);

      for (const p of profiles ?? []) {
        profileMap[p.id] = {
          display_name: p.display_name,
          avatar_url: p.avatar_url,
        };
      }
    }

    const enriched = (admins ?? []).map((a) => ({
      ...a,
      profile: a.user_id ? profileMap[a.user_id] ?? null : null,
    }));

    return NextResponse.json({ admins: enriched });
  } catch (err) {
    console.error("[GET /api/events/[id]/admins] Error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
