const { MessageEmbed, MessageActionRow, MessageButton } = require("discord.js");
const moment = require("moment");
moment.locale("pt-br");

module.exports = class {
    constructor(client) {
        this.client = client;
        this.eventName = "messageCreate";
    }

    async run(message) {
        try {
            if (!message.guild || message.author.bot === true || message.guild.id != this.client.ticketConfig.centralGuildId) return;
            let ticket = await this.client.database.tickets.findOne({ channelId: message.channel.id, closed: false });
            if (ticket) {
                let user = await this.client.users.cache.get(ticket.userId);
                if (!user) return message.channel.delete().catch(() => { });
                if (message.content && message.content.startsWith("&")) return;
                if (message.content && message.content.startsWith("//")) {
                    let commentContent = message.content.substring(2);
                    let attachments = "";
                    message.attachments.forEach(attachment => {
                        if (attachments == "") attachments += `\n\n[\`[${attachment.name}]\`](${attachment.url})`
                        else attachments += `\n[\`[${attachment.name}]\`](${attachment.url})`
                    });
                    if (commentContent == "" && attachments == "") commentContent = "Não é possível fixar um comentário sem nenhuma mensagem!";
                    commentContent += attachments;
                    let commentEmbed = new MessageEmbed()
                        .setAuthor({ name: `${message.author.username} deixou um comentário!`, iconURL: message.author.displayAvatarURL() })
                        .setDescription(`${commentContent}`)
                        .setColor("#ffffff");
                    if (message.attachments.first()) commentEmbed.setImage(message.attachments.first().url);
                    message.channel.send({ embeds: [commentEmbed] }).catch(() => { });
                    message.delete().catch(() => { });
                    return;
                }
                let messageContent = "";
                if (message.content) messageContent = message.content;
                let attachments = "";
                message.attachments.forEach(attachment => {
                    if (attachments == "") attachments += `\n\n[\`[${attachment.name}]\`](${attachment.url})`
                    else attachments += `\n[\`[${attachment.name}]\`](${attachment.url})`
                });
                messageContent += attachments;
                let messageEmbed = new MessageEmbed()
                    .setAuthor({ name: `${message.author.username} enviou uma mensagem!`, iconURL: message.author.displayAvatarURL() })
                    .setDescription(`${messageContent}`);
                if (message.attachments.first()) messageEmbed.setImage(message.attachments.first().url);
                user.send({ embeds: [messageEmbed] }).catch(() => { });
                message.channel.send({embeds: [messageEmbed]}).catch(() => { });
                message.delete().catch(() => { });
                ticket.lastResponceUserId = message.author.id;
                ticket.lastResponceAt = new Date().getTime();
                ticket.save();
            }
        } catch (error) {
            if (error) console.error(error);
        }
    }
};