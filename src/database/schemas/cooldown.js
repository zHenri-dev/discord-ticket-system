const { Schema, model } = require("mongoose");

const cooldownSchema = Schema({
    userId: String,
    time: Number,
})

module.exports = model("Cooldown", cooldownSchema);