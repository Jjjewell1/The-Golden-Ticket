import nodemailer from 'nodemailer';

export class Mailer {
  constructor(cfg) {
    this.cfg = cfg;
    this.dry = !!cfg.dry;
    this.transport = this.dry
      ? null
      : nodemailer.createTransport({
          host: cfg.host,
          port: Number(cfg.port || 465),
          secure: cfg.secure !== false,
          auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
        });
  }

  get enabled() {
    return this.dry || (!!this.cfg.host && !!this.cfg.user && !!this.cfg.pass);
  }

  async _send(to, subject, html) {
    if (!this.enabled) {
      console.warn(`Mailer: not configured, skipping email to ${to} ("${subject}")`);
      return false;
    }
    if (this.dry) {
      console.log(`[mail-dry] to=${to} subject="${subject}"\n${html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 500)}`);
      return true;
    }
    try {
      await this.transport.sendMail({
        from: this.cfg.from,
        to,
        subject,
        text: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
        html,
      });
      return true;
    } catch (err) {
      console.error('Mailer: send failed:', err.message);
      return false;
    }
  }

  _shell(title, bodyLines) {
    const link = this.cfg.publicUrl;
    return `
      <div style="max-width:560px;margin:0 auto;font-family:Arial,sans-serif;color:#1d1c38;background:#f4f1ff;border-radius:16px;overflow:hidden;border:1px solid #e4dcff">
        <div style="padding:24px 28px;background:linear-gradient(135deg,#7c3aed,#ec4899);color:#fff">
          <div style="font-size:22px;font-weight:bold">🎫 The Golden Ticket</div>
        </div>
        <div style="padding:28px">
          <h2 style="margin:0 0 14px">${title}</h2>
          ${bodyLines.filter(Boolean).map((l) => `<p style="margin:8px 0;line-height:1.6">${l}</p>`).join('')}
          <p style="margin:22px 0 0;font-size:13px;color:#6b6b93">You can sign in anytime at <a href="${link}" style="color:#7c3aed">${link}</a></p>
        </div>
      </div>`;
  }

  welcome(user) {
    return this._send(
      user.email,
      'Your Golden Ticket account is ready 🎫',
      this._shell('Welcome aboard!', [
        `Your username is <strong>${user.username}</strong> and your account is active.`,
        'Head to the site and sign in with the username and password you chose.',
      ]),
    );
  }

  approved(user) {
    return this._send(
      user.email,
      'Your Golden Ticket request was approved 🎫',
      this._shell('You got your ticket!', [
        `Your username is <strong>${user.username}</strong>.`,
        'Sign in below with the username and password you picked at signup — everything is ready to go.',
      ]),
    );
  }

  denied(email, username, reason) {
    const lines = [
      `Your request for a <strong>Golden Ticket</strong> account (<em>${username}</em>) wasn't approved this time.`,
    ];
    if (reason && reason.trim()) {
      lines.push(`A note from the owner: <em>${reason.trim()}</em>`);
    } else {
      lines.push('The owner chose not to grant access at this time.');
    }
    return this._send(email, 'About your Golden Ticket request', this._shell('About your request', lines));
  }

  resetLink(email, username, link) {
    return this._send(
      email,
      'Reset your Golden Ticket password',
      this._shell('Reset your password', [
        `We got a request to reset the password for <strong>${username}</strong>.`,
        `Tap this link to choose a new one (it expires in 15 minutes): <a href="${link}" style="color:#7c3aed">${link}</a>`,
        "If you didn't ask for this, you can ignore this email.",
      ]),
    );
  }
}
