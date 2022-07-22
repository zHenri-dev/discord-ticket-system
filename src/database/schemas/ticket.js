const { Schema, model } = require("mongoose");

const ticketSchema = Schema({
    userId: String,
    channelId: String,
    firstMessageId: String,
    category: String,
    lastResponseUserId: String,
    lastResponseAt: Number,
    closed: String,
    history: Array,
    createdAt: Number
})

module.exports = model("Ticket", ticketSchema);