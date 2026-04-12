const nodemailer = require("nodemailer");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function esc(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: required("SMTP_HOST"),
      port: Number(required("SMTP_PORT")),
      secure: Number(required("SMTP_PORT")) === 465,
      auth: { user: required("SMTP_USER"), pass: required("SMTP_PASS") }
    });

    const fromEmail = required("MAIL_FROM");
    const toEmail = required("MAIL_TO");
    const body = JSON.parse(event.body || "{}");

    for (const field of ["fullName", "email", "telephone", "householdSize", "unitType", "annualIncome"]) {
      if (!body[field]) {
        return { statusCode: 400, body: JSON.stringify({ error: `Missing required field: ${field}` }) };
      }
    }
    if (!body.certification) {
      return { statusCode: 400, body: JSON.stringify({ error: "Certification is required." }) };
    }

    const members = Array.isArray(body.members) ? body.members : [];
    const bankAccounts = Array.isArray(body.bankAccounts) ? body.bankAccounts : [];
    const otherAssets = Array.isArray(body.otherAssets) ? body.otherAssets : [];

    const textBody = [
      "Market Centre Apartments Household Interest Submission",
      "",
      `Full Name: ${body.fullName}`,
      `Email: ${body.email}`,
      `Telephone: ${body.telephone}`,
      `Household Size: ${body.householdSize}`,
      `Unit Type: ${body.unitType}`,
      `Annual Income: ${body.annualIncome}`,
      `Preferred Move-In: ${body.preferredMoveIn || ""}`,
      `All household members full-time students: ${body.studentStatus || ""}`,
      "",
      "Household Members & Sources of Income:",
      members.length
        ? members.map((m) => `${m.fullName || "[blank]"} | Age: ${m.age || "[blank]"} | ${m.incomeType || "[blank]"} | ${m.incomeAmount || "[blank]"}`).join("\n")
        : "None listed",
      "",
      "Bank Accounts:",
      bankAccounts.length
        ? bankAccounts.map((a) => `${a.accountType || "[blank]"} | ${a.amount || "[blank]"}`).join("\n")
        : "None listed",
      "",
      "Property & Other Assets:",
      otherAssets.length
        ? otherAssets.map((a) => `${a.assetType || "[blank]"} | ${a.amount || "[blank]"}`).join("\n")
        : "None listed",
      "",
      "Certification acknowledged: Yes"
    ].join("\n");

    const htmlBody = `
      <h2>Market Centre Apartments Household Interest Submission</h2>
      <p><strong>Full Name:</strong> ${esc(body.fullName)}</p>
      <p><strong>Email:</strong> ${esc(body.email)}</p>
      <p><strong>Telephone:</strong> ${esc(body.telephone)}</p>
      <p><strong>Household Size:</strong> ${esc(body.householdSize)}</p>
      <p><strong>Unit Type:</strong> ${esc(body.unitType)}</p>
      <p><strong>Annual Income:</strong> ${esc(body.annualIncome)}</p>
      <p><strong>Preferred Move-In:</strong> ${esc(body.preferredMoveIn || "")}</p>
      <p><strong>Are all household members full-time students:</strong> ${esc(body.studentStatus || "")}</p>
      <h3>Household Members & Sources of Income</h3>
      <ul>${members.map((m) => `<li>${esc(m.fullName || "[blank]")} | Age: ${esc(m.age || "[blank]")} | ${esc(m.incomeType || "[blank]")} | ${esc(m.incomeAmount || "[blank]")}</li>`).join("") || "<li>None listed</li>"}</ul>
      <h3>Bank Accounts</h3>
      <ul>${bankAccounts.map((a) => `<li>${esc(a.accountType || "[blank]")} | ${esc(a.amount || "[blank]")}</li>`).join("") || "<li>None listed</li>"}</ul>
      <h3>Property & Other Assets</h3>
      <ul>${otherAssets.map((a) => `<li>${esc(a.assetType || "[blank]")} | ${esc(a.amount || "[blank]")}</li>`).join("") || "<li>None listed</li>"}</ul>
      <p><strong>Certification acknowledged:</strong> Yes</p>
    `;

    await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      replyTo: body.email,
      subject: `Market Centre Apartments - ${body.fullName}`,
      text: textBody,
      html: htmlBody
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: true })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Server error" })
    };
  }
};
