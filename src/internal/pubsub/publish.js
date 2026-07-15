export async function publishJSON(ch, exchange, routingKey, value) {
    const json = JSON.stringify(value);
    if (json === undefined) {
        throw new Error("Value is not JSON-serializable");
    }
    const serializedValue = Buffer.from(json, "utf8");
    ch.publish(exchange, routingKey, serializedValue, { contentType: "application/json" });
}
