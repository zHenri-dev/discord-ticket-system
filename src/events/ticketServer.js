const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
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
                let closeRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`close-${message.channel.id}`)
                        .setStyle(ButtonStyle.Danger)
                        .setLabel("Encerrar o atendimento."),
                );

                let user = await this.client.users.cache.get(ticket.userId);
                let userObject = await this.client.database.users.findOne({ userId: message.author.id });
                if (!user) {
                    message.delete().catch(() => { });
                    let errorEmbed = new EmbedBuilder()
                        .setAuthor({ name: `${message.author.username} não foi possível encontrar o membro!`, iconURL: message.author.displayAvatarURL() })
                        .setDescription(`O membro pode ter saído do discord principal ou sua conta pode ter sido desativada.`)
                        .setColor(this.client.ticketConfig.errorColor);
                    message.channel.send({ embeds: [errorEmbed], components: [closeRow] }).catch(() => { });
                    return;
                }
                if (message.content && message.content.startsWith("&")) return;
                if (message.content && message.content.startsWith("//")) {
                    let commentContent = message.content.substring(2);
                    message.attachments.forEach(attachment => {
                        let attachmentEmbed = new EmbedBuilder()
                            .setTitle(`${this.client.customEmojis.folder} Este arquivo foi enviado no comentário por ${message.author.username}.`)
                            .setURL(attachment.url)
                            .setImage(attachment.url)
                            .setFooter({ text: `Nome do arquivo: ${attachment.name}` })
                            .setColor(`${this.client.ticketConfig.commentColor}`);
                        message.channel.send({ embeds: [attachmentEmbed] }).catch(() => { });
                    });
                    if (commentContent != "") {
                        let commentEmbed = new EmbedBuilder()
                            .setAuthor({ name: `${message.author.username} comentou:`, iconURL: message.author.displayAvatarURL() })
                            .setDescription(`${commentContent}`)
                            .setColor(`${this.client.ticketConfig.commentColor}`);
                        message.channel.send({ embeds: [commentEmbed] }).catch(() => { });
                    }
                    message.delete().catch(() => { });
                    return;
                }
                let errorEmbed = new EmbedBuilder()
                    .setAuthor({ name: `${message.author.username} ocorreu um erro ao enviar a mensagem!`, iconURL: message.author.displayAvatarURL() })
                    .setDescription(`O membro desativou o recebimentos de mensagens privadas ou bloqueou o bot.`)
                    .setColor(this.client.ticketConfig.errorColor);

                message.attachments.forEach(async attachment => {
                    let attachmentCentralEmbed = new EmbedBuilder()
                        .setTitle(`${this.client.customEmojis.folder} Este arquivo foi enviado por ${message.author.username} para o membro.`)
                        .setURL(attachment.url)
                        .setImage(attachment.url)
                        .setFooter({ text: `Nome do arquivo: ${attachment.name}` });
                    let attachmentMemberEmbed = new EmbedBuilder()
                        .setTitle(`${this.client.customEmojis.folder} Este arquivo foi enviado por ${message.author.username}.`)
                        .setURL(attachment.url)
                        .setImage(attachment.url)
                        .setFooter({ text: `Nome do arquivo: ${attachment.name}` });
                    await user.send({ embeds: [attachmentMemberEmbed] }).then(() => {
                        message.channel.send({ embeds: [attachmentCentralEmbed] }).catch(() => { });
                    }).catch(() => {
                        if (!message.content) message.channel.send({ embeds: [errorEmbed], components: [closeRow] }).catch(() => { });
                    });
                });
                if (message.content) {
                    let messageEmbed = new EmbedBuilder()
                        .setAuthor({ name: `${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                        .setDescription(`${message.content}`);
                    let centralMessageEmbed = new EmbedBuilder()
                        .setAuthor({ name: `${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                        .setDescription(`${message.content}`);
                    if (userObject && userObject.profile && userObject.profile.anonymous) { messageEmbed.setAuthor({ name: "Membro da equipe.", iconURL: "https://i.imgur.com/cSqp77S.png" }); centralMessageEmbed.setFooter({ text: "O membro não pode ver quem enviou esta mensagem." }) }
                    await user.send({ embeds: [messageEmbed] }).then(() => {
                        message.channel.send({ embeds: [centralMessageEmbed] }).catch(() => { });
                    }).catch(() => {
                        message.channel.send({ embeds: [errorEmbed], components: [closeRow] }).catch(() => { });
                    });
                }
                message.delete().catch(() => { });
                ticket.lastResponseUserId = message.author.id;
                ticket.lastResponseAt = new Date().getTime();
                ticket.save();
            }
        } catch (error) {
            if (error) console.error(error);
        }
    }
};