import amqp from "amqplib";
import { SimpleQueueType, subscribe, subscribeMsgPack as subscribeMsgPackInternal } from "./consume.js";


export enum AckType {
    Ack, NackRequeue, NackDiscard,
}
export async function subscribeJSON<T>(conn: amqp.ChannelModel, exchange: string, queueName: string, key: string, queueType: SimpleQueueType,
    handler: (data: T) => AckType | Promise<AckType>,
): Promise<void> {
    return subscribe(
        conn,
        exchange,
        queueName,
        key,
        queueType,
        handler,
        (data: Buffer) => JSON.parse(data.toString("utf8")) as T,
    );
}

export async function subscribeMsgPack<T>(conn: amqp.ChannelModel, exchange: string, queueName: string, key: string, queueType: SimpleQueueType,
    handler: (data: T) => AckType | Promise<AckType>,
): Promise<void> {
    return subscribeMsgPackInternal(conn, exchange, queueName, key, queueType, handler);
}