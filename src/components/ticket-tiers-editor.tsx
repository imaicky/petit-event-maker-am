"use client";

/**
 * チケット種別エディタ
 *
 * 1イベントに複数の料金プラン（通常/早割/VIP など）を持たせる PRO 機能。
 * Phase 1 では PRO_OPEN_ACCESS でデフォルト全員が編集可能。
 */

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, GripVertical, Tag, AlertCircle, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type TicketTier = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price: number;
  capacity: number | null;
  sort_order: number;
  is_active: boolean;
};

type DraftTier = {
  // 新規作成用の一時ID（保存後にDBのIDで上書きされる）
  _localId?: string;
  id?: string;
  name: string;
  description: string;
  price: number | "";
  capacity: number | "" | null;
};

interface Props {
  eventId: string;
  isPro: boolean;
}

export function TicketTiersEditor({ eventId, isPro }: Props) {
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<DraftTier[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchTiers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/tiers`);
      if (res.ok) {
        const json = await res.json();
        setTiers((json.tiers as TicketTier[]) ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void fetchTiers();
  }, [fetchTiers]);

  const addDraft = () => {
    setDrafts((prev) => [
      ...prev,
      {
        _localId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: "",
        description: "",
        price: "",
        capacity: "",
      },
    ]);
  };

  const removeDraft = (localId: string) => {
    setDrafts((prev) => prev.filter((d) => d._localId !== localId));
  };

  const saveDraft = async (draft: DraftTier) => {
    if (!draft.name.trim()) {
      setError("プラン名を入力してください");
      return;
    }
    if (draft.price === "" || Number(draft.price) < 0) {
      setError("料金を入力してください");
      return;
    }
    setSaving(draft._localId ?? draft.id ?? "");
    setError(null);
    try {
      const body = {
        name: draft.name,
        description: draft.description || null,
        price: Number(draft.price),
        capacity: draft.capacity === "" || draft.capacity == null ? null : Number(draft.capacity),
        sort_order: tiers.length + drafts.length,
      };
      const res = await fetch(`/api/events/${eventId}/tiers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "保存に失敗しました");
        return;
      }
      if (draft._localId) removeDraft(draft._localId);
      await fetchTiers();
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(null);
    }
  };

  const updateExisting = async (tier: TicketTier, patch: Partial<TicketTier>) => {
    setSaving(tier.id);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/tiers/${tier.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "更新に失敗しました");
        return;
      }
      await fetchTiers();
    } catch {
      setError("更新に失敗しました");
    } finally {
      setSaving(null);
    }
  };

  const deleteTier = async (tier: TicketTier) => {
    if (!confirm(`「${tier.name}」プランを削除しますか？`)) return;
    setDeleting(tier.id);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/tiers/${tier.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error || "削除に失敗しました");
        return;
      }
      await fetchTiers();
    } catch {
      setError("削除に失敗しました");
    } finally {
      setDeleting(null);
    }
  };

  const updateDraft = (localId: string, patch: Partial<DraftTier>) => {
    setDrafts((prev) =>
      prev.map((d) => (d._localId === localId ? { ...d, ...patch } : d))
    );
  };

  if (!isPro) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <Crown className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900 mb-1">
              複数プランは PRO 限定機能です
            </p>
            <p className="text-xs text-amber-900/80 leading-relaxed">
              1イベントに「通常 / 早割 / VIP」のように複数の料金プランを設定して、
              申込者に選んでもらえます。PRO プラン契約者のみご利用いただけます。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2.5">
        <Tag className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-900 leading-relaxed">
          複数プランを設定すると、申込者が「通常 ¥1,500 / VIP ¥3,000」のように選べます。
          プランを1つも追加しない場合は、上の「料金」フィールドの単一価格が使われます。
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[#999999]" />
        </div>
      ) : (
        <div className="space-y-2">
          {tiers.map((tier) => (
            <TierRow
              key={tier.id}
              tier={tier}
              saving={saving === tier.id}
              deleting={deleting === tier.id}
              onUpdate={(patch) => updateExisting(tier, patch)}
              onDelete={() => deleteTier(tier)}
            />
          ))}

          {drafts.map((draft) => (
            <DraftRow
              key={draft._localId}
              draft={draft}
              saving={saving === draft._localId}
              onChange={(patch) => updateDraft(draft._localId!, patch)}
              onSave={() => saveDraft(draft)}
              onCancel={() => removeDraft(draft._localId!)}
            />
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={addDraft}
        className="w-full h-11 rounded-xl border-dashed border-[#1A1A1A]/30 text-sm font-medium text-[#1A1A1A] hover:bg-[#F7F7F7] gap-2"
      >
        <Plus className="h-4 w-4" />
        プランを追加
      </Button>
    </div>
  );
}

function TierRow({
  tier,
  saving,
  deleting,
  onUpdate,
  onDelete,
}: {
  tier: TicketTier;
  saving: boolean;
  deleting: boolean;
  onUpdate: (patch: Partial<TicketTier>) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(tier.name);
  const [description, setDescription] = useState(tier.description ?? "");
  const [price, setPrice] = useState<number | "">(tier.price);
  const [capacity, setCapacity] = useState<number | "">(tier.capacity ?? "");
  const dirty =
    name !== tier.name ||
    description !== (tier.description ?? "") ||
    price !== tier.price ||
    (capacity === "" ? null : Number(capacity)) !== tier.capacity;

  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-white p-3 sm:p-4 space-y-2.5">
      <div className="flex items-start gap-2">
        <GripVertical className="h-5 w-5 text-[#CCCCCC] shrink-0 mt-2.5" />
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-2">
          <div>
            <Label className="text-xs font-medium text-[#666666]">プラン名</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 rounded-xl border-[#E5E5E5]"
              placeholder="例: VIP"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-[#666666]">料金（円）</Label>
            <Input
              type="number"
              value={price}
              onChange={(e) =>
                setPrice(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="h-10 rounded-xl border-[#E5E5E5]"
              placeholder="3000"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-[#666666]">定員（任意）</Label>
            <Input
              type="number"
              value={capacity}
              onChange={(e) =>
                setCapacity(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="h-10 rounded-xl border-[#E5E5E5]"
              placeholder="無制限"
            />
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={deleting}
          className="h-9 w-9 rounded-xl text-[#999999] hover:bg-red-50 hover:text-red-500 shrink-0"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
      <div>
        <Label className="text-xs font-medium text-[#666666]">プラン説明（任意）</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="例: 限定特典付き、最前列指定"
          className="rounded-xl border-[#E5E5E5] resize-none text-sm"
        />
      </div>
      {dirty && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setName(tier.name);
              setDescription(tier.description ?? "");
              setPrice(tier.price);
              setCapacity(tier.capacity ?? "");
            }}
            className="h-8 rounded-full text-xs"
          >
            キャンセル
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() =>
              onUpdate({
                name,
                description: description || null,
                price: price === "" ? 0 : Number(price),
                capacity: capacity === "" ? null : Number(capacity),
              })
            }
            disabled={saving}
            className="h-8 rounded-full bg-[#1A1A1A] text-white text-xs gap-1"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            変更を保存
          </Button>
        </div>
      )}
    </div>
  );
}

function DraftRow({
  draft,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  draft: DraftTier;
  saving: boolean;
  onChange: (patch: Partial<DraftTier>) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-[#1A1A1A]/20 bg-[#FAFAFA] p-3 sm:p-4 space-y-2.5">
      <div className="flex items-start gap-2">
        <Plus className="h-5 w-5 text-[#999999] shrink-0 mt-2.5" />
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr] gap-2">
          <div>
            <Label className="text-xs font-medium text-[#666666]">プラン名</Label>
            <Input
              value={draft.name}
              onChange={(e) => onChange({ name: e.target.value })}
              className="h-10 rounded-xl border-[#E5E5E5]"
              placeholder="例: VIP"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-[#666666]">料金（円）</Label>
            <Input
              type="number"
              value={draft.price}
              onChange={(e) =>
                onChange({
                  price: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              className="h-10 rounded-xl border-[#E5E5E5]"
              placeholder="3000"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-[#666666]">定員（任意）</Label>
            <Input
              type="number"
              value={draft.capacity ?? ""}
              onChange={(e) =>
                onChange({
                  capacity: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
              className="h-10 rounded-xl border-[#E5E5E5]"
              placeholder="無制限"
            />
          </div>
        </div>
      </div>
      <div>
        <Label className="text-xs font-medium text-[#666666]">プラン説明（任意）</Label>
        <Textarea
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          placeholder="例: 限定特典付き、最前列指定"
          className="rounded-xl border-[#E5E5E5] resize-none text-sm"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          className="h-8 rounded-full text-xs"
        >
          キャンセル
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onSave}
          disabled={saving || !draft.name || draft.price === ""}
          className="h-8 rounded-full bg-[#1A1A1A] text-white text-xs gap-1 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          プランを保存
        </Button>
      </div>
    </div>
  );
}
