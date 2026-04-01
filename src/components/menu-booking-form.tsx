"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CustomField } from "@/types/database";

type Props = {
  menuId: string;
  customFields: CustomField[];
};

export function MenuBookingForm({ menuId, customFields }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    custom_field_values: {} as Record<string, string>,
  });

  const setField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setCustomField = (fieldId: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      custom_field_values: { ...prev.custom_field_values, [fieldId]: value },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/menus/${menuId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "申し込みに失敗しました");
        return;
      }

      if (data.redirect) {
        router.push(data.redirect);
      }
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label htmlFor="guest_name" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
          お名前 <span className="text-red-500">*</span>
        </label>
        <input
          id="guest_name"
          type="text"
          required
          value={form.guest_name}
          onChange={(e) => setField("guest_name", e.target.value)}
          placeholder="山田太郎"
          className="w-full rounded-xl border border-[#E5E5E5] px-4 py-2.5 text-sm focus:border-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="guest_email" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
          メールアドレス <span className="text-red-500">*</span>
        </label>
        <input
          id="guest_email"
          type="email"
          required
          value={form.guest_email}
          onChange={(e) => setField("guest_email", e.target.value)}
          placeholder="example@email.com"
          className="w-full rounded-xl border border-[#E5E5E5] px-4 py-2.5 text-sm focus:border-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
        />
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="guest_phone" className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
          電話番号
        </label>
        <input
          id="guest_phone"
          type="tel"
          value={form.guest_phone}
          onChange={(e) => setField("guest_phone", e.target.value)}
          placeholder="090-1234-5678"
          className="w-full rounded-xl border border-[#E5E5E5] px-4 py-2.5 text-sm focus:border-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
        />
      </div>

      {/* Custom fields */}
      {customFields.map((field) => (
        <div key={field.id}>
          <label htmlFor={field.id} className="block text-sm font-medium text-[#1A1A1A] mb-1.5">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </label>
          {field.type === "text" && (
            <input
              id={field.id}
              type="text"
              required={field.required}
              value={form.custom_field_values[field.id] ?? ""}
              onChange={(e) => setCustomField(field.id, e.target.value)}
              className="w-full rounded-xl border border-[#E5E5E5] px-4 py-2.5 text-sm focus:border-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
            />
          )}
          {field.type === "date" && (
            <input
              id={field.id}
              type="date"
              required={field.required}
              value={form.custom_field_values[field.id] ?? ""}
              onChange={(e) => setCustomField(field.id, e.target.value)}
              className="w-full rounded-xl border border-[#E5E5E5] px-4 py-2.5 text-sm focus:border-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A]"
            />
          )}
          {field.type === "select" && (
            <select
              id={field.id}
              required={field.required}
              value={form.custom_field_values[field.id] ?? ""}
              onChange={(e) => setCustomField(field.id, e.target.value)}
              className="w-full rounded-xl border border-[#E5E5E5] px-4 py-2.5 text-sm focus:border-[#1A1A1A] focus:outline-none focus:ring-1 focus:ring-[#1A1A1A] bg-white"
            >
              <option value="">選択してください</option>
              {(field.options ?? []).map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-12 rounded-xl bg-[#1A1A1A] text-white hover:bg-[#111111] font-medium text-sm"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            送信中...
          </>
        ) : (
          "申し込む"
        )}
      </Button>
    </form>
  );
}
