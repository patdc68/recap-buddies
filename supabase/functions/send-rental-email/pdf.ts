import { createClient } from "jsr:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "npm:pdf-lib@1.17.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERIFICATION_BUCKET = "verification-images";
const AGREEMENT_BUCKET = "terms_and_condition";
const AGREEMENT_PATH = "agreement.md";
const MAX_EMBED_BYTES = 4 * 1024 * 1024;
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 48;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

interface PdfRentalRecord {
  id: string;
  renter_type: "new" | "returnee" | null;
  returnee_matched_existing: boolean | null;
  legacy_returnee: boolean | null;
  notification_email: string | null;
  returnee_selfie_img: string | null;
  created_at: string | null;
  status: string | null;
  rent_date_start: string | null;
  rent_date_end: string | null;
  pickup_time: string | null;
  return_time: string | null;
  loc_usage: string | null;
  hub_pick_up_addr: string | null;
  delivery_addr: string | null;
  hub_return_addr: string | null;
  return_addr: string | null;
  remarks: string | null;
}

interface PdfRenterRecord {
  renter_fname: string | null;
  renter_lname: string | null;
  mobile_no: number | string | null;
  emergency_contact_no: number | string | null;
  emergency_contact_person: string | null;
  emergency_contact_relationship: string | null;
  email: string | null;
  primary_id_front: string | null;
  primary_id_back: string | null;
  secondary_id_front: string | null;
  secondary_id_back: string | null;
  proof_of_billing: string | null;
  selfie_verification_img: string | null;
}

interface PdfItemRecord {
  code_name: string | null;
  device: { cam_name: string | null } | Array<{ cam_name: string | null }> | null;
}

export interface AdminPdfBookingData {
  rental: PdfRentalRecord;
  renter: PdfRenterRecord;
  items: PdfItemRecord[];
  branchName: string | null;
  pickupBranchName: string | null;
  returnBranchName: string | null;
}

interface InlineSegment {
  text: string;
  bold: boolean;
}

