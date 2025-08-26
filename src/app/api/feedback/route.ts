export async function POST(request: Request): Promise<Response> {
    try {
        const { feedback } = await request.json().catch(() => ({}));

        if (!feedback || typeof feedback !== "string" || !feedback.trim()) {
            return new Response(JSON.stringify({ error: "Feedback is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }

        const formId = process.env.GOOGLE_FORM_ID;
        const entryId = process.env.GOOGLE_FORM_ENTRY_ID; // The numeric id from the prefilled link (entry.<id>)

        if (!formId || !entryId) {
            return new Response(
                JSON.stringify({ error: "Server not configured. Set GOOGLE_FORM_ID and GOOGLE_FORM_ENTRY_ID in env." }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const url = `https://docs.google.com/forms/d/e/${formId}/formResponse`;
        const formData = new URLSearchParams();
        formData.set(`entry.${entryId}`, feedback.trim());
        // Optional extras often seen in form submissions
        formData.set("fvv", "1");
        formData.set("pageHistory", "0");
        formData.set("usp", "pp_url");

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: formData.toString(),
            redirect: "manual",
        });

        // Google Forms may return 200 or a redirect (302). Treat both as success.
        if (res.ok || res.status === 302) {
            return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
        }

        return new Response(
            JSON.stringify({ error: `Google Forms responded with status ${res.status}` }),
            { status: 502, headers: { "Content-Type": "application/json" } }
        );
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}


