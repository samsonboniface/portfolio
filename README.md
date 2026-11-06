# Portfolio contact form

The portfolio and its contact API run from the same Node.js server.

## Run locally

1. Install Node.js, then run `npm install`.
2. Copy `.env.example` to `.env`.
3. In your Google Account, enable 2-Step Verification and create an App Password. Put that 16-character password in `SMTP_PASS` in `.env`; do not use your regular Google password.
4. Run `npm start` and open <http://localhost:3000>.

The contact form sends submissions to `CONTACT_TO` (currently `samsonboniface380@gmail.com`) and uses the visitor's address as the reply-to address. SMTP credentials stay on the server and must not be added to browser code or committed to Git. If you use another email provider, replace the SMTP host, port, and security settings with that provider's SMTP details.

The API accepts JSON at `POST /api/contact` with `name`, `email`, `phone`, and `message` fields. `country` is optional. Successful submissions are emailed to `CONTACT_TO`, with the sender's address set as the reply-to address.

Run the API tests with `npm test`.
