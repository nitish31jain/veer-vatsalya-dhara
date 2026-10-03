"use client";

import { useActionState } from "react";
import { updateProfile, type FormState } from "@/app/(customer)/actions";
import { SubmitButton } from "./SubmitButton";

export function ProfileForm({ whatsapp, address }: { whatsapp: string | null; address: string | null }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfile, {});
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="whatsapp">WhatsApp number</label>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">+91</span>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="98765 43210"
            defaultValue={whatsapp ?? ""}
            required
            className="input"
          />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="address">Delivery address</label>
        <textarea
          id="address"
          name="address"
          rows={3}
          defaultValue={address ?? ""}
          placeholder="House no, street, area"
          className="input py-2"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-brand-700">Saved ✓</p>}
      <SubmitButton className="btn-primary w-full">Save</SubmitButton>
    </form>
  );
}
