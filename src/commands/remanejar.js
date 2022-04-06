const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require("discord.js");
const moment = require("moment");
moment.locale("pt-br");

module.exports = class Remanejar {
    constructor(client) {
        this.client = client;
        this.name = "remanejar";
        this.aliases = [];
    }

    async run({ message, args }) {
        try {
            if (message.guild && message.guild.id != this.client.ticketConfig.centralGuildId) return;
            let ticket = await this.client.database.tickets.findOne({ channelId: message.channel.id, closed: false });
            if (!ticket) {
                message.reply({ content: "Este comando apenas pode ser executado dentro de um canal de atendimento!" }).then(msg => { setTimeout(() => { msg.delete().catch(() => { }); message.delete().catch(() => { }); }, 10000); }).catch(() => { });
                return;
            }
            let selectNewCategoryEmbed = new MessageEmbed()
                .setAuthor({ name: `${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                .setDescription(`Após confirmar o remanejamento do canal, esta informação ficará vinculada no\ncanal até o seu encerramento.`)
            let row = new MessageActionRow().addComponents(
                new MessageSelectMenu()
                    .setCustomId(`remanejar-select`)
                    .setPlaceholder('Escolha a categoria que deseja remanejar.')
                    .addOptions([
                        {
                            label: "Maior complexidade.",
                            description: "Todos os superiores terão acesso.",
                            emoji: this.client.customEmojis.uparrow,
                            value: "remanejar-high"
                        },
                        {
                            label: "Menor complexidade.",
                            description: "Todos da central terão acesso ao canal.",
                            emoji: this.client.customEmojis.downarrow,
                            value: "remanejar-low"
                        },
                        {
                            label: "Encerrar.",
                            description: "O canal aparece na categoria atual.",
                            emoji: this.client.customEmojis.wastebasket,
                            value: "remanejar-close"
                        }
                    ])
            );
            let selectNewCategoryMenu = await message.channel.send({ embeds: [selectNewCategoryEmbed], components: [row] }).catch(() => { });
            const filter = (interaction) => interaction.user.id == message.author.id;
            const collector = selectNewCategoryMenu.createMessageComponentCollector({ filter, time: 60000, max: 1 });
            collector.on("collect", async i => {
                i.deferUpdate();
                if (i.customId == "remanejar-select") {
                    let id = i.values[0];
                    if (!id) return;
                    let successEmbed = new MessageEmbed()
                        .setAuthor({ name: `${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                        .setDescription(`Mais informações sobre este remanejamento estão fixadas na primeira mensagem\ndo canal. O histórico do canal de suporte não pode ser alterado!`);
                    let userEmbed = new MessageEmbed()
                        .setAuthor({ name: `Este canal foi remanejado por ${message.author.username} em ${moment().format('LL')}.` })
                        .setDescription("Seu canal de atendimento foi remanejado para que você seja atendido pelos membros setor responsável pelo seu problema.\n")
                        .setThumbnail("https://i.imgur.com/xCHdk0w.png")
                        .setFooter({ text: `Não é necessário informar seu problema novamente, todo seu histórico de mensagens entre você e os atendentes foram repassados!` })
                        .setTimestamp();
                    let user = await this.client.users.cache.get(ticket.userId);
                    switch (id) {
                        case "remanejar-high":
                            i.message.channel.setParent(this.client.ticketConfig.highParentId);
                            message.reply({ embeds: [successEmbed], allowedMentions: { repliedUser: false } }).catch(() => { });
                            ticket.history.push({ string: `**${message.author.tag}** remanejou este canal de suporte. [%highEmoji%]`, createdAt: new Date().getTime() });
                            ticket.save();
                            this.client.functions.updateTicketHistory(ticket);
                            if (user) user.send({embeds: [userEmbed]});
                            break;
                        case "remanejar-low":
                            i.message.channel.setParent(this.client.ticketConfig.lowParentId);
                            message.reply({ embeds: [successEmbed], allowedMentions: { repliedUser: false } }).catch(() => { });
                            ticket.history.push({ string: `**${message.author.tag}** remanejou este canal de suporte. [%lowEmoji%]`, createdAt: new Date().getTime() });
                            ticket.save();
                            this.client.functions.updateTicketHistory(ticket);
                            if (user) user.send({embeds: [userEmbed]});
                            break;
                        case "remanejar-close":
                            i.message.delete().catch(() => { });
                            message.delete().catch(() => { });
                            break;
                    }
                }
            });
        } catch (error) {
            console.log(error);
            console.log(`\x1b[91m[Commands] Ocorreu um erro ao executar o comando ${this.name}.js\x1b[0m`)
        }
    }
};