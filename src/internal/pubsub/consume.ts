import type { Channel, ChannelModel, ConsumeMessage, Replies } from "amqplib";
import { decode } from "@msgpack/msgpack";
import { AckType } from "./subscribe.js";
import { ExchangePerilDeadLetter } from "../routing/routing.js";

export enum SimpleQueueType {
    Durable,
    Transient,
}

export async function declareAndBind(
    conn: ChannelModel,
    exchange: string,
    queueName: string,
    key: string,
    queueType: SimpleQueueType,
    deadLetterExchangeName: string,
): Promise<[Channel, Replies.AssertQueue]> {
    const ch = await conn.createChannel();
    const durable = queueType === SimpleQueueType.Durable;
    const autoDelete = queueType === SimpleQueueType.Transient;
    const exclusive = queueType === SimpleQueueType.Transient;

    const q = await ch.assertQueue(queueName, {
        durable, autoDelete, exclusive, arguments: {
            "x-dead-letter-exchange": deadLetterExchangeName,
        },
    });
    await ch.bindQueue(q.queue, exchange, key);

    return [ch, q];
}
export async function subscribe<T>(
    conn: ChannelModel,
    exchange: string,
    queueName: string,
    routingKey: string,
    simpleQueueType: SimpleQueueType,
    handler: (data: T) => Promise<AckType> | AckType,
    deserializer: (data: Buffer) => T,
): Promise<void> {
    const [channel, queue] = await declareAndBind(
        conn,
        exchange,
        queueName,
        routingKey,
        simpleQueueType,
        ExchangePerilDeadLetter,
    );
    const onMessage = async (msg: ConsumeMessage | null) => {
        if (msg === null) {
            return;
        }

        const parsed = deserializer(msg.content);
        const ackType = await handler(parsed);

        if (ackType === AckType.NackRequeue) {
            channel.nack(msg, false, true);
            return;
        } else if (ackType === AckType.NackDiscard) {
            return channel.nack(msg, false, false);
        }
        else {
            channel.ack(msg);
        }
    };

    await channel.consume(queue.queue, onMessage);
}

export async function subscribeMsgPack<T>(
    conn: ChannelModel,
    exchange: string,
    queueName: string,
    routingKey: string,
    simpleQueueType: SimpleQueueType,
    handler: (data: T) => Promise<AckType> | AckType,
): Promise<void> {
    return subscribe(
        conn,
        exchange,
        queueName,
        routingKey,
        simpleQueueType,
        handler,
        (data: Buffer) => decode(data) as T,
    );
}