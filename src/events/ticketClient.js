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
            if (message.guild || message.author.bot === true) return;
            let ticket = await this.client.database.tickets.findOne({ userId: message.author.id, closed: false });
            let central = await this.client.guilds.cache.get(this.client.ticketConfig.centralGuildId);
            if (!central) return;
            let cooldown = await this.client.cooldowns.includes(message.author.id);
            if (cooldown) {
                let cooldownEmbed = new EmbedBuilder()
                    .setTitle("Aguarde... você está enviando mensagens rápido demais!")
                    .setFooter({ text: "Por conta da grande demanda de atendimento, e necessário esperar 10 segundos para enviar outra mensagem para central de atendimento!" })
                    .setTimestamp();
                message.reply({ embeds: [cooldownEmbed], allowedMentions: { repliedUser: false } }).catch(() => { });
                return;
            } else {
                this.client.cooldowns.push(message.author.id);
                setTimeout(() => { this.client.cooldowns = this.client.cooldowns.filter(cooldown => cooldown != message.author.id) }, 10000);
            }
            if (!ticket) {
                let cooldown = await this.client.database.cooldowns.findOne({ userId: message.author.id });
                if (cooldown) {
                    if (cooldown.time >= new Date().getTime()) {
                        let cooldownEmbed2 = new EmbedBuilder()
                            .setTitle("Criação temporariamente proibida!")
                            .setURL(`https://discord.com/channels/@me/${this.client.user.id}`)
                            .setDescription(`** Isso acontece com todos os membros que criaram tickets recentemente por conta de um tempo de espera estabelecido.**\n\n A criação do seu ticket foi bloqueada porque você criou um recentemente.\n É necessário esperar ainda \`${await this.client.functions.getFormattedTime(cooldown.time - new Date().getTime())}\` para criar outro ticket, tente novamente após o término de seu tempo de espera.`)
                            .setFooter({ text: `Lembrando que, a criação de tickets de forma maliciosa e fútil pode resultar em punição!` })
                        message.reply({ embeds: [cooldownEmbed2], allowedMentions: { repliedUser: false } }).catch(() => { });
                        return;
                    } else {
                        cooldown.delete();
                    }
                }
                let ticketCount = (await this.client.database.tickets.find({ closed: false })).length;
                if (ticket >= this.client.ticketConfig.maxTickets) {
                    let maxTicketsEmbed = new EmbedBuilder()
                        .setTitle("Sistema lotado!")
                        .setURL(`https://discord.com/channels/@me/${this.client.user.id}`)
                        .setDescription(`**Isso ocorre pelo fato do sistema estar lotado e não suportar que jogadores novos consigam abrir um ticket.**\n\n Recomendamos que tente abrir o ticket mais tarde ou aguarde algum outro jogador ter seu ticket fechado.`)
                        .setFooter({ text: `Lembrando que, a criação de tickets de forma maliciosa e fútil pode resultar em punição!` })
                    message.reply({ embeds: [maxTicketsEmbed], allowedMentions: { repliedUser: false } }).catch(() => { });
                    return;
                }
                let category = undefined;
                let userSelect = this.client.selects.find(select => select.userId == message.author.id);
                if (userSelect) category = this.client.categories[userSelect.category]
                else {
                    let messageObject = (await this.client.database.messages.find({}))[0];
                    if (messageObject) {
                        let noSelectionEmbed = new EmbedBuilder()
                            .setTitle(`É necessário classificar seu canal de suporte.`)
                            .setDescription(`Anteriormente você criou um canal de suporte sem nenhuma classificação, entretanto agora é necessário.\n\n[${this.client.customEmojis.paperplane} Clique na reação desta mensagem e prossiga com a classificação.](https://discord.com/channels/${messageObject.guildId}/${messageObject.channelId}/${messageObject.messageId})`);
                        message.channel.send({ embeds: [noSelectionEmbed] }).catch(() => { });
                        return;
                    }
                }
                let waitingEmbed = new EmbedBuilder()
                    .setTitle("Aguarde!")
                    .setDescription(`Estamos preparando um lugar confortável para seu canal de atendimento. Este processo pode demorar alguns segundos!`)
                    .setThumbnail(`https://i.imgur.com/PC6QhJJ.png`)
                message.channel.send({ embeds: [waitingEmbed] }).catch(() => { });
                let parent = this.client.ticketConfig.lowParentId;
                if (category.high) parent = this.client.ticketConfig.highParentId;
                let channel = await central.channels.create({ name: `0${message.author.discriminator}${ticketCount + 1}`, parent, topic: category.name }).catch((error) => { console.log(error); console.log(`\x1b[91m[TicketClient] Ocorreu um erro ao criar o ticket do membro ${message.author.tag} \x1b[0m`); })
                if (!channel) return;
                let firstMessageEmbed = new EmbedBuilder()
                    .setAuthor({ name: "Canal de atendimento.", iconURL: "https://i.imgur.com/kLw1M7i.png" })
                    .setDescription(`Este canal foi criado por ${message.author.username} em ${moment().format("LLL")}.\n**Categoria:** ${category.name}\n\n⠀ **Histórico do canal:**\n\`[${moment().format("DD/MM [às] HH:mm")}]\` **${message.author.tag}** criou este canal de suporte.\n\n⠀ **Informações:**\n${this.client.customEmojis.connection} Latência: ~${this.client.ws.ping}ms.`)
                    .setFooter({ text: `ID do membro: ${message.author.id}  —  ID do canal: ${channel.id}` });
                let row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`close-${channel.id}`)
                        .setStyle(ButtonStyle.Danger)
                        .setLabel("Encerrar o atendimento."),
                );
                let firstMessage = await channel.send({ embeds: [firstMessageEmbed], components: [row] }).catch(() => { });
                await firstMessage.pin().catch(() => { });
                ticket = await this.client.database.tickets.create({
                    userId: message.author.id,
                    channelId: channel.id,
                    firstMessageId: firstMessage.id,
                    category: category.name,
                    closed: false,
                    history: [{ string: `**${message.author.tag}** criou este canal de suporte.`, createdAt: new Date().getTime() }],
                    createdAt: new Date().getTime()
                });
                this.client.database.histories.create({
                    string: `**${message.author.tag}** criou um canal de suporte.`,
                    createdAt: new Date().getTime(),
                });
                this.client.selects = this.client.selects.filter(select => select.userId != message.author.id)
                message.attachments.forEach(attachment => {
                    let attachmentEmbed = new EmbedBuilder()
                        .setTitle(`${this.client.customEmojis.folder} Este arquivo foi enviado por ${message.author.username} para a central.`)
                        .setURL(attachment.url)
                        .setImage(attachment.url)
                        .setFooter({ text: `Nome do arquivo: ${attachment.name}` });
                    channel.send({ embeds: [attachmentEmbed] }).catch(() => { });
                });
                if (message.content) {
                    let messageEmbed = new EmbedBuilder()
                        .setAuthor({ name: `${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                        .setDescription(`${message.content}`);
                    channel.send({ embeds: [messageEmbed] }).catch(() => { });
                }
                let sentEmbed = new EmbedBuilder()
                    .setTitle(`${this.client.customEmojis.messages}⠀Recebemos essa mensagem!`);
                message.reply({ embeds: [sentEmbed], allowedMentions: { repliedUser: false } }).catch(() => { });
                this.client.functions.updateMessages();
            } else {
                let channel = await central.channels.cache.get(ticket.channelId);
                if (!channel) {
                    let errorEmbed = new EmbedBuilder()
                        .setAuthor({ name: `${message.author.username} não foi possível criar seu canal de atendimento!`, iconURL: message.author.displayAvatarURL() })
                        .setDescription("Ocorreu um erro ao criar seu canal de atendimento, pedimos desculpas por isto e pedimos que tente cria-lo novamente enviando outra mensagem.")
                        .setColor(this.client.ticketConfig.errorColor);
                    message.reply({ embeds: [errorEmbed], allowedMentions: { repliedUser: false } }).catch(() => { });
                    ticket.closed = true;
                    ticket.save();
                    this.client.functions.updateMessages();
                    return;
                }
                message.attachments.forEach(attachment => {
                    let attachmentEmbed = new EmbedBuilder()
                        .setTitle(`${this.client.customEmojis.folder} Este arquivo foi enviado por ${message.author.username} para a central.`)
                        .setURL(attachment.url)
                        .setImage(attachment.url)
                        .setFooter({ text: `Nome do arquivo: ${attachment.name}` });
                    channel.send({ embeds: [attachmentEmbed] }).catch(() => { });
                });
                if (message.content) {
                    let messageEmbed = new EmbedBuilder()
                        .setAuthor({ name: `${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                        .setDescription(`${message.content}`);
                    let lastResponseUser = await this.client.users.cache.get(ticket.lastResponseUserId);
                    let lastResponseUserObject = await this.client.database.users.findOne({ userId: message.author.id });
                    let ticketInactiveTime = this.client.ticketConfig.ticketInactiveTime;
                    if (lastResponseUserObject && lastResponseUserObject.profile && lastResponseUserObject.profile.ticketInactiveTime) ticketInactiveTime = lastResponseUserObject.profile.ticketInactiveTime;
                    if (lastResponseUser && ticket.lastResponseAt + ticketInactiveTime <= new Date().getTime()) {
                        channel.send({ content: `${lastResponseUser}` }).then(msg => { msg.delete().catch(() => { }) }).catch(() => { });
                        messageEmbed.setFooter({ text: `${lastResponseUser.username} acabou de ser notificado(a) do envio desta mensagem.`, iconURL: "https://i.imgur.com/Aatgi3x.png" })
                    }
                    channel.send({ embeds: [messageEmbed] }).catch(() => { });
                }
                let sentEmbed = new EmbedBuilder()
                    .setTitle(`${this.client.customEmojis.messages}⠀Recebemos essa mensagem!`);
                message.reply({ embeds: [sentEmbed], allowedMentions: { repliedUser: false } }).catch(() => { });
            }
        } catch (error) {
            if (error) console.error(error);
        }
    }
};