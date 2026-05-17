import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canManageEvent } from "@/lib/check-event-access";

type EventForPublish = {
  title: string | null;
  description: string | null;
  datetime: string | null;
  capacity: number | null;
  location: string | null;
  location_type: string | null;
};

function findMissingFields(event: EventForPublish): string[] {
  const missing: string[] = [];
  if (!event.title?.trim()) missing.push("タイトル");
  if (!event.description?.trim()) missing.push("説明");
  if (!event.datetime) missing.push("日時");
  if (!event.capacity || event.capacity < 1) missing.push("定員");
  const needsLocation =
    event.location_type === "physical" || event.location_type === "hybrid";
  if (needsLocation && !event.location?.trim()) missing.push("場所");
  return missing;
}

async function requireManager(eventId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 }
      ),
    };
  }
  const hasAccess = await canManageEvent(supabase, eventId, user.id);
  if (!hasAccess) {
    return {
      error: NextResponse.json(
        { error: "このイベントを編集する権限がありません" },
        { status: 403 }
      ),
    };
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error: NextResponse.json(
        { error: "サーバー設定エラーです" },
        { status: 500 }
      ),
    };
  }
  return { admin: createAdminClient() };
}

// POST /api/events/[id]/publish — 下書きを公開
export async function POST(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const gate = await requireManager(id);
  if (gate.error) return gate.error;
  const admin = gate.admin!;

  const { data: current, error: fetchError } = await admin
    .from("events")
    .select("title, description, datetime, capacity, location, location_type")
    .eq("id", id)
    .single();

  if (fetchError || !current) {
    return NextResponse.json(
      { error: "イベントが見つかりません" },
      { status: 404 }
    );
  }

  const missing = findMissingFields(current as EventForPublish);
  if (missing.length > 0) {
    return NextResponse.json(
      {
        error: `公開には次の項目が必要です: ${missing.join("、")}`,
        missing,
        needsEdit: true,
      },
      { status: 400 }
    );
  }

  const { error: updateError } = await admin
    .from("events")
    .update({ is_published: true } as never)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, is_published: true });
}

// DELETE /api/events/[id]/publish — 公開を取り消して下書きに戻す（Undo用）
export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const gate = await requireManager(id);
  if (gate.error) return gate.error;
  const admin = gate.admin!;

  const { error: updateError } = await admin
    .from("events")
    .update({ is_published: false } as never)
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, is_published: false });
}
