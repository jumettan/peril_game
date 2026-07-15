export var SimpleQueueType;
(function (SimpleQueueType) {
    SimpleQueueType[SimpleQueueType["Durable"] = 0] = "Durable";
    SimpleQueueType[SimpleQueueType["Transient"] = 1] = "Transient";
})(SimpleQueueType = SimpleQueueType || (SimpleQueueType = {}));
export async function declareAndBind(conn, exchange, queueName, key, queueType) {
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