const cleanPdfText = (value: unknown) => String(value ?? "")
  .replace(/\\([\\`*_[\]{}()#+\-.!&>])/g, "$1")
  .replace(/[\u2013\u2014]/g, "-")
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/\u00a0/g, " ")
  .replace(/[^\x20-\x7e\u00a1-\u00ff]/g, " ")
  .replace(/[ \t]+/g, " ")
  .trim();

const displayValue = (value: unknown) => cleanPdfText(value) || "Not provided";
const formatShortId = (id: string) => id.slice(0, 8);

const formatDateOnly = (value: string | null) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatSubmissionDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatTime = (value: string | null) => {
  const match = value?.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = match[2];
  if (hour > 23) return null;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
};

const deviceName = (item: PdfItemRecord) => {
  const device = Array.isArray(item.device) ? item.device[0] : item.device;
  const name = device?.cam_name ?? "Unknown camera";
  return item.code_name ? `${name} (${item.code_name})` : name;
};

const parseInline = (value: string): InlineSegment[] => {
  const normalized = value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\+\+(.+?)\+\+/g, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
  const segments: InlineSegment[] = [];
  const pattern = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  for (const match of normalized.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) segments.push({ text: normalized.slice(cursor, index), bold: false });
    segments.push({ text: match[1], bold: true });
    cursor = index + match[0].length;
  }
  if (cursor < normalized.length) segments.push({ text: normalized.slice(cursor), bold: false });
  return segments.length ? segments : [{ text: normalized, bold: false }];
};

class PdfComposer {
  page: PDFPage;
  y: number;

  constructor(
    readonly pdf: PDFDocument,
    readonly font: PDFFont,
    readonly bold: PDFFont,
  ) {
    this.page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  newPage() {
    this.page = this.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  ensure(height: number) {
    if (this.y - height < MARGIN) this.newPage();
  }

  space(height: number) {
    this.ensure(height);
    this.y -= height;
  }

  rule(color = rgb(0.78, 0.66, 0.42)) {
    this.ensure(12);
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: PAGE_WIDTH - MARGIN, y: this.y }, thickness: 1, color });
    this.y -= 12;
  }

  drawInline(segments: InlineSegment[], options: {
    x?: number;
    width?: number;
    size?: number;
    lineHeight?: number;
    color?: ReturnType<typeof rgb>;
    bullet?: boolean;
  } = {}) {
    const x = options.x ?? MARGIN;
    const width = options.width ?? PAGE_WIDTH - MARGIN * 2;
    const size = options.size ?? 10.5;
    const lineHeight = options.lineHeight ?? size + 4;
    const color = options.color ?? rgb(0.12, 0.12, 0.12);
    const lineX = options.bullet ? x + 18 : x;
    const lineWidth = options.bullet ? width - 18 : width;
    let cursorX = lineX;
    let hasWord = false;
    let firstLine = true;

    this.ensure(lineHeight);
    if (options.bullet) this.page.drawText("-", { x, y: this.y, font: this.bold, size, color });

    for (const segment of segments) {
      const selectedFont = segment.bold ? this.bold : this.font;
      for (const rawWord of segment.text.split(/\s+/).filter(Boolean)) {
        const word = cleanPdfText(rawWord);
        if (!word) continue;
        let token = hasWord ? ` ${word}` : word;
        let tokenWidth = selectedFont.widthOfTextAtSize(token, size);
        if (hasWord && cursorX + tokenWidth > lineX + lineWidth) {
          this.y -= lineHeight;
          this.ensure(lineHeight);
          cursorX = lineX;
          hasWord = false;
          firstLine = false;
          token = word;
          tokenWidth = selectedFont.widthOfTextAtSize(token, size);
        }
        if (!firstLine && options.bullet && !hasWord) {
          // Wrapped list lines align with the text, not the bullet.
          cursorX = lineX;
        }
        this.page.drawText(token, { x: cursorX, y: this.y, font: selectedFont, size, color });
        cursorX += tokenWidth;
        hasWord = true;
      }
    }
    this.y -= lineHeight;
  }
}

const loadAgreementMarkdown = async () => {
  const { data, error } = await supabase.storage.from(AGREEMENT_BUCKET).download(AGREEMENT_PATH);
  if (error || !data) {
    console.error("Authoritative rental agreement download failed", { bucket: AGREEMENT_BUCKET, path: AGREEMENT_PATH });
    throw new Error("The authoritative rental agreement could not be loaded.");
  }
  const markdown = await data.text();
  if (!markdown.trim()) {
    console.error("Authoritative rental agreement was empty", { bucket: AGREEMENT_BUCKET, path: AGREEMENT_PATH });
    throw new Error("The authoritative rental agreement could not be loaded.");
  }
  return markdown;
};

const renderAgreement = (composer: PdfComposer, markdown: string) => {
  composer.page.drawText("OFFICIAL RENTAL CONTRACT AGREEMENT", {
    x: MARGIN,
    y: composer.y,
    font: composer.bold,
    size: 18,
    color: rgb(0.06, 0.06, 0.06),
  });
  composer.y -= 25;
  composer.page.drawText("Recap Buddies Camera Rental PH", {
    x: MARGIN,
    y: composer.y,
    font: composer.font,
    size: 10,
    color: rgb(0.35, 0.35, 0.35),
  });
  composer.y -= 16;
  composer.rule();

  for (const rawLine of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      composer.space(5);
      continue;
    }

    if (/^(?:\*{3,}|-{3,}|_{3,})$/.test(line)) {
      composer.space(4);
      composer.rule(rgb(0.82, 0.82, 0.78));
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      composer.space(heading[1].length === 1 ? 8 : 5);
      composer.drawInline(parseInline(heading[2]), {
        size: heading[1].length === 1 ? 15 : heading[1].length === 2 ? 13 : 11.5,
        lineHeight: heading[1].length === 1 ? 20 : 17,
      });
      continue;
    }

    if (/^\*\*.+\*\*$/.test(line)) {
      composer.space(5);
      composer.drawInline([{ text: line.slice(2, -2), bold: true }], { size: 11.5, lineHeight: 16 });
      continue;
    }

    const bullet = line.match(/^[-*+\u2022\u25cf]\s*(.+)$/);
    if (bullet) {
      composer.drawInline(parseInline(bullet[1]), { bullet: true, size: 9.5, lineHeight: 13.5 });
      continue;
    }

    const quote = line.match(/^>\s*(.+)$/);
    if (quote) {
      composer.drawInline(parseInline(quote[1]), { size: 9.5, lineHeight: 13.5, color: rgb(0.35, 0.35, 0.35) });
      continue;
    }

    composer.drawInline(parseInline(line), { size: 9.5, lineHeight: 13.5 });
  }
};

const wrapText = (text: string, font: PDFFont, size: number, maxWidth: number) => {
  const words = displayValue(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const renderDetails = (composer: PdfComposer, data: AdminPdfBookingData) => {
  composer.newPage();
  composer.page.drawText("RENTER + RENTAL DETAILS", { x: MARGIN, y: composer.y, font: composer.bold, size: 17, color: rgb(0.06, 0.06, 0.06) });
  composer.y -= 24;
  composer.rule();

  const renterName = `${data.renter.renter_fname ?? ""} ${data.renter.renter_lname ?? ""}`.trim();
  const notificationEmail = data.rental.notification_email?.trim() || data.renter.email;
  const pickupType = data.rental.hub_pick_up_addr ? "Pick-up" : "Delivery";
  const pickupLocation = data.pickupBranchName ?? data.rental.delivery_addr;
  const returnLocation = data.returnBranchName ?? data.rental.return_addr;
  const renterType = data.rental.renter_type === "returnee" ? "Returning Renter" : "New Renter";

  const rows: Array<[string, unknown]> = [
    ["Booking ID", formatShortId(data.rental.id)],
    ["Date Submitted", formatSubmissionDate(data.rental.created_at)],
    ["Full Name", renterName],
    ["Active E-mail", notificationEmail],
    ["Mobile Number", data.renter.mobile_no],
    ["Emergency Contact", data.renter.emergency_contact_no],
    ["Emergency Contact Person", data.renter.emergency_contact_person],
    ["Emergency Relationship", data.renter.emergency_contact_relationship],
    ["Which device are you renting?", data.items.map(deviceName).join(", ")],
    ["Unit Code", data.items.map((item) => item.code_name).filter(Boolean).join(", ")],
    ["Rental Start Date", formatDateOnly(data.rental.rent_date_start)],
    ["Rental End Date", formatDateOnly(data.rental.rent_date_end)],
    ["Pick-up Time", formatTime(data.rental.pickup_time)],
    ["Return Time", formatTime(data.rental.return_time)],
    ["Pickup / Delivery Type", pickupType],
    ["Pickup / Delivery Location", pickupLocation],
    ["Return Location", returnLocation],
    ["Branch / Hub", data.pickupBranchName ?? data.branchName],
    ["Location Usage", data.rental.loc_usage],
    ["Status", data.rental.status],
    ["Remarks", data.rental.remarks],
    ["Renter Type", renterType],
  ];

  if (data.rental.renter_type === "returnee") {
    rows.push(["Existing System Record", data.rental.returnee_matched_existing ? "Yes" : "No"]);
    if (data.rental.legacy_returnee) {
      rows.push(["Legacy Returning Customer", "Yes"]);
      rows.push(["Legacy Returnee Note", "This renter indicated that they previously rented from Recap Buddies before the current system records were available."]);
    }
  }

  const labelX = MARGIN + 10;
  const valueX = 245;
  const labelWidth = valueX - labelX - 18;
  const valueWidth = PAGE_WIDTH - MARGIN - valueX - 10;
  const fontSize = 9.5;
  const lineHeight = 13;

  rows.forEach(([label, value], index) => {
    const labelLines = wrapText(cleanPdfText(label), composer.bold, fontSize, labelWidth);
    const valueLines = wrapText(displayValue(value), composer.font, fontSize, valueWidth);
    const lineCount = Math.max(labelLines.length, valueLines.length);
    const rowHeight = Math.max(28, lineCount * lineHeight + 10);
    composer.ensure(rowHeight);
    if (index % 2 === 0) {
      composer.page.drawRectangle({
        x: MARGIN,
        y: composer.y - rowHeight + 4,
        width: PAGE_WIDTH - MARGIN * 2,
        height: rowHeight,
        color: rgb(0.965, 0.96, 0.945),
      });
    }
    labelLines.forEach((line, lineIndex) => composer.page.drawText(line, {
      x: labelX,
      y: composer.y - 10 - lineIndex * lineHeight,
      font: composer.bold,
      size: fontSize,
      color: rgb(0.28, 0.28, 0.28),
    }));
    valueLines.forEach((line, lineIndex) => composer.page.drawText(line, {
      x: valueX,
      y: composer.y - 10 - lineIndex * lineHeight,
      font: composer.font,
      size: fontSize,
      color: rgb(0.08, 0.08, 0.08),
    }));
    composer.y -= rowHeight;
  });
};

const storagePath = (storedValue: string) => {
  const marker = `/${VERIFICATION_BUCKET}/`;
  const markerIndex = storedValue.indexOf(marker);
  const candidate = markerIndex >= 0
    ? decodeURIComponent(storedValue.slice(markerIndex + marker.length).split("?")[0])
    : storedValue.startsWith(`${VERIFICATION_BUCKET}/`)
      ? storedValue.slice(VERIFICATION_BUCKET.length + 1)
      : storedValue.startsWith("http://") || storedValue.startsWith("https://")
        ? ""
        : storedValue.replace(/^\/+/, "").split("?")[0];
  return candidate && !candidate.split("/").includes("..") ? candidate : null;
};

const addDocumentUnavailable = (pdf: PDFDocument, bold: PDFFont, label: string, message = "Document unavailable") => {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawText(cleanPdfText(label), { x: MARGIN, y: 730, font: bold, size: 16 });
  page.drawText(message, { x: MARGIN, y: 700, font: bold, size: 10.5, color: rgb(0.65, 0.1, 0.1) });
};

interface VerificationDocument {
  label: string;
  storedValue: string | null;
}

const verificationDocuments = (data: AdminPdfBookingData): VerificationDocument[] => {
  const historicalDocuments: VerificationDocument[] = [
    { label: "Requirement 1: Primary ID - Front", storedValue: data.renter.primary_id_front },
    { label: "Requirement 1: Primary ID - Back", storedValue: data.renter.primary_id_back },
    { label: "Requirement 2: Secondary ID - Front", storedValue: data.renter.secondary_id_front },
    { label: "Requirement 2: Secondary ID - Back", storedValue: data.renter.secondary_id_back },
    { label: "Requirement 3: Proof of Billing", storedValue: data.renter.proof_of_billing },
  ];

  if (data.rental.renter_type !== "returnee") {
    return [
      ...historicalDocuments,
      { label: "Requirement 4/5: Selfie Verification", storedValue: data.renter.selfie_verification_img },
    ];
  }

  const currentSelfiePath = data.rental.returnee_selfie_img
    ? storagePath(data.rental.returnee_selfie_img)
    : null;
  const historicalSelfiePath = data.renter.selfie_verification_img
    ? storagePath(data.renter.selfie_verification_img)
    : null;
  const hasDistinctHistoricalSelfie = Boolean(
    historicalSelfiePath && historicalSelfiePath !== currentSelfiePath,
  );

  return [
    ...historicalDocuments,
    ...(hasDistinctHistoricalSelfie ? [{
      label: "Requirement 4/5: Selfie Verification (Existing Record)",
      storedValue: data.renter.selfie_verification_img,
    }] : []),
    {
      label: "Requirement 4/5: Selfie Verification (Current Returnee Submission)",
      storedValue: data.rental.returnee_selfie_img,
    },
  ];
};

const appendVerificationDocuments = async (pdf: PDFDocument, font: PDFFont, bold: PDFFont, data: AdminPdfBookingData) => {
  const documents = verificationDocuments(data);
  const section = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  section.drawText("VERIFICATION / SUPPORTING DOCUMENTS", { x: MARGIN, y: 730, font: bold, size: 17, color: rgb(0.06, 0.06, 0.06) });
  section.drawLine({ start: { x: MARGIN, y: 710 }, end: { x: PAGE_WIDTH - MARGIN, y: 710 }, thickness: 1, color: rgb(0.78, 0.66, 0.42) });
  section.drawText("Files are resolved and downloaded server-side from private Recap Buddies Storage.", { x: MARGIN, y: 680, font: bold, size: 10, color: rgb(0.35, 0.35, 0.35) });
  let summaryY = 650;
  for (const document of documents) {
    const available = Boolean(document.storedValue && storagePath(document.storedValue));
    const summaryLines = wrapText(`${document.label}: ${available ? "Available" : "Not available"}`, font, 9.5, PAGE_WIDTH - MARGIN * 2);
    for (const line of summaryLines) {
      section.drawText(line, {
        x: MARGIN,
        y: summaryY,
        font: available ? font : bold,
        size: 9.5,
        color: available ? rgb(0.15, 0.15, 0.15) : rgb(0.48, 0.48, 0.48),
      });
      summaryY -= 14;
    }
    summaryY -= 3;
  }

  for (const { label, storedValue } of documents) {
    const path = storedValue ? storagePath(storedValue) : null;
    if (!path) continue;

    try {
      const { data: blob, error } = await supabase.storage.from(VERIFICATION_BUCKET).download(path);
      if (error || !blob) throw new Error("download failed");
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (bytes.byteLength > MAX_EMBED_BYTES) throw new Error("file too large to embed");

      if (blob.type === "application/pdf" || path.toLowerCase().endsWith(".pdf")) {
        const titlePage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        titlePage.drawText(cleanPdfText(label), { x: MARGIN, y: 730, font: bold, size: 16 });
        titlePage.drawText("Submitted PDF pages follow.", { x: MARGIN, y: 700, font: bold, size: 10, color: rgb(0.35, 0.35, 0.35) });
        const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const copied = await pdf.copyPages(source, source.getPageIndices().slice(0, 2));
        copied.forEach((page) => pdf.addPage(page));
        continue;
      }

      const image = blob.type === "image/png" || path.toLowerCase().endsWith(".png")
        ? await pdf.embedPng(bytes)
        : await pdf.embedJpg(bytes);
      const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      page.drawText(cleanPdfText(label), { x: MARGIN, y: 730, font: bold, size: 16 });
      const scale = Math.min(500 / image.width, 620 / image.height, 1);
      const width = image.width * scale;
      const height = image.height * scale;
      page.drawImage(image, { x: (PAGE_WIDTH - width) / 2, y: 680 - height, width, height });
    } catch (error) {
      console.warn("Verification document unavailable for Admin PDF", {
        label,
        reason: error instanceof Error ? error.message : "unknown",
      });
      addDocumentUnavailable(pdf, bold, label);
    }
  }
};

export const buildAdminPdf = async (data: AdminPdfBookingData) => {
  const agreementMarkdown = await loadAgreementMarkdown();
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const composer = new PdfComposer(pdf, font, bold);

  renderAgreement(composer, agreementMarkdown);
  renderDetails(composer, data);
  await appendVerificationDocuments(pdf, font, bold, data);

  return pdf.save({ useObjectStreams: true });
};
