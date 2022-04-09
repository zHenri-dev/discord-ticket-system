const { Schema, model } = require("mongoose");

const userSchema = Schema({
    userId: String,
    closedTickets: Number,
    profile: Object
})

module.exports = model("User", userSchema);