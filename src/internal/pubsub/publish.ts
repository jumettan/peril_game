import type { ConfirmChannel } from "amqplib";
import { encode } from "@msgpack/msgpack";

export async function publishJSON<T>(ch: ConfirmChannel, exchange: string, routingKey: string, value: T
): Promise<void> {
    const json = JSON.stringify(value);
    if (json === undefined) {
        throw new Error("Value is not JSON-serializable");
    }
    const serializedValue = Buffer.from(json, "utf8");

    ch.publish(exchange, routingKey, serializedValue, { contentType: "application/json" })
}

export async function publishMsgPack<T>(ch: ConfirmChannel, exchange: string, routingKey: string, value: T,): Promise<void> {
    const serializedValue = Buffer.from(encode(value));

    ch.publish(exchange, routingKey, serializedValue, { contentType: "application/msgpack" })
}