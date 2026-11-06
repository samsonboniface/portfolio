const assert = require("node:assert/strict");
const { once } = require("node:events");
const test = require("node:test");
const { createApp } = require("../server");

async function listen(app) {
    const server = app.listen(0);
    await once(server, "listening");
    return {
        server,
        url: `http://127.0.0.1:${server.address().port}`,
    };
}

function close(server) {
    return new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
        server.closeAllConnections();
    });
}

test("serves the portfolio while keeping backend source private", async (t) => {
    const { server, url } = await listen(createApp());
    t.after(() => close(server));

    const pageResponse = await fetch(url);
    const sourceResponse = await fetch(`${url}/server.js`);

    assert.equal(pageResponse.status, 200);
    assert.match(await pageResponse.text(), /Samson Boniface/);
    assert.equal(sourceResponse.status, 404);
});

test("rejects invalid contact data without sending email", async (t) => {
    let sendAttempts = 0;
    const { server, url } = await listen(
        createApp({ sendMail: async () => { sendAttempts += 1; } })
    );
    t.after(() => close(server));

    const response = await fetch(`${url}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Samson", email: "not-an-email" }),
    });

    assert.equal(response.status, 400);
    assert.equal(sendAttempts, 0);
    assert.match((await response.json()).error, /provide your phone/);
});

test("sends validated contact details through the mailer", async (t) => {
    let sentMessage;
    const { server, url } = await listen(
        createApp({ sendMail: async (message) => { sentMessage = message; } })
    );
    t.after(() => close(server));

    const response = await fetch(`${url}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Samson",
            email: "samson@example.com",
            phone: "+123456789",
            country: "Nigeria",
            message: "Hello",
        }),
    });

    assert.equal(response.status, 200);
    assert.deepEqual(sentMessage, {
        name: "Samson",
        email: "samson@example.com",
        phone: "+123456789",
        country: "Nigeria",
        message: "Hello",
    });
    assert.match((await response.json()).message, /sent/);
});

test("returns an explicit error when email delivery fails", async (t) => {
    const { server, url } = await listen(
        createApp({ sendMail: async () => { throw new Error("SMTP unavailable"); } })
    );
    t.after(() => close(server));

    const response = await fetch(`${url}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Samson",
            email: "samson@example.com",
            phone: "+123456789",
            message: "Hello",
        }),
    });

    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /could not be sent/);
});
