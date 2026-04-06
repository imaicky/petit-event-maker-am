import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/invite/[token] — accept an invite
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Find the invite
    const { data: invite, error: findError } = await admin
      .from("event_admins")
      .select("id, event_id, user_id, status")
      .eq("invite_token", token)
      .maybeSingle();

    if (findError || !invite) {
      return NextResponse.json(
        { error: "招待が見つかりません。リンクが無効か、既に使用済みです。" },
        { status: 404 }
      );
    }

    if (invite.status === "accepted") {
      return NextResponse.json(
        { error: "この招待は既に受諾済みです", event_id: invite.event_id },
        { status: 409 }
      );
    }

    // Check if user is the event creator (shouldn't add themselves)
    const { data: event } = await admin
      .from("events")
      .select("creator_id")
      .eq("id", invite.event_id)
      .single();

    if (event?.creator_id === user.id) {
      return NextResponse.json(
        { error: "自分のイベントには共同管理者として参加できません", event_id: invite.event_id },
        { status: 400 }
      );
    }

    // Check if user already has another accepted admin record for this event
    const { data: existingAdmin } = await admin
      .from("event_admins")
      .select("id")
      .eq("event_id", invite.event_id)
      .eq("user_id", user.id)
      .eq("status", "accepted")
      .maybeSingle();

    if (existingAdmin) {
      // Already an admin, just clean up this invite
      await admin.from("event_admins").delete().eq("id", invite.id);
      return NextResponse.json({
        success: true,
        event_id: invite.event_id,
        message: "既にこのイベントの共同管理者です",
      });
    }

    // Accept the invite
    const { error: updateError } = await admin
      .from("event_admins")
      .update({
        user_id: user.id,
        status: "accepted",
      })
      .eq("id", invite.id);

    if (updateError) {
      console.error("[POST /api/invite/[token]] Update error:", updateError);
      return NextResponse.json(
        { error: "招待の受諾に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      event_id: invite.event_id,
    });
  } catch (err) {
    console.error("[POST /api/invite/[token]] Error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}

// GET /api/invite/[token] — get invite info (for the invite page)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const admin = createAdminClient();

    const { data: invite } = await admin
      .from("event_admins")
      .select("id, event_id, status")
      .eq("invite_token", token)
      .maybeSingle();

    if (!invite) {
      return NextResponse.json(
        { error: "招待が見つかりません" },
        { status: 404 }
      );
    }

    // Get event info
    const { data: event } = await admin
      .from("events")
      .select("id, title, datetime, location, creator_id")
      .eq("id", invite.event_id)
      .single();

    if (!event) {
      return NextResponse.json(
        { error: "イベントが見つかりません" },
        { status: 404 }
      );
    }

    // Get creator name
    let creatorName: string | null = null;
    if (event.creator_id) {
      const { data: creator } = await admin
        .from("profiles")
        .select("display_name")
        .eq("id", event.creator_id)
        .maybeSingle();
      creatorName = creator?.display_name ?? null;
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        status: invite.status,
      },
      event: {
        id: event.id,
        title: event.title,
        datetime: event.datetime,
        location: event.location,
        creator_name: creatorName,
      },
    });
  } catch (err) {
    console.error("[GET /api/invite/[token]] Error:", err);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
