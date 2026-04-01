"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type,
  Calendar,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CustomField } from "@/types/database";

type Props = {
  value: CustomField[];
  onChange: (fields: CustomField[]) => void;
};

function generateFieldId() {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

const FIELD_TYPE_LABELS: Record<CustomField["type"], { label: string; icon: React.ReactNode }> = {
  text: { label: "テキスト", icon: <Type className="h-3.5 w-3.5" /> },
  date: { label: "日付", icon: <Calendar className="h-3.5 w-3.5" /> },
  select: { label: "選択肢", icon: <List className="h-3.5 w-3.5" /> },
};

export function CustomFieldsBuilder({ value, onChange }: Props) {
  const [addingType, setAddingType] = useState<CustomField["type"] | null>(null);

  const addField = (type: CustomField["type"]) => {
    const newField: CustomField = {
      id: generateFieldId(),
      type,
      label: "",
      required: false,
      ...(type === "select" ? { options: [""] } : {}),
    };
    onChange([...value, newField]);
    setAddingType(null);
  };

  const updateField = (index: number, patch: Partial<CustomField>) => {
    const updated = [...value];
    updated[index] = { ...updated[index], ...patch };
    onChange(updated);
  };

  const removeField = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= value.length) return;
    const updated = [...value];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onChange(updated);
  };

  const updateOption = (fieldIndex: number, optionIndex: number, val: string) => {
    const field = value[fieldIndex];
    if (!field.options) return;
    const newOptions = [...field.options];
    newOptions[optionIndex] = val;
    updateField(fieldIndex, { options: newOptions });
  };

  const addOption = (fieldIndex: number) => {
    const field = value[fieldIndex];
    updateField(fieldIndex, { options: [...(field.options ?? []), ""] });
  };

  const removeOption = (fieldIndex: number, optionIndex: number) => {
    const field = value[fieldIndex];
    if (!field.options || field.options.length <= 1) return;
    updateField(fieldIndex, {
      options: field.options.filter((_, i) => i !== optionIndex),
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[#1A1A1A]">
          カスタムフィールド
        </label>
        <span className="text-xs text-[#999999]">{value.length}件</span>
      </div>

      {value.length > 0 && (
        <div className="space-y-3">
          {value.map((field, index) => (
            <div
              key={field.id}
              className="rounded-xl border border-[#E5E5E5] bg-white p-4 space-y-3"
            >
              {/* Header row */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F2F2F2] px-2 py-0.5 text-xs font-medium text-[#666666]">
                  {FIELD_TYPE_LABELS[field.type].icon}
                  {FIELD_TYPE_LABELS[field.type].label}
                </span>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => moveField(index, "up")}
                  disabled={index === 0}
                  className="p-1 rounded text-[#999999] hover:text-[#1A1A1A] disabled:opacity-30"
                  aria-label="上に移動"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveField(index, "down")}
                  disabled={index === value.length - 1}
                  className="p-1 rounded text-[#999999] hover:text-[#1A1A1A] disabled:opacity-30"
                  aria-label="下に移動"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeField(index)}
                  className="p-1 rounded text-[#999999] hover:text-red-500"
                  aria-label="削除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Label input */}
              <input
                type="text"
                value={field.label}
                onChange={(e) => updateField(index, { label: e.target.value })}
                placeholder="フィールド名（例: 生年月日）"
                className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  field.label.trim() === ""
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-[#E5E5E5] focus:border-[#1A1A1A] focus:ring-[#1A1A1A]"
                }`}
              />
              {field.label.trim() === "" && (
                <p className="text-xs text-red-500">フィールド名を入力してください</p>
              )}

              {/* Select options */}
              {field.type === "select" && (
                <div className="space-y-2 pl-2 border-l-2 border-[#E5E5E5]">
                  <span className="text-xs text-[#999999]">選択肢</span>
                  {(field.options ?? []).map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(index, oi, e.target.value)}
                        placeholder={`選択肢 ${oi + 1}`}
                        className="flex-1 rounded-lg border border-[#E5E5E5] px-3 py-1.5 text-sm focus:border-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
                      />
                      {(field.options?.length ?? 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOption(index, oi)}
                          className="p-1 text-[#999999] hover:text-red-500"
                          aria-label="選択肢を削除"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOption(index)}
                    className="text-xs text-[#1A1A1A] hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    選択肢を追加
                  </button>
                </div>
              )}

              {/* Required toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => updateField(index, { required: e.target.checked })}
                  className="rounded border-[#E5E5E5] text-[#1A1A1A] focus:ring-[#1A1A1A]"
                />
                <span className="text-xs text-[#666666]">必須項目にする</span>
              </label>
            </div>
          ))}
        </div>
      )}

      {/* Add field buttons */}
      {addingType === null ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setAddingType("text")}
          className="w-full rounded-xl border-dashed border-[#E5E5E5] text-[#999999] hover:text-[#1A1A1A] hover:border-[#1A1A1A]/30 gap-1.5"
        >
          <Plus className="h-4 w-4" />
          フィールドを追加
        </Button>
      ) : (
        <div className="flex gap-2 rounded-xl border border-[#E5E5E5] bg-[#F7F7F7] p-2">
          {(Object.keys(FIELD_TYPE_LABELS) as CustomField["type"][]).map((type) => (
            <Button
              key={type}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addField(type)}
              className="flex-1 rounded-lg gap-1.5 text-xs"
            >
              {FIELD_TYPE_LABELS[type].icon}
              {FIELD_TYPE_LABELS[type].label}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddingType(null)}
            className="text-xs text-[#999999]"
          >
            キャンセル
          </Button>
        </div>
      )}
    </div>
  );
}
