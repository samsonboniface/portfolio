require("dotenv").config();

const express = require("express");
const nodemailer = require("nodemailer");
const path = require("node:path");

class SmtpConfigurationError extends Error {}

async function sendContactEmail(message) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_TO } = process.env;
    const port = Number(SMTP_PORT);
    const secureSetting = (process.env.SMTP_SECURE || "false").trim().toLowerCase();

    if (
        !SMTP_HOST ||
        !SMTP_PORT ||
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65535 ||
        !["true", "false"].includes(secureSetting) ||
        !SMTP_USER ||
        !SMTP_PASS ||
        !CONTACT_TO
    ) {
        throw new SmtpConfigurationError("SMTP settings are incomplete or invalid.");
    }

    const transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port,
        secure: secureSetting === "true",
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        disableFileAccess: true,
        disableUrlAccess: true,
    });

    await transporter.sendMail({
        from: process.env.CONTACT_FROM || SMTP_USER,
        to: CONTACT_TO,
        replyTo: message.email,
        subject: `Portfolio contact: ${message.name}`,
        text: [
            `Name: ${message.name}`,
            `Email: ${message.email}`,
            `Phone: ${message.phone}`,
            `Country: ${message.country || "Not provided"}`,
            "",
            message.message,
        ].join("\n"),
    });
}

function validateContact(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        return { error: "Submit the contact form as a JSON object." };
    }

    const limits = { name: 100, email: 254, phone: 30, country: 100, message: 5000 };
    const values = {};

    for (const [field, maxLength] of Object.entries(limits)) {
        const value = body[field] === undefined ? "" : body[field];
        if (typeof value !== "string") {
            return { error: `Please provide a valid ${field}.` };
        }

        values[field] = value.trim();
        if (values[field].length > maxLength) {
            return { error: `${field} must be ${maxLength} characters or fewer.` };
        }
        if (field !== "message" && /[\u0000-\u001f\u007f]/.test(values[field])) {
            return { error: `Please provide a valid ${field}.` };
        }
    }

    for (const field of ["name", "email", "phone", "message"]) {
        if (!values[field]) {
            return { error: `Please provide your ${field}.` };
        }
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        return { error: "Please provide a valid email address." };
    }

    return { value: values };
}

function createApp({ sendMail = sendContactEmail } = {}) {
    const app = express();
    app.use(express.json({ limit: "10kb" }));

    app.get("/api/health", (req, res) => {
        res.json({ status: "ok" });
    });

    app.post("/api/contact", async (req, res) => {
        const validation = validateContact(req.body);
        if (validation.error) {
            return res.status(400).json({ error: validation.error });
        }

        try {
            await sendMail(validation.value);
            return res.json({ message: "Thanks! Your message has been sent." });
        } catch (error) {
            if (error instanceof SmtpConfigurationError) {
                console.error(error.message);
                return res.status(503).json({
                    error: "Email delivery is not configured on the server.",
                });
            }

            console.error("Unable to send contact form email:", error);
            return res.status(502).json({
                error: "Your message could not be sent. Please try again later.",
            });
        }
    });

    app.get("/", (req, res) => {
        res.sendFile(path.join(__dirname, "index.html"));
    });

    const publicFiles = {
        "/style.css": "style.css",
        "/index.js": "index.js",
        "/profile.jpg": "profile.jpg",
        "/project-three.jpeg": "project-three.jpeg",
        "/Samson.png": "Samson.png",
        "/.profile.jpg": ".profile.jpg",
        "/.jpeg": ".jpeg",
        "/2.jpg": "2.jpg",
        "/3.jpg": "3.jpg",
        "/Samson_Boniface_CV.docx": "Samson_Boniface_CV.docx",
    };

    for (const [url, file] of Object.entries(publicFiles)) {
        app.get(url, (req, res, next) => {
            res.sendFile(path.join(__dirname, file), (error) => {
                if (error) {
                    next(error);
                }
            });
        });
    }

    app.use((error, req, res, next) => {
        if (error.type === "entity.parse.failed") {
            return res.status(400).json({ error: "Request body must contain valid JSON." });
        }
        if (error.type === "entity.too.large") {
            return res.status(413).json({ error: "Request body is too large." });
        }

        console.error("Request failed:", error);
        return res.status(500).json({ error: "An unexpected server error occurred." });
    });

    app.use((req, res) => {
        res.status(404).json({ error: "Not found." });
    });

    return app;
}

if (require.main === module) {
    const port = Number(process.env.PORT || 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("PORT must be an integer between 1 and 65535.");
    }

    createApp().listen(port, () => {
        console.log(`Portfolio server listening on http://localhost:${port}`);
    });
}

module.exports = { createApp };
