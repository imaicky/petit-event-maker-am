"use client";

import { CreditCard, Banknote, FileText, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { UseFormRegister, FieldValues } from "react-hook-form";

export type PaymentMethod = "stripe" | "bank" | "onsite" | "custom";

interface PaymentMethodsFieldProps {
  methods: PaymentMethod[];
  onChange: (methods: PaymentMethod[]) => void;
  // react-hook-form's register is generic; use a loose type so this works for
  // both the create and edit form schemas.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values: FieldValues;
  inputCls: string;
  inputWithIconCls: string;
}

const ALL_METHODS: { value: PaymentMethod; label: string; icon: typeof CreditCard; desc: string }[] = [
  { value: "stripe", label: "Stripe決済", icon: CreditCard, desc: "クレジットカード" },
  { value: "bank", label: "銀行振込", icon: Building2, desc: "振込先を案内" },
  { value: "onsite", label: "現地払い", icon: Banknote, desc: "当日会場でお支払い" },
  { value: "custom", label: "カスタム案内", icon: FileText, desc: "PayPay・自由テキスト" },
];

export function PaymentMethodsField({
  methods,
  onChange,
  register,
  values,
  inputCls,
  inputWithIconCls,
}: PaymentMethodsFieldProps) {
  const has = (m: PaymentMethod) => methods.includes(m);
  const toggle = (m: PaymentMethod) => {
    const next = has(m) ? methods.filter((x) => x !== m) : [...methods, m];
    // Always keep at least one selected
    if (next.length === 0) return;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 text-sm font-medium text-[#1A1A1A]">
          集金方法 <span className="text-red-500">*</span>
        </p>
        <p className="mb-2.5 text-xs text-[#999999]">
          複数選択できます。参加者は申込時に選んで支払い方法を選択できます
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ALL_METHODS.map((opt) => {
            const isSelected = has(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggle(opt.value)}
                aria-pressed={isSelected}
                className={`flex items-center gap-2.5 rounded-xl border-2 p-3 text-left transition-all ${
                  isSelected
                    ? "border-[#1A1A1A] bg-[#F7F7F7]"
                    : "border-[#E5E5E5] bg-white hover:border-[#1A1A1A]/40"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    isSelected ? "border-[#1A1A1A] bg-[#1A1A1A]" : "border-[#999999] bg-white"
                  }`}
                >
                  {isSelected && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="currentColor">
                      <path d="M5 8.5L2.5 6l-.7.7L5 9.9l5.2-5.2-.7-.7z" />
                    </svg>
                  )}
                </span>
                <opt.icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-[#1A1A1A]" : "text-[#999999]"}`} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${isSelected ? "text-[#1A1A1A]" : "text-[#666666]"}`}>
                    {opt.label}
                  </p>
                  <p className="text-[10px] text-[#999999]">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {has("stripe") && (
        <p className="text-xs text-[#999999]">
          <a
            href="/settings/stripe"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#635BFF] underline underline-offset-2 hover:no-underline"
          >
            Stripe連携
          </a>
          が必要です
        </p>
      )}

      {/* Bank transfer fields */}
      {has("bank") && (
        <div className="space-y-3 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-4">
          <p className="text-sm font-bold text-[#1A1A1A]">銀行振込先</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1A1A1A]">銀行名</label>
              <Input placeholder="例：三井住友銀行" {...register("bank_name")} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1A1A1A]">支店名</label>
              <Input placeholder="例：渋谷支店" {...register("bank_branch")} className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1A1A1A]">口座種別</label>
              <select
                {...register("bank_account_type")}
                defaultValue={(values?.bank_account_type as string) || "普通"}
                className="h-11 w-full rounded-xl border border-[#E5E5E5] bg-white px-3 text-sm focus:border-[#1A1A1A] focus:outline-none"
              >
                <option value="普通">普通</option>
                <option value="当座">当座</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[#1A1A1A]">口座番号</label>
              <Input placeholder="例：1234567" {...register("bank_account_number")} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#1A1A1A]">口座名義（カナ）</label>
              <Input placeholder="例：プチイベント　タロウ" {...register("bank_account_holder")} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-[#1A1A1A]">振込時の注意事項（任意）</label>
              <Textarea
                rows={2}
                placeholder="例：振込手数料は申込者ご負担でお願いします"
                {...register("bank_note")}
                className="rounded-xl border-[#E5E5E5] focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20"
              />
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            💡 入金確認は主催者が手動で行います（参加者一覧の「入金確認」ボタン）。確認後にZoom情報などが自動送信されます。
          </div>
        </div>
      )}

      {/* Custom payment fields */}
      {has("custom") && (
        <div className="space-y-3 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-4">
          <p className="text-sm font-bold text-[#1A1A1A]">カスタム案内</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#1A1A1A]">お支払い案内文</label>
            <Textarea
              placeholder="例：PayPayで以下のアカウントにお支払いください。&#10;アカウント：@example"
              rows={3}
              {...register("payment_info")}
              className="rounded-xl border-[#E5E5E5] focus-visible:border-[#1A1A1A] focus-visible:ring-[#1A1A1A]/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#1A1A1A]">お支払いリンク（任意）</label>
            <Input
              placeholder="例：https://pay.paypay.ne.jp/..."
              {...register("payment_link")}
              className={inputWithIconCls}
            />
          </div>
        </div>
      )}

      {/* Bank-specific deadline override */}
      {has("bank") && (
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
          <label className="mb-1 block text-sm font-medium text-[#1A1A1A]">振込期限（任意）</label>
          <p className="mb-2 text-xs text-[#999999]">
            未指定の場合は「申込から7日 または 開催3日前のどちらか早い方」が自動で適用されます
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={60}
              placeholder="7"
              {...register("payment_deadline_days")}
              className={`${inputCls} w-24`}
            />
            <span className="text-sm text-[#666666]">日以内</span>
          </div>
        </div>
      )}
    </div>
  );
}
