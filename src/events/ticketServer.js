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
                let closeRow = new MessageActionRow().addComponents(
                    new MessageButton()
                        .setCustomId(`close-${message.channel.id}`)
                        .setStyle("DANGER")
                        .setLabel("Encerrar o atendimento."),
                );

                let user = await this.client.users.cache.get(ticket.userId);
                let userObject = await this.client.database.users.findOne({ userId: message.author.id });
                if (!user) {
                    message.delete().catch(() => { });
                    let errorEmbed = new MessageEmbed()
                        .setAuthor({ name: `${message.author.username} não foi possível encontrar o membro!`, iconURL: message.author.displayAvatarURL() })
                        .setDescription(`O membro pode ter saído do discord principal ou sua conta pode ter sido desativada.`)
                        .setColor(this.client.ticketConfig.errorColor);
                    message.channel.send({ embeds: [errorEmbed], components: [closeRow] }).catch(() => { });
                    return;
                }
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
                        .setColor(`${this.client.ticketConfig.commentColor}`);
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
                let centralMessageEmbed = new MessageEmbed()
                    .setAuthor({ name: `${message.author.username} enviou uma mensagem!`, iconURL: message.author.displayAvatarURL() })
                    .setDescription(`${messageContent}`);
                if (userObject && userObject.profile && userObject.profile.anonymous) { messageEmbed.setAuthor({ name: "Um membro da equipe enviou uma mensagem!", iconURL: "https://i.imgur.com/cSqp77S.png" }); centralMessageEmbed.setFooter({ text: "Essa mensagem foi para o membro anonimamente." }) }
                if (message.attachments.first()) messageEmbed.setImage(message.attachments.first().url);
                await user.send({ embeds: [messageEmbed] }).then(() => {
                    message.channel.send({ embeds: [centralMessageEmbed] }).catch(() => { });
                }).catch(() => {
                    let errorEmbed = new MessageEmbed()
                        .setAuthor({ name: `${message.author.username} ocorreu um erro ao enviar a mensagem!`, iconURL: message.author.displayAvatarURL() })
                        .setDescription(`O membro desativou o recebimentos de mensagens privadas ou bloqueou o bot.`)
                        .setColor(this.client.ticketConfig.errorColor);
                    message.channel.send({ embeds: [errorEmbed], components: [closeRow] }).catch(() => { });
                }).finally(() => {
                    message.delete().catch(() => { });
                    ticket.lastResponceUserId = message.author.id;
                    ticket.lastResponceAt = new Date().getTime();
                    ticket.save();
                });
            }
        } catch (error) {
            if (error) console.error(error);
        }
    }
};