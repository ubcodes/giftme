import { createFileRoute } from '@tanstack/react-router'
import { CONTACT_EMAIL, LegalPage } from '@/components/legal'

export const Route = createFileRoute('/privacy')({
  head: () => ({ meta: [{ title: 'Privacy · GiftMe' }] }),
  component: Privacy,
})

function Privacy() {
  return (
    <LegalPage title="Privacy">
      <p>
        GiftMe lets you make wishlists and lets friends give to them. This page says what we keep about you, why, and who
        else sees it. In short: only what the site needs to work, and we never sell it.
      </p>

      <section>
        <h2>What we keep</h2>
        <ul>
          <li>
            <strong>Your account:</strong> your name, email and profile picture from Google or your email sign-in, your
            GiftMe handle, and any social links or phone number you choose to add.
          </li>
          <li>
            <strong>Your wishlists:</strong> titles, dates, notes, gift links, prices and the photos you upload or copy from
            shops.
          </li>
          <li>
            <strong>Where gifts go:</strong> your bank name, account name and the last four digits of the account. The full
            account number goes to Paystack, not to us.
          </li>
          <li>
            <strong>Gifts:</strong> for each gift, the giver's name, email, message and amount, and who reserved which item.
          </li>
        </ul>
      </section>

      <section>
        <h2>Who else sees it</h2>
        <ul>
          <li>
            <strong>Anyone with your wishlist link</strong> sees the list, your name, picture and the gifts on it. Givers
            can stay anonymous to other visitors.
          </li>
          <li>
            <strong>Friends finding you:</strong> only if you switch on “Let friends find me”. Phone numbers and emails are
            matched by a scrambled fingerprint, never shown.
          </li>
          <li>
            <strong>Services that run GiftMe:</strong> Clerk (sign-in), Paystack (payments and payouts), Blnk (the ledger
            that records each gift), Turso (the database) and Brimble (hosting). Each gets only what its job needs.
          </li>
        </ul>
      </section>

      <section>
        <h2>Money</h2>
        <p>
          Payments are handled by Paystack. GiftMe never sees card details and never holds your money: each gift is
          settled by Paystack to the bank account you added.
        </p>
      </section>

      <section>
        <h2>Your choices</h2>
        <p>
          You can edit or delete your wishlists at any time. To delete your account and everything in it, email{' '}
          <a className="underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>{' '}
          and it will be done within 30 days. Payment records may be kept longer where the law requires it.
        </p>
      </section>

      <section>
        <h2>Questions</h2>
        <p>
          Email{' '}
          <a className="underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>
    </LegalPage>
  )
}
