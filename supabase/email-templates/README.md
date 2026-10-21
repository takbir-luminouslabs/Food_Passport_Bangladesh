# Sign-in email templates

Supabase sends two different emails for the same email-link sign-in:

| Who | Template in Supabase | File | Subject |
|---|---|---|---|
| Someone who already has an account | **Magic Link** | `magic-link.html` | `আপনার Food Passport সাইন-ইন লিংক | Your Food Passport sign-in link` |
| A first-time visitor | **Confirm signup** | `confirm-signup.html` | `Food Passport-এ স্বাগতম | Welcome to Food Passport` |

Both are bilingual (Bangla, then English), use only inline CSS and tables so they look right in Gmail, Outlook and phone mail apps, and carry no images or tracking.

## Install (Supabase dashboard)

1. **Authentication → Emails → Templates**.
2. Open **Magic Link**: paste the subject above, then replace the body with the contents of `magic-link.html`. Save.
3. Open **Confirm signup**: same with `confirm-signup.html`. Save.
4. Keep the `{{ .ConfirmationURL }}`, `{{ .Email }}` and `{{ .SiteURL }}` placeholders exactly as they are.

## Sender name and address

The free built-in sender shows "Supabase Auth" and is limited to a few emails an hour. For a branded sender such as `Food Passport <hello@yourdomain>`, add your own SMTP provider (Resend, Brevo, Postmark, ...) under **Authentication → Emails → SMTP Settings** and set the sender name there.

## Local preview

Open the `.html` file in a browser. The `{{ ... }}` placeholders stay visible there; Supabase fills them in when it sends.
