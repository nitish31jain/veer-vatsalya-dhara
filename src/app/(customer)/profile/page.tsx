/* eslint-disable @next/next/no-img-element */
import { requireUser } from "@/lib/session";
import { ProfileForm } from "@/components/ProfileForm";
import { getT } from "@/i18n/server";

export default async function ProfilePage({ searchParams }: PageProps<"/profile">) {
  const { user } = await requireUser({ allowIncompleteProfile: true });
  const { setup } = await searchParams;
  const { t } = await getT();

  return (
    <>
      {setup && !user.whatsapp && (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          {t.profile.welcomeSetup}
        </div>
      )}
      <section className="card flex items-center gap-4">
        {user.image ? (
          <img src={user.image} alt="" className="size-14 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <div className="grid size-14 place-items-center rounded-full bg-brand-100 text-xl">
            {user.name[0]}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-sm text-gray-500">{user.email}</p>
        </div>
      </section>
      <section className="card">
        <ProfileForm
          whatsapp={user.whatsapp}
          address={user.address}
          labels={{
            whatsapp: t.profile.whatsapp,
            address: t.profile.address,
            addressPlaceholder: t.profile.addressPlaceholder,
            save: t.common.save,
            saved: t.common.saved,
          }}
        />
      </section>
    </>
  );
}
