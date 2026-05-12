export interface RentalEmailTemplateInput {
  title: string;
  preheader: string;
  heading: string;
  bodyHtml: string;
}

const LOGO_URL = 'https://kjgtkagxzvklxgrvvmcz.supabase.co/storage/v1/object/public/sample-images/recap-black-text.svg';

const baseStyles = {
  page: 'margin:0;padding:0;background-color:#f5f7fb;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#111827;',
  wrapper: 'width:100%;padding:28px 16px;',
  card: 'max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(17,24,39,0.06);',
  content: 'padding:28px 24px 12px;',
  heading: 'margin:0 0 12px;font-size:24px;line-height:1.25;font-weight:700;color:#111827;',
  body: 'margin:0;font-size:15px;line-height:1.7;color:#374151;',
  footerWrap: 'margin-top:24px;padding:20px 24px 28px;',
  divider: 'height:1px;background:#e5e7eb;width:100%;margin-bottom:20px;',
  logo: 'display:block;height:24px;width:auto;max-width:240px;margin:0 auto 12px;',
  footNote: 'margin:0;text-align:center;font-size:12px;line-height:1.6;color:#6b7280;',
};

export const buildFooter = () => `
  <div style="${baseStyles.footerWrap}">
    <div style="${baseStyles.divider}"></div>
    <img src="${LOGO_URL}" alt="Recap Buddies" style="${baseStyles.logo}" />
    <p style="${baseStyles.footNote}">
      This is an automated message from Recap Buddies Camera Rental PH.<br />
      Please do not reply to this email.
    </p>
  </div>
`;

export const buildEmailWrapper = ({ title, preheader, heading, bodyHtml }: RentalEmailTemplateInput): string => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="${baseStyles.page}">
    <span style="display:none !important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>
    <div style="${baseStyles.wrapper}">
      <div style="${baseStyles.card}">
        <div style="${baseStyles.content}">
          <h1 style="${baseStyles.heading}">${heading}</h1>
          <div style="${baseStyles.body}">${bodyHtml}</div>
        </div>
        ${buildFooter()}
      </div>
    </div>
  </body>
</html>
`;
