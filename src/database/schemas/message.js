const { Schema, model } = require("mongoose");

const messageSchema = Schema({
    guildId: String,
    channelId: String,
    messageId: String,
})

module.exports = model("Message", messageSchema);