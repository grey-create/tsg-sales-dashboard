// Netlify serverless function — proxies Airtable API to keep the token private
exports.handler = async (event) => {
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = "appbx9KaWpz9q1qpE";
  const TABLE_ID = "tblgy7Oah36KTcmmS";

  if (!AIRTABLE_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: "AIRTABLE_TOKEN not configured" }) };
  }

  const headers = {
    "Authorization": "Bearer " + AIRTABLE_TOKEN,
    "Content-Type": "application/json"
  };

  try {
    let allRecords = [];
    let offset = null;

    do {
      const url = new URL("https://api.airtable.com/v0/" + BASE_ID + "/" + TABLE_ID);
      url.searchParams.set("pageSize", "100");
      url.searchParams.set("sort[0][field]", "Date");
      url.searchParams.set("sort[0][direction]", "asc");
      if (offset) url.searchParams.set("offset", offset);

      const res = await fetch(url.toString(), { headers });

      if (!res.ok) {
        const err = await res.text();
        return { statusCode: res.status, body: JSON.stringify({ error: "Airtable API error: " + err }) };
      }

      const data = await res.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset || null;
    } while (offset);

    const records = allRecords
      .filter(r => r.fields["Employee"] && r.fields["Date"])
      .map(r => {
        const f = r.fields;
        return {
          date: f["Date"],
          employee: f["Employee"],
          enq: f["Enq's"] || 0,
          orders: f["Orders"] || 0,
          convRate: f["Conv. Rate"] || 0,
          rejected: f["Quotes Rejected"] || 0,
          follow: f["Quotes to follow"] || 0,
          valueEnq: f["Value Enq's"] || 0,
          valueOrd: f["Value Ord's"] || 0,
          ordCost: f["Ord Cost"] || 0,
          gp: f["Order GP"] || 0,
          margin: f["Profit Margin"] || 0,
          aov: f["Ave Ord Value"] || 0,
          monthYear: f["Month/Year"] || ""
        };
      });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300"
      },
      body: JSON.stringify({ records, lastFetched: new Date().toISOString() })
    };

  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
