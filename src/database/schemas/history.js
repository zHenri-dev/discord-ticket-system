const { Schema, model } = require("mongoose");

const historySchema = Schema({
    string: String,
    createdAt: Number,
})

module.exports = model("History", historySchema);