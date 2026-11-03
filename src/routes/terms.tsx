import { createFileRoute } from '@tanstack/react-router'
import { CONTACT_EMAIL, LegalPage } from '@/components/legal'

export const Route = createFileRoute('/terms')({
  head: () => ({ meta: [{ title: 'Terms · GiftMe' }] }),
  component: Terms,
})

function Terms() {
  return (
    <LegalPage title="Terms">
      <p>By using GiftMe you agree to these terms. They are short on purpose.</p>

      <section>
        <h2>The service</h2>
        <p>
          GiftMe lets you make wishlists, share them, and receive gifts or contributions from friends. It is free to use
          and provided as it is, without guarantees that it will always be available or free of mistakes.
        </p>
      </section>

      <section>
        <h2>Your account and lists</h2>
        <ul>
          <li>Keep your sign-in safe. You are responsible for what happens on your account.</li>
          <li>
            Only add things you have the right to share. No illegal items, scams, hate or content that is not yours to post.
          </li>
          <li>We may remove lists or accounts that break these rules.</li>
        </ul>
      </section>

      <section>
        <h2>Gifts and payments</h2>
        <ul>
          <li>
            Payments are processed by Paystack under its own terms. GiftMe does not hold money: gifts are settled to the
            bank account the list owner added.
          </li>
          <li>
            Gifts are given freely. Refunds are between the giver and the list owner, and GiftMe can help where Paystack
            allows it.
          </li>
          <li>Reserving an item is a friendly signal to other givers, not a promise or a purchase.</li>
        </ul>
      </section>

      <section>
        <h2>Changes</h2>
        <p>We may update these terms. The date at the top shows the latest version.</p>
      </section>

      <section>
        <h2>Contact</h2>
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
